import React, { useState } from 'react';
import ThreeHero from '../components/ThreeHero';

export default function LandingPage({ setActiveTab }) {
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('clinical');

  return (
    <div className="flex flex-col gap-16">
      {/* Atmospheric Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-pattern"></div>
      <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-primary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-1/3 -right-40 w-[550px] h-[550px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[580px]" id="overview">
        {/* Left Column: Typography & CTAs */}
        <div className="lg:col-span-6 flex flex-col items-start gap-6 z-10">
          {/* Live Engine Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40 glass-rim">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
            <span className="text-label-sm font-label-sm text-tertiary uppercase tracking-wider font-semibold">
              Population Risk Engine Active
            </span>
            <span className="text-outline-variant">|</span>
            <span className="text-label-sm font-label-sm text-on-surface-variant">
              CDC BRFSS Survey (70.7K Cohort)
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-display-xl font-display-xl text-on-surface tracking-tight">
            Predicting Diabetes Risk{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-container via-primary-fixed to-primary">
              Before It Happens
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-xl leading-relaxed">
            A simple, private health screening tool that estimates your diabetes risk based on answers to everyday health questions. Understand what affects your risk, not just a score.
          </p>

          {/* CTA Action Cluster */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2.5 bg-primary-container hover:bg-inverse-primary text-on-primary-container text-body-md font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] electric-glow border-t border-white/25 cursor-pointer"
            >
              <span>Assess Your Risk</span>
              <span className="material-symbols-outlined text-lg">east</span>
            </button>
            <button
              onClick={() => { setActiveTab('insights'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 bg-surface-container/60 hover:bg-surface-container text-on-surface border border-outline-variant/40 px-5 py-3.5 rounded-xl text-body-md font-medium transition-all duration-150 glass-rim cursor-pointer"
            >
              <span className="material-symbols-outlined text-secondary-container text-lg">query_stats</span>
              <span>Explore Population Insights</span>
            </button>
          </div>

          {/* Trust Validation Indicator */}
          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20 w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-tertiary-container/20 border border-tertiary/30 text-tertiary">
              <span className="material-symbols-outlined text-base fill-1">verified_user</span>
            </div>
            <div className="flex flex-col">
              <span className="text-label-md font-label-md font-semibold text-on-surface">
                Based on CDC BRFSS health survey data
              </span>
              <span className="text-body-sm font-body-sm text-outline">
                Validated on 70,692 survey responses
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Visualization Canvas & Live Risk Matrix HUD */}
        <div className="lg:col-span-6 relative z-10">
          <div className="relative w-full rounded-2xl glass-panel p-2 glass-rim overflow-hidden border border-outline-variant/40 cyan-glow">
            {/* Top HUD Micro-Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/30 bg-surface-container-lowest/60 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                <span className="text-label-sm font-label-sm text-on-surface font-semibold tracking-wider uppercase">
                  Health Risk Visualization
                </span>
              </div>
            </div>

            {/* Embed 3D Scene */}
            <ThreeHero />

            {/* Floating Overlay Card */}
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl glass-panel border border-secondary-container/30 flex items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-surface-container-high border border-outline-variant text-secondary-container">
                  <span className="material-symbols-outlined text-xl">radar</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-label-sm font-label-sm font-semibold uppercase text-secondary-container">
                      Sample Risk Profile
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-label-sm font-label-sm bg-error-container/30 text-error border border-error/30">
                      Higher Risk
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">
                    Risk factors identified: BMI, general health, and blood pressure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USER-FRIENDLY FACTS BAR */}
      <section className="glass-panel rounded-2xl p-6 glass-rim z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/30">
          {/* Fact 1 */}
          <div className="flex flex-col gap-1.5 px-3 sm:first:pl-0">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Quick Assessment</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary-container/30 text-tertiary border border-tertiary/30">
                Simple
              </span>
            </div>
            <div className="text-stat-metric font-stat-metric text-on-surface font-bold tracking-tight flex items-baseline gap-1">
              21
              <span className="text-label-md font-label-md font-normal text-tertiary">Health Questions</span>
            </div>
            <span className="text-body-sm font-body-sm text-on-surface-variant">
              Answer simple questions about your health habits and history.
            </span>
          </div>

          {/* Fact 2 */}
          <div className="flex flex-col gap-1.5 px-3 pt-4 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Time Required</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-secondary-container border border-outline-variant/40">
                Fast
              </span>
            </div>
            <div className="text-stat-metric font-stat-metric text-on-surface font-bold tracking-tight flex items-baseline gap-1">
              ~2
              <span className="text-label-md font-label-md font-normal text-secondary-container">Minutes</span>
            </div>
            <span className="text-body-sm font-body-sm text-on-surface-variant">
              Complete the assessment in just a few minutes.
            </span>
          </div>

          {/* Fact 3 */}
          <div className="flex flex-col gap-1.5 px-3 pt-4 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Privacy</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-primary-container/20 text-primary border border-primary/30">
                Secure
              </span>
            </div>
            <div className="text-stat-metric font-stat-metric text-on-surface font-bold tracking-tight flex items-baseline gap-1">
              Free
              <span className="text-label-md font-label-md font-normal text-primary">& Private</span>
            </div>
            <span className="text-body-sm font-body-sm text-on-surface-variant">
              No account needed. Your data is not stored.
            </span>
          </div>

          {/* Fact 4 */}
          <div className="flex flex-col gap-1.5 px-3 pt-4 sm:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">Results</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary-container/30 text-tertiary border border-tertiary/30">
                Clear
              </span>
            </div>
            <div className="text-stat-metric font-stat-metric text-on-surface font-bold tracking-tight flex items-baseline gap-1">
              Explains
              <span className="text-label-md font-label-md font-normal text-tertiary">Why</span>
            </div>
            <span className="text-body-sm font-body-sm text-on-surface-variant">
              See which factors raise or lower your risk, not just a score.
            </span>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS (Trio Bento Grid) */}
      <section className="flex flex-col gap-8 z-10" id="how-it-works">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">schema</span>
              <span>Algorithmic Architecture</span>
            </div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface">
              Precision Public Health Grounded in Calibrated ML
            </h2>
          </div>
          <p className="text-body-md font-body-md text-on-surface-variant max-w-md">
            Unlike black-box risk scores, EquiRisk exposes every physiological vector, verifies parity across vulnerable demographics, and outputs conformal prediction uncertainty bands.
          </p>
        </div>

        {/* Trio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Explainable AI */}
          <div 
            onClick={() => { setActiveTab('explainability'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="glass-panel rounded-2xl p-6 glass-rim flex flex-col justify-between group hover:border-secondary-container/40 transition-all duration-300 cursor-pointer"
          >
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-secondary-container group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl fill-1">psychology</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm font-label-sm text-secondary-container uppercase">Feature Attribution</span>
                <h3 className="text-headline-md font-headline-md text-on-surface">Explainable AI (SHAP)</h3>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant">
                TreeSHAP decomposition for every prediction breaks down which specific lifestyle and biometric factors increase or reduce individual vulnerability.
              </p>
            </div>

            {/* SHAP Mini-Bar Preview */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between text-code-metric font-code-metric">
                <span className="text-on-surface-variant">General Health Rating</span>
                <span className="text-secondary-container font-semibold">+0.63 SHAP</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-secondary-container h-full rounded-full" style={{ width: '82%' }}></div>
              </div>
              <div className="flex items-center justify-between text-code-metric font-code-metric">
                <span className="text-on-surface-variant">High Blood Pressure</span>
                <span className="text-primary font-semibold">+0.46 SHAP</span>
              </div>
              <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>

          {/* Card 2: Algorithmic Fairness */}
          <div 
            onClick={() => { setActiveTab('fairness'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="glass-panel rounded-2xl p-6 glass-rim flex flex-col justify-between group hover:border-tertiary/40 transition-all duration-300 cursor-pointer"
          >
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl fill-1">balance</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm font-label-sm text-tertiary uppercase">Equity Auditing</span>
                <h3 className="text-headline-md font-headline-md text-on-surface">Subgroup Fairness</h3>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Explicitly audited across age groups, income brackets, biological sex, and BMI tiers to detect and document performance disparities in survey-based screening.
              </p>
            </div>

            {/* Parity Matrix */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between text-label-sm font-label-sm">
                <span className="text-on-surface-variant">Demographic Parity Audit</span>
                <span className="text-tertiary font-semibold">Audited Subgroups</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div className="h-6 rounded bg-tertiary-container/30 border border-tertiary/30 flex items-center justify-center text-label-sm font-label-sm text-tertiary">18-34</div>
                <div className="h-6 rounded bg-tertiary-container/30 border border-tertiary/30 flex items-center justify-center text-label-sm font-label-sm text-tertiary">35-49</div>
                <div className="h-6 rounded bg-tertiary-container/30 border border-tertiary/30 flex items-center justify-center text-label-sm font-label-sm text-tertiary">50-64</div>
                <div className="h-6 rounded bg-tertiary-container/30 border border-tertiary/30 flex items-center justify-center text-label-sm font-label-sm text-tertiary">65+</div>
              </div>
            </div>
          </div>

          {/* Card 3: Uncertainty-Aware */}
          <div 
            onClick={() => { setActiveTab('results'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="glass-panel rounded-2xl p-6 glass-rim flex flex-col justify-between group hover:border-primary/40 transition-all duration-300 cursor-pointer"
          >
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-outline-variant/50 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl fill-1">ssid_chart</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-label-sm font-label-sm text-primary uppercase">Conformal Prediction</span>
                <h3 className="text-headline-md font-headline-md text-on-surface">Uncertainty-Aware (MAPIE)</h3>
              </div>
              <p className="text-body-md font-body-md text-on-surface-variant">
                Conformal prediction sets provide statistical coverage guarantees, flagging borderline and ambiguous respondent profiles where caution is warranted.
              </p>
            </div>

            {/* Confidence Interval Display */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
              <div className="flex items-center justify-between text-code-metric font-code-metric">
                <span className="text-on-surface-variant">Sample Calibrated Risk</span>
                <span className="text-on-surface font-semibold">68.4% <span className="text-outline font-normal">[CI: 64.1% - 71.8%]</span></span>
              </div>
              <div className="relative w-full bg-surface-container h-3 rounded-full overflow-hidden flex items-center">
                <div className="absolute left-[64%] right-[28%] h-full bg-primary-container/40"></div>
                <div className="absolute left-[68.4%] w-1 h-full bg-primary z-10"></div>
              </div>
              <div className="flex justify-between text-label-sm font-label-sm text-outline">
                <span>0% Low</span>
                <span className="text-primary font-semibold">90% Coverage Band</span>
                <span>100% High</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESEARCH WORKFLOW PEEK & SURVEY MATRIX */}
      <section className="glass-panel rounded-2xl p-6 lg:p-8 glass-rim flex flex-col gap-6 z-10" id="insights-dashboard">
        {/* Section Header with Segmented Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-base">preview</span>
              <span>Research Capabilities</span>
            </div>
            <h2 className="text-headline-lg font-headline-lg text-on-surface">
              Population Stratification Across Epidemiological Dimensions
            </h2>
          </div>

          {/* Workflow Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
            <button
              onClick={() => setActiveWorkflowTab('clinical')}
              className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                activeWorkflowTab === 'clinical'
                  ? 'font-semibold bg-surface-container-high text-secondary-container shadow-sm border border-secondary-container/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Epidemiological Screening
            </button>
            <button
              onClick={() => setActiveWorkflowTab('population')}
              className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                activeWorkflowTab === 'population'
                  ? 'font-semibold bg-surface-container-high text-secondary-container shadow-sm border border-secondary-container/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Demographic Stratification
            </button>
            <button
              onClick={() => setActiveWorkflowTab('policy')}
              className={`px-4 py-2 rounded-lg text-label-md font-label-md transition-all cursor-pointer ${
                activeWorkflowTab === 'policy'
                  ? 'font-semibold bg-surface-container-high text-secondary-container shadow-sm border border-secondary-container/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Public Health Policy
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column Narrative */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-secondary-container/10 border border-secondary-container/25 text-secondary-container text-label-sm font-label-sm uppercase font-semibold">
              <span className="material-symbols-outlined text-sm">stethoscope</span>
              <span>
                {activeWorkflowTab === 'clinical'
                  ? 'Survey-Driven Screening'
                  : activeWorkflowTab === 'population'
                    ? 'Cohort Risk Stratification'
                    : 'Targeted Prevention Planning'}
              </span>
            </div>

            <h3 className="text-headline-md font-headline-md text-on-surface">
              {activeWorkflowTab === 'clinical'
                ? 'Non-Invasive Community Health Risk Assessment'
                : activeWorkflowTab === 'population'
                  ? 'Quantifying Vulnerability Across Demographic Strata'
                  : 'Data-Driven Allocation of Public Health Resources'}
            </h3>

            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              {activeWorkflowTab === 'clinical'
                ? 'EquiRisk utilizes 21 self-reported survey indicators from the CDC BRFSS questionnaire to produce a calibrated probability score without requiring invasive lab draws.'
                : activeWorkflowTab === 'population'
                  ? 'Explore how socioeconomic gradients (such as income brackets and education levels) strongly modulate cardiometabolic risk trajectories across age bands.'
                  : 'Epidemiologists can use conformal prediction sets and fairness audits to deploy lifestyle intervention programs where community vulnerability is highest.'}
            </p>

            <ul className="flex flex-col gap-3 text-body-sm font-body-sm text-on-surface">
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">check_circle</span>
                <span>Self-reported lifestyle indicators (exercise, smoking, fruit/veg intake, alcohol) coupled with BMI and BP history.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">check_circle</span>
                <span>Isotonic probability calibration ensures predicted percentages match empirical frequency (Brier score 0.166).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">check_circle</span>
                <span>Open-source academic pipeline with reproducible Jupyter notebook and audited subgroup metrics.</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-2 text-label-md font-label-md font-semibold text-secondary-container hover:text-secondary transition-colors cursor-pointer"
              >
                <span>Run Interactive Assessment</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right Column: Sample BRFSS Cohort Table */}
          <div className="lg:col-span-7 bg-surface-container-lowest/80 rounded-xl border border-outline-variant/40 p-4 flex flex-col gap-4 overflow-hidden">
            {/* Table HUD Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <span className="text-label-sm font-label-sm font-semibold uppercase text-on-surface">
                  Representative Survey Respondent Profiles
                </span>
                <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                  CDC BRFSS 2015 Held-Out Set
                </span>
              </div>
              <button 
                onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-2.5 py-1 rounded bg-surface-container text-label-sm font-label-sm text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant/30 cursor-pointer"
              >
                Try Your Own
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm font-label-sm uppercase text-outline">
                    <th className="py-2.5 px-3">Respondent</th>
                    <th className="py-2.5 px-3">Key Indicators</th>
                    <th className="py-2.5 px-3">Calibrated Risk</th>
                    <th className="py-2.5 px-3">90% Conformal Band</th>
                    <th className="py-2.5 px-3 text-right">Top SHAP Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-body-sm font-body-sm">
                  <tr className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-3 font-code-metric text-code-metric text-on-surface">#BRFSS-041</td>
                    <td className="py-3 px-3 text-on-surface-variant">BMI 34, High BP, GenHlth 4 (Fair)</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-error/10 text-error border border-error/30 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-error"></span> High (86.3%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface font-code-metric text-xs">[81.8% — 90.8%]</td>
                    <td className="py-3 px-3 text-right font-code-metric text-secondary-container">+0.63 GenHlth</td>
                  </tr>

                  <tr className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-3 font-code-metric text-code-metric text-on-surface">#BRFSS-119</td>
                    <td className="py-3 px-3 text-on-surface-variant">BMI 28, High BP, Active, GenHlth 3</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-secondary-container/10 text-secondary-container border border-secondary-container/30 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span> Moderate (52.4%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface font-code-metric text-xs">[47.9% — 56.9%]</td>
                    <td className="py-3 px-3 text-right font-code-metric text-secondary-container">+0.46 HighBP</td>
                  </tr>

                  <tr className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-3 font-code-metric text-code-metric text-on-surface">#BRFSS-892</td>
                    <td className="py-3 px-3 text-on-surface-variant">BMI 22, Normal BP/Chol, GenHlth 1</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary-container/30 text-tertiary border border-tertiary/30 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Low (11.8%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-on-surface font-code-metric text-xs">[7.3% — 16.3%]</td>
                    <td className="py-3 px-3 text-right font-code-metric text-tertiary">-0.58 GenHlth</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Micro Status Strip */}
            <div className="flex items-center justify-between text-label-sm font-label-sm text-outline pt-2 border-t border-outline-variant/30">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                FastAPI Serving LightGBM + MAPIE v1.5 + TreeSHAP
              </span>
              <span className="font-code-metric">Inference Latency: ~12ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="relative rounded-2xl glass-panel p-8 md:p-12 overflow-hidden border border-secondary-container/40 electric-glow z-10" id="assess-risk">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-primary-container/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl flex flex-col items-start gap-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-secondary-container text-label-sm font-label-sm font-semibold uppercase">
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            <span>Research Tool Ready</span>
          </div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface tracking-tight">
            Ready to Evaluate Population-Level Cardiometabolic Risk?
          </h2>
          <p className="text-body-lg font-body-lg text-on-surface-variant">
            Input demographic, biometric, and lifestyle variables to generate calibrated probabilities, conformal confidence intervals, and SHAP feature attributions in real time.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2.5 bg-primary-container hover:bg-inverse-primary text-on-primary-container text-body-md font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 active:scale-[0.98] electric-glow border-t border-white/20 cursor-pointer"
            >
              <span>Launch Assessment Form</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            <button
              onClick={() => { setActiveTab('fairness'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="inline-flex items-center gap-2 bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/50 px-5 py-3.5 rounded-xl text-body-md font-medium transition-all duration-150 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">menu_book</span>
              <span>View Algorithmic Fairness Audit</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
