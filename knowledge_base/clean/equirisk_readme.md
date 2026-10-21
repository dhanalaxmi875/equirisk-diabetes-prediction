---
title: "EquiRisk System Architecture and Methodology"
organisation: "EquiRisk AI Research Team"
url: "https://github.com/dhanalaxmi875/equirisk-diabetes-prediction"
topic: "system_architecture_and_model"
date_accessed: "2026-10-21"
---

# EquiRisk: Explainable AI for Population-Level Diabetes Risk Prediction

## 1. Executive Summary and Mission

**EquiRisk** is an academic research and clinical decision-support framework engineered for population-level diabetes risk stratification. Traditional risk calculators often operate as uncalibrated black-box models, providing single-point probability estimates without confidence bounds or explainability. EquiRisk addresses these foundational shortcomings by combining:

1. **High-Performance Machine Learning**: Gradient boosted decision trees (LightGBM) trained on large-scale epidemiological survey data.
2. **Empirical Probability Calibration**: Isotonic regression to align raw model outputs with true empirical diabetes prevalence.
3. **Rigorous Uncertainty Quantification**: MAPIE split-conformal prediction sets and finite-sample confidence bands at a 90% target coverage level.
4. **Local and Global Explainability**: TreeSHAP (SHapley Additive exPlanations) attribution to quantify individual feature contributions.
5. **Algorithmic Fairness and Disparity Auditing**: Continuous auditing across age, household income, biological sex, and body mass index (BMI) strata to detect and mitigate demographic disparities.

---

## 2. Cohort and Data Foundation

EquiRisk is trained, calibrated, and validated on **70,692 balanced respondent records** drawn from the **CDC Behavioral Risk Factor Surveillance System (BRFSS 2015)**.

- **Outcome Variable (`Diabetes_binary`)**:
  - `0`: No diabetes diagnosis or prediabetes.
  - `1`: Clinically confirmed diabetes diagnosis.
  - The dataset maintains an exact 50/50 balance (35,346 positive cases, 35,346 negative controls), mitigating the severe majority-class bias typical of uncurated observational surveys.
- **Evaluation Split**:
  - **80% Training & Calibration Set**: 56,553 records.
  - **20% Held-Out Test Set**: 14,139 records (never seen during model training, hyperparameter search, or threshold tuning).

---

## 3. The 21 BRFSS Clinical and Behavioral Predictors

EquiRisk ingests 21 standardized survey indicators categorized across behavioral, metabolic, socioeconomic, and general health domains:

| Feature Name | Description | Encoding / Range | Clinical Relevance |
| :--- | :--- | :--- | :--- |
| **`HighBP`** | Clinically diagnosed hypertension | `0.0` (No), `1.0` (Yes) | Vascular endothelial stress and insulin resistance marker |
| **`HighChol`** | Clinically diagnosed high blood cholesterol | `0.0` (No), `1.0` (Yes) | Dyslipidemia component of metabolic syndrome |
| **`CholCheck`** | Blood cholesterol test in past 5 years | `0.0` (No), `1.0` (Yes) | Access to preventive primary care and screening |
| **`BMI`** | Body Mass Index ($kg/m^2$) | Continuous (`12.0` – `98.0`) | Adiposity and visceral fat burden driving insulin resistance |
| **`Smoker`** | Smoked at least 100 cigarettes in lifetime | `0.0` (No), `1.0` (Yes) | Systemic vascular inflammation and beta-cell dysfunction |
| **`Stroke`** | History of diagnosed stroke | `0.0` (No), `1.0` (Yes) | Macrovascular target organ damage |
| **`HeartDiseaseorAttack`** | Coronary heart disease (CHD) or myocardial infarction (MI) | `0.0` (No), `1.0` (Yes) | Atherosclerotic cardiovascular disease overlap |
| **`PhysActivity`** | Any leisure-time physical activity in past 30 days | `0.0` (No), `1.0` (Yes) | Skeletal muscle glucose uptake and metabolic clearance |
| **`Fruits`** | Consumes fruit at least 1 time per day | `0.0` (No), `1.0` (Yes) | Dietary fiber and antioxidant intake |
| **`Veggies`** | Consumes vegetables at least 1 time per day | `0.0` (No), `1.0` (Yes) | Micronutrient density and low glycemic impact |
| **`HvyAlcoholConsump`** | Heavy alcohol consumption (men >14 drinks/wk, women >7 drinks/wk) | `0.0` (No), `1.0` (Yes) | Hepatic steatosis, pancreatitis, and caloric excess |
| **`AnyHealthcare`** | Any health insurance or health care coverage | `0.0` (No), `1.0` (Yes) | Healthcare system utilization and timely diagnosis |
| **`NoDocbcCost`** | Inability to see a doctor due to cost in past 12 mos | `0.0` (No), `1.0` (Yes) | Financial toxicity and deferred medical care |
| **`GenHlth`** | Self-rated general health status | `1.0` (Excellent) to `5.0` (Poor) | Highly predictive composite health perception |
| **`MentHlth`** | Number of days with poor mental health in past 30 days | Continuous (`0.0` – `30.0`) | Chronic stress, cortisol dysregulation, and depression |
| **`PhysHlth`** | Number of days with physical illness/injury in past 30 days | Continuous (`0.0` – `30.0`) | Chronic disease burden and physical functional limitation |
| **`DiffWalk`** | Serious difficulty walking or climbing stairs | `0.0` (No), `1.0` (Yes) | Mobility impairment reducing physical activity capacity |
| **`Sex`** | Biological sex | `0.0` (Female), `1.0` (Male) | Sexual dimorphism in adipokine secretion and visceral fat |
| **`Age`** | 13-level age group | Ordinal `1` (18–24) to `13` (80+) | Age-related decline in beta-cell insulin secretory capacity |
| **`Education`** | Educational attainment level | Ordinal `1` (Never/Kindergarten) to `6` (College 4+ yrs) | Health literacy and socioeconomic health capital |
| **`Income`** | Annual household income bracket | Ordinal `1` (<$10,000) to `8` (≥$75,000) | Structural social determinants of nutritional and medical access |

---

## 4. Validated Performance Metrics (Held-Out Test Set: N = 14,139)

- **Predictive Discrimination (AUROC)**: **83.08%**
  - Confirms strong ability to rank-order individuals from highest to lowest metabolic risk across diverse demographic profiles.
- **Screening Sensitivity (Recall)**: **80.12%**
  - Clinical priority: In population-level screening, a false negative (failing to identify an individual with prediabetes or undiagnosed diabetes) leads to irreversible complications (nephropathy, retinopathy, neuropathy). The model is tuned specifically to keep sensitivity above 80%.
- **Balanced Accuracy**: **75.42%**
  - Reflects balanced predictive ability across both positive and negative cases.
- **Probability Calibration (Brier Score)**: **0.1664**
  - Calibrated using 5-fold cross-validated Isotonic Regression. When EquiRisk predicts a 65% probability, approximately 65 out of 100 individuals in that risk tier test positive.
- **Conformal Uncertainty Coverage**: **89.91%** empirical coverage at a nominal 90% confidence target.
- **Optimal Decision Threshold**: **0.3723**
  - Derived from Precision-Recall curve F1 maximization rather than the arbitrary default of 0.50.

---

## 5. Uncertainty Quantification and Explainability Engine

### Conformal Prediction with MAPIE
Point predictions in clinical AI can induce false certainty. EquiRisk integrates **MAPIE (Model Agnostic Prediction Interval Estimator)** to compute:
- A finite-sample 90% confidence interval `[lower_bound, upper_bound]`.
- Conformal prediction sets:
  - `{No Diabetes}`: Confidently negative.
  - `{Diabetes}`: Confidently elevated risk.
  - `{Indeterminate}`: Both classes included, signaling high epistemic ambiguity where additional laboratory tests (HbA1c / FPG) are urgently required.

### TreeSHAP Feature Attribution
For every user assessment, EquiRisk executes TreeSHAP to decompose the prediction into local feature attributions:
$$\text{Logit(Risk)} = \phi_0 + \sum_{i=1}^{21} \phi_i$$
- **Cyan/Blue bars**: Feature values driving risk upward (e.g., $BMI \ge 32$, diagnosed hypertension, sedentary lifestyle).
- **Emerald/Green bars**: Protective factors counterbalancing risk (e.g., daily vegetable consumption, regular physical activity, age under 35).

---

## 6. Software Architecture

- **Backend**: Python 3.12, FastAPI, Uvicorn, LightGBM, MAPIE 1.5, TreeSHAP, Scikit-learn, Pydantic v2.
- **Frontend**: Vite, React 18, TailwindCSS glassmorphism design system, Three.js 3D hero visualization, Lucide React icons.
- **RAG Chatbot Knowledge Base**: Curated medical knowledge base located in `knowledge_base/clean/`, ingested into vector storage for grounded epidemiological question answering.
