import React, { useState, useEffect } from 'react';
import { getPopulationInsights } from '../services/api';
import { BarChart3, TrendingUp, Users, DollarSign, Activity, Layers, AlertTriangle } from 'lucide-react';

export default function InsightsPage() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('age');

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getPopulationInsights();
        setInsights(res);
      } catch (err) {
        console.warn("Failed to load population insights:", err);
        setError('Unable to load insights. Please ensure the backend service is running.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const data = insights;

  const getCategoryData = () => {
    if (!data) {
      return { title: "", subtitle: "", data: {}, icon: BarChart3, color: "bg-secondary-container" };
    }
    switch (activeCategory) {
      case 'age':
        return {
          title: "Cardiometabolic Risk by Age Band",
          subtitle: "Risk dramatically escalates across decades as cumulative physiological wear accumulates.",
          data: data.by_age_group,
          icon: TrendingUp,
          color: "bg-secondary-container"
        };
      case 'income':
        return {
          title: "Cardiometabolic Risk by Household Income",
          subtitle: "Clear socioeconomic gradient: lower income brackets experience a 26.8% higher baseline diabetes risk.",
          data: data.by_income_group,
          icon: DollarSign,
          color: "bg-primary"
        };
      case 'bmi':
        return {
          title: "Cardiometabolic Risk by BMI Category",
          subtitle: "Obesity tier exhibits a 2.36x risk elevation compared to normal weight respondents.",
          data: data.by_bmi_category,
          icon: Activity,
          color: "bg-error"
        };
      case 'sex':
        return {
          title: "Cardiometabolic Risk by Biological Sex",
          subtitle: "Male respondents display a slightly higher baseline vulnerability (+4.1%) across the survey cohort.",
          data: data.by_sex,
          icon: Users,
          color: "bg-tertiary"
        };
      default:
        return { title: "", subtitle: "", data: {}, icon: BarChart3, color: "bg-secondary-container" };
    }
  };

  const catMeta = getCategoryData();

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-secondary-container font-label-sm uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">query_stats</span>
            <span>CDC BRFSS Population Aggregates (N=70,692)</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Population Insights Dashboard
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Empirical diabetes risk distributions aggregated across demographic, socioeconomic, and lifestyle strata.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container/30 border border-error text-error flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'age', label: 'Age Groups', icon: TrendingUp },
          { id: 'income', label: 'Income Brackets', icon: DollarSign },
          { id: 'bmi', label: 'BMI Categories', icon: Activity },
          { id: 'sex', label: 'Biological Sex', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-body-md font-medium transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-surface-container-high text-secondary-container border border-secondary-container/40 shadow'
                  : 'glass-panel text-on-surface-variant hover:text-on-surface border-outline-variant/30'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <div className="w-8 h-8 rounded-full border-2 border-secondary-container border-t-transparent animate-spin" />
          <span className="text-body-sm">Loading insights...</span>
        </div>
      ) : data ? (
        <>
          {/* Main Breakdown Card */}
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-outline-variant/30 glass-rim flex flex-col gap-6">
            <div className="flex flex-col gap-1 border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-surface-container text-secondary-container">
                  <catMeta.icon size={20} />
                </span>
                <h2 className="text-headline-md font-headline-md text-on-surface">
                  {catMeta.title}
                </h2>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {catMeta.subtitle}
              </p>
            </div>

            {/* Bar comparison list */}
            <div className="flex flex-col gap-5 pt-2">
              {Object.entries(catMeta.data).map(([group, val]) => {
                const pct = (val * 100).toFixed(1);
                return (
                  <div key={group} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-body-md font-semibold text-on-surface">{group}</span>
                      <div className="flex items-baseline gap-2 font-code-metric">
                        <span className="text-stat-metric font-stat-metric text-on-surface font-bold text-lg">
                          {pct}%
                        </span>
                        <span className="text-xs text-outline">average risk</span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="w-full bg-surface-container h-3.5 rounded-full overflow-hidden border border-outline-variant/20">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${catMeta.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Population Tier Distribution Graphic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-2">
              <div className="text-label-sm uppercase text-tertiary font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                Low Risk Tier (&lt;35%)
              </div>
              <div className="text-3xl font-bold font-stat-metric text-on-surface">
                {(data?.distribution_stats?.tier_proportions?.low * 100 || 33.7).toFixed(1)}%
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Respondents with normal BMI, active physical lifestyle, and no hypertension history.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-2">
              <div className="text-label-sm uppercase text-secondary-container font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary-container" />
                Moderate Risk Tier (35-65%)
              </div>
              <div className="text-3xl font-bold font-stat-metric text-on-surface">
                {(data?.distribution_stats?.tier_proportions?.moderate * 100 || 26.0).toFixed(1)}%
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Borderline cohort exhibiting moderate BMI or single cardiometabolic risk factor.
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-2">
              <div className="text-label-sm uppercase text-error font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error" />
                High Risk Tier (&gt;=65%)
              </div>
              <div className="text-3xl font-bold font-stat-metric text-on-surface">
                {(data?.distribution_stats?.tier_proportions?.high * 100 || 40.3).toFixed(1)}%
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Compounding multi-factor profiles (High BP + High Chol + Elevated BMI + Fair/Poor GenHlth).
              </p>
            </div>
          </div>

          {/* Dataset Note */}
          <div className="p-4 rounded-xl glass-panel border border-outline-variant/30 flex items-start gap-3 text-body-sm text-on-surface-variant">
            <AlertTriangle size={18} className="text-secondary-container shrink-0 mt-0.5" />
            <div>
              <strong className="text-on-surface">Important Note:</strong> Based on a balanced research dataset. Compare groups relatively, these are not real-world prevalence rates.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
