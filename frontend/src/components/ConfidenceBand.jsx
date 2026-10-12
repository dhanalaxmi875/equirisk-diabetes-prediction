import React from 'react';
import { Info } from 'lucide-react';

export default function ConfidenceBand({
  calibratedProbability = 0.5,
  lowerBound = 0.45,
  upperBound = 0.55,
  confidenceLevel = 0.90,
  predictionSet = ["Diabetes"],
  isIndeterminate = false
}) {
  const probPct = Math.round(calibratedProbability * 1000) / 10;
  const lowerPct = Math.max(0, Math.round(lowerBound * 1000) / 10);
  const upperPct = Math.min(100, Math.round(upperBound * 1000) / 10);
  const widthPct = Math.max(2, upperPct - lowerPct);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-label-sm font-label-sm text-primary uppercase tracking-wider font-semibold">
            MAPIE Conformal Uncertainty Band
          </span>
          <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-primary-container/20 text-primary border border-primary/30">
            {Math.round(confidenceLevel * 100)}% Coverage Guarantee
          </span>
        </div>
        
        {/* Prediction set pill */}
        <div className="flex items-center gap-1.5 text-code-metric font-code-metric">
          <span className="text-outline text-label-sm">Conformal Set:</span>
          <span className={`px-2 py-0.5 rounded text-label-sm font-semibold border ${
            isIndeterminate 
              ? 'bg-secondary-container/20 text-secondary-container border-secondary-container/40'
              : predictionSet.includes("Diabetes")
                ? 'bg-error-container/30 text-error border-error/30'
                : 'bg-tertiary-container/30 text-tertiary border-tertiary/30'
          }`}>
            {'{ ' + predictionSet.join(', ') + ' }'}
          </span>
        </div>
      </div>

      {/* Numerical readout */}
      <div className="flex items-baseline justify-between text-code-metric font-code-metric">
        <span className="text-on-surface-variant font-medium">Predicted Risk Point</span>
        <div className="flex items-baseline gap-2">
          <span className="text-stat-metric font-stat-metric text-on-surface font-bold">
            {probPct}%
          </span>
          <span className="text-label-md font-label-md text-outline">
            [CI: {lowerPct}% — {upperPct}%]
          </span>
        </div>
      </div>

      {/* Visual Interval Slider Graphic */}
      <div className="relative w-full bg-surface-container h-4 rounded-full overflow-hidden flex items-center border border-outline-variant/30">
        {/* Shaded Conformal Interval Band */}
        <div
          className="absolute h-full bg-primary-container/35 border-x border-primary transition-all duration-500"
          style={{
            left: `${lowerPct}%`,
            width: `${widthPct}%`
          }}
        />
        {/* Center marker line for point estimate */}
        <div
          className="absolute w-1.5 h-full bg-primary shadow-lg z-10 transition-all duration-500"
          style={{ left: `calc(${probPct}% - 3px)` }}
        />
      </div>

      {/* Axis markers */}
      <div className="flex justify-between text-label-sm font-label-sm text-outline pt-0.5">
        <span>0% (Low)</span>
        <span className="text-primary font-semibold">
          Credible Conformal Range ({Math.round(confidenceLevel * 100)}%)
        </span>
        <span>100% (High)</span>
      </div>

      {isIndeterminate && (
        <div className="mt-1 p-2 rounded-lg bg-surface-container-high/60 border border-secondary-container/30 flex items-start gap-2 text-body-sm text-secondary-container">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Conformal Set Indeterminate:</strong> The model includes both labels in the 90% confidence set. In epidemiological terms, this indicates high borderline ambiguity near the classification threshold.
          </span>
        </div>
      )}
    </div>
  );
}
