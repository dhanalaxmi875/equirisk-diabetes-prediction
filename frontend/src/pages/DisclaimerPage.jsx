import React from 'react';

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <h1 className="text-headline-lg text-on-surface">Disclaimer</h1>
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30">
        <p className="text-body-md text-on-surface-variant">
          This tool provides estimates based on survey data and is not a medical diagnosis. Always consult a healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
