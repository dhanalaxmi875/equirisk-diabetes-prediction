---
title: "EquiRisk Frequently Asked Questions (FAQ)"
organisation: "EquiRisk AI Research Team"
url: "https://github.com/dhanalaxmi875/equirisk-diabetes-prediction"
topic: "faq_and_user_guidance"
date_accessed: "2026-10-21"
---

# EquiRisk Frequently Asked Questions (FAQ)

## 1. Risk Score Interpretation

### Q1: What does my EquiRisk percentage mean?
**Answer:** Your EquiRisk score represents an empirically calibrated statistical probability of having undiagnosed prediabetes or type 2 diabetes based on 21 validated clinical, lifestyle, and demographic indicators from the CDC BRFSS epidemiological cohort. Because the model undergoes 5-fold cross-validated Isotonic Calibration, a score of 60% means that among 100 historical individuals sharing your risk profile, approximately 60 were confirmed to have diabetes.

### Q2: How are the risk tiers defined?
**Answer:** EquiRisk categorizes individuals into three operational screening tiers:
- **Low Risk (< 25.0%)**: Minimal risk indicators; recommend standard lifestyle maintenance and routine 3-year health checkups.
- **Moderate Risk (25.0% – 37.2%)**: Sub-threshold metabolic risk; eligible for proactive lifestyle interventions (dietary optimization, physical activity ramp-up) to prevent progression to prediabetes.
- **Elevated / High Risk (≥ 37.23%)**: Surpasses the clinically tuned screening threshold; strongly warrants laboratory confirmation (fasting plasma glucose or HbA1c blood test) and enrollment in a CDC-recognized National Diabetes Prevention Program (DPP).

### Q3: Why is the decision threshold set to 0.3723 rather than the default 0.50?
**Answer:** In clinical screening, false negatives are far more dangerous than false positives. Failing to flag an individual with early dysglycemia allows microvascular and macrovascular damage (retinopathy, neuropathy, nephropathy, and cardiovascular disease) to progress silently without intervention. 

By analyzing the Precision-Recall curve on a held-out cohort of 14,139 individuals, our research team established **0.3723** as the optimal threshold maximizing the F1-score while guaranteeing an **80.12% screening sensitivity (recall)**. An arbitrary 0.50 threshold would miss more than a third of elevated risk cases.

---

## 2. Uncertainty and Conformal Prediction

### Q4: What is the "MAPIE Conformal Confidence Band"?
**Answer:** Most machine learning systems produce single-point estimates that can convey a misleading sense of absolute confidence. EquiRisk uses split-conformal prediction via the **MAPIE** framework to construct a mathematically guaranteed 90% confidence interval `[lower_bound, upper_bound]`. This finite-sample guarantee means that over repeated independent assessments, the true clinical state will fall within this interval in at least 90% of cases regardless of model architecture.

### Q5: What does an "Indeterminate" prediction set mean?
**Answer:** When EquiRisk produces an `Indeterminate` conformal prediction set, the model includes both `{No Diabetes}` and `{Diabetes}` in the output set. This occurs when an individual presents conflicting risk factors—such as young age ($Age < 30$) combined with high BMI ($BMI \ge 35$) and diagnosed hypertension. The model transparently refuses to make an overconfident assertion and explicitly instructs the user to seek definitive clinical laboratory testing.

---

## 3. Explainability and TreeSHAP

### Q6: How should I interpret my SHAP waterfall chart?
**Answer:** The SHAP chart breaks down your overall risk score starting from the baseline population prevalence (the expected value). Each horizontal bar represents how much a specific survey answer pushed your risk:
- **Cyan / Blue Bars (Positive SHAP values)**: Factors that push your risk above the population baseline (e.g., high BMI, diagnosed hypertension, sedentary lifestyle, older age).
- **Emerald / Green Bars (Negative SHAP values)**: Protective factors that lower your risk relative to the baseline (e.g., daily vegetable consumption, regular aerobic exercise, no smoking history).

### Q7: Can I change my modifiable SHAP factors to lower my risk?
**Answer:** Yes. While non-modifiable factors (age, genetic family history, biological sex) cannot be adjusted, modifiable risk drivers—such as physical inactivity, lack of dietary fruits and vegetables, and elevated BMI—directly respond to lifestyle interventions. For instance, increasing weekly moderate exercise and adopting a plant-forward, low-glycemic dietary pattern will immediately shift your physical activity and nutrition SHAP attributions into the protective green zone.

---

## 4. Clinical Scope and Safety

### Q8: Is EquiRisk a medical device or a clinical diagnostic test?
**Answer:** **No.** EquiRisk is an academic research platform and pre-clinical risk stratification tool. It does not measure blood biomarkers, diagnose medical conditions, or prescribe medications. It is designed to empower individuals with personalized epidemiological insights and guide discussions with primary care physicians.

### Q9: What clinical laboratory tests should I request if my score is high?
**Answer:** If EquiRisk classifies your risk as elevated, discuss the following standardized American Diabetes Association (ADA) laboratory diagnostic tests with your healthcare provider:
1. **Glycated Hemoglobin (HbA1c)**: Reflects average blood sugar over the preceding 2–3 months. (Normal: < 5.7%; Prediabetes: 5.7% – 6.4%; Diabetes: ≥ 6.5%).
2. **Fasting Plasma Glucose (FPG)**: Fasting blood glucose after an 8-hour fast. (Normal: < 100 mg/dL; Prediabetes: 100–125 mg/dL; Diabetes: ≥ 126 mg/dL).
3. **Oral Glucose Tolerance Test (OGTT)**: 2-hour post-prandial blood sugar following a 75g glucose challenge. (Normal: < 140 mg/dL; Prediabetes: 140–199 mg/dL; Diabetes: ≥ 200 mg/dL).

---

## 5. Demographic Fairness and Data Privacy

### Q10: Why does EquiRisk ask about annual income, education, and healthcare coverage?
**Answer:** Type 2 diabetes is heavily mediated by structural Social Determinants of Health (SDOH). In the CDC BRFSS dataset, lower household income brackets (<$15,000/year) exhibit an empirical diabetes prevalence of 66.1%, compared to 39.4% in high-income brackets (≥$75,000/year). Lack of insurance and cost barriers lead to deferred preventive care, delayed diagnosis, and uncontrolled progression. Including these factors allows the model to capture social vulnerability without penalizing users.

### Q11: How does EquiRisk ensure algorithmic fairness?
**Answer:** Machine learning models can inadvertently encode historical health disparities. EquiRisk incorporates a dedicated **Subgroup Fairness Audit** dashboard that computes sensitivity (recall), false positive rates, and AUC-ROC across age, sex, income, and BMI strata. The platform flags any subgroup where recall drops by more than 5 percentage points (`UNDERPERFORMING`), ensuring that performance disparities—particularly among younger cohorts where diabetes prevalence is low—are transparently documented and mitigated.

### Q12: Is my survey data stored or shared?
**Answer:** No. Individual survey responses submitted through the EquiRisk web assessment form are processed transiently in memory for real-time model inference and SHAP attribution. EquiRisk does not sell, track, or persist personally identifiable medical data.
