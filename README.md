# EquiRisk — Explainable AI for Population-Level Diabetes Risk Prediction

EquiRisk is a full-stack research web application for population-level diabetes risk prediction, featuring calibrated machine learning, MAPIE split-conformal uncertainty quantification, TreeSHAP feature attribution, and demographic fairness auditing.

The system is trained and cross-validated on **70,692 balanced respondent records** from the **CDC Behavioral Risk Factor Surveillance System (BRFSS 2015)**.

---

## Key Validated Metrics (Held-Out Test Set: N = 14,139)

- **Predictive Discrimination (AUROC)**: **83.08%**
- **Screening Sensitivity (Recall)**: **80.12%** (optimized to minimize missed diagnoses)
- **Balanced Accuracy**: **75.42%**
- **Probability Calibration**: **Brier score 0.1664** (Isotonic Regression, 5-fold CV)
- **Conformal Uncertainty Coverage**: **89.91% empirical coverage** at 90% target level (MAPIE v1.5)
- **Optimal Decision Threshold**: **0.3723** (tuned via Precision-Recall curve F1 maximization)

---

## System Architecture

```
c:\DHANALAXMI\ps-1\
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with CORS middleware and API endpoints
│   │   ├── model.py             # Inference manager (LightGBM, MAPIE, TreeSHAP)
│   │   └── schemas.py           # Pydantic request/response schemas with range validations
│   ├── model_artifacts/         # Trained model binaries & configuration JSONs
│   │   ├── model_lightgbm_final.joblib
│   │   ├── model_lightgbm_calibrated.joblib
│   │   ├── scaler.joblib
│   │   ├── mapie_model.joblib
│   │   ├── shap_explainer.joblib
│   │   ├── feature_config.json
│   │   ├── model_metadata.json
│   │   ├── optimal_threshold.json
│   │   ├── population_insights.json
│   │   └── fairness_audit.json
│   ├── requirements.txt         # Python dependencies
│   └── run.py                   # Script to launch Uvicorn server on port 8000
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Glassmorphism header with active tab navigation
│   │   │   ├── Footer.jsx       # Academic disclaimers & research citations
│   │   │   ├── ThreeHero.jsx    # Interactive Three.js 3D double-helix particle network
│   │   │   └── ConfidenceBand.jsx # Visual MAPIE conformal prediction band component
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx  # Hero, live metrics bar, core tenets, survey queue
│   │   │   ├── AssessmentPage.jsx # 3-step risk wizard with presets & real-time sliders
│   │   │   ├── ResultsPage.jsx  # Risk gauge, calibrated tier, MAPIE confidence band
│   │   │   ├── ExplainabilityPage.jsx # TreeSHAP horizontal waterfall & feature drivers
│   │   │   ├── InsightsPage.jsx # Population risk aggregates by Age, Income, Sex, BMI
│   │   │   └── FairnessPage.jsx # Subgroup fairness audit table & disparity badges
│   │   ├── services/
│   │   │   └── api.js           # Frontend API client
│   │   ├── App.jsx              # Main app shell & routing
│   │   ├── index.css            # Glassmorphism utilities, glow effects, grid pattern
│   │   └── main.jsx             # React entry point
│   ├── tailwind.config.js       # Exact design tokens matching provided reference
│   ├── vite.config.js           # Vite server configuration with API proxy
│   └── package.json             # Frontend dependencies (React 18, Three.js, Lucide)
```

---

## Pages & User Interface

1. **Landing Page (`Overview`)**:
   - Three.js 3D interactive double-helix and ambient data particle canvas.
   - Live statistical metrics strip (AUROC, cohort scope, sensitivity, conformal coverage).
   - Core tenets bento grid: Explainable AI (SHAP), Algorithmic Fairness, and Uncertainty Quantification.
   - Cohort matrix table previewing held-out BRFSS respondents.

2. **Risk Assessment Form (`Assess Risk`)**:
   - 3-phase interactive questionnaire matching all 21 BRFSS survey indicators:
     - **Phase 1**: BMI slider with instant category calculation, Age band, Biological Sex, General Health rating, Education, Income bracket.
     - **Phase 2**: High Blood Pressure, High Cholesterol, 5-year cholesterol check, Stroke, Coronary Heart Disease/MI, Difficulty walking.
     - **Phase 3**: Tobacco use, Physical activity, Fruits & Vegetables intake, Heavy alcohol consumption, Health coverage, Cost barrier to doctor, Mental & Physical health days.
   - Preset 1-click test profiles: **Elevated Risk**, **Moderate Risk**, **Low Risk**.

3. **Results Page (`Results`)**:
   - Calibrated probability percentage with circular animated SVG meter.
   - Risk Tier badge: Low (Green), Moderate (Cyan), High (Red).
   - **MAPIE Visual Confidence Band**: Conformal prediction set `{Diabetes}` / `{No Diabetes}` / `{Indeterminate}` and 90% finite-sample confidence interval `[lower_bound, upper_bound]`.
   - Actionable epidemiological guidance based on CDC screening criteria.

4. **Explainability Page (`Explainability`)**:
   - Computes per-feature **TreeSHAP attributions** for the user's survey responses.
   - Interactive horizontal waterfall / contribution bar chart distinguishing risk-increasing drivers (cyan/blue) and protective factors (green/emerald).
   - Plain-English clinical interpretation for each feature.
   - Interactive persona switcher to compare user results against representative cohort personas.

5. **Population Insights Dashboard (`Population Insights`)**:
   - Empirical aggregate charts across the 70,692 respondent cohort:
     - Risk by Age Group (18-34: 14.0%, 35-49: 32.5%, 50-64: 51.0%, 65+: 61.7%)
     - Risk by Household Income (High: 39.4%, Middle: 55.4%, Low: 66.1%)
     - Risk by Biological Sex (Female: 48.4%, Male: 52.5%)
     - Risk by BMI Category (Normal: 27.7%, Obese: 65.5%)
     - Population tier proportions: Low (33.7%), Moderate (26.0%), High (40.3%).

6. **Fairness & Transparency Page (`Fairness & Audit`)**:
   - Subgroup audit table evaluating **Recall, Precision, FPR, FNR, and ROC-AUC** across Age, Income, Sex, and BMI strata.
   - Disparity flag system identifying `UNDERPERFORMING` subgroups where recall gap exceeds 5 percentage points.
   - Transparent ethical disclosure explaining why younger respondents (18-34) present lower sensitivity due to low survey prevalence, and documenting how threshold tuning mitigates this disparity.

---

## API Endpoints (FastAPI)

- `GET /health` — Verifies model artifacts loaded and operational.
- `GET /metadata` — Returns model name, hyperparameters, and held-out test metrics.
- `GET /feature-config` — Returns the 21 survey features, value ranges, and display labels.
- `POST /predict` — Accepts 21 survey features; returns calibrated probability, risk tier, and MAPIE conformal interval.
- `POST /explain` — Accepts 21 survey features; returns TreeSHAP feature attributions and base expected value.
- `GET /explain/{prediction_id}` — Returns cached SHAP breakdown for a prior prediction.
- `GET /insights` — Returns precomputed population-level aggregates across demographic strata.
- `GET /fairness` — Returns full subgroup audit metrics and disparity flags.
- `GET /sample/{persona}` — Returns preset sample feature payload (`elevated`, `moderate`, `low`).

---

## Running Locally

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ & npm (tested on Node v20.18.0)

### 1. Start the FastAPI Backend
```bash
cd backend
python run.py
```
*The backend will load all 10 artifacts into memory and start listening at `http://127.0.0.1:8000`.*
*Interactive API Swagger docs available at `http://127.0.0.1:8000/docs`.*

### 2. Start the React Frontend
Open a separate terminal window:
```bash
cd frontend
npm run dev
```
*The Vite development server will launch at `http://localhost:5173/`.*
*Navigate to `http://localhost:5173/` in your browser to interact with EquiRisk.*

---

## Academic Citation & Research Scope

> **Disclaimer**: EquiRisk is developed strictly as an academic research tool for population-level risk stratification and epidemiological inquiry. It is trained on public survey data from the CDC Behavioral Risk Factor Surveillance System (BRFSS 2015). It is not a medical device, does not provide medical diagnoses, and should not replace clinical laboratory assessments (such as venous plasma glucose or standardized HbA1c tests).
