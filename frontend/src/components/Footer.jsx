import React from 'react';

export default function Footer({ setActiveTab }) {
  return (
    <footer className="bg-surface-container-lowest docked full-width bottom border-t border-outline-variant/30 mt-16 z-10">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo & Legal Disclaimer */}
        <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
          <div className="text-headline-sm font-headline-sm font-bold text-on-surface flex items-center justify-center md:justify-start gap-2">
            <span className="material-symbols-outlined text-secondary-container fill-1">shield_with_heart</span>
            <span>EquiRisk</span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant/80">
            General health information, not medical advice.
          </p>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-label-sm font-label-sm">
          <button 
            onClick={() => { setActiveTab('model-transparency'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-on-surface-variant/80 hover:text-primary transition-colors cursor-pointer"
          >
            Model Transparency
          </button>
          <button 
            onClick={() => { setActiveTab('insights'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-on-surface-variant/80 hover:text-primary transition-colors cursor-pointer"
          >
            Population Insights
          </button>
          <button 
            onClick={() => { setActiveTab('disclaimer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="text-on-surface-variant/80 hover:text-primary transition-colors cursor-pointer"
          >
            Disclaimer
          </button>
        </div>
      </div>
    </footer>
  );
}
