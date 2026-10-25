import React, { useState, useRef } from 'react';
import { predictRisk, uploadMedicalReport, fetchSampleReport } from '../services/api';
import {
  Sparkles, ArrowRight, ArrowLeft, RotateCcw, AlertCircle, FileUp, CheckCircle2,
  AlertTriangle, HelpCircle, FileText, Check, ShieldCheck, Activity, Info, X,
  UploadCloud, RefreshCw
} from 'lucide-react';

const INITIAL_STATE = {
  HighBP: 0,
  HighChol: 0,
  CholCheck: 1,
  BMI: 27.0,
  Smoker: 0,
  Stroke: 0,
  HeartDiseaseorAttack: 0,
  PhysActivity: 1,
  Fruits: 1,
  Veggies: 1,
  HvyAlcoholConsump: 0,
  AnyHealthcare: 1,
  NoDocbcCost: 0,
  GenHlth: 2,
  MentHlth: 0,
  PhysHlth: 0,
  DiffWalk: 0,
  Sex: 0,
  Age: 7,
  Education: 5,
  Income: 6
};

const STEP_1_FIELDS = ['BMI', 'Age', 'Sex', 'GenHlth', 'Income', 'Education'];
const STEP_2_FIELDS = ['HighBP', 'HighChol', 'CholCheck', 'Stroke', 'HeartDiseaseorAttack', 'DiffWalk'];
const STEP_3_FIELDS = ['Smoker', 'PhysActivity', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'AnyHealthcare', 'NoDocbcCost', 'PhysHlth', 'MentHlth'];

const FIELD_LABELS = {
  HighBP: "High Blood Pressure",
  HighChol: "High Cholesterol",
  CholCheck: "Cholesterol Check in Past 5 Yrs",
  BMI: "Body Mass Index (BMI)",
  Smoker: "Smoked >= 100 Cigarettes",
  Stroke: "History of Stroke",
  HeartDiseaseorAttack: "Coronary Heart Disease / MI",
  PhysActivity: "Physical Activity (Past 30 Days)",
  Fruits: "Consumes Fruit Daily",
  Veggies: "Consumes Vegetables Daily",
  HvyAlcoholConsump: "Heavy Alcohol Intake",
  AnyHealthcare: "Healthcare Coverage",
  NoDocbcCost: "Cost Barrier to Doctor",
  GenHlth: "General Health Rating",
  MentHlth: "Poor Mental Health Days",
  PhysHlth: "Poor Physical Health Days",
  DiffWalk: "Difficulty Walking / Stairs",
  Sex: "Biological Sex",
  Age: "Age Category",
  Education: "Education Completed",
  Income: "Household Income"
};

export default function AssessmentPage({ onPredictionComplete, setActiveTab }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Medical report upload states
  const [entryMode, setEntryMode] = useState('report'); // 'report' | 'manual'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [reportResult, setReportResult] = useState(null);
  const [fieldMeta, setFieldMeta] = useState({}); // { [key]: { status, explanation, snippet, confirmed } }
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const showDemoPresets = new URLSearchParams(window.location.search).get('demo') === '1';

  const updateField = (field, value) => {
    const numVal = value === '' || value === null ? null : Number(value);
    setFormData(prev => ({ ...prev, [field]: numVal }));
    setFieldMeta(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        status: prev[field]?.status === 'auto_filled' ? 'auto_filled' : 'user_confirmed',
        confirmed: true
      }
    }));
    // Clear validation error for this field
    if (validationErrors.includes(field)) {
      setValidationErrors(prev => prev.filter(f => f !== field));
    }
  };

  const confirmField = (field) => {
    setFieldMeta(prev => ({
      ...prev,
      [field]: {
        ...(prev[field] || {}),
        confirmed: true
      }
    }));
  };

  const confirmAllExtracted = () => {
    setFieldMeta(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[k]?.status === 'needs_confirmation' || updated[k]?.status === 'auto_filled') {
          updated[k] = { ...updated[k], confirmed: true };
        }
      });
      return updated;
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Client-side file validation
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      setError(`Invalid file format '.${ext}'. Please upload a PDF, JPG, PNG, or JPEG file.`);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15 MB limit. Please upload a smaller file.");
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(10);
    setUploadStage("Uploading medical report...");

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 40) return prev + 10;
          if (prev < 80) {
            setUploadStage("Extracting text and running OCR on report pages...");
            return prev + 8;
          }
          if (prev < 95) {
            setUploadStage("Analyzing clinical vitals and matching survey indicators...");
            return prev + 3;
          }
          return prev;
        });
      }, 250);

      const result = await uploadMedicalReport(file, (pct) => {
        if (pct < 50) setUploadProgress(Math.max(10, Math.round(pct * 0.5)));
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadStage("Report analyzed successfully!");

      setTimeout(() => {
        setReportResult(result);
        setUploading(false);

        // Apply extracted fields:
        // Fill matching auto_filled and needs_confirmation fields.
        // Missing fields are left blank (null) to ask users to answer manually!
        const newFormData = {};
        const newFieldMeta = {};

        Object.keys(result.extracted_fields).forEach(key => {
          const detail = result.extracted_fields[key];
          newFieldMeta[key] = {
            status: detail.status, // "auto_filled" | "needs_confirmation" | "not_found"
            explanation: detail.explanation,
            snippet: detail.source_snippet,
            confidence: detail.confidence,
            confirmed: detail.status === 'auto_filled'
          };

          if (detail.status === 'not_found' || detail.value === null) {
            newFormData[key] = null; // Left blank for manual user input!
          } else {
            newFormData[key] = Number(detail.value);
          }
        });

        setFormData(newFormData);
        setStep(1);
      }, 500);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to parse medical report. Please check the file or try manual entry.");
      setUploading(false);
    }
  };

  const handleSampleSelect = async (sampleKey) => {
    try {
      setError(null);
      setUploading(true);
      setUploadProgress(25);
      setUploadStage(`Fetching ${sampleKey} sample medical report...`);
      const file = await fetchSampleReport(sampleKey);
      await handleFileUpload(file);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load sample report.");
      setUploading(false);
    }
  };

  const clearReport = () => {
    setReportResult(null);
    setFieldMeta({});
    setFormData(INITIAL_STATE);
    setError(null);
    setValidationErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateStepFields = (stepNum) => {
    const fieldsToValidate = stepNum === 1 ? STEP_1_FIELDS : stepNum === 2 ? STEP_2_FIELDS : STEP_3_FIELDS;
    const missing = [];

    fieldsToValidate.forEach(field => {
      const val = formData[field];
      if (val === null || val === undefined || isNaN(val)) {
        missing.push(field);
      }
    });

    return missing;
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    const missing = validateStepFields(step);
    if (missing.length > 0) {
      setValidationErrors(missing);
      setError(`Please complete all required fields before proceeding: ${missing.map(f => FIELD_LABELS[f] || f).join(', ')}`);
      return;
    }
    setError(null);
    setValidationErrors([]);
    setStep(step + 1);
  };

  const loadPreset = (presetName) => {
    clearReport();
    if (presetName === 'elevated') {
      setFormData({
        HighBP: 1, HighChol: 1, CholCheck: 1, BMI: 34.5, Smoker: 1,
        Stroke: 0, HeartDiseaseorAttack: 1, PhysActivity: 0, Fruits: 0, Veggies: 0,
        HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, GenHlth: 4,
        MentHlth: 5, PhysHlth: 12, DiffWalk: 1, Sex: 1, Age: 10, Education: 4, Income: 3
      });
    } else if (presetName === 'moderate') {
      setFormData({
        HighBP: 1, HighChol: 0, CholCheck: 1, BMI: 28.5, Smoker: 0,
        Stroke: 0, HeartDiseaseorAttack: 0, PhysActivity: 1, Fruits: 1, Veggies: 1,
        HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, GenHlth: 3,
        MentHlth: 2, PhysHlth: 3, DiffWalk: 0, Sex: 0, Age: 7, Education: 5, Income: 6
      });
    } else {
      setFormData({
        HighBP: 0, HighChol: 0, CholCheck: 1, BMI: 22.0, Smoker: 0,
        Stroke: 0, HeartDiseaseorAttack: 0, PhysActivity: 1, Fruits: 1, Veggies: 1,
        HvyAlcoholConsump: 0, AnyHealthcare: 1, NoDocbcCost: 0, GenHlth: 1,
        MentHlth: 0, PhysHlth: 0, DiffWalk: 0, Sex: 0, Age: 3, Education: 6, Income: 8
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && step < 3) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    // Validate all 21 fields
    const allFields = [...STEP_1_FIELDS, ...STEP_2_FIELDS, ...STEP_3_FIELDS];
    const missing = allFields.filter(f => formData[f] === null || formData[f] === undefined || isNaN(formData[f]));

    if (missing.length > 0) {
      setValidationErrors(missing);
      setError(`Cannot calculate prediction. Missing ${missing.length} unanswered field(s): ${missing.map(f => FIELD_LABELS[f] || f).join(', ')}`);
      // Jump to the step with missing fields
      if (missing.some(f => STEP_1_FIELDS.includes(f))) setStep(1);
      else if (missing.some(f => STEP_2_FIELDS.includes(f))) setStep(2);
      else setStep(3);
      return;
    }

    setLoading(true);
    try {
      // Clean 21 floats sent to existing prediction API
      const cleanFeatures = {};
      allFields.forEach(f => {
        cleanFeatures[f] = Number(formData[f]);
      });

      const result = await predictRisk(cleanFeatures);
      onPredictionComplete(result, cleanFeatures);
      setActiveTab('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError("Failed to obtain prediction from backend. Please ensure the server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const getBmiCategory = (bmi) => {
    if (bmi === null || bmi === undefined) return { label: "Unspecified", color: "text-outline" };
    if (bmi < 18.5) return { label: "Underweight", color: "text-secondary" };
    if (bmi < 25) return { label: "Normal weight", color: "text-tertiary" };
    if (bmi < 30) return { label: "Overweight", color: "text-secondary-container" };
    return { label: "Obese (Class I+)", color: "text-error" };
  };

  const renderFieldBadge = (fieldKey) => {
    const meta = fieldMeta[fieldKey];
    if (!meta) return null;

    if (meta.status === 'auto_filled') {
      return (
        <span
          title={meta.snippet ? `Extracted from: "${meta.snippet}"` : meta.explanation}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
        >
          <CheckCircle2 size={12} className="text-emerald-400" />
          <span>Auto-filled</span>
        </span>
      );
    }

    if (meta.status === 'needs_confirmation') {
      return (
        <div className="inline-flex items-center gap-1.5">
          <span
            title={meta.explanation}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-semibold ${
              meta.confirmed
                ? 'bg-secondary-container/20 border border-secondary-container/40 text-secondary-container'
                : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
            }`}
          >
            {meta.confirmed ? <Check size={12} /> : <AlertTriangle size={12} />}
            <span>{meta.confirmed ? 'Confirmed' : 'Needs Confirmation'}</span>
          </span>
          {!meta.confirmed && (
            <button
              type="button"
              onClick={() => confirmField(fieldKey)}
              className="text-label-sm underline hover:text-amber-300 text-amber-400 cursor-pointer"
            >
              Confirm
            </button>
          )}
        </div>
      );
    }

    if (meta.status === 'not_found' || meta.status === 'user_confirmed') {
      const isAnswered = formData[fieldKey] !== null && formData[fieldKey] !== undefined;
      return (
        <span
          title={meta.explanation}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-semibold ${
            isAnswered
              ? 'bg-primary-container/20 border border-primary/30 text-primary'
              : 'bg-surface-variant border border-outline-variant/40 text-outline'
          }`}
        >
          {isAnswered ? <Check size={12} /> : <HelpCircle size={12} />}
          <span>{isAnswered ? 'User Answered' : 'Not in Report - Answer Manually'}</span>
        </span>
      );
    }

    return null;
  };

  const bmiMeta = getBmiCategory(formData.BMI);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">clinical_notes</span>
            <span>Intelligent Clinical Assessment</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Diabetes Risk Assessment & Report Auto-Fill
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Upload your medical report for automated clinical data extraction, or answer the survey manually.
          </p>
        </div>

        {/* Demo Presets (if active in demo mode) */}
        {showDemoPresets && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-sm font-label-sm text-outline uppercase mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => loadPreset('elevated')}
              className="px-3 py-1.5 rounded-lg bg-error-container/20 hover:bg-error-container/40 text-error border border-error/30 text-label-sm transition-all cursor-pointer"
            >
              Elevated Risk
            </button>
            <button
              type="button"
              onClick={() => loadPreset('moderate')}
              className="px-3 py-1.5 rounded-lg bg-secondary-container/20 hover:bg-secondary-container/40 text-secondary-container border border-secondary-container/30 text-label-sm transition-all cursor-pointer"
            >
              Moderate Risk
            </button>
            <button
              type="button"
              onClick={() => loadPreset('low')}
              className="px-3 py-1.5 rounded-lg bg-tertiary-container/20 hover:bg-tertiary-container/40 text-tertiary border border-tertiary/30 text-label-sm transition-all cursor-pointer"
            >
              Low Risk
            </button>
          </div>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/30">
        <button
          type="button"
          onClick={() => setEntryMode('report')}
          className={`flex-1 py-3 px-4 rounded-xl text-body-md font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            entryMode === 'report'
              ? 'bg-surface-container-high text-secondary-container border border-secondary-container/50 shadow-md'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Sparkles size={18} className="text-secondary-container" />
          <span>Smart Report Upload & Auto-Fill</span>
          <span className="text-label-sm px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary-container font-mono">
            AI OCR
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEntryMode('manual');
            if (!reportResult) setFormData(INITIAL_STATE);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-body-md font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            entryMode === 'manual'
              ? 'bg-surface-container-high text-secondary-container border border-secondary-container/50 shadow-md'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <RotateCcw size={18} />
          <span>Manual Questionnaire Entry</span>
        </button>
      </div>

      {/* MEDICAL REPORT UPLOADER CARD (Visible in 'report' mode) */}
      {entryMode === 'report' && !reportResult && (
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-outline-variant/30 glass-rim flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
            <div>
              <h2 className="text-title-lg font-bold text-on-surface flex items-center gap-2">
                <FileUp className="text-secondary-container" size={22} />
                <span>Upload Clinical Lab Report or EHR Summary</span>
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                Supports PDF documents and scanned image reports (JPG, PNG, JPEG). Files are processed securely in-memory.
              </p>
            </div>
            <div className="flex items-center gap-2 text-label-sm text-outline">
              <ShieldCheck size={16} className="text-tertiary" />
              <span>HIPAA Compliant In-Memory OCR</span>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-secondary-container bg-secondary-container/10 scale-[1.01]'
                : 'border-outline-variant/40 bg-surface-container-lowest/40 hover:bg-surface-container-lowest/80 hover:border-secondary-container/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 rounded-2xl bg-secondary-container/15 flex items-center justify-center border border-secondary-container/30 text-secondary-container">
              <UploadCloud size={32} />
            </div>

            <div>
              <div className="text-title-md font-semibold text-on-surface">
                Drop your medical report here, or <span className="text-secondary-container underline">browse files</span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Accepted: PDF, JPG, PNG, JPEG (Max file size: 15 MB)
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-md bg-surface-container text-label-sm text-outline border border-outline-variant/30">
                PDF Documents
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container text-label-sm text-outline border border-outline-variant/30">
                Blood Test Panels
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container text-label-sm text-outline border border-outline-variant/30">
                Scanned Clinic Notes
              </span>
            </div>
          </div>

          {/* Quick Sample Reports */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <span className="text-label-md font-medium text-outline">
              Don't have a report on hand? Test with our sample medical records:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSampleSelect('comprehensive')}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText size={14} className="text-secondary-container" />
                <span>Sample Lab Report (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSampleSelect('scanned')}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Activity size={14} className="text-tertiary" />
                <span>Scanned Note (PNG OCR)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSampleSelect('minimal')}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <HelpCircle size={14} className="text-amber-400" />
                <span>Partial / Missing Report</span>
              </button>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="p-4 rounded-xl bg-surface-container-high border border-secondary-container/40 flex flex-col gap-2.5 animate-pulse">
              <div className="flex items-center justify-between text-body-sm font-medium">
                <span className="text-secondary-container flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-secondary-container border-t-transparent animate-spin"></span>
                  <span>{uploadStage}</span>
                </span>
                <span className="font-mono text-secondary-container">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-secondary-container transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXTRACTION SUMMARY BANNER (When report is parsed) */}
      {reportResult && (
        <div className="glass-panel rounded-2xl p-6 border border-secondary-container/40 flex flex-col gap-5 bg-surface-container-high/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-container/20 border border-secondary-container/40 flex items-center justify-center text-secondary-container shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <div className="text-title-md font-bold text-on-surface flex items-center gap-2">
                  <span>{reportResult.filename}</span>
                  <span className="text-label-sm font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Analyzed
                  </span>
                </div>
                <p className="text-body-sm text-on-surface-variant">
                  Clinical values mapped to questionnaire. Missing fields left blank for manual verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmAllExtracted}
                className="px-3.5 py-1.5 rounded-xl bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary-container border border-secondary-container/40 text-label-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check size={14} />
                <span>Confirm All Extracted</span>
              </button>
              <button
                type="button"
                onClick={clearReport}
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-variant text-outline hover:text-on-surface border border-outline-variant/30 transition-all cursor-pointer"
                title="Remove report & reset"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Counts statistics pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <div className="text-label-sm uppercase tracking-wider text-emerald-400 font-semibold">Auto-Filled Fields</div>
                <div className="text-headline-sm font-bold text-emerald-300 font-code-metric">
                  {reportResult.auto_filled_count} <span className="text-body-sm font-normal text-emerald-400/80">/ 21</span>
                </div>
              </div>
              <CheckCircle2 size={24} className="text-emerald-400 opacity-80" />
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <div className="text-label-sm uppercase tracking-wider text-amber-400 font-semibold">Needs Confirmation</div>
                <div className="text-headline-sm font-bold text-amber-300 font-code-metric">
                  {reportResult.needs_confirmation_count}
                </div>
              </div>
              <AlertTriangle size={24} className="text-amber-400 opacity-80" />
            </div>

            <div className="p-3.5 rounded-xl bg-primary-container/10 border border-primary/20 flex items-center justify-between">
              <div>
                <div className="text-label-sm uppercase tracking-wider text-primary font-semibold">Manual Input Required</div>
                <div className="text-headline-sm font-bold text-primary font-code-metric">
                  {reportResult.not_found_count}
                </div>
              </div>
              <HelpCircle size={24} className="text-primary opacity-80" />
            </div>
          </div>

          {/* DETECTED NON-MODEL CLINICAL LAB INDICATORS (Displayed transparently, NEVER mapped to model inputs) */}
          {reportResult.non_model_clinical_indicators && Object.keys(reportResult.non_model_clinical_indicators).length > 0 && (
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-label-md font-semibold text-on-surface">
                  <Activity size={16} className="text-tertiary" />
                  <span>Detected Clinical Lab Markers (Informational Context)</span>
                </div>
                <span className="text-label-sm text-outline">Reference Only</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {Object.entries(reportResult.non_model_clinical_indicators).map(([labName, labVal]) => (
                  <div key={labName} className="p-2.5 rounded-lg bg-surface-container-lowest/80 border border-outline-variant/30 flex flex-col gap-0.5">
                    <span className="text-label-sm text-outline">{labName}</span>
                    <span className="text-body-sm font-semibold text-on-surface">{labVal}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 text-label-sm text-outline bg-surface-container-lowest/40 p-2.5 rounded-lg border border-outline-variant/20">
                <Info size={14} className="text-tertiary shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Validation Note:</strong> These lab biomarkers (such as HbA1c and Blood Glucose) are extracted for clinical awareness. Consistent with strict ML safety protocols, they are NOT mapped to unrelated survey features of the CDC BRFSS model.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multi-step Progress Indicator */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setStep(1)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            step === 1
              ? 'bg-surface-container-high border-secondary-container text-secondary-container shadow-md'
              : 'glass-panel border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="text-label-sm font-code-metric uppercase">Step 01</div>
          <div className="text-body-md font-semibold text-on-surface">Demographics & General Health</div>
        </button>

        <button
          onClick={() => setStep(2)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            step === 2
              ? 'bg-surface-container-high border-secondary-container text-secondary-container shadow-md'
              : 'glass-panel border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="text-label-sm font-code-metric uppercase">Step 02</div>
          <div className="text-body-md font-semibold text-on-surface">Vitals & Medical History</div>
        </button>

        <button
          onClick={() => setStep(3)}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            step === 3
              ? 'bg-surface-container-high border-secondary-container text-secondary-container shadow-md'
              : 'glass-panel border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <div className="text-label-sm font-code-metric uppercase">Step 03</div>
          <div className="text-body-md font-semibold text-on-surface">Lifestyle & Healthcare Access</div>
        </button>
      </div>

      {/* Alert Error Box */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1"><p>{error}</p>{error.startsWith('Failed to obtain prediction') && <button type="button" onClick={() => handleSubmit({ preventDefault() {} })} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"><RotateCcw size={14} /> Retry prediction</button>}</div>
        </div>
      )}

      {/* Form Card Container */}
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="glass-panel rounded-2xl p-6 sm:p-8 border border-outline-variant/30 glass-rim flex flex-col gap-8">
        
        {/* STEP 1: Demographics & General Health */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="text-headline-md font-headline-md text-on-surface">
                Phase 1: Biometrics & Demographic Profile
              </h2>
              <span className="text-label-sm text-outline">Review, edit, or answer missing fields</span>
            </div>

            {/* BMI Slider */}
            <div className={`flex flex-col gap-2 p-4 rounded-xl bg-surface-container-lowest/60 border ${
              validationErrors.includes('BMI') ? 'border-error' : 'border-outline-variant/30'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <label className="text-body-md font-semibold text-on-surface">
                    Body Mass Index (BMI)
                  </label>
                  {renderFieldBadge('BMI')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stat-metric font-code-metric text-on-surface font-bold">
                    {formData.BMI !== null && formData.BMI !== undefined ? formData.BMI.toFixed(1) : "—"}
                  </span>
                  <span className={`text-label-md font-semibold px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 ${bmiMeta.color}`}>
                    {bmiMeta.label}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="14"
                max="65"
                step="0.5"
                value={formData.BMI ?? 27.0}
                onChange={(e) => updateField('BMI', e.target.value)}
                className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-label-sm text-outline">
                <span>14.0 (Severely Underweight)</span>
                <span>25.0 (Overweight threshold)</span>
                <span>30.0 (Obese threshold)</span>
                <span>65.0</span>
              </div>
              {formData.BMI === null && (
                <p className="text-label-sm text-amber-400 font-medium mt-1">
                  * Not specified in report. Drag slider or click above to set BMI.
                </p>
              )}
            </div>

            {/* Age Category & Biological Sex */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Age Category */}
              <div className={`flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest/40 border ${
                validationErrors.includes('Age') ? 'border-error' : 'border-outline-variant/30'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-medium text-on-surface-variant">
                    Age Category
                  </label>
                  {renderFieldBadge('Age')}
                </div>
                <select
                  value={formData.Age ?? ''}
                  onChange={(e) => updateField('Age', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
                  <option value="">-- Please select age category --</option>
                  <option value={1}>18 - 24 years</option>
                  <option value={2}>25 - 29 years</option>
                  <option value={3}>30 - 34 years</option>
                  <option value={4}>35 - 39 years</option>
                  <option value={5}>40 - 44 years</option>
                  <option value={6}>45 - 49 years</option>
                  <option value={7}>50 - 54 years</option>
                  <option value={8}>55 - 59 years</option>
                  <option value={9}>60 - 64 years</option>
                  <option value={10}>65 - 69 years</option>
                  <option value={11}>70 - 74 years</option>
                  <option value={12}>75 - 79 years</option>
                  <option value={13}>80 years or older</option>
                </select>
              </div>

              {/* Biological Sex */}
              <div className={`flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest/40 border ${
                validationErrors.includes('Sex') ? 'border-error' : 'border-outline-variant/30'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-medium text-on-surface-variant">
                    Biological Sex
                  </label>
                  {renderFieldBadge('Sex')}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => updateField('Sex', 0)}
                    className={`py-2 px-4 rounded-lg border text-body-md font-medium transition-all cursor-pointer ${
                      formData.Sex === 0
                        ? 'bg-primary-container text-on-primary-container border-primary shadow'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
                    }`}
                  >
                    Female
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('Sex', 1)}
                    className={`py-2 px-4 rounded-lg border text-body-md font-medium transition-all cursor-pointer ${
                      formData.Sex === 1
                        ? 'bg-primary-container text-on-primary-container border-primary shadow'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:text-on-surface'
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>
            </div>

            {/* General Health Self-Assessment */}
            <div className={`flex flex-col gap-2 p-3.5 rounded-xl bg-surface-container-lowest/40 border ${
              validationErrors.includes('GenHlth') ? 'border-error' : 'border-outline-variant/30'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-label-md font-medium text-on-surface-variant">
                  General Health Self-Assessment
                </label>
                {renderFieldBadge('GenHlth')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { val: 1, label: "1 - Excellent" },
                  { val: 2, label: "2 - Very Good" },
                  { val: 3, label: "3 - Good" },
                  { val: 4, label: "4 - Fair" },
                  { val: 5, label: "5 - Poor" }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => updateField('GenHlth', opt.val)}
                    className={`p-2.5 rounded-lg border text-center text-label-md transition-all cursor-pointer ${
                      formData.GenHlth === opt.val
                        ? 'bg-secondary-container/20 border-secondary-container text-secondary-container font-semibold shadow'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/40 hover:bg-surface-variant'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Socioeconomic Determinants: Income & Education */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest/40 border ${
                validationErrors.includes('Income') ? 'border-error' : 'border-outline-variant/30'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-medium text-on-surface-variant">
                    Household Income Bracket
                  </label>
                  {renderFieldBadge('Income')}
                </div>
                <select
                  value={formData.Income ?? ''}
                  onChange={(e) => updateField('Income', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
                  <option value="">-- Please select income bracket --</option>
                  <option value={1}>Less than $10,000</option>
                  <option value={2}>$10,000 to &lt;$15,000</option>
                  <option value={3}>$15,000 to &lt;$20,000</option>
                  <option value={4}>$20,000 to &lt;$25,000</option>
                  <option value={5}>$25,000 to &lt;$35,000</option>
                  <option value={6}>$35,000 to &lt;$50,000</option>
                  <option value={7}>$50,000 to &lt;$75,000</option>
                  <option value={8}>$75,000 or greater</option>
                </select>
              </div>

              <div className={`flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-lowest/40 border ${
                validationErrors.includes('Education') ? 'border-error' : 'border-outline-variant/30'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-label-md font-medium text-on-surface-variant">
                    Education Completed
                  </label>
                  {renderFieldBadge('Education')}
                </div>
                <select
                  value={formData.Education ?? ''}
                  onChange={(e) => updateField('Education', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
                  <option value="">-- Please select education level --</option>
                  <option value={1}>Never attended / Kindergarten only</option>
                  <option value={2}>Elementary school (Grades 1-8)</option>
                  <option value={3}>Some high school (Grades 9-11)</option>
                  <option value={4}>High school graduate or GED</option>
                  <option value={5}>Some college or vocational school</option>
                  <option value={6}>College graduate (4+ years degree)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Vitals & Clinical History */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="text-headline-md font-headline-md text-on-surface">
                Phase 2: Vitals & Cardiometabolic Indicators
              </h2>
              <span className="text-label-sm text-outline">Clinical history verification</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HighBP */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('HighBP') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">High Blood Pressure</div>
                    <p className="text-body-sm text-outline">Diagnosed hypertension by health professional</p>
                  </div>
                  {renderFieldBadge('HighBP')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.HighBP === 1 ? 'Yes (Diagnosed)' : formData.HighBP === 0 ? 'No (Normal)' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('HighBP', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HighBP === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('HighBP', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HighBP === 1
                          ? 'bg-primary-container text-on-primary-container border border-primary'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* HighChol */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('HighChol') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">High Cholesterol</div>
                    <p className="text-body-sm text-outline">Told blood cholesterol is elevated</p>
                  </div>
                  {renderFieldBadge('HighChol')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.HighChol === 1 ? 'Yes (Elevated)' : formData.HighChol === 0 ? 'No (Normal)' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('HighChol', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HighChol === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('HighChol', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HighChol === 1
                          ? 'bg-primary-container text-on-primary-container border border-primary'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* CholCheck */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('CholCheck') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">Cholesterol Check in Past 5 Yrs</div>
                    <p className="text-body-sm text-outline">Routine lipid panel screening interval</p>
                  </div>
                  {renderFieldBadge('CholCheck')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.CholCheck === 1 ? 'Yes (Checked)' : formData.CholCheck === 0 ? 'No' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('CholCheck', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.CholCheck === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('CholCheck', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.CholCheck === 1
                          ? 'bg-primary-container text-on-primary-container border border-primary'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* Stroke */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('Stroke') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">History of Stroke</div>
                    <p className="text-body-sm text-outline">Diagnosed with stroke or CVA incident</p>
                  </div>
                  {renderFieldBadge('Stroke')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.Stroke === 1 ? 'Yes (History)' : formData.Stroke === 0 ? 'No (None)' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('Stroke', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.Stroke === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('Stroke', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.Stroke === 1
                          ? 'bg-error-container text-on-error-container border border-error'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* HeartDiseaseorAttack */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('HeartDiseaseorAttack') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">Coronary Heart Disease / MI</div>
                    <p className="text-body-sm text-outline">Heart attack or angina diagnosis</p>
                  </div>
                  {renderFieldBadge('HeartDiseaseorAttack')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.HeartDiseaseorAttack === 1 ? 'Yes (Reported)' : formData.HeartDiseaseorAttack === 0 ? 'No (None)' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('HeartDiseaseorAttack', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HeartDiseaseorAttack === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('HeartDiseaseorAttack', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.HeartDiseaseorAttack === 1
                          ? 'bg-error-container text-on-error-container border border-error'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>

              {/* DiffWalk */}
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('DiffWalk') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col justify-between gap-3`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-body-md font-semibold text-on-surface">Difficulty Walking / Stairs</div>
                    <p className="text-body-sm text-outline">Physical mobility limitations</p>
                  </div>
                  {renderFieldBadge('DiffWalk')}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-body-sm text-on-surface font-medium">
                    {formData.DiffWalk === 1 ? 'Yes (Difficulty)' : formData.DiffWalk === 0 ? 'No (Normal Gait)' : 'Unanswered'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateField('DiffWalk', 0)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.DiffWalk === 0
                          ? 'bg-surface-variant text-on-surface border border-outline'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('DiffWalk', 1)}
                      className={`px-3 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                        formData.DiffWalk === 1
                          ? 'bg-primary-container text-on-primary-container border border-primary'
                          : 'bg-surface-container text-outline hover:text-on-surface'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Lifestyle & Healthcare Access */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h2 className="text-headline-md font-headline-md text-on-surface">
                Phase 3: Lifestyle Habits & Health Equity Indicators
              </h2>
              <span className="text-label-sm text-outline">Daily habits and health system access</span>
            </div>

            {/* Habit toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'Smoker', label: 'Smoked >=100 Cigarettes', desc: 'Lifetime tobacco exposure' },
                { key: 'PhysActivity', label: 'Physical Activity (30d)', desc: 'Past month exercise' },
                { key: 'Fruits', label: 'Consumes Fruits Daily', desc: '>=1 fruit portion/day' },
                { key: 'Veggies', label: 'Consumes Vegetables Daily', desc: '>=1 vegetable portion/day' },
                { key: 'HvyAlcoholConsump', label: 'Heavy Alcohol Intake', desc: 'Men >=14 drinks/wk, Women >=7' },
                { key: 'AnyHealthcare', label: 'Health Coverage', desc: 'Any medical insurance plan' },
                { key: 'NoDocbcCost', label: 'Cost Barrier to Doctor', desc: 'Could not see doctor due to cost' }
              ].map(item => (
                <div
                  key={item.key}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                    validationErrors.includes(item.key)
                      ? 'border-error bg-error-container/10'
                      : formData[item.key] === 1
                      ? 'bg-surface-container-high border-secondary-container/60 shadow'
                      : formData[item.key] === 0
                      ? 'bg-surface-container-lowest/70 border-outline-variant/40'
                      : 'bg-surface-container-lowest/30 border-dashed border-outline-variant/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-body-sm font-semibold text-on-surface">{item.label}</span>
                    {renderFieldBadge(item.key)}
                  </div>
                  <span className="text-label-sm text-outline">{item.desc}</span>

                  <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
                    <span className="text-label-sm font-medium text-on-surface-variant">
                      {formData[item.key] === 1 ? 'Yes' : formData[item.key] === 0 ? 'No' : 'Select:'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField(item.key, 0)}
                        className={`px-2.5 py-1 rounded-lg text-label-sm font-semibold transition-all cursor-pointer ${
                          formData[item.key] === 0
                            ? 'bg-surface-variant text-on-surface border border-outline'
                            : 'bg-surface-container text-outline hover:text-on-surface'
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(item.key, 1)}
                        className={`px-2.5 py-1 rounded-lg text-label-sm font-semibold transition-all cursor-pointer ${
                          formData[item.key] === 1
                            ? 'bg-primary-container text-on-primary-container border border-primary'
                            : 'bg-surface-container text-outline hover:text-on-surface'
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sliders: Mental and Physical Health Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('PhysHlth') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col gap-2`}>
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-2">
                    <label className="text-body-sm font-semibold text-on-surface">
                      Poor Physical Health Days (past 30d)
                    </label>
                    {renderFieldBadge('PhysHlth')}
                  </div>
                  <span className="font-code-metric text-on-surface font-bold">
                    {formData.PhysHlth !== null && formData.PhysHlth !== undefined ? `${formData.PhysHlth} days` : '0 days'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={formData.PhysHlth ?? 0}
                  onChange={(e) => updateField('PhysHlth', e.target.value)}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-label-sm text-outline">
                  <span>0 days (None)</span>
                  <span>15 days</span>
                  <span>30 days (Daily illness)</span>
                </div>
              </div>

              <div className={`p-4 rounded-xl bg-surface-container-lowest/60 border ${
                validationErrors.includes('MentHlth') ? 'border-error' : 'border-outline-variant/30'
              } flex flex-col gap-2`}>
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-2">
                    <label className="text-body-sm font-semibold text-on-surface">
                      Poor Mental Health Days (past 30d)
                    </label>
                    {renderFieldBadge('MentHlth')}
                  </div>
                  <span className="font-code-metric text-on-surface font-bold">
                    {formData.MentHlth !== null && formData.MentHlth !== undefined ? `${formData.MentHlth} days` : '0 days'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={formData.MentHlth ?? 0}
                  onChange={(e) => updateField('MentHlth', e.target.value)}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-label-sm text-outline">
                  <span>0 days (None)</span>
                  <span>15 days</span>
                  <span>30 days (Daily distress)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-variant border border-outline-variant/40 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Previous Step</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={clearReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-label-md text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Defaults</span>
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center gap-2 bg-surface-container-high hover:bg-surface-variant text-secondary-container px-5 py-2.5 rounded-xl font-semibold border border-secondary-container/40 transition-all cursor-pointer"
            >
              <span>Next Phase</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2.5 bg-primary-container hover:bg-inverse-primary text-on-primary-container px-6 py-3 rounded-xl text-body-md font-semibold transition-all duration-200 active:scale-[0.98] electric-glow border-t border-white/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>Calculating Confirmed Risk...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Get Your Risk Estimate</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
