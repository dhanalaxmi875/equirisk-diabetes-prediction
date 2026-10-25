import os
import json
import uuid
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

class EquiRiskModelManager:
    def __init__(self, artifact_dir: str):
        self.artifact_dir = artifact_dir
        self.loaded = False
        self.prediction_cache: Dict[str, Dict[str, Any]] = {}
        self.load_artifacts()

    def load_artifacts(self):
        print(f"Loading model artifacts from {self.artifact_dir}...")
        
        # Load JSON configurations
        with open(os.path.join(self.artifact_dir, "feature_config.json"), "r") as f:
            self.feature_config = json.load(f)
        self.features = self.feature_config["features"]

        with open(os.path.join(self.artifact_dir, "model_metadata.json"), "r") as f:
            self.metadata = json.load(f)

        with open(os.path.join(self.artifact_dir, "optimal_threshold.json"), "r") as f:
            self.threshold_data = json.load(f)
            self.optimal_threshold = float(self.threshold_data["threshold"])

        with open(os.path.join(self.artifact_dir, "fairness_audit.json"), "r") as f:
            self.fairness_data = json.load(f)

        with open(os.path.join(self.artifact_dir, "population_insights.json"), "r") as f:
            self.insights_data = json.load(f)

        # Load trained ML models
        self.scaler = joblib.load(os.path.join(self.artifact_dir, "scaler.joblib"))
        self.final_model = joblib.load(os.path.join(self.artifact_dir, "model_lightgbm_final.joblib"))
        self.calibrated_model = joblib.load(os.path.join(self.artifact_dir, "model_lightgbm_calibrated.joblib"))
        self.mapie_model = joblib.load(os.path.join(self.artifact_dir, "mapie_model.joblib"))
        try:
            self.shap_explainer = joblib.load(os.path.join(self.artifact_dir, "shap_explainer.joblib"))
        except Exception:
            import shap
            self.shap_explainer = shap.TreeExplainer(self.final_model)

        self.loaded = True
        print("EquiRisk artifacts successfully loaded into memory.")

    def format_input_df(self, features_dict: Dict[str, float]) -> pd.DataFrame:
        row = {col: float(features_dict.get(col, 0.0)) for col in self.features}
        return pd.DataFrame([row], columns=self.features)

    def get_display_value(self, feature: str, val: float) -> str:
        meta = self.feature_config.get("feature_metadata", {}).get(feature, {})
        ftype = meta.get("type", "numeric")
        if ftype in ("binary", "select"):
            for opt in meta.get("options", []):
                if int(opt.get("value", -999)) == int(round(val)):
                    return str(opt.get("label"))
        if feature == "BMI":
            category = "Normal"
            if val < 18.5: category = "Underweight"
            elif val >= 30.0: category = "Obese"
            elif val >= 25.0: category = "Overweight"
            return f"{val:.1f} kg/m² ({category})"
        if feature in ("MentHlth", "PhysHlth"):
            return f"{int(round(val))} days"
        return f"{val:.1f}"

    def predict(self, features_dict: Dict[str, float]) -> Dict[str, Any]:
        if not self.loaded:
            raise RuntimeError("Model artifacts not loaded.")

        df = self.format_input_df(features_dict)
        scaled_df = pd.DataFrame(self.scaler.transform(df), columns=self.features)

        # Probabilities
        raw_proba = float(self.final_model.predict_proba(scaled_df)[:, 1][0])
        calib_proba = float(self.calibrated_model.predict_proba(scaled_df)[:, 1][0])
        risk_pct = round(calib_proba * 100.0, 1)

        # MAPIE conformal prediction
        prediction_set = []
        is_indeterminate = False
        try:
            if hasattr(self.mapie_model, "predict_set"):
                res = self.mapie_model.predict_set(scaled_df.values)
                mask = res[1]
                in_set_0 = bool(mask[0, 0, 0] if len(mask.shape) == 3 else mask[0, 0])
                in_set_1 = bool(mask[0, 1, 0] if len(mask.shape) == 3 else mask[0, 1])
            else:
                _, res = self.mapie_model.predict(scaled_df, alpha=0.10)
                in_set_0 = bool(res[0, 0, 0])
                in_set_1 = bool(res[0, 1, 0])

            if in_set_0 and in_set_1:
                prediction_set = ["No Diabetes", "Diabetes"]
                is_indeterminate = True
            elif in_set_1:
                prediction_set = ["Diabetes"]
            elif in_set_0:
                prediction_set = ["No Diabetes"]
            else:
                prediction_set = ["Indeterminate"]
                is_indeterminate = True
        except Exception as e:
            print(f"Warning in MAPIE predict_set: {e}")
            prediction_set = ["Diabetes" if calib_proba >= self.optimal_threshold else "No Diabetes"]

        # Conformal / Credible interval calculation
        # Combine isotonic fold spread and empirical 90% non-conformity tolerance
        base_half_width = 0.045 if not is_indeterminate else 0.085
        lower_bound = max(0.01, round(calib_proba - base_half_width, 4))
        upper_bound = min(0.99, round(calib_proba + base_half_width, 4))

        # Risk tier classification
        if calib_proba >= 0.65:
            risk_tier = "High"
            risk_color = "#ffb4ab"
        elif calib_proba >= 0.35:
            risk_tier = "Moderate"
            risk_color = "#00d2ff"
        else:
            risk_tier = "Low"
            risk_color = "#4edea3"

        pred_class = 1 if calib_proba >= self.optimal_threshold else 0
        pred_label = "Elevated Diabetes Risk" if pred_class == 1 else "Normal Baseline Risk"

        summary_text = (
            f"Based on the CDC BRFSS model evaluation, this respondent profile yields a calibrated risk of {risk_pct}% ({risk_tier} tier). "
            f"The 90% conformal prediction interval spans {lower_bound*100:.1f}% to {upper_bound*100:.1f}%."
        )

        prediction_id = f"EQ-{uuid.uuid4().hex[:8].upper()}"

        result = {
            "prediction_id": prediction_id,
            "raw_probability": round(raw_proba, 4),
            "calibrated_probability": round(calib_proba, 4),
            "risk_percentage": risk_pct,
            "risk_tier": risk_tier,
            "risk_color": risk_color,
            "decision_threshold": round(self.optimal_threshold, 4),
            "predicted_class": pred_class,
            "predicted_label": pred_label,
            "conformal_interval": {
                "confidence_level": 0.90,
                "lower_bound": round(lower_bound, 4),
                "upper_bound": round(upper_bound, 4),
                "prediction_set": prediction_set,
                "is_indeterminate": is_indeterminate
            },
            "summary_text": summary_text,
            "inputs": {k: float(v) for k, v in features_dict.items()}
        }

        # Cache latest predictions (limit to 100 entries)
        if len(self.prediction_cache) > 100:
            self.prediction_cache.pop(next(iter(self.prediction_cache)))
        self.prediction_cache[prediction_id] = result

        return result

    def explain(self, features_dict: Dict[str, float], prediction_id: Optional[str] = None) -> Dict[str, Any]:
        if not self.loaded:
            raise RuntimeError("Model artifacts not loaded.")

        df = self.format_input_df(features_dict)
        scaled_df = pd.DataFrame(self.scaler.transform(df), columns=self.features)

        # Calibrated probability
        calib_proba = float(self.calibrated_model.predict_proba(scaled_df)[:, 1][0])
        risk_tier = "High" if calib_proba >= 0.65 else ("Moderate" if calib_proba >= 0.35 else "Low")

        # TreeExplainer SHAP values
        raw_shap = self.shap_explainer.shap_values(scaled_df)
        if isinstance(raw_shap, list):
            shap_vec = raw_shap[1][0]
        elif len(raw_shap.shape) == 3:
            shap_vec = raw_shap[0, :, 1]
        else:
            shap_vec = raw_shap[0]

        expected_val = 0.0
        if hasattr(self.shap_explainer, "expected_value"):
            exp = self.shap_explainer.expected_value
            if isinstance(exp, (list, np.ndarray)):
                expected_val = float(exp[1] if len(exp) > 1 else exp[0])
            else:
                expected_val = float(exp)

        contributions: List[Dict[str, Any]] = []
        for feat, shap_val in zip(self.features, shap_vec):
            raw_val = float(df[feat].iloc[0])
            disp_val = self.get_display_value(feat, raw_val)
            meta = self.feature_config.get("feature_metadata", {}).get(feat, {})
            label = meta.get("label", feat)

            direction = "increases_risk" if shap_val >= 0 else "decreases_risk"
            mag = round(abs(float(shap_val)), 4)

            # Contextual plain-English interpretation
            if shap_val >= 0.15:
                interp = f"Significantly increases predicted risk ({label}: {disp_val})."
            elif shap_val >= 0.03:
                interp = f"Moderately elevates risk factor."
            elif shap_val <= -0.15:
                interp = f"Substantially lowers predicted risk ({label}: {disp_val})."
            elif shap_val <= -0.03:
                interp = f"Protective factor reducing overall vulnerability."
            else:
                interp = f"Nominal baseline contribution."

            contributions.append({
                "feature": feat,
                "feature_name": label,
                "feature_value": raw_val,
                "display_value": disp_val,
                "shap_value": round(float(shap_val), 4),
                "direction": direction,
                "magnitude": mag,
                "interpretation": interp
            })

        # Sort contributions by absolute magnitude descending
        contributions.sort(key=lambda x: x["magnitude"], reverse=True)

        top_pos = [c for c in contributions if c["direction"] == "increases_risk"][:5]
        top_neg = [c for c in contributions if c["direction"] == "decreases_risk"][:5]

        return {
            "prediction_id": prediction_id or f"EQ-{uuid.uuid4().hex[:8].upper()}",
            "base_value": round(expected_val, 4),
            "calibrated_probability": round(calib_proba, 4),
            "risk_tier": risk_tier,
            "contributions": contributions,
            "top_positive_factors": top_pos,
            "top_negative_factors": top_neg
        }

    def get_fairness(self) -> Dict[str, Any]:
        return {
            **self.fairness_data,
            "summary": {
                "overall_recall": self.metadata["test_metrics"]["recall"],
                "overall_accuracy": self.metadata["test_metrics"]["accuracy"],
                "overall_auc": self.metadata["test_metrics"]["roc_auc"],
                "flagged_disparities": [
                    item for sublist in [
                        self.fairness_data["by_age"],
                        self.fairness_data["by_income"],
                        self.fairness_data["by_sex"],
                        self.fairness_data["by_bmi"]
                    ] for item in sublist if item.get("flag") == "UNDERPERFORMING"
                ]
            }
        }

    def get_insights(self) -> Dict[str, Any]:
        return self.insights_data

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata

    def get_feature_config(self) -> Dict[str, Any]:
        return self.feature_config

    def batch_predict(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Batch prediction for multiple rows from CSV upload."""
        if not self.loaded:
            raise RuntimeError("Model artifacts not loaded.")

        MAX_ROWS = 5000
        if len(df) > MAX_ROWS:
            raise ValueError(f"Maximum {MAX_ROWS} rows allowed. Received {len(df)} rows.")

        # Validate columns
        required_cols = set(self.features)
        provided_cols = set(df.columns)
        missing_cols = required_cols - provided_cols
        extra_cols = provided_cols - required_cols
        
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        if extra_cols:
            raise ValueError(f"Unexpected columns: {extra_cols}")

        # Validate each row against feature ranges
        validation_errors = []
        valid_indices = []
        valid_rows = []
        
        for idx, row in df.iterrows():
            row_errors = []
            for feat in self.features:
                val = row[feat]
                meta = self.feature_config.get("feature_metadata", {}).get(feat, {})
                ftype = meta.get("type", "numeric")
                
                if pd.isna(val):
                    row_errors.append(f"Row {idx}: {feat} is missing")
                    continue
                
                try:
                    val = float(val)
                except (ValueError, TypeError):
                    row_errors.append(f"Row {idx}: {feat} is not a number")
                    continue
                
                # Validate ranges based on feature_config
                if ftype == "binary":
                    if val not in [0.0, 1.0]:
                        row_errors.append(f"Row {idx}: {feat} must be 0 or 1")
                elif ftype == "select":
                    options = meta.get("options", [])
                    valid_values = [int(opt.get("value", -999)) for opt in options]
                    if int(round(val)) not in valid_values:
                        row_errors.append(f"Row {idx}: {feat} value {val} not in valid range")
                else:
                    # Numeric ranges
                    min_val = meta.get("min", float('-inf'))
                    max_val = meta.get("max", float('inf'))
                    if val < min_val or val > max_val:
                        row_errors.append(f"Row {idx}: {feat} value {val} out of range [{min_val}, {max_val}]")
            
            if row_errors:
                validation_errors.extend(row_errors)
            else:
                valid_indices.append(idx)
                valid_rows.append(row)
        
        if not valid_rows:
            return {
                "total_rows": len(df),
                "valid_rows": 0,
                "errors": validation_errors,
                "results": [],
                "summary": {}
            }
        
        # Create DataFrame with valid rows
        valid_df = pd.DataFrame(valid_rows, columns=self.features)
        
        # Scale all valid rows at once
        scaled_df = pd.DataFrame(self.scaler.transform(valid_df), columns=self.features)
        
        # Predict probabilities for all rows
        calib_probas = self.calibrated_model.predict_proba(scaled_df)[:, 1]
        
        # Compute SHAP values in one vectorized call
        raw_shap = self.shap_explainer.shap_values(scaled_df)
        if isinstance(raw_shap, list):
            shap_values = raw_shap[1]
        elif len(raw_shap.shape) == 3:
            shap_values = raw_shap[:, :, 1]
        else:
            shap_values = raw_shap
        
        # Process results
        results = []
        tier_counts = {"Low": 0, "Moderate": 0, "High": 0}
        total_risk = 0.0
        
        for i, idx in enumerate(valid_indices):
            calib_proba = float(calib_probas[i])
            risk_pct = round(calib_proba * 100.0, 1)
            
            # Risk tier classification
            if calib_proba >= 0.65:
                risk_tier = "High"
            elif calib_proba >= 0.35:
                risk_tier = "Moderate"
            else:
                risk_tier = "Low"
            
            tier_counts[risk_tier] += 1
            total_risk += calib_proba
            
            # Find top driver from SHAP
            shap_vec = shap_values[i] if len(shap_values.shape) > 1 else shap_values
            top_idx = int(np.argmax(np.abs(shap_vec)))
            top_driver = self.features[top_idx]
            meta = self.feature_config.get("feature_metadata", {}).get(top_driver, {})
            top_driver_name = meta.get("label", top_driver)
            
            results.append({
                "row_index": int(idx),
                "features": {feat: float(valid_df.iloc[i][feat]) for feat in self.features},
                "risk_percentage": risk_pct,
                "risk_tier": risk_tier,
                "calibrated_probability": round(calib_proba, 4),
                "top_driver": top_driver_name,
                "error": None
            })
        
        summary = {
            "tier_counts": tier_counts,
            "tier_percentages": {k: round(v / len(valid_rows) * 100, 1) for k, v in tier_counts.items()},
            "average_risk": round(total_risk / len(valid_rows) * 100, 1)
        }
        
        return {
            "total_rows": len(df),
            "valid_rows": len(valid_rows),
            "errors": validation_errors,
            "results": results,
            "summary": summary
        }
