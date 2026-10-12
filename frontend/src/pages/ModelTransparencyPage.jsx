import React, { useState, useEffect } from 'react';
import { getFairnessAudit } from '../services/api';
import { Scale, AlertTriangle, CheckCircle, Info, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';

export default function ModelTransparencyPage({ setActiveTab }) {
  const [fairness, setFairness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('age');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getFairnessAudit();
        setFairness(res);
      } catch (err) {
        console.warn("Failed to load fairness audit:", err);
        setError('Unable to load model transparency data. Please ensure the backend service is running.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const data = fairness;

  const currentTable = activeCategory === 'age' ? data?.by_age :
    activeCategory === 'income' ? data?.by_income :
    activeCategory === 'bmi' ? data?.by_bmi : data?.by_sex;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-tertiary font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">balance</span>
            <span>Model Transparency</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Model Transparency & Fairness Audit
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            For researchers: Detailed model metrics, ROC-AUC, recall, and fairness auditing across demographic subgroups.
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

      {error && (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <div className="w-8 h-8 rounded-full border-2 border-secondary-container border-t-transparent animate-spin" />
          <span className="text-body-sm">Loading model transparency data...</span>
        </div>
      ) : data ? (
        <>
          {/* Global Test Performance Baseline */}
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/40">
            <div>
              <div className="text-label-sm uppercase text-outline">Test Cohort N</div>
              <div className="text-headline-sm font-bold font-stat-metric text-on-surface">
                {data.overall.n.toLocaleString()}
              </div>
            </div>
            <div className="h-8 w-px bg-outline-variant/40" />
            <div>
              <div className="text-label-sm uppercase text-outline">Overall Recall</div>
              <div className="text-headline-sm font-bold font-stat-metric text-tertiary">
                {(data.overall.recall * 100).toFixed(1)}%
              </div>
            </div>
            <div className="h-8 w-px bg-outline-variant/40" />
            <div>
              <div className="text-label-sm uppercase text-outline">Overall ROC-AUC</div>
              <div className="text-headline-sm font-bold font-stat-metric text-secondary-container">
                {(data.overall.roc_auc * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Disparity Alert Banner */}
          <div className="p-4 rounded-xl glass-panel border border-secondary-container/40 flex items-start gap-3 bg-secondary-container/5">
            <Info size={20} className="text-secondary-container shrink-0 mt-0.5" />
            <div className="text-body-sm text-on-surface-variant">
              <strong className="text-on-surface">Algorithmic Equity Transparency:</strong> A subgroup is flagged as{' '}
              <span className="px-1.5 py-0.2 rounded text-xs bg-error-container/30 text-error font-semibold">UNDERPERFORMING</span>{' '}
              if its test recall falls &gt;5 percentage points below the overall test recall ({(data.overall.recall * 100).toFixed(1)}%). In this model, younger respondents (18-34) have lower sensitivity primarily due to very low baseline prevalence in the survey.
            </div>
          </div>

          {/* Stratum Category Switcher */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'age', label: 'Age Group Audit' },
              { id: 'income', label: 'Household Income Audit' },
              { id: 'sex', label: 'Biological Sex Audit' },
              { id: 'bmi', label: 'BMI Category Audit' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-body-md font-medium transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-surface-container-high text-tertiary border border-tertiary/40 shadow'
                    : 'glass-panel text-on-surface-variant hover:text-on-surface border-outline-variant/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subgroup Audit Table Card */}
          <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 glass-rim flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <span className="text-label-sm font-label-sm uppercase font-semibold text-on-surface">
                Subgroup Audit Metrics Table
              </span>
              <span className="text-code-metric text-xs text-outline">
                Baseline Recall: {(data.overall.recall * 100).toFixed(1)}% | Threshold: 5 pt gap
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm font-label-sm uppercase text-outline">
                    <th className="py-2.5 px-3">Subgroup</th>
                    <th className="py-2.5 px-3 text-right">Sample (N)</th>
                    <th className="py-2.5 px-3 text-right">Accuracy</th>
                    <th className="py-2.5 px-3 text-right">Recall (Sensitivity)</th>
                    <th className="py-2.5 px-3 text-right">Precision</th>
                    <th className="py-2.5 px-3 text-right">FPR</th>
                    <th className="py-2.5 px-3 text-right">FNR</th>
                    <th className="py-2.5 px-3 text-right">ROC-AUC</th>
                    <th className="py-2.5 px-3 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-sm font-body-sm">
                  {currentTable?.map(row => {
                    const isUnder = row.flag === 'UNDERPERFORMING';
                    return (
                      <tr key={row.group} className="hover:bg-surface-container/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-on-surface">{row.group}</td>
                        <td className="py-3 px-3 text-right font-code-metric text-outline">{row.n.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right font-code-metric text-on-surface">{(row.accuracy * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-code-metric font-semibold text-on-surface">
                          <span className={isUnder ? 'text-error' : 'text-tertiary'}>
                            {(row.recall * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-code-metric text-on-surface">{(row.precision * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-code-metric text-outline">{(row.fpr * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-code-metric text-outline">{(row.fnr * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 text-right font-code-metric text-secondary-container">{(row.roc_auc * 100).toFixed(1)}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                            isUnder
                              ? 'bg-error-container/30 text-error border-error/30'
                              : 'bg-tertiary-container/30 text-tertiary border-tertiary/30'
                          }`}>
                            {row.flag}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Transparency & Limitations Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase font-semibold">
                <ShieldCheck size={18} />
                <span>Ethical Considerations in Survey Screening</span>
              </div>
              <h3 className="text-headline-sm text-on-surface font-semibold">
                Why Disparities Exist & How to Mitigate Them
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                The CDC BRFSS is an annual telephone survey relying on self-reported health indicators. Younger demographics (18-34) present with lower rates of formal diabetes diagnosis, causing tree models to lean towards specificity over sensitivity in this subgroup.
              </p>
              <ul className="text-body-sm text-outline flex flex-col gap-1.5 list-disc pl-4">
                <li>Lower decision threshold (0.37 vs 0.50) raises younger cohort recall from 34% to 58%.</li>
                <li>Conformal prediction bands widen appropriately to signal elevated uncertainty.</li>
              </ul>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-tertiary font-label-sm uppercase font-semibold">
                <CheckCircle size={18} />
                <span>Model Card Specifications</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-body-sm font-code-metric pt-1">
                <div className="p-2.5 rounded bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-xs block">Architecture</span>
                  <span className="text-on-surface font-semibold">LightGBM (Optuna Tuned)</span>
                </div>
                <div className="p-2.5 rounded bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-xs block">Calibration</span>
                  <span className="text-on-surface font-semibold">Isotonic (cv=5)</span>
                </div>
                <div className="p-2.5 rounded bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-xs block">Uncertainty</span>
                  <span className="text-on-surface font-semibold">MAPIE Split-Conformal</span>
                </div>
                <div className="p-2.5 rounded bg-surface-container border border-outline-variant/30">
                  <span className="text-outline text-xs block">Explainability</span>
                  <span className="text-on-surface font-semibold">TreeSHAP (21 Features)</span>
                </div>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Intended strictly as an epidemiological population screening research tool, not a regulated clinical in-vitro diagnostic software.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
