import React, { useState } from 'react';
import { batchPredict } from '../services/api';
import { Upload, Download, AlertTriangle, CheckCircle, FileText, ArrowLeft } from 'lucide-react';

export default function BatchAnalysisPage({ setActiveTab }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      setValidationErrors([]);
      setResults(null);
    } else {
      setError('Please upload a CSV file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setError(null);
      setValidationErrors([]);
      setResults(null);
    } else {
      setError('Please upload a CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    
    try {
      const response = await batchPredict(file);
      setResults(response);
      if (response.errors && response.errors.length > 0) {
        setValidationErrors(response.errors);
      }
    } catch (err) {
      setError(err.message || 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Feature names in the order expected by the backend
    const headers = ['HighBP', 'HighChol', 'CholCheck', 'BMI', 'Smoker', 'Stroke', 'HeartDiseaseorAttack', 'PhysActivity', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'AnyHealthcare', 'NoDocbcCost', 'GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Sex', 'Age', 'Education', 'Income'];
    const exampleRow = [0, 0, 1, 27.0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 2.0, 0, 0, 0, 0, 7.0, 5.0, 6.0];
    
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResults = () => {
    if (!results || !results.results) return;
    
    const headers = ['row_index', 'HighBP', 'HighChol', 'CholCheck', 'BMI', 'Smoker', 'Stroke', 'HeartDiseaseorAttack', 'PhysActivity', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'AnyHealthcare', 'NoDocbcCost', 'GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Sex', 'Age', 'Education', 'Income', 'risk_percentage', 'risk_tier', 'top_driver'];
    const featureNames = ['HighBP', 'HighChol', 'CholCheck', 'BMI', 'Smoker', 'Stroke', 'HeartDiseaseorAttack', 'PhysActivity', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'AnyHealthcare', 'NoDocbcCost', 'GenHlth', 'MentHlth', 'PhysHlth', 'DiffWalk', 'Sex', 'Age', 'Education', 'Income'];
    
    const rows = results.results.map(r => [
      r.row_index,
      ...featureNames.map(f => r.features[f]),
      r.risk_percentage,
      r.risk_tier,
      r.top_driver
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">analytics</span>
            <span>Batch Analysis</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Population-Level Risk Screening
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Upload a CSV file to analyze diabetes risk for multiple people. Maximum 5,000 rows.
          </p>
        </div>

        <button
          onClick={() => { setActiveTab('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-md transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back to Overview</span>
        </button>
      </div>

      {/* Upload Section */}
      {!results && (
        <div className="glass-panel rounded-2xl p-8 border border-outline-variant/30 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">Upload CSV File</h2>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-sm transition-all cursor-pointer"
            >
              <Download size={16} />
              <span>Download Template</span>
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              file ? 'border-secondary-container bg-secondary-container/10' : 'border-outline-variant/40 hover:border-secondary-container/60'
            }`}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={48} className="mx-auto mb-4 text-outline-variant" />
              <p className="text-body-md text-on-surface mb-2">
                {file ? file.name : 'Drag and drop your CSV file here, or click to browse'}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Maximum 5,000 rows. Your file is processed and not saved.
              </p>
            </label>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {file && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-primary-container hover:bg-inverse-primary text-on-primary-container px-6 py-3 rounded-xl font-semibold electric-glow transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FileText size={18} />
                  <span>Analyze File</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="flex flex-col gap-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel rounded-xl p-4 border border-outline-variant/30">
              <div className="text-label-sm text-outline uppercase">Total Rows</div>
              <div className="text-2xl font-bold text-on-surface">{results.total_rows}</div>
            </div>
            <div className="glass-panel rounded-xl p-4 border border-outline-variant/30">
              <div className="text-label-sm text-outline uppercase">Valid Rows</div>
              <div className="text-2xl font-bold text-secondary-container">{results.valid_rows}</div>
            </div>
            <div className="glass-panel rounded-xl p-4 border border-outline-variant/30">
              <div className="text-label-sm text-outline uppercase">Average Risk</div>
              <div className="text-2xl font-bold text-on-surface">{results.summary.average_risk}%</div>
            </div>
            <div className="glass-panel rounded-xl p-4 border border-outline-variant/30">
              <div className="text-label-sm text-outline uppercase">High Risk</div>
              <div className="text-2xl font-bold text-error">{results.summary.tier_percentages.High}%</div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="glass-panel rounded-xl p-4 border border-error/30 bg-error-container/10">
              <div className="flex items-center gap-2 text-error font-semibold mb-2">
                <AlertTriangle size={18} />
                <span>Validation Errors ({validationErrors.length})</span>
              </div>
              <div className="text-body-sm text-on-surface-variant max-h-40 overflow-y-auto">
                {validationErrors.slice(0, 20).map((err, idx) => (
                  <div key={idx} className="py-1">{err}</div>
                ))}
                {validationErrors.length > 20 && (
                  <div className="py-1 text-outline">... and {validationErrors.length - 20} more errors</div>
                )}
              </div>
            </div>
          )}

          {/* Tier Distribution */}
          <div className="glass-panel rounded-xl p-6 border border-outline-variant/30">
            <h3 className="text-headline-sm text-on-surface mb-4">Risk Tier Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-tertiary">{results.summary.tier_counts.Low}</div>
                <div className="text-label-sm text-outline">Low Risk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary-container">{results.summary.tier_counts.Moderate}</div>
                <div className="text-label-sm text-outline">Moderate Risk</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-error">{results.summary.tier_counts.High}</div>
                <div className="text-label-sm text-outline">High Risk</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={downloadResults}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-container hover:bg-inverse-primary text-on-primary-container font-semibold electric-glow transition-all cursor-pointer"
            >
              <Download size={18} />
              <span>Download Results CSV</span>
            </button>
            <button
              onClick={() => {
                setFile(null);
                setResults(null);
                setValidationErrors([]);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 font-semibold transition-all cursor-pointer"
            >
              <Upload size={18} />
              <span>Upload New File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
