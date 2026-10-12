import React, { useState } from 'react';
import { predictRisk, getSamplePersona } from '../services/api';
import { Sparkles, ArrowRight, ArrowLeft, RotateCcw, AlertCircle } from 'lucide-react';

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

export default function AssessmentPage({ onPredictionComplete, setActiveTab }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const showDemoPresets = new URLSearchParams(window.location.search).get('demo') === '1';

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: Number(value) }));
  };

  const loadPreset = (presetName) => {
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
    setLoading(true);
    setError(null);
    try {
      const result = await predictRisk(formData);
      onPredictionComplete(result, formData);
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
    if (bmi < 18.5) return { label: "Underweight", color: "text-secondary" };
    if (bmi < 25) return { label: "Normal weight", color: "text-tertiary" };
    if (bmi < 30) return { label: "Overweight", color: "text-secondary-container" };
    return { label: "Obese (Class I+)", color: "text-error" };
  };

  const bmiMeta = getBmiCategory(formData.BMI);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">clinical_notes</span>
            <span>Survey Feature Input Wizard</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            BRFSS Population Risk Assessment
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Complete the health questionnaire to estimate your current diabetes risk.
          </p>
        </div>

        {/* Quick Presets - only show in demo mode */}
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

      {error && (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card Container */}
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="glass-panel rounded-2xl p-6 sm:p-8 border border-outline-variant/30 glass-rim flex flex-col gap-8">
        {/* STEP 1: Demographics & General Health */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-headline-md font-headline-md text-on-surface border-b border-outline-variant/20 pb-3">
              Phase 1: Biometrics & Demographic Profile
            </h2>

            {/* BMI Slider */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30">
              <div className="flex justify-between items-baseline">
                <label className="text-body-md font-semibold text-on-surface">
                  Body Mass Index (BMI)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-stat-metric font-code-metric text-on-surface font-bold">
                    {formData.BMI.toFixed(1)}
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
                value={formData.BMI}
                onChange={(e) => updateField('BMI', e.target.value)}
                className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-label-sm text-outline">
                <span>14.0 (Severely Underweight)</span>
                <span>25.0 (Overweight threshold)</span>
                <span>30.0 (Obese threshold)</span>
                <span>65.0</span>
              </div>
            </div>

            {/* Age Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-medium text-on-surface-variant">
                  Age Category
                </label>
                <select
                  value={formData.Age}
                  onChange={(e) => updateField('Age', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
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
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-medium text-on-surface-variant">
                  Biological Sex
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('Sex', 0)}
                    className={`py-2.5 px-4 rounded-lg border text-body-md font-medium transition-all cursor-pointer ${
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
                    className={`py-2.5 px-4 rounded-lg border text-body-md font-medium transition-all cursor-pointer ${
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
            <div className="flex flex-col gap-2">
              <label className="text-label-md font-medium text-on-surface-variant">
                General Health Self-Assessment
              </label>
              <div className="grid grid-cols-5 gap-2">
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
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-medium text-on-surface-variant">
                  Household Income Bracket
                </label>
                <select
                  value={formData.Income}
                  onChange={(e) => updateField('Income', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
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

              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-medium text-on-surface-variant">
                  Education Completed
                </label>
                <select
                  value={formData.Education}
                  onChange={(e) => updateField('Education', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-container text-on-surface border border-outline-variant/40 focus:border-secondary-container focus:outline-none text-body-md"
                >
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
            <h2 className="text-headline-md font-headline-md text-on-surface border-b border-outline-variant/20 pb-3">
              Phase 2: Vitals & Cardiometabolic Indicators
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HighBP */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">High Blood Pressure</div>
                  <p className="text-body-sm text-outline">Diagnosed with hypertension by health professional</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('HighBP', formData.HighBP ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.HighBP ? 'bg-primary-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* HighChol */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">High Cholesterol</div>
                  <p className="text-body-sm text-outline">Ever told blood cholesterol is elevated</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('HighChol', formData.HighChol ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.HighChol ? 'bg-primary-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* CholCheck */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">Cholesterol Check in Past 5 Yrs</div>
                  <p className="text-body-sm text-outline">Routine lipid panel screening interval</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('CholCheck', formData.CholCheck ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.CholCheck ? 'bg-primary-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* Stroke */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">History of Stroke</div>
                  <p className="text-body-sm text-outline">Ever diagnosed with cerebrovascular incident</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('Stroke', formData.Stroke ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.Stroke ? 'bg-error-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* HeartDiseaseorAttack */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">Coronary Heart Disease / MI</div>
                  <p className="text-body-sm text-outline">Reported heart attack or angina diagnosis</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('HeartDiseaseorAttack', formData.HeartDiseaseorAttack ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.HeartDiseaseorAttack ? 'bg-error-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              {/* DiffWalk */}
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <div className="text-body-md font-semibold text-on-surface">Difficulty Walking / Stairs</div>
                  <p className="text-body-sm text-outline">Serious physical mobility limitation</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('DiffWalk', formData.DiffWalk ? 0 : 1)}
                  className={`w-14 h-8 rounded-full p-1 transition-all cursor-pointer ${
                    formData.DiffWalk ? 'bg-primary-container justify-end' : 'bg-surface-variant justify-start'
                  } flex items-center`}
                >
                  <div className="w-6 h-6 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Lifestyle & Healthcare Access */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <h2 className="text-headline-md font-headline-md text-on-surface border-b border-outline-variant/20 pb-3">
              Phase 3: Lifestyle Habits & Health Equity Indicators
            </h2>

            {/* Habit toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'Smoker', label: 'Smoked >=100 Cigarettes', desc: 'Lifetime tobacco exposure' },
                { key: 'PhysActivity', label: 'Physical Activity (30d)', desc: 'Past month active exercise' },
                { key: 'Fruits', label: 'Consumes Fruits Daily', desc: '>=1 fruit portion per day' },
                { key: 'Veggies', label: 'Consumes Vegetables Daily', desc: '>=1 veggie portion per day' },
                { key: 'HvyAlcoholConsump', label: 'Heavy Alcohol Intake', desc: 'Men >=14 drinks/wk, Women >=7' },
                { key: 'AnyHealthcare', label: 'Health Coverage', desc: 'Any medical insurance plan' },
                { key: 'NoDocbcCost', label: 'Cost Barrier to Doctor', desc: 'Could not see doctor due to cost' }
              ].map(item => (
                <div
                  key={item.key}
                  onClick={() => updateField(item.key, formData[item.key] ? 0 : 1)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                    formData[item.key]
                      ? 'bg-surface-container-high border-secondary-container/60 shadow'
                      : 'bg-surface-container-lowest/60 border-outline-variant/30 hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm font-semibold text-on-surface">{item.label}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${formData[item.key] ? 'bg-secondary-container' : 'bg-outline-variant'}`} />
                  </div>
                  <span className="text-label-sm text-outline">{item.desc}</span>
                </div>
              ))}
            </div>

            {/* Sliders: Mental and Physical Health Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-body-sm font-semibold text-on-surface">
                    Poor Physical Health Days (past 30d)
                  </label>
                  <span className="font-code-metric text-on-surface font-bold">
                    {formData.PhysHlth} days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={formData.PhysHlth}
                  onChange={(e) => updateField('PhysHlth', e.target.value)}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl bg-surface-container-lowest/60 border border-outline-variant/30 flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-body-sm font-semibold text-on-surface">
                    Poor Mental Health Days (past 30d)
                  </label>
                  <span className="font-code-metric text-on-surface font-bold">
                    {formData.MentHlth} days
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={formData.MentHlth}
                  onChange={(e) => updateField('MentHlth', e.target.value)}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer"
                />
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
              onClick={() => setFormData(INITIAL_STATE)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-label-md text-outline hover:text-on-surface transition-colors cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset Default</span>
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setStep(step + 1); }}
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
                  <span>Analyzing your answers...</span>
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
