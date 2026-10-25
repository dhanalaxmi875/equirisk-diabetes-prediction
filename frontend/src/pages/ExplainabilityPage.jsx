import React, { useState, useEffect } from 'react';
import { getExplanation } from '../services/api';
import { HelpCircle, CheckCircle, AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';

export default function ExplainabilityPage({ currentFeatures, predictionId, setActiveTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!currentFeatures) {
        throw new Error('No features provided');
      }
      const res = await getExplanation(currentFeatures, predictionId);
      setData(res);
    } catch (err) {
      console.warn("Failed to fetch explanation:", err);
      setError('Unable to load explanation. Please ensure the backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplain();
  }, [currentFeatures, predictionId]);

  const maxMagnitude = data?.contributions ? Math.max(...data.contributions.map(c => c.magnitude), 0.1) : 0.8;

  // Categorize features as changeable or not changeable
  const changeableFeatures = ['BMI', 'PhysActivity', 'Smoker', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'MentHlth', 'PhysHlth'];
  
  const changeableContributions = data?.contributions ? data.contributions.filter(c => changeableFeatures.includes(c.feature)) : [];
  const nonChangeableContributions = data?.contributions ? data.contributions.filter(c => !changeableFeatures.includes(c.feature)) : [];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">psychology</span>
            <span>What Affects Your Risk</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Factors That Influence Your Risk
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            See which factors raise or lower your risk, grouped by what you can change.
          </p>
        </div>

        <button
          onClick={() => { setActiveTab('results'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-md transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Back to Results</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1"><p>{error}</p><button type="button" onClick={fetchExplain} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"><RotateCcw size={14} /> Retry</button></div>
        </div>
      )}

      {/* Things You Can Change */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 glass-rim flex flex-col gap-4">
        <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase font-semibold">
          <span>Things You Can Change</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          These factors can be improved through lifestyle changes.
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <div className="w-8 h-8 rounded-full border-2 border-secondary-container border-t-transparent animate-spin" />
            <span className="text-body-sm">Loading...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {changeableContributions.slice(0, 5).map((item) => {
              const isPositive = item.direction === 'increases_risk';
              const barWidthPct = Math.min(100, Math.max(8, (item.magnitude / maxMagnitude) * 100));

              return (
                <div
                  key={item.feature}
                  className="p-3.5 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/25 hover:border-outline-variant/60 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-md font-semibold text-on-surface">{item.feature_name}</span>
                    <span className={`text-sm font-semibold ${
                      isPositive ? 'text-error' : 'text-tertiary'
                    }`}>
                      {isPositive ? 'Raises your risk' : 'Lowers your risk'}
                    </span>
                  </div>

                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isPositive ? 'bg-error' : 'bg-tertiary'
                      }`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {changeableContributions.length === 0 && (
              <p className="text-body-sm text-on-surface-variant italic">No significant changeable factors found.</p>
            )}
          </div>
        )}
      </div>

      {/* Things You Cannot Change */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 glass-rim flex flex-col gap-4">
        <div className="flex items-center gap-2 text-outline font-label-sm uppercase font-semibold">
          <span>Things You Cannot Change</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          These factors are part of your background and cannot be modified.
        </p>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <div className="w-8 h-8 rounded-full border-2 border-secondary-container border-t-transparent animate-spin" />
            <span className="text-body-sm">Loading...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {nonChangeableContributions.slice(0, 5).map((item) => {
              const isPositive = item.direction === 'increases_risk';
              const barWidthPct = Math.min(100, Math.max(8, (item.magnitude / maxMagnitude) * 100));

              return (
                <div
                  key={item.feature}
                  className="p-3.5 rounded-xl bg-surface-container-lowest/70 border border-outline-variant/25 hover:border-outline-variant/60 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-md font-semibold text-on-surface">{item.feature_name}</span>
                    <span className={`text-sm font-semibold ${
                      isPositive ? 'text-error' : 'text-tertiary'
                    }`}>
                      {isPositive ? 'Raises your risk' : 'Lowers your risk'}
                    </span>
                  </div>

                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isPositive ? 'bg-error' : 'bg-tertiary'
                      }`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {nonChangeableContributions.length === 0 && (
              <p className="text-body-sm text-on-surface-variant italic">No significant non-changeable factors found.</p>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
