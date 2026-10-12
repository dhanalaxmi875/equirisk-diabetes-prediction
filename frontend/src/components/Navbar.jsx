import React, { useState } from 'react';
import { Shield, ArrowRight, Menu, X, Activity } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Overview' },
    { id: 'assessment', label: 'Assess Risk' },
    { id: 'batch', label: 'Batch Analysis' },
    { id: 'insights', label: 'Insights' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="bg-surface-container-lowest/90 backdrop-blur-md docked full-width top-0 sticky z-50 border-b border-outline-variant/30 shadow-sm dark:shadow-none">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo Anchor */}
        <button 
          onClick={() => handleNavClick('landing')}
          className="text-headline-sm font-headline-sm font-bold text-on-surface tracking-tight flex items-center gap-2 group text-left"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container border border-secondary-container/40 group-hover:border-secondary-container transition-all">
            <span className="material-symbols-outlined text-secondary-container text-xl fill-1">shield_with_heart</span>
            <span className="absolute inset-0 rounded-lg bg-secondary-container/20 blur-sm -z-10 group-hover:bg-secondary-container/40 transition-all"></span>
          </div>
          <span className="text-on-surface tracking-tight font-headline-sm">EquiRisk</span>
          <span className="text-label-sm font-label-sm uppercase px-1.5 py-0.5 rounded bg-surface-container-high text-secondary-fixed-dim border border-outline-variant/50 ml-1">
            BRFSS v2.4
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-body-md transition-all pb-1 cursor-pointer ${
                  isActive
                    ? 'text-secondary-container font-semibold border-b-2 border-secondary-container'
                    : 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Trailing Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavClick('assessment')}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-inverse-primary text-on-primary-container px-4 py-2 rounded-xl text-label-md font-label-md font-semibold transition-all duration-200 active:scale-[0.98] electric-glow border-t border-white/20"
          >
            <span>Assess Risk</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-outline-variant/30 bg-surface-container-lowest/95 backdrop-blur-xl flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-body-md transition-all ${
                  isActive
                    ? 'bg-surface-container text-secondary-container font-semibold border border-secondary-container/30'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
