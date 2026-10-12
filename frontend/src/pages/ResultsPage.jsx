import React, { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw, AlertTriangle, CheckCircle, HelpCircle, Activity, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { getExplanation } from '../services/api';
import precautions from '../config/precautions.json';

export default function ResultsPage({ prediction, formData, explanation, setExplanation, setActiveTab }) {
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  useEffect(() => {
    if (prediction && formData && !explanation) {
      loadExplanation();
    }
  }, [prediction, formData, explanation]);

  const loadExplanation = async () => {
    setLoadingExplanation(true);
    setExplanationError(null);
    try {
      console.log('Fetching explanation from /explain with features:', formData);
      const expl = await getExplanation(formData);
      console.log('Explanation response:', expl);
      setExplanation(expl);
    } catch (err) {
      console.error('Failed to load explanation:', err);
      setExplanationError(err.message || 'Failed to load factor breakdown');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const handleRetryExplanation = () => {
    loadExplanation();
  };
  if (!prediction) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 py-16">
        <AlertTriangle className="text-error w-12 h-12" />
        <h2 className="text-headline-lg text-on-surface">Service Unavailable</h2>
        <p className="text-body-md text-on-surface-variant">
          Unable to load results. Please ensure the backend service is running.
        </p>
        <button
          onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const data = prediction;
  const tier = data.risk_tier.toLowerCase();
  const summaryData = precautions.summary[tier] || precautions.summary.low;

  const getTopRiskFactors = () => {
    if (!explanation) return [];
    // Backend returns 'top_positive_factors' or 'contributions'
    const factors = explanation.top_positive_factors || explanation.contributions || [];
    return factors.filter(f => f.shap_value > 0 || f.direction === 'increases_risk').slice(0, 3);
  };

  const getProtectiveFactors = () => {
    if (!explanation) return [];
    // Backend returns 'top_negative_factors' or 'contributions'
    const factors = explanation.top_negative_factors || explanation.contributions || [];
    return factors.filter(f => f.shap_value < 0 || f.direction === 'decreases_risk').slice(0, 3);
  };

  const formatFactorLabel = (factor) => {
    // Use the backend's display_value if available, otherwise format from formData
    if (factor.display_value) {
      const feature = factor.feature_name || factor.feature;
      const val = factor.display_value;
      
      if (factor.feature === 'BMI') {
        const bmi = factor.feature_value;
        if (bmi >= 35) return `BMI of ${bmi.toFixed(1)} (well above the healthy range)`;
        if (bmi >= 30) return `BMI of ${bmi.toFixed(1)} (above the healthy range)`;
        if (bmi >= 25) return `BMI of ${bmi.toFixed(1)} (slightly above the healthy range)`;
        return `BMI of ${bmi.toFixed(1)} (healthy range)`;
      }
      
      if (factor.feature === 'PhysActivity') {
        return factor.feature_value === 1 ? 'Regularly physically active' : 'Not physically active';
      }
      
      if (factor.feature === 'Smoker') {
        return factor.feature_value === 1 ? 'Smoker' : 'Non-smoker';
      }
      
      if (factor.feature === 'HighBP') {
        return factor.feature_value === 1 ? 'High blood pressure' : 'Normal blood pressure';
      }
      
      if (factor.feature === 'HighChol') {
        return factor.feature_value === 1 ? 'High cholesterol' : 'Normal cholesterol';
      }
      
      if (factor.feature === 'Fruits') {
        return factor.feature_value === 1 ? 'Eats fruit daily' : 'Does not eat fruit daily';
      }
      
      if (factor.feature === 'Veggies') {
        return factor.feature_value === 1 ? 'Eats vegetables daily' : 'Does not eat vegetables daily';
      }
      
      return `${feature}: ${val}`;
    }
    
    // Fallback to formData
    const value = formData[factor.feature];
    if (factor.feature === 'BMI') return `BMI of ${value}`;
    if (factor.feature === 'Age') return `Age group ${value}`;
    if (factor.feature === 'GenHlth') return `General health rating ${value}`;
    if (factor.feature === 'HighBP') return value === 1 ? 'High blood pressure' : 'Normal blood pressure';
    if (factor.feature === 'HighChol') return value === 1 ? 'High cholesterol' : 'Normal cholesterol';
    if (factor.feature === 'Smoker') return value === 1 ? 'Smoker' : 'Non-smoker';
    if (factor.feature === 'PhysActivity') return value === 1 ? 'Physically active' : 'Not physically active';
    if (factor.feature === 'Fruits') return value === 1 ? 'Eats fruit daily' : 'Does not eat fruit daily';
    if (factor.feature === 'Veggies') return value === 1 ? 'Eats vegetables daily' : 'Does not eat vegetables daily';
    return factor.feature;
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">analytics</span>
            <span>Your Risk Assessment</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Diabetes Risk Estimate
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Based on your health questionnaire responses.
          </p>
        </div>

        <button
          onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-md transition-all cursor-pointer"
        >
          <RotateCcw size={15} />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Main Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Probability Gauge & Tier */}
        <div className="md:col-span-5 glass-panel rounded-2xl p-6 border border-outline-variant/30 glass-rim flex flex-col items-center justify-between text-center gap-6">
          <div className="w-full flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <span className="text-label-sm font-label-sm uppercase text-outline">Risk level</span>
            <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${
              tier === 'high'
                ? 'bg-error/15 text-error border-error/30'
                : tier === 'moderate'
                  ? 'bg-secondary-container/15 text-secondary-container border-secondary-container/30'
                  : 'bg-tertiary-container/25 text-tertiary border-tertiary/30'
            }`}>
              {data.risk_tier} Risk
            </span>
          </div>

          {/* Circular Percentage Graphic */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-surface-container"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={tier === 'high' ? '#ffb4ab' : tier === 'moderate' ? '#00d2ff' : '#4edea3'}
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * data.risk_percentage) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-bold font-stat-metric tracking-tight text-on-surface">
                {data.risk_percentage}%
              </span>
              <span className="text-xs uppercase tracking-wider text-outline font-code-metric">
                estimated risk
              </span>
            </div>
          </div>

          {/* Risk Range */}
          <div className="w-full pt-3 border-t border-outline-variant/20 text-center text-body-sm text-on-surface-variant">
            Likely between {(data.conformal_interval?.lower_bound * 100 || (data.calibrated_probability - 0.05) * 100).toFixed(0)}% and {(data.conformal_interval?.upper_bound * 100 || (data.calibrated_probability + 0.05) * 100).toFixed(0)}%
          </div>
        </div>

        {/* Summary Card */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase font-semibold">
              <Activity size={16} />
              <span>Summary</span>
            </div>
            
            {/* What this means */}
            <div>
              <h4 className="text-body-sm font-semibold text-on-surface mb-1">What this means</h4>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {summaryData.what_this_means}
              </p>
            </div>

            {/* Your main risk factors */}
            <div>
              <h4 className="text-body-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                <TrendingUp size={14} className="text-error" />
                Your main risk factors
              </h4>
              {loadingExplanation ? (
                <p className="text-body-sm text-outline">Loading...</p>
              ) : explanationError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-body-sm text-error">We couldn't load the factor breakdown. Please retry.</p>
                  <button
                    onClick={handleRetryExplanation}
                    className="inline-flex items-center gap-1 text-sm text-secondary-container hover:underline cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    Retry
                  </button>
                </div>
              ) : getTopRiskFactors().length > 0 ? (
                <ul className="text-body-md text-on-surface-variant space-y-1">
                  {getTopRiskFactors().map((f, i) => (
                    <li key={i}>• {formatFactorLabel(f)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-md text-on-surface-variant">No major risk factors stood out.</p>
              )}
            </div>

            {/* Your protective factors */}
            <div>
              <h4 className="text-body-sm font-semibold text-on-surface mb-2 flex items-center gap-2">
                <TrendingDown size={14} className="text-tertiary" />
                Your protective factors
              </h4>
              {loadingExplanation ? (
                <p className="text-body-sm text-outline">Loading...</p>
              ) : explanationError ? (
                <p className="text-body-sm text-outline">Factor details unavailable</p>
              ) : getProtectiveFactors().length > 0 ? (
                <ul className="text-body-md text-on-surface-variant space-y-1">
                  {getProtectiveFactors().map((f, i) => (
                    <li key={i}>• {formatFactorLabel(f)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-md text-on-surface-variant">No protective factors identified.</p>
              )}
            </div>

            {/* Next step */}
            <div className="pt-2 border-t border-outline-variant/20">
              <h4 className="text-body-sm font-semibold text-on-surface mb-1">Next step</h4>
              <p className="text-body-md text-secondary-container font-medium">
                {summaryData.next_step}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Next Steps & Navigation Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-secondary-container/40 cyan-glow flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-headline-sm font-headline-sm text-on-surface">
            View Your Full Report
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            See detailed factors affecting your risk and personalized health recommendations.
          </p>
        </div>

        <button
          onClick={() => { setActiveTab('report'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-inverse-primary text-on-primary-container px-6 py-3 rounded-xl font-semibold electric-glow transition-all whitespace-nowrap cursor-pointer"
        >
          <FileText size={18} />
          <span>View Full Report</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
