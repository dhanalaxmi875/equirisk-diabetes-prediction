from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from fastapi import UploadFile, File

class FeatureInput(BaseModel):
    HighBP: float = Field(default=0.0, ge=0.0, le=1.0, description="High Blood Pressure (0=No, 1=Yes)")
    HighChol: float = Field(default=0.0, ge=0.0, le=1.0, description="High Cholesterol (0=No, 1=Yes)")
    CholCheck: float = Field(default=1.0, ge=0.0, le=1.0, description="Cholesterol check in past 5 years (0=No, 1=Yes)")
    BMI: float = Field(default=27.0, ge=12.0, le=98.0, description="Body Mass Index (12-98)")
    Smoker: float = Field(default=0.0, ge=0.0, le=1.0, description="Smoked >= 100 cigarettes (0=No, 1=Yes)")
    Stroke: float = Field(default=0.0, ge=0.0, le=1.0, description="History of Stroke (0=No, 1=Yes)")
    HeartDiseaseorAttack: float = Field(default=0.0, ge=0.0, le=1.0, description="Coronary Heart Disease or Heart Attack (0=No, 1=Yes)")
    PhysActivity: float = Field(default=1.0, ge=0.0, le=1.0, description="Physical activity in past 30 days (0=No, 1=Yes)")
    Fruits: float = Field(default=1.0, ge=0.0, le=1.0, description="Consumes fruit >= 1x/day (0=No, 1=Yes)")
    Veggies: float = Field(default=1.0, ge=0.0, le=1.0, description="Consumes veggies >= 1x/day (0=No, 1=Yes)")
    HvyAlcoholConsump: float = Field(default=0.0, ge=0.0, le=1.0, description="Heavy alcohol consumption (0=No, 1=Yes)")
    AnyHealthcare: float = Field(default=1.0, ge=0.0, le=1.0, description="Any health care coverage (0=No, 1=Yes)")
    NoDocbcCost: float = Field(default=0.0, ge=0.0, le=1.0, description="Could not see doctor due to cost (0=No, 1=Yes)")
    GenHlth: float = Field(default=2.0, ge=1.0, le=5.0, description="General health rating (1=Excellent, 2=Very Good, 3=Good, 4=Fair, 5=Poor)")
    MentHlth: float = Field(default=0.0, ge=0.0, le=30.0, description="Days with poor mental health in past 30 days (0-30)")
    PhysHlth: float = Field(default=0.0, ge=0.0, le=30.0, description="Days with physical illness/injury in past 30 days (0-30)")
    DiffWalk: float = Field(default=0.0, ge=0.0, le=1.0, description="Difficulty walking or climbing stairs (0=No, 1=Yes)")
    Sex: float = Field(default=0.0, ge=0.0, le=1.0, description="Biological sex (0=Female, 1=Male)")
    Age: float = Field(default=7.0, ge=1.0, le=13.0, description="Age category 1-13 (1=18-24 ... 13=80+)")
    Education: float = Field(default=5.0, ge=1.0, le=6.0, description="Education level 1-6 (1=Kindergarten ... 6=College 4+ yrs)")
    Income: float = Field(default=6.0, ge=1.0, le=8.0, description="Income bracket 1-8 (1=<$10k ... 8=>=$75k)")

    class Config:
        json_schema_extra = {
            "example": {
                "HighBP": 1.0,
                "HighChol": 1.0,
                "CholCheck": 1.0,
                "BMI": 31.5,
                "Smoker": 1.0,
                "Stroke": 0.0,
                "HeartDiseaseorAttack": 0.0,
                "PhysActivity": 0.0,
                "Fruits": 0.0,
                "Veggies": 1.0,
                "HvyAlcoholConsump": 0.0,
                "AnyHealthcare": 1.0,
                "NoDocbcCost": 0.0,
                "GenHlth": 4.0,
                "MentHlth": 5.0,
                "PhysHlth": 8.0,
                "DiffWalk": 1.0,
                "Sex": 1.0,
                "Age": 9.0,
                "Education": 4.0,
                "Income": 4.0
            }
        }

class ConformalInterval(BaseModel):
    confidence_level: float
    lower_bound: float
    upper_bound: float
    prediction_set: List[str]
    is_indeterminate: bool

class PredictResponse(BaseModel):
    prediction_id: str
    raw_probability: float
    calibrated_probability: float
    risk_percentage: float
    risk_tier: str
    risk_color: str
    decision_threshold: float
    predicted_class: int
    predicted_label: str
    conformal_interval: ConformalInterval
    summary_text: str
    inputs: Dict[str, float]

class ShapFeatureContribution(BaseModel):
    feature: str
    feature_name: str
    feature_value: float
    display_value: str
    shap_value: float
    direction: str  # "increases_risk" or "decreases_risk"
    magnitude: float
    interpretation: str

class ExplainResponse(BaseModel):
    prediction_id: str
    base_value: float
    calibrated_probability: float
    risk_tier: str
    contributions: List[ShapFeatureContribution]
    top_positive_factors: List[ShapFeatureContribution]
    top_negative_factors: List[ShapFeatureContribution]

class SubgroupMetric(BaseModel):
    group_column: str
    group: str
    n: int
    accuracy: float
    recall: float
    precision: float
    fpr: float
    fnr: float
    f1: float
    roc_auc: float
    recall_gap: float
    flag: str

class FairnessResponse(BaseModel):
    overall: Dict[str, Any]
    by_age: List[SubgroupMetric]
    by_income: List[SubgroupMetric]
    by_sex: List[SubgroupMetric]
    by_bmi: List[SubgroupMetric]
    summary: Dict[str, Any]

class PopulationInsightsResponse(BaseModel):
    by_age_group: Dict[str, float]
    by_income_group: Dict[str, float]
    by_sex: Dict[str, float]
    by_bmi_category: Dict[str, float]
    distribution_stats: Dict[str, Any]

class BatchPredictionRow(BaseModel):
    row_index: int
    features: Dict[str, float]
    risk_percentage: float
    risk_tier: str
    calibrated_probability: float
    top_driver: str
    error: Optional[str] = None

class BatchPredictResponse(BaseModel):
    total_rows: int
    valid_rows: int
    errors: List[str]
    results: List[BatchPredictionRow]
    summary: Dict[str, Any]

class ExtractedFieldDetail(BaseModel):
    field: str
    field_name: str
    value: Optional[float] = None
    status: str  # "auto_filled", "needs_confirmation", "not_found"
    confidence: float
    source_snippet: Optional[str] = None
    explanation: str

class ReportExtractionResponse(BaseModel):
    filename: str
    file_type: str
    total_fields: int
    auto_filled_count: int
    needs_confirmation_count: int
    not_found_count: int
    extracted_fields: Dict[str, ExtractedFieldDetail]
    initial_form_values: Dict[str, Optional[float]]
    non_model_clinical_indicators: Dict[str, str]
    raw_text_summary: str
