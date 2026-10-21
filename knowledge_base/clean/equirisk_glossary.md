---
title: "EquiRisk Clinical and Machine Learning Glossary"
organisation: "EquiRisk AI Research Team"
url: "https://github.com/dhanalaxmi875/equirisk-diabetes-prediction"
topic: "glossary_and_definitions"
date_accessed: "2026-10-21"
---

# EquiRisk Clinical and Machine Learning Glossary

This comprehensive glossary defines the clinical, epidemiological, statistical, and artificial intelligence terms utilized throughout the EquiRisk platform, RAG knowledge base, and model audits.

---

## Part 1: Clinical and Epidemiological Terminology

### **Type 2 Diabetes Mellitus (T2D)**
A chronic metabolic disorder characterized by progressive insulin resistance combined with an inadequate compensatory insulin secretory response by pancreatic beta cells. Persistent hyperglycemia leads to microvascular complications (diabetic retinopathy, nephropathy, peripheral neuropathy) and macrovascular atherosclerosis (coronary artery disease, stroke, peripheral artery disease).

### **Prediabetes**
An intermediate metabolic state where blood glucose levels exceed normal physiologic limits but do not meet formal diagnostic criteria for diabetes. Defined clinically as an HbA1c of 5.7%–6.4%, Fasting Plasma Glucose of 100–125 mg/dL, or 2-hour Oral Glucose Tolerance Test of 140–199 mg/dL. Prediabetes is largely asymptomatic but carries significant cardiovascular risk and can be reversed with lifestyle intervention.

### **Glycated Hemoglobin (HbA1c)**
A laboratory blood test measuring the percentage of hemoglobin molecules in red blood cells bound to glucose. Because erythrocytes circulate for approximately 120 days, HbA1c provides an objective measure of glycemic control over the preceding 2–3 months without requiring fasting.
- **Normal**: $< 5.7\%$
- **Prediabetes**: $5.7\% - 6.4\%$
- **Diabetes**: $\ge 6.5\%$

### **Fasting Plasma Glucose (FPG)**
The concentration of glucose in venous plasma following a minimum 8-hour overnight fast.
- **Normal**: $< 100\text{ mg/dL}$ ($5.6\text{ mmol/L}$)
- **Impaired Fasting Glucose (Prediabetes)**: $100 - 125\text{ mg/dL}$ ($5.6 - 6.9\text{ mmol/L}$)
- **Diabetes**: $\ge 126\text{ mg/dL}$ ($7.0\text{ mmol/L}$) on repeated testing

### **Oral Glucose Tolerance Test (OGTT)**
A dynamic challenge test evaluating the body's physiological clearance of glucose from the bloodstream. Blood glucose is drawn before and 2 hours after consuming a standardized solution containing 75 grams of anhydrous glucose dissolved in water.

### **Insulin Resistance**
A pathophysiological condition where target tissues (skeletal muscle, adipose tissue, liver) exhibit an impaired cellular response to normal physiological concentrations of insulin, demanding higher pancreatic insulin secretion to maintain normal blood glucose.

### **Metabolic Syndrome**
A cluster of interconnected cardiovascular and metabolic risk factors, comprising visceral adiposity, hypertension, dyslipidemia (elevated triglycerides, low HDL cholesterol), and impaired fasting glucose.

### **Body Mass Index (BMI)**
An anthropometric index defined as an individual's weight in kilograms divided by the square of their height in meters ($kg/m^2$).
- **Underweight**: $< 18.5$
- **Normal Weight**: $18.5 - 24.9$
- **Overweight**: $25.0 - 29.9$
- **Class I Obesity**: $30.0 - 34.9$
- **Class II Obesity**: $35.0 - 39.9$
- **Class III Obesity (Severe)**: $\ge 40.0$

### **Behavioral Risk Factor Surveillance System (BRFSS)**
The premier health-related telephone survey system established by the Centers for Disease Control and Prevention (CDC). BRFSS collects state-level data on health-related risk behaviors, chronic clinical conditions, healthcare access, and the use of preventive services across adult US residents.

### **Social Determinants of Health (SDOH)**
Non-medical conditions in the environments where individuals are born, live, learn, work, and age that shape long-term health outcomes. Examples include income stability, educational attainment, food security, and access to affordable clinical care.

---

## Part 2: Machine Learning and Statistical Terminology

### **AUROC (Area Under the Receiver Operating Characteristic Curve)**
A threshold-independent metric evaluating the discrimination capability of a binary classification model. It represents the probability that the model ranks a randomly chosen positive case higher than a randomly chosen negative case across all possible operational thresholds. EquiRisk achieves an AUROC of **83.08%**.

### **Sensitivity (Recall)**
$$\text{Sensitivity} = \frac{\text{True Positives}}{\text{True Positives} + \text{False Negatives}}$$
The proportion of individuals with confirmed diabetes correctly flagged by the model. EquiRisk prioritizes high sensitivity (**80.12%**) to prevent false-negative screening outcomes.

### **Specificity**
$$\text{Specificity} = \frac{\text{True Negatives}}{\text{True Negatives} + \text{False Positives}}$$
The proportion of non-diabetic individuals correctly classified as negative. In screening systems, a calibrated trade-off between sensitivity and specificity is tuned via the decision threshold.

### **Balanced Accuracy**
The unweighted arithmetic mean of sensitivity and specificity:
$$\text{Balanced Accuracy} = \frac{\text{Sensitivity} + \text{Specificity}}{2}$$
EquiRisk achieves **75.42%** balanced accuracy on the held-out test cohort.

### **Brier Score**
A strictly proper scoring rule measuring the accuracy of probabilistic predictions:
$$\text{Brier} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2$$
Where $p_i$ is the predicted probability and $y_i \in \{0, 1\}$ is the actual outcome. Lower scores indicate superior calibration and sharpness. EquiRisk achieves a Brier score of **0.1664**.

### **Isotonic Regression Calibration**
A non-parametric calibration method that fits a piecewise constant, monotonically increasing function mapping raw tree ensemble scores into true empirical probabilities. It ensures that predicted probabilities match observed cohort event rates.

### **Decision Threshold**
The probability cutoff above which a case is classified into the positive screening tier. While conventional algorithms default to 0.50, EquiRisk establishes an optimal decision threshold of **0.3723**, tuned via Precision-Recall F1 optimization to protect screening recall.

### **Conformal Prediction (MAPIE)**
A distribution-free statistical framework that augments point predictions with mathematically guaranteed confidence sets. Based on a calibration set, it bounds prediction error without relying on Gaussian or asymptotic normality assumptions.

### **Conformal Prediction Set**
The subset of classes guaranteed to contain the true class label at a predetermined confidence level $1 - \alpha$ (e.g., 90%). For EquiRisk:
- `{No Diabetes}`: High confidence negative.
- `{Diabetes}`: High confidence positive.
- `{Indeterminate}`: The model admits ambiguity, outputting both classes to signal that additional clinical data is required.

### **TreeSHAP (Tree SHapley Additive exPlanations)**
A game-theoretic algorithm designed to explain predictions from tree ensembles (LightGBM, XGBoost, Random Forest). It computes Shapley values $\phi_i$ satisfying local accuracy, missingness, and consistency:
$$\hat{f}(x) = \phi_0 + \sum_{i=1}^M \phi_i$$
Where $\phi_0$ is the base expected value and $\phi_i$ is the attribution of feature $i$.

### **Epistemic vs. Aleatoric Uncertainty**
- **Epistemic Uncertainty**: Model uncertainty arising from insufficient training data or unexplored feature regions; can be reduced by collecting more samples.
- **Aleatoric Uncertainty**: Inherent, irreducible stochasticity in biological and survey systems (e.g., genetic susceptibility not captured in survey questions).

### **Disparity Flag (`UNDERPERFORMING`)**
An algorithmic audit threshold triggered when a demographic subgroup's sensitivity drops by more than 5 percentage points below the cohort average. This transparency mechanism guides clinical users to exercise caution when interpreting scores for underrepresented subpopulations.
