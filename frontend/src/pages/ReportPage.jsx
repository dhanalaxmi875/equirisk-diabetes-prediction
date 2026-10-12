import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, AlertTriangle, Heart, ArrowLeft, TrendingUp, TrendingDown, User, Calendar, RotateCcw } from 'lucide-react';
import { getExplanation, predictRisk } from '../services/api';
import precautions from '../config/precautions.json';

export default function ReportPage({ latestPrediction, latestFeatures, latestExplanation, setLatestExplanation, setActiveTab }) {
  const [precautionData, setPrecautionData] = useState(null);
  const [explanation, setExplanation] = useState(latestExplanation);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(null);
  const [userName, setUserName] = useState('');
  const [illustrativePredictions, setIllustrativePredictions] = useState({});
  const [loadingIllustrative, setLoadingIllustrative] = useState(false);

  useEffect(() => {
    setPrecautionData(precautions);
  }, []);

  useEffect(() => {
    setExplanation(latestExplanation);
  }, [latestExplanation]);

  const loadExplanation = async () => {
    if (!latestPrediction || !latestFeatures) return;
    setLoadingExplanation(true);
    setExplanationError(null);
    try {
      console.log('ReportPage: Fetching explanation from /explain with features:', latestFeatures);
      const expl = await getExplanation(latestFeatures);
      console.log('ReportPage: Explanation response:', expl);
      setExplanation(expl);
      setLatestExplanation(expl); // Share with app state
    } catch (err) {
      console.error('ReportPage: Failed to load explanation:', err);
      setExplanationError(err.message || 'Failed to load factor breakdown');
    } finally {
      setLoadingExplanation(false);
    }
  };

  useEffect(() => {
    if (latestPrediction && latestFeatures && !explanation && !latestExplanation) {
      loadExplanation();
    }
  }, [latestPrediction, latestFeatures]);

  const formatFeatureLabel = (key, value) => {
    const labels = {
      HighBP: value === 1 ? 'High blood pressure: Yes' : 'High blood pressure: No',
      HighChol: value === 1 ? 'High cholesterol: Yes' : 'High cholesterol: No',
      CholCheck: value === 1 ? 'Cholesterol checked: Yes' : 'Cholesterol checked: No',
      BMI: `BMI: ${value}`,
      Smoker: value === 1 ? 'Smoker: Yes' : 'Smoker: No',
      Stroke: value === 1 ? 'History of stroke: Yes' : 'History of stroke: No',
      HeartDiseaseorAttack: value === 1 ? 'Heart disease or heart attack: Yes' : 'Heart disease or heart attack: No',
      PhysActivity: value === 1 ? 'Physical activity: Yes' : 'Physical activity: No',
      Fruits: value === 1 ? 'Fruit daily: Yes' : 'Fruit daily: No',
      Veggies: value === 1 ? 'Vegetables daily: Yes' : 'Vegetables daily: No',
      HvyAlcoholConsump: value === 1 ? 'Heavy alcohol consumption: Yes' : 'Heavy alcohol consumption: No',
      AnyHealthcare: value === 1 ? 'Health coverage: Yes' : 'Health coverage: No',
      NoDocbcCost: value === 1 ? 'Could not afford a doctor in the past year: Yes' : 'Could not afford a doctor in the past year: No',
      GenHlth: `General health: ${value} of 5 (${value === 1 ? 'Excellent' : value === 2 ? 'Very good' : value === 3 ? 'Good' : value === 4 ? 'Fair' : 'Poor'})`,
      MentHlth: `Poor mental health days (past 30d): ${value}`,
      PhysHlth: `Poor physical health days (past 30d): ${value}`,
      DiffWalk: value === 1 ? 'Difficulty walking: Yes' : 'Difficulty walking: No',
      Sex: value === 0 ? 'Sex: Female' : 'Sex: Male',
      Age: `Age group: ${value === 1 ? '18-24' : value === 2 ? '25-29' : value === 3 ? '30-34' : value === 4 ? '35-39' : value === 5 ? '40-44' : value === 6 ? '45-49' : value === 7 ? '50-54' : value === 8 ? '55-59' : value === 9 ? '60-64' : value === 10 ? '65-69' : value === 11 ? '70-74' : value === 12 ? '75-79' : '80+'}`,
      Education: `Education: ${value === 1 ? 'Never attended/Kindergarten' : value === 2 ? 'Elementary' : value === 3 ? 'Some high school' : value === 4 ? 'High school graduate' : value === 5 ? 'Some college' : 'College graduate'}`,
      Income: `Income bracket: ${value === 1 ? '<$10,000' : value === 2 ? '$10,000-$15,000' : value === 3 ? '$15,000-$20,000' : value === 4 ? '$20,000-$25,000' : value === 5 ? '$25,000-$35,000' : value === 6 ? '$35,000-$50,000' : value === 7 ? '$50,000-$75,000' : '$75,000+'}`
    };
    return labels[key] || `${key}: ${value}`;
  };

  const getPersonalizedPrecautions = () => {
    if (!precautionData) return [];
    const personalized = precautionData.precautions.personalized || [];
    
    return personalized.filter(step => {
      const condition = step.condition;
      
      // Handle complex conditions with &&
      if (condition.includes('&&')) {
        const parts = condition.split('&&').map(s => s.trim());
        return parts.every(part => {
          if (part.includes('>=')) {
            const [feat, threshold] = part.split('>=').map(s => s.trim());
            return latestFeatures[feat] >= parseFloat(threshold);
          }
          if (part.includes('<')) {
            const [feat, threshold] = part.split('<').map(s => s.trim());
            return latestFeatures[feat] < parseFloat(threshold);
          }
          if (part.includes('==')) {
            const [feat, value] = part.split('==').map(s => s.trim());
            return latestFeatures[feat] === parseFloat(value);
          }
          return false;
        });
      }
      
      if (condition.includes('>=')) {
        const [feat, threshold] = condition.split('>=').map(s => s.trim());
        return latestFeatures[feat] >= parseFloat(threshold);
      }
      if (condition.includes('<')) {
        const [feat, threshold] = condition.split('<').map(s => s.trim());
        return latestFeatures[feat] < parseFloat(threshold);
      }
      if (condition.includes('==')) {
        const [feat, value] = condition.split('==').map(s => s.trim());
        return latestFeatures[feat] === parseFloat(value);
      }
      if (condition.includes('||')) {
        const conditions = condition.split('||').map(s => s.trim());
        return conditions.some(cond => {
          if (cond.includes('>=')) {
            const [feat, threshold] = cond.split('>=').map(s => s.trim());
            return latestFeatures[feat] >= parseFloat(threshold);
          }
          if (cond.includes('<')) {
            const [feat, threshold] = cond.split('<').map(s => s.trim());
            return latestFeatures[feat] < parseFloat(threshold);
          }
          if (cond.includes('==')) {
            const [feat, value] = cond.split('==').map(s => s.trim());
            return latestFeatures[feat] === parseFloat(value);
          }
          return false;
        });
      }
      return false;
    });
  };

  const getGroupedPrecautions = () => {
    const baseline = precautionData?.precautions?.baseline || {};
    const extra = (tier === 'moderate' || tier === 'high') ? (precautionData?.precautions?.moderate_high_extra || {}) : {};
    const personalized = getPersonalizedPrecautions();
    
    const groups = {
      food_and_nutrition: [...(baseline.food_and_nutrition || []), ...(extra.food_and_nutrition || [])],
      physical_activity: [...(baseline.physical_activity || []), ...(extra.physical_activity || [])],
      weight: [...(baseline.weight || []), ...(extra.weight || [])],
      habits: [...(baseline.habits || []), ...(extra.habits || [])],
      medical_follow_up: [...(baseline.medical_follow_up || []), ...(extra.medical_follow_up || [])]
    };

    personalized.forEach(p => {
      if (groups[p.group]) {
        groups[p.group].push(p.advice);
      }
    });

    return groups;
  };

  const getGroupedFactors = () => {
    if (!explanation) return null;
    
    // Backend returns 'contributions', 'top_positive_factors', 'top_negative_factors'
    const allFactors = explanation.contributions || [];
    const raising = allFactors.filter(f => f.shap_value > 0 || f.direction === 'increases_risk')
      .sort((a, b) => (b.shap_value || b.magnitude) - (a.shap_value || a.magnitude));
    const lowering = allFactors.filter(f => f.shap_value < 0 || f.direction === 'decreases_risk')
      .sort((a, b) => (a.shap_value || a.magnitude) - (b.shap_value || b.magnitude));
    
    const changeable = ['BMI', 'PhysActivity', 'Smoker', 'Fruits', 'Veggies', 'HvyAlcoholConsump', 'HighBP', 'HighChol'];
    const unchangeable = ['Age', 'Sex', 'Stroke', 'HeartDiseaseorAttack'];
    
    return {
      raising_changeable: raising.filter(f => changeable.includes(f.feature)).slice(0, 5),
      raising_unchangeable: raising.filter(f => unchangeable.includes(f.feature)).slice(0, 3),
      lowering: lowering.slice(0, 5)
    };
  };

  const tier = latestPrediction.risk_tier.toLowerCase();
  const outcomeText = precautionData?.outcome[tier] || '';
  const timelineText = precautionData?.timeline[tier] || '';

  const groupedPrecautions = getGroupedPrecautions();
  const groupedFactors = getGroupedFactors();

  const loadIllustrativePredictions = async () => {
    if (!latestFeatures || !groupedFactors) return;
    
    setLoadingIllustrative(true);
    const predictions = {};
    
    // Get top 3 changeable raising factors
    const topChangeable = groupedFactors.raising_changeable.slice(0, 3);
    
    for (const factor of topChangeable) {
      try {
        const modifiedFeatures = { ...latestFeatures };
        
        // Modify the factor to a healthier value
        if (factor.feature === 'BMI') {
          modifiedFeatures.BMI = 27.0;
        } else if (factor.feature === 'PhysActivity') {
          modifiedFeatures.PhysActivity = 1;
        } else if (factor.feature === 'Smoker') {
          modifiedFeatures.Smoker = 0;
        } else if (factor.feature === 'HighBP') {
          modifiedFeatures.HighBP = 0;
        } else if (factor.feature === 'HighChol') {
          modifiedFeatures.HighChol = 0;
        } else if (factor.feature === 'Fruits') {
          modifiedFeatures.Fruits = 1;
        } else if (factor.feature === 'Veggies') {
          modifiedFeatures.Veggies = 1;
        } else if (factor.feature === 'HvyAlcoholConsump') {
          modifiedFeatures.HvyAlcoholConsump = 0;
        }
        
        const result = await predictRisk(modifiedFeatures);
        predictions[factor.feature] = result.risk_percentage;
      } catch (err) {
        console.warn(`Failed to get illustrative prediction for ${factor.feature}:`, err);
      }
    }
    
    setIllustrativePredictions(predictions);
    setLoadingIllustrative(false);
  };

  useEffect(() => {
    if (groupedFactors && groupedFactors.raising_changeable.length > 0) {
      loadIllustrativePredictions();
    }
  }, [groupedFactors]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!latestPrediction || !latestFeatures) return;
    
    const currentGroupedPrecautions = getGroupedPrecautions();
    const currentGroupedFactors = getGroupedFactors();
    
    const content = `
PERSONALIZED HEALTH REPORT
==========================

Date: ${new Date().toLocaleDateString()}
${userName ? `Name: ${userName}\n` : ''}

RISK ASSESSMENT
---------------
Risk Level: ${latestPrediction.risk_tier}
Estimated Risk: ${latestPrediction.risk_percentage}%
Range: ${(latestPrediction.conformal_interval?.lower_bound * 100 || (latestPrediction.calibrated_probability - 0.05) * 100).toFixed(0)}% - ${(latestPrediction.conformal_interval?.upper_bound * 100 || (latestPrediction.calibrated_probability + 0.05) * 100).toFixed(0)}%

OUTCOME
-------
${outcomeText}

YOUR ANSWERS AT A GLANCE
------------------------
${Object.entries(latestFeatures).map(([key, value]) => `${formatFeatureLabel(key, value)}`).join('\n')}

WHAT IS AFFECTING YOUR RISK
---------------------------
${currentGroupedFactors ? `
Raising your risk (you can change):
${currentGroupedFactors.raising_changeable.map(f => `• ${formatFeatureLabel(f.feature, latestFeatures[f.feature])}`).join('\n') || 'None identified'}

Raising your risk (you can't change):
${currentGroupedFactors.raising_unchangeable.map(f => `• ${formatFeatureLabel(f.feature, latestFeatures[f.feature])}`).join('\n') || 'None identified'}

Lowering your risk:
${currentGroupedFactors.lowering.map(f => `• ${formatFeatureLabel(f.feature, latestFeatures[f.feature])}`).join('\n') || 'None identified'}
` : 'Factor details unavailable'}

WHAT TO DO NEXT
---------------
${timelineText}

PRECAUTIONS AND RECOMMENDATIONS
--------------------------------
${Object.entries(currentGroupedPrecautions).map(([group, items]) => `
${group.replace(/_/g, ' ').toUpperCase()}:
${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}
`).join('\n')}

WARNING SIGNS
-------------
See a doctor soon:
${precautionData?.warning_signs?.see_doctor_soon?.map(s => `• ${s}`).join('\n')}

Get emergency care immediately:
${precautionData?.warning_signs?.emergency_care?.map(s => `• ${s}`).join('\n')}

ABOUT THE BLOOD TESTS
---------------------
${precautionData?.blood_tests?.explanation}

DISCLAIMER
----------
${precautionData?.disclaimer}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equirisk_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!latestPrediction || !latestFeatures) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 py-16">
        <FileText size={48} className="text-outline-variant" />
        <h2 className="text-headline-lg text-on-surface">No Report Available</h2>
        <p className="text-body-md text-on-surface-variant">
          Complete the health assessment to generate your personalized report.
        </p>
        <button
          onClick={() => { setActiveTab('assessment'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-container hover:bg-inverse-primary text-on-primary-container font-semibold electric-glow transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Go to Assessment</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 print:gap-6 print:bg-white print:text-black print:p-8">
      {/* Header - Screen */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-primary font-label-sm uppercase tracking-wider mb-1">
            <Heart size={18} />
            <span>Personalized Health Report</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface">
            Your Risk Assessment
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-md transition-all cursor-pointer"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 text-label-md transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Header - Print */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">Personalized Health Report</h1>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-2">
          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date().toLocaleDateString()}</span>
          {userName && <span className="flex items-center gap-1"><User size={14} /> {userName}</span>}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            tier === 'high' ? 'bg-red-100 text-red-800' :
            tier === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-green-100 text-green-800'
          }`}>
            {latestPrediction.risk_tier} Risk
          </span>
          <span className="text-lg font-bold">{latestPrediction.risk_percentage}%</span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Likely between {(latestPrediction.conformal_interval?.lower_bound * 100 || (latestPrediction.calibrated_probability - 0.05) * 100).toFixed(0)}% and {(latestPrediction.conformal_interval?.upper_bound * 100 || (latestPrediction.calibrated_probability + 0.05) * 100).toFixed(0)}%
        </div>
      </div>

      {/* Risk Header Card (Screen) */}
      <div className={`glass-panel rounded-2xl p-6 border print:hidden ${
        tier === 'high' ? 'border-error/50 bg-error-container/10' :
        tier === 'moderate' ? 'border-secondary-container/50 bg-secondary-container/10' :
        'border-tertiary/50 bg-tertiary-container/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                tier === 'high' ? 'bg-error text-white' :
                tier === 'moderate' ? 'bg-secondary-container text-white' :
                'bg-tertiary text-white'
              }`}>
                {latestPrediction.risk_tier} Risk
              </span>
              <span className="text-3xl font-bold text-on-surface">{latestPrediction.risk_percentage}%</span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Likely between {(latestPrediction.conformal_interval?.lower_bound * 100 || (latestPrediction.calibrated_probability - 0.05) * 100).toFixed(0)}% and {(latestPrediction.conformal_interval?.upper_bound * 100 || (latestPrediction.calibrated_probability + 0.05) * 100).toFixed(0)}%
            </p>
            <p className="text-body-sm text-outline mt-1 flex items-center gap-1">
              <Calendar size={12} /> {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Optional name field */}
      <div className="glass-panel rounded-2xl p-4 border border-outline-variant/30 print:hidden">
        <label className="text-body-sm text-on-surface-variant mb-2 block">Your name (optional, for report only):</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-surface-variant text-on-surface border border-outline-variant/40 focus:outline-none focus:border-secondary-container"
          placeholder="Enter your name"
        />
      </div>

      {/* Outcome Statement */}
      <div className={`glass-panel rounded-2xl p-6 border ${
        tier === 'high' ? 'border-error/50 bg-error-container/10' :
        tier === 'moderate' ? 'border-secondary-container/50 bg-secondary-container/10' :
        'border-tertiary/50 bg-tertiary-container/10'
      } print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid`}>
        <h2 className="text-headline-md text-on-surface mb-3 print:text-black">Outcome</h2>
        <p className="text-body-md text-on-surface-variant print:text-black">
          {outcomeText}
        </p>
      </div>

      {/* Your answers at a glance */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-4 print:text-black">Your answers at a glance</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries(latestFeatures).map(([key, value]) => (
            <div key={key} className="flex justify-between py-1 border-b border-outline-variant/10 print:border-gray-200">
              <span className="text-on-surface-variant print:text-gray-700">{formatFeatureLabel(key, value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What is affecting your risk */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-4 print:text-black">What is affecting your risk</h2>
        
        {groupedFactors ? (
          <>
            <div className="mb-4">
              <h3 className="text-body-md font-semibold text-on-surface mb-2 flex items-center gap-2 print:text-black">
                <TrendingUp size={16} className="text-error" />
                Raising your risk
              </h3>
              
              <div className="mb-3">
                <h4 className="text-body-sm font-semibold text-outline mb-2 print:text-gray-600">You can change</h4>
                {groupedFactors.raising_changeable.length > 0 ? (
                  <div className="space-y-2">
                    {groupedFactors.raising_changeable.map((f, i) => {
                      const maxMag = Math.max(...groupedFactors.raising_changeable.map(x => x.shap_value || x.magnitude));
                      const barWidth = ((f.shap_value || f.magnitude) / maxMag) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-body-md text-on-surface-variant print:text-black">
                                {formatFeatureLabel(f.feature, latestFeatures[f.feature])}
                              </span>
                            </div>
                            <div className="w-full bg-surface-variant rounded-full h-2">
                              <div 
                                className="bg-error h-2 rounded-full" 
                                style={{ width: `${Math.max(barWidth, 10)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-body-sm text-on-surface-variant print:text-gray-600">None identified</p>
                )}
              </div>
              
              <div>
                <h4 className="text-body-sm font-semibold text-outline mb-2 print:text-gray-600">You can't change</h4>
                {groupedFactors.raising_unchangeable.length > 0 ? (
                  <div className="space-y-2">
                    {groupedFactors.raising_unchangeable.map((f, i) => {
                      const maxMag = Math.max(...groupedFactors.raising_unchangeable.map(x => x.shap_value || x.magnitude));
                      const barWidth = ((f.shap_value || f.magnitude) / maxMag) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-body-md text-on-surface-variant print:text-black">
                                {formatFeatureLabel(f.feature, latestFeatures[f.feature])}
                              </span>
                            </div>
                            <div className="w-full bg-surface-variant rounded-full h-2">
                              <div 
                                className="bg-secondary-container h-2 rounded-full" 
                                style={{ width: `${Math.max(barWidth, 10)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-body-sm text-on-surface-variant print:text-gray-600">None identified</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-body-md font-semibold text-on-surface mb-2 flex items-center gap-2 print:text-black">
                <TrendingDown size={16} className="text-tertiary" />
                Lowering your risk
              </h3>
              {groupedFactors.lowering.length > 0 ? (
                <div className="space-y-2">
                  {groupedFactors.lowering.map((f, i) => {
                    const maxMag = Math.max(...groupedFactors.lowering.map(x => Math.abs(x.shap_value || x.magnitude)));
                    const barWidth = (Math.abs(f.shap_value || f.magnitude) / maxMag) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-body-md text-on-surface-variant print:text-black">
                              {formatFeatureLabel(f.feature, latestFeatures[f.feature])}
                            </span>
                          </div>
                          <div className="w-full bg-surface-variant rounded-full h-2">
                            <div 
                              className="bg-tertiary h-2 rounded-full" 
                              style={{ width: `${Math.max(barWidth, 10)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant print:text-gray-600">None identified</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-body-sm text-outline print:text-gray-600">Factor details unavailable</p>
        )}
      </div>

      {/* Your changeable factors, what could help */}
      {groupedFactors && groupedFactors.raising_changeable.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
          <h2 className="text-headline-md text-on-surface mb-4 print:text-black">Your changeable factors, what could help</h2>
          <p className="text-body-sm text-on-surface-variant mb-4 print:text-black">
            Illustrative estimates if these factors improved (not a guarantee):
          </p>
          <div className="space-y-3">
            {groupedFactors.raising_changeable.slice(0, 3).map((f, i) => {
              const illustrativeRisk = illustrativePredictions[f.feature];
              const getImprovementText = (feature) => {
                if (feature === 'BMI') return 'If your BMI were 27';
                if (feature === 'PhysActivity') return 'If you were physically active';
                if (feature === 'Smoker') return 'If you were a non-smoker';
                if (feature === 'HighBP') return 'If you had normal blood pressure';
                if (feature === 'HighChol') return 'If you had normal cholesterol';
                if (feature === 'Fruits') return 'If you ate fruit daily';
                if (feature === 'Veggies') return 'If you ate vegetables daily';
                if (feature === 'HvyAlcoholConsump') return 'If you reduced alcohol consumption';
                return `If ${feature} improved`;
              };
              
              return (
                <div key={i} className="p-3 rounded-lg bg-surface-container-lowest/60 border border-outline-variant/30">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-body-md text-on-surface-variant print:text-black">
                      {getImprovementText(f.feature)}, the model's estimate would be about{' '}
                      {loadingIllustrative ? (
                        <span className="text-outline">calculating...</span>
                      ) : illustrativeRisk !== undefined ? (
                        <span className="font-semibold text-tertiary">{illustrativeRisk}%</span>
                      ) : (
                        <span className="text-outline">unavailable</span>
                      )}
                    </span>
                  </div>
                  <p className="text-body-sm text-outline mt-1 print:text-gray-500">
                    (Illustrative, not a guarantee)
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* What to do next */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-3 print:text-black">What to do next</h2>
        <p className="text-body-md text-secondary-container font-medium print:text-black">
          {timelineText}
        </p>
      </div>

      {/* Precautions and recommendations */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-4 print:text-black">Precautions and recommendations</h2>
        
        <div className="space-y-6">
          {Object.entries(groupedPrecautions).map(([group, items]) => (
          items.length > 0 && (
            <div key={group}>
              <h3 className="text-body-md font-semibold text-on-surface mb-2 print:text-black capitalize">
                {group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <ul className="text-body-md text-on-surface-variant space-y-1 print:text-black">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span>{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}
        </div>
      </div>

      {/* Warning signs */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-4 print:text-black">Warning signs</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 print:bg-yellow-50 print:border-yellow-300">
            <h3 className="text-body-md font-semibold text-error mb-2 flex items-center gap-2 print:text-black">
              <AlertTriangle size={16} />
              See a doctor soon
            </h3>
            <ul className="text-body-sm text-on-surface-variant space-y-1 print:text-black">
              {precautionData?.warning_signs?.see_doctor_soon?.map((sign, i) => (
                <li key={i}>• {sign}</li>
              ))}
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-error-container/20 border border-error/30 print:bg-red-50 print:border-red-300">
            <h3 className="text-body-md font-semibold text-error mb-2 flex items-center gap-2 print:text-black">
              <AlertTriangle size={16} />
              Get emergency care immediately
            </h3>
            <ul className="text-body-sm text-on-surface-variant space-y-1 print:text-black">
              {precautionData?.warning_signs?.emergency_care?.map((sign, i) => (
                <li key={i}>• {sign}</li>
              ))}
            </ul>
            <p className="text-body-sm font-semibold text-error mt-3 print:text-black">
              {precautionData?.warning_signs?.emergency_note}
            </p>
          </div>
        </div>
      </div>

      {/* About the blood tests */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <h2 className="text-headline-md text-on-surface mb-3 print:text-black">About the blood tests</h2>
        <p className="text-body-md text-on-surface-variant print:text-black">
          {precautionData?.blood_tests?.explanation}
        </p>
        <p className="text-body-md text-secondary-container font-medium mt-3 print:text-black">
          {precautionData?.share_with_doctor}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/30 bg-surface-container/50 print:border-2 print:border-gray-300 print:bg-white print:break-inside-avoid">
        <p className="text-body-sm text-on-surface-italic print:text-black">
          {precautionData?.disclaimer}
        </p>
      </div>

      {/* Back Button (hidden in print) */}
      <div className="print:hidden">
        <button
          onClick={() => { setActiveTab('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface border border-outline-variant/40 font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back to Overview</span>
        </button>
      </div>
    </div>
  );
}
