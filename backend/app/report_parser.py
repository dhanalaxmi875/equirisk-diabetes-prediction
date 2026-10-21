import io
import re
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from PIL import Image

# Import document & OCR libraries
try:
    import pymupdf
except ImportError:
    pymupdf = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import winocr
except ImportError:
    winocr = None


# Exact 21 BRFSS features required by EquiRisk
QUESTIONNAIRE_FIELDS = [
    "HighBP",
    "HighChol",
    "CholCheck",
    "BMI",
    "Smoker",
    "Stroke",
    "HeartDiseaseorAttack",
    "PhysActivity",
    "Fruits",
    "Veggies",
    "HvyAlcoholConsump",
    "AnyHealthcare",
    "NoDocbcCost",
    "GenHlth",
    "MentHlth",
    "PhysHlth",
    "DiffWalk",
    "Sex",
    "Age",
    "Education",
    "Income"
]

FIELD_DISPLAY_NAMES = {
    "HighBP": "High Blood Pressure",
    "HighChol": "High Cholesterol",
    "CholCheck": "Cholesterol Check (Past 5 Yrs)",
    "BMI": "Body Mass Index (BMI)",
    "Smoker": "Smoked >= 100 Cigarettes",
    "Stroke": "History of Stroke",
    "HeartDiseaseorAttack": "Coronary Heart Disease / MI",
    "PhysActivity": "Physical Activity (Past 30 Days)",
    "Fruits": "Consumes Fruit >= 1x/Day",
    "Veggies": "Consumes Veggies >= 1x/Day",
    "HvyAlcoholConsump": "Heavy Alcohol Consumption",
    "AnyHealthcare": "Healthcare Coverage",
    "NoDocbcCost": "Could Not See Doctor Due to Cost",
    "GenHlth": "General Health Rating (1-5)",
    "MentHlth": "Poor Mental Health Days (0-30)",
    "PhysHlth": "Poor Physical Health Days (0-30)",
    "DiffWalk": "Difficulty Walking / Stairs",
    "Sex": "Biological Sex (0=F, 1=M)",
    "Age": "Age Category (1-13)",
    "Education": "Education Level (1-6)",
    "Income": "Household Income Bracket (1-8)"
}

AGE_CATEGORIES = [
    (18, 24, 1.0, "18 - 24"),
    (25, 29, 2.0, "25 - 29"),
    (30, 34, 3.0, "30 - 34"),
    (35, 39, 4.0, "35 - 39"),
    (40, 44, 5.0, "40 - 44"),
    (45, 49, 6.0, "45 - 49"),
    (50, 54, 7.0, "50 - 54"),
    (55, 59, 8.0, "55 - 59"),
    (60, 64, 9.0, "60 - 64"),
    (65, 69, 10.0, "65 - 69"),
    (70, 74, 11.0, "70 - 74"),
    (75, 79, 12.0, "75 - 79"),
    (80, 150, 13.0, "80 or older")
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract embedded text from PDF, or perform OCR on scanned pages."""
    text_content = []
    
    # 1. Try PyMuPDF
    if pymupdf is not None:
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                page_text = page.get_text()
                if page_text and len(page_text.strip()) > 10:
                    text_content.append(page_text)
                elif winocr is not None:
                    # Page seems scanned; render to image and run OCR
                    pix = page.get_pixmap(dpi=150)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    ocr_res = winocr.recognize_pil_sync(img)
                    if ocr_res and "text" in ocr_res:
                        text_content.append(ocr_res["text"])
            doc.close()
            if text_content:
                return "\n".join(text_content)
        except Exception as e:
            print(f"PyMuPDF extraction note: {e}")

    # 2. Fallback to pypdf
    if pypdf is not None:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    text_content.append(txt)
            if text_content:
                return "\n".join(text_content)
        except Exception as e:
            print(f"pypdf extraction note: {e}")

    return "\n".join(text_content)


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from an image (JPG, PNG, JPEG) using Windows OCR."""
    try:
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        if winocr is not None:
            res = winocr.recognize_pil_sync(img)
            if res and "text" in res:
                return res["text"]
            elif res and "lines" in res:
                return "\n".join([line.get("text", "") for line in res.get("lines", [])])
    except Exception as e:
        print(f"Image OCR note: {e}")
    return ""


def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Securely extract text based on file format (PDF, JPG, PNG, JPEG)."""
    fn_lower = filename.lower()
    ct_lower = content_type.lower() if content_type else ""

    if fn_lower.endswith(".pdf") or "pdf" in ct_lower:
        return extract_text_from_pdf(file_bytes)
    elif fn_lower.endswith((".png", ".jpg", ".jpeg")) or "image" in ct_lower:
        return extract_text_from_image(file_bytes)
    else:
        raise ValueError(f"Unsupported file format '{filename}'. Please upload a PDF, JPG, PNG, or JPEG file.")


def match_clinical_entities(raw_text: str) -> Tuple[Dict[str, Any], Dict[str, str]]:
    """
    Parse clinical report text into:
      1. 21 BRFSS survey fields (Auto-filled, Needs Confirmation, or Not Found).
      2. Non-model clinical lab indicators (e.g. HbA1c, Fasting Glucose, eGFR) for patient awareness.
    NEVER guesses missing values. NEVER maps unrelated clinical labs (like HbA1c) to BRFSS features.
    """
    results: Dict[str, Any] = {}
    non_model_labs: Dict[str, str] = {}
    lines = raw_text.splitlines()

    def check_history_item(patterns: List[str]) -> Optional[Tuple[float, str, str]]:
        """
        Check lines containing medical patterns for positive vs negative affirmation.
        Returns (value, status, snippet) or None if not found.
        """
        for line in lines:
            line_str = line.strip()
            for pat in patterns:
                if re.search(r'(?i)\b' + pat + r'\b', line_str):
                    # Check for explicit negation on the same line or in phrase
                    if re.search(r'(?i)\b(none|negative|denies|denied|no|absent|never|without|0)\b', line_str):
                        return (0.0, "auto_filled", line_str)
                    # Check for explicit affirmation
                    if re.search(r'(?i)\b(yes|positive|present|diagnosed|active|confirmed|1)\b', line_str):
                        return (1.0, "auto_filled", line_str)
                    if "negative for" in line_str.lower() or "no history of" in line_str.lower():
                        return (0.0, "auto_filled", line_str)
                    if "history of" in line_str.lower() or "diagnosed with" in line_str.lower():
                        return (1.0, "auto_filled", line_str)
                    return (1.0, "needs_confirmation", line_str)
        return None

    # -------------------------------------------------------------
    # NON-MODEL CLINICAL LAB INDICATORS (Displayed for context, NEVER mapped to features)
    # -------------------------------------------------------------
    # HbA1c
    hba1c_match = re.search(r'(?i)\b(?:HbA1c|Hemoglobin\s*A1c|Glycated\s*Hemoglobin|A1C)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*%?', raw_text)
    if hba1c_match:
        val = float(hba1c_match.group(1))
        status_note = "Normal (< 5.7%)" if val < 5.7 else ("Prediabetes (5.7% - 6.4%)" if val < 6.5 else "Elevated / Diabetic Range (>= 6.5%)")
        non_model_labs["HbA1c (Glycated Hemoglobin)"] = f"{val:.1f}% - {status_note}"

    # Fasting Glucose
    glucose_match = re.search(r'(?i)\b(?:Fasting\s*(?:Blood\s*)?Glucose|FBG|Fasting\s*Sugar|Blood\s*Glucose|Serum\s*Glucose)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:mg/dL)?', raw_text)
    if glucose_match:
        val = float(glucose_match.group(1))
        status_note = "Normal (< 100 mg/dL)" if val < 100 else ("Impaired Fasting Glucose (100-125 mg/dL)" if val <= 125 else "Elevated / Diabetic Range (>= 126 mg/dL)")
        non_model_labs["Fasting Blood Glucose"] = f"{val:.0f} mg/dL - {status_note}"

    # Triglycerides
    tg_match = re.search(r'(?i)\b(?:Triglycerides?|Serum\s*Triglycerides?)\s*[:=-]?\s*(\d{2,4})\s*(?:mg/dL)?', raw_text)
    if tg_match:
        val = float(tg_match.group(1))
        status_note = "Normal (< 150 mg/dL)" if val < 150 else ("Borderline High (150-199 mg/dL)" if val < 200 else "High (>= 200 mg/dL)")
        non_model_labs["Triglycerides"] = f"{val:.0f} mg/dL - {status_note}"

    # HDL Cholesterol
    hdl_match = re.search(r'(?i)\b(?:HDL(?:\s*Cholesterol)?|High\s*Density\s*Lipoprotein)\s*[:=-]?\s*(\d{2,3})\s*(?:mg/dL)?', raw_text)
    if hdl_match:
        val = float(hdl_match.group(1))
        status_note = "Optimal (>= 50 mg/dL)" if val >= 50 else "Low (< 40-50 mg/dL)"
        non_model_labs["HDL Cholesterol"] = f"{val:.0f} mg/dL - {status_note}"

    # eGFR
    egfr_match = re.search(r'(?i)\b(?:eGFR|Estimated\s*GFR)\s*[:=-]?\s*([><]?\s*\d{1,3})', raw_text)
    if egfr_match:
        non_model_labs["eGFR (Kidney Function)"] = f"{egfr_match.group(1).strip()} mL/min/1.73m2"

    # Serum Creatinine
    creat_match = re.search(r'(?i)\b(?:Creatinine|Serum\s*Creatinine)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:mg/dL)?', raw_text)
    if creat_match:
        non_model_labs["Serum Creatinine"] = f"{float(creat_match.group(1)):.2f} mg/dL"

    # -------------------------------------------------------------
    # 21 BRFSS QUESTIONNAIRE FIELDS
    # -------------------------------------------------------------

    # 1. HighBP (High Blood Pressure)
    bp_match = re.search(r'(?i)(?:BP|Blood\s*Pressure|B\.P\.)?\s*[:=-]?\s*(\d{2,3})\s*[/xX]\s*(\d{2,3})\s*(?:mm[Hh]g)?', raw_text)
    bp_diag = check_history_item(["hypertension", "htn", "high blood pressure", "essential hypertension"])

    if bp_diag:
        val, stat, snip = bp_diag
        results["HighBP"] = {
            "value": val,
            "status": stat,
            "confidence": 0.95,
            "source_snippet": snip,
            "explanation": "Explicit absence of hypertension documented." if val == 0.0 else f"Clinical diagnosis '{snip}' noted in history."
        }
    elif bp_match:
        sys = int(bp_match.group(1))
        dia = int(bp_match.group(2))
        if 80 <= sys <= 250 and 40 <= dia <= 150:
            if sys >= 140 or dia >= 90:
                results["HighBP"] = {
                    "value": 1.0,
                    "status": "auto_filled",
                    "confidence": 0.90,
                    "source_snippet": f"Recorded BP: {sys}/{dia} mmHg",
                    "explanation": f"Blood pressure reading {sys}/{dia} mmHg meets Stage 2 Hypertension threshold (>=140/90)."
                }
            elif sys >= 130 or dia >= 80:
                results["HighBP"] = {
                    "value": 1.0,
                    "status": "needs_confirmation",
                    "confidence": 0.75,
                    "source_snippet": f"Recorded BP: {sys}/{dia} mmHg",
                    "explanation": f"Blood pressure reading {sys}/{dia} mmHg indicates Stage 1 elevated BP. Please confirm if medically diagnosed with hypertension."
                }
            else:
                results["HighBP"] = {
                    "value": 0.0,
                    "status": "auto_filled",
                    "confidence": 0.90,
                    "source_snippet": f"Recorded BP: {sys}/{dia} mmHg",
                    "explanation": f"Blood pressure reading {sys}/{dia} mmHg is within normal reference limits (<120/80)."
                }
    if "HighBP" not in results:
        results["HighBP"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No blood pressure reading or hypertension status found in report."
        }

    # 2. HighChol (High Cholesterol)
    chol_match = re.search(r'(?i)(?:Total\s*Cholesterol|Cholesterol[,\s]+Total|Serum\s*Cholesterol)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)', raw_text)
    ldl_match = re.search(r'(?i)(?:LDL(?:\s*Cholesterol)?|Low\s*Density\s*Lipoprotein)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)', raw_text)
    chol_diag = check_history_item(["hyperlipidemia", "high cholesterol", "hypercholesterolemia", "dyslipidemia"])

    if chol_diag:
        val, stat, snip = chol_diag
        results["HighChol"] = {
            "value": val,
            "status": stat,
            "confidence": 0.95,
            "source_snippet": snip,
            "explanation": "Report notes negative for hyperlipidemia." if val == 0.0 else f"Hyperlipidemia / high cholesterol noted: '{snip}'."
        }
    elif chol_match:
        tc = float(chol_match.group(1))
        if tc >= 200:
            results["HighChol"] = {
                "value": 1.0,
                "status": "auto_filled",
                "confidence": 0.92,
                "source_snippet": f"Total Cholesterol: {tc:.0f} mg/dL",
                "explanation": f"Total Cholesterol {tc:.0f} mg/dL is elevated above desirable cutoff (>= 200 mg/dL)."
            }
        else:
            results["HighChol"] = {
                "value": 0.0,
                "status": "auto_filled",
                "confidence": 0.90,
                "source_snippet": f"Total Cholesterol: {tc:.0f} mg/dL",
                "explanation": f"Total Cholesterol {tc:.0f} mg/dL is within desirable reference range (< 200 mg/dL)."
            }
    elif ldl_match:
        ldl = float(ldl_match.group(1))
        if ldl >= 130:
            results["HighChol"] = {
                "value": 1.0,
                "status": "auto_filled",
                "confidence": 0.88,
                "source_snippet": f"LDL Cholesterol: {ldl:.0f} mg/dL",
                "explanation": f"LDL Cholesterol {ldl:.0f} mg/dL is elevated (>= 130 mg/dL)."
            }
        elif ldl < 100:
            results["HighChol"] = {
                "value": 0.0,
                "status": "auto_filled",
                "confidence": 0.85,
                "source_snippet": f"LDL Cholesterol: {ldl:.0f} mg/dL",
                "explanation": f"LDL Cholesterol {ldl:.0f} mg/dL is optimal (< 100 mg/dL)."
            }
    if "HighChol" not in results:
        results["HighChol"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No cholesterol levels or hyperlipidemia diagnoses found in report."
        }

    # 3. CholCheck (Cholesterol check in past 5 years)
    if chol_match or ldl_match or tg_match or hdl_match or re.search(r'(?i)\b(lipid\s*panel|lipid\s*profile|cholesterol\s*screening)\b', raw_text):
        results["CholCheck"] = {
            "value": 1.0,
            "status": "auto_filled",
            "confidence": 0.98,
            "source_snippet": "Lipid / Cholesterol Panel documented on report",
            "explanation": "Confirmed cholesterol screening from active medical lab report."
        }
    else:
        results["CholCheck"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No record of cholesterol screening interval found."
        }

    # 4. BMI (Body Mass Index)
    bmi_match = re.search(r'(?i)\b(?:BMI|Body\s*Mass\s*Index)\s*[:=-]?\s*(\d{1,2}(?:\.\d+)?)\s*(?:kg/m[²2])?\b', raw_text)
    ht_match = re.search(r'(?i)\b(?:Height|Ht)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(cm|m|in(?:ches)?|ft)?\b', raw_text)
    wt_match = re.search(r'(?i)\b(?:Weight|Wt)\s*[:=-]?\s*(\d{2,3}(?:\.\d+)?)\s*(kg|lbs?|pounds?)?\b', raw_text)

    if bmi_match:
        bmi_val = float(bmi_match.group(1))
        if 12.0 <= bmi_val <= 98.0:
            results["BMI"] = {
                "value": round(bmi_val, 1),
                "status": "auto_filled",
                "confidence": 0.98,
                "source_snippet": bmi_match.group(0).strip(),
                "explanation": f"BMI explicitly documented as {bmi_val:.1f} kg/m2."
            }
    if "BMI" not in results and ht_match and wt_match:
        try:
            ht_val = float(ht_match.group(1))
            ht_unit = (ht_match.group(2) or "cm").lower()
            wt_val = float(wt_match.group(1))
            wt_unit = (wt_match.group(2) or "kg").lower()

            if "m" in ht_unit and "c" not in ht_unit:
                h_m = ht_val
            elif "in" in ht_unit:
                h_m = ht_val * 0.0254
            else:
                h_m = ht_val / 100.0

            if "lb" in wt_unit or "pound" in wt_unit:
                w_kg = wt_val * 0.453592
            else:
                w_kg = wt_val

            if 1.0 <= h_m <= 2.5 and 30 <= w_kg <= 300:
                calc_bmi = round(w_kg / (h_m ** 2), 1)
                if 12.0 <= calc_bmi <= 98.0:
                    results["BMI"] = {
                        "value": calc_bmi,
                        "status": "needs_confirmation",
                        "confidence": 0.85,
                        "source_snippet": f"Height: {ht_match.group(0)}, Weight: {wt_match.group(0)}",
                        "explanation": f"Calculated BMI {calc_bmi:.1f} kg/m2 from Height ({ht_val} {ht_unit}) and Weight ({wt_val} {wt_unit}). Please confirm."
                    }
        except Exception:
            pass

    if "BMI" not in results:
        results["BMI"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Neither BMI nor Height/Weight vitals found in report."
        }

    # 5. Smoker (Smoked >= 100 cigarettes)
    smk_current = re.search(r'(?i)\b(?:Smoking|Tobacco(?:\s*Use)?|Smoker)\s*[:=-]?\s*(Current(?:\s*Smoker)?|Yes|Daily|Active)\b', raw_text)
    smk_former = re.search(r'(?i)\b(?:Smoking|Tobacco(?:\s*Use)?|Smoker)\s*[:=-]?\s*(Former(?:\s*Smoker)?|Quit|Ex-Smoker)\b', raw_text)
    smk_never = re.search(r'(?i)\b(?:Smoking|Tobacco(?:\s*Use)?|Smoker)\s*[:=-]?\s*(Never(?:\s*Smoked)?|Non-Smoker|No|Negative|None)\b', raw_text)

    if smk_current:
        results["Smoker"] = {
            "value": 1.0,
            "status": "auto_filled",
            "confidence": 0.95,
            "source_snippet": smk_current.group(0),
            "explanation": "Active/current tobacco use documented in social history."
        }
    elif smk_former:
        results["Smoker"] = {
            "value": 1.0,
            "status": "needs_confirmation",
            "confidence": 0.80,
            "source_snippet": smk_former.group(0),
            "explanation": "Former smoker noted. Please confirm if you have smoked at least 100 cigarettes in your lifetime."
        }
    elif smk_never:
        results["Smoker"] = {
            "value": 0.0,
            "status": "auto_filled",
            "confidence": 0.95,
            "source_snippet": smk_never.group(0),
            "explanation": "Report notes non-smoker / lifetime non-tobacco status."
        }
    else:
        results["Smoker"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No tobacco use or smoking history found in report."
        }

    # 6. Stroke (History of Stroke / CVA / TIA)
    stroke_item = check_history_item(["stroke", "cva", "cerebrovascular accident", "transient ischemic attack", "tia"])
    if stroke_item:
        val, stat, snip = stroke_item
        results["Stroke"] = {
            "value": val,
            "status": stat,
            "confidence": 0.95,
            "source_snippet": snip,
            "explanation": "Explicitly negative for stroke/CVA." if val == 0.0 else f"History of stroke/CVA documented: '{snip}'."
        }
    else:
        results["Stroke"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No history of stroke or cerebrovascular accident recorded."
        }

    # 7. HeartDiseaseorAttack (Coronary Heart Disease or Myocardial Infarction)
    cad_item = check_history_item(["coronary artery disease", "cad", "myocardial infarction", "heart attack", "angina"])
    if cad_item:
        val, stat, snip = cad_item
        results["HeartDiseaseorAttack"] = {
            "value": val,
            "status": stat,
            "confidence": 0.95,
            "source_snippet": snip,
            "explanation": "Report notes negative for coronary artery disease / heart attack." if val == 0.0 else f"Cardiometabolic history of '{snip}' documented."
        }
    else:
        results["HeartDiseaseorAttack"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No coronary heart disease or heart attack diagnosis found."
        }

    # 8. PhysActivity (Physical activity in past 30 days)
    act_pos = re.search(r'(?i)\b(?:Physical\s*Activity|Exercise)\s*[:=-]?\s*(Active|Regular|Daily|Yes|Frequent)\b', raw_text)
    act_neg = re.search(r'(?i)\b(?:Physical\s*Activity|Exercise)\s*[:=-]?\s*(Sedentary|None|Inactive|No)\b', raw_text)

    if act_pos:
        results["PhysActivity"] = {
            "value": 1.0,
            "status": "needs_confirmation",
            "confidence": 0.80,
            "source_snippet": act_pos.group(0),
            "explanation": "Report notes regular physical exercise. Please confirm for past 30-day activity."
        }
    elif act_neg:
        results["PhysActivity"] = {
            "value": 0.0,
            "status": "needs_confirmation",
            "confidence": 0.80,
            "source_snippet": act_neg.group(0),
            "explanation": "Sedentary activity recorded in lifestyle notes. Please confirm."
        }
    else:
        results["PhysActivity"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No physical activity or exercise habit documented in report."
        }

    # 9. Fruits (Consumes fruit >= 1x/day) - Do NOT guess!
    fruit_match = re.search(r'(?i)\b(?:Fruit\s*Consumption|Dietary\s*Fruit)\s*[:=-]?\s*(Daily|Regular|Yes|None|No)\b', raw_text)
    if fruit_match:
        val = 1.0 if fruit_match.group(1).lower() in ("daily", "regular", "yes") else 0.0
        results["Fruits"] = {
            "value": val,
            "status": "needs_confirmation",
            "confidence": 0.75,
            "source_snippet": fruit_match.group(0),
            "explanation": f"Dietary notes mention fruit intake: '{fruit_match.group(1)}'. Please confirm."
        }
    else:
        results["Fruits"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Dietary fruit consumption not specified in standard report. Please answer manually."
        }

    # 10. Veggies (Consumes veggies >= 1x/day) - Do NOT guess!
    veg_match = re.search(r'(?i)\b(?:Vegetable\s*Consumption|Dietary\s*Vegetables?)\s*[:=-]?\s*(Daily|Regular|Yes|None|No)\b', raw_text)
    if veg_match:
        val = 1.0 if veg_match.group(1).lower() in ("daily", "regular", "yes") else 0.0
        results["Veggies"] = {
            "value": val,
            "status": "needs_confirmation",
            "confidence": 0.75,
            "source_snippet": veg_match.group(0),
            "explanation": f"Dietary notes mention vegetable intake: '{veg_match.group(1)}'. Please confirm."
        }
    else:
        results["Veggies"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Dietary vegetable intake not specified in standard report. Please answer manually."
        }

    # 11. HvyAlcoholConsump (Heavy alcohol consumption)
    alc_heavy = re.search(r'(?i)\b(?:Alcohol(?:\s*Use)?|Drinking)\s*[:=-]?\s*(Heavy|Abuse|Excessive|Frequent)\b', raw_text)
    alc_light = re.search(r'(?i)\b(?:Alcohol(?:\s*Use)?|Drinking)\s*[:=-]?\s*(None|Non-Drinker|Rare|Occasional|Social|Light)\b', raw_text)

    if alc_heavy:
        results["HvyAlcoholConsump"] = {
            "value": 1.0,
            "status": "needs_confirmation",
            "confidence": 0.80,
            "source_snippet": alc_heavy.group(0),
            "explanation": "Heavy alcohol consumption indicated. Please confirm if intake exceeds 14 drinks/wk (men) or 7 drinks/wk (women)."
        }
    elif alc_light:
        results["HvyAlcoholConsump"] = {
            "value": 0.0,
            "status": "auto_filled",
            "confidence": 0.90,
            "source_snippet": alc_light.group(0),
            "explanation": "Social, occasional, or zero alcohol consumption documented."
        }
    else:
        results["HvyAlcoholConsump"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No alcohol consumption habits documented in report."
        }

    # 12. AnyHealthcare (Healthcare coverage)
    ins_pos = re.search(r'(?i)\b(?:Insurance|Payer|Coverage|Health\s*Plan)\s*[:=-]?\s*(Medicare|Medicaid|Blue\s*Cross|Aetna|Cigna|United|Commercial|HMO|PPO|Insured)\b', raw_text)
    ins_neg = re.search(r'(?i)\b(?:Insurance|Payer)\s*[:=-]?\s*(Self-Pay|Uninsured|None)\b', raw_text)

    if ins_neg:
        results["AnyHealthcare"] = {
            "value": 0.0,
            "status": "auto_filled",
            "confidence": 0.92,
            "source_snippet": ins_neg.group(0),
            "explanation": "Patient documented as Self-pay or Uninsured."
        }
    elif ins_pos or re.search(r'(?i)\b(medicare|medicaid|blue\s*cross|aetna|cigna|kaiser)\b', raw_text):
        matched = ins_pos.group(0) if ins_pos else "Health insurance provider listed on header"
        results["AnyHealthcare"] = {
            "value": 1.0,
            "status": "auto_filled",
            "confidence": 0.95,
            "source_snippet": matched,
            "explanation": "Active health insurance coverage / payer listed on report."
        }
    else:
        results["AnyHealthcare"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No insurance coverage or payer information specified."
        }

    # 13. NoDocbcCost (Could not see doctor due to cost) - Do NOT guess!
    cost_match = re.search(r'(?i)\b(could\s*not\s*afford\s*doctor|cost\s*barrier|financial\s*hardship\s*for\s*care)\b', raw_text)
    if cost_match:
        results["NoDocbcCost"] = {
            "value": 1.0,
            "status": "needs_confirmation",
            "confidence": 0.80,
            "source_snippet": cost_match.group(0),
            "explanation": "Report notes financial/cost barrier to medical care. Please confirm."
        }
    else:
        results["NoDocbcCost"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Cost barrier to doctor not noted in medical report. Please answer manually."
        }

    # 14. GenHlth (General Health: 1=Excellent, 2=Very Good, 3=Good, 4=Fair, 5=Poor)
    gh_match = re.search(r'(?i)\b(?:General\s*Health|General\s*Condition|Overall\s*Health)\s*[:=-]?\s*(Excellent|Very\s*Good|Good|Fair|Poor)\b', raw_text)
    if gh_match:
        rating_str = gh_match.group(1).lower()
        mapping = {"excellent": 1.0, "very good": 2.0, "good": 3.0, "fair": 4.0, "poor": 5.0}
        val = mapping.get(rating_str, 3.0)
        results["GenHlth"] = {
            "value": val,
            "status": "needs_confirmation",
            "confidence": 0.85,
            "source_snippet": gh_match.group(0),
            "explanation": f"General condition noted as '{gh_match.group(1)}'. Please confirm rating."
        }
    else:
        results["GenHlth"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "General health self-rating not found. Please self-rate (1=Excellent to 5=Poor)."
        }

    # 15. MentHlth (Days with poor mental health in past 30 days) - Do NOT guess!
    phq_match = re.search(r'(?i)\b(?:PHQ-9|Mental\s*Health\s*Score)\s*[:=-]?\s*(\d{1,2})\b', raw_text)
    if phq_match:
        results["MentHlth"] = {
            "value": float(min(int(phq_match.group(1)), 30)),
            "status": "needs_confirmation",
            "confidence": 0.70,
            "source_snippet": phq_match.group(0),
            "explanation": f"PHQ-9 screening score {phq_match.group(1)} detected. Please confirm days of poor mental health in past 30 days."
        }
    else:
        results["MentHlth"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Mental health days not documented in report. Please specify manually (0-30 days)."
        }

    # 16. PhysHlth (Days with physical illness/injury in past 30 days) - Do NOT guess!
    results["PhysHlth"] = {
        "value": None,
        "status": "not_found",
        "confidence": 0.0,
        "source_snippet": None,
        "explanation": "Days with physical illness/injury not documented in standard report. Please answer manually (0-30 days)."
    }

    # 17. DiffWalk (Difficulty walking or climbing stairs)
    walk_pos = re.search(r'(?i)\b(?:Mobility|Ambulation|Difficulty\s*Walking)\s*[:=-]?\s*(Impaired|Difficulty|Wheelchair|Walker|Assisted|Cane)\b', raw_text)
    walk_neg = re.search(r'(?i)\b(?:Mobility|Ambulation|Gait)\s*[:=-]?\s*(Normal|Independent|Intact|Steady|Unassisted)\b', raw_text)

    if walk_pos:
        results["DiffWalk"] = {
            "value": 1.0,
            "status": "auto_filled",
            "confidence": 0.90,
            "source_snippet": walk_pos.group(0),
            "explanation": f"Mobility limitation documented: '{walk_pos.group(1)}'."
        }
    elif walk_neg:
        results["DiffWalk"] = {
            "value": 0.0,
            "status": "auto_filled",
            "confidence": 0.92,
            "source_snippet": walk_neg.group(0),
            "explanation": "Physical exam records normal, independent ambulation and gait."
        }
    else:
        results["DiffWalk"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "No ambulatory mobility status found in report."
        }

    # 18. Sex (0=Female, 1=Male)
    sex_match = re.search(r'(?i)\b(?:Sex|Gender)\s*[:=-]?\s*(Male|Female|M|F)\b', raw_text)
    if sex_match:
        s_val = sex_match.group(1).upper()
        is_male = 1.0 if s_val in ("MALE", "M") else 0.0
        results["Sex"] = {
            "value": is_male,
            "status": "auto_filled",
            "confidence": 0.99,
            "source_snippet": sex_match.group(0),
            "explanation": f"Patient sex identified as {'Male' if is_male == 1.0 else 'Female'}."
        }
    else:
        results["Sex"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Biological sex not specified in report."
        }

    # 19. Age (Mapped to 1-13 BRFSS Age bracket)
    age_match = re.search(r'(?i)\b(?:Age|Patient\s*Age)\s*[:=-]?\s*(\d{1,3})\s*(?:years?|yo|y\.o\.)?\b', raw_text)
    dob_match = re.search(r'(?i)\b(?:DOB|Date\s*of\s*Birth)\s*[:=-]?\s*(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})\b', raw_text)

    age_years = None
    age_snippet = None

    if age_match:
        cand = int(age_match.group(1))
        if 18 <= cand <= 120:
            age_years = cand
            age_snippet = age_match.group(0)

    if age_years is None and dob_match:
        dob_str = dob_match.group(1)
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(dob_str, fmt)
                today = datetime.now()
                calc_age = today.year - dt.year - ((today.month, today.day) < (dt.month, dt.day))
                if 18 <= calc_age <= 120:
                    age_years = calc_age
                    age_snippet = f"DOB: {dob_str} (Calculated age {calc_age} years)"
                    break
            except Exception:
                continue

    if age_years is not None:
        matched_cat = 7.0  # fallback
        matched_label = "50 - 54"
        for (low, high, cat_val, label) in AGE_CATEGORIES:
            if low <= age_years <= high:
                matched_cat = cat_val
                matched_label = label
                break

        results["Age"] = {
            "value": matched_cat,
            "status": "auto_filled",
            "confidence": 0.95,
            "source_snippet": age_snippet,
            "explanation": f"Patient age ({age_years} yrs) mapped to CDC BRFSS Bracket {int(matched_cat)} ({matched_label} yrs)."
        }
    else:
        results["Age"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Patient age or date of birth not found in report."
        }

    # 20. Education (Level 1-6) - Do NOT guess!
    edu_match = re.search(r'(?i)\b(?:Education|Education\s*Level)\s*[:=-]?\s*(College|University|Degree|High\s*School|GED|Elementary)\b', raw_text)
    if edu_match:
        ed_str = edu_match.group(1).lower()
        if "college" in ed_str or "degree" in ed_str or "university" in ed_str:
            results["Education"] = {
                "value": 6.0,
                "status": "needs_confirmation",
                "confidence": 0.80,
                "source_snippet": edu_match.group(0),
                "explanation": "College / University education level noted. Please confirm."
            }
        elif "high school" in ed_str or "ged" in ed_str:
            results["Education"] = {
                "value": 4.0,
                "status": "needs_confirmation",
                "confidence": 0.80,
                "source_snippet": edu_match.group(0),
                "explanation": "High School / GED completion noted. Please confirm."
            }
    if "Education" not in results:
        results["Education"] = {
            "value": None,
            "status": "not_found",
            "confidence": 0.0,
            "source_snippet": None,
            "explanation": "Education level is a socioeconomic factor not recorded in medical labs. Please select manually."
        }

    # 21. Income (Bracket 1-8) - Do NOT guess!
    results["Income"] = {
        "value": None,
        "status": "not_found",
        "confidence": 0.0,
        "source_snippet": None,
        "explanation": "Household income is an equity determinant not present in clinical records. Please select manually."
    }

    # Ensure all 21 fields exist in output
    for f in QUESTIONNAIRE_FIELDS:
        if f not in results:
            results[f] = {
                "value": None,
                "status": "not_found",
                "confidence": 0.0,
                "source_snippet": None,
                "explanation": "Field not detected in uploaded document. Manual completion required."
            }

    return results, non_model_labs


def parse_medical_report(file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """
    Main orchestration function to extract text and parse 21 survey fields.
    Validates file integrity and size, extracts text, performs entity recognition.
    """
    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes).")

    if len(file_bytes) > 15 * 1024 * 1024:
        raise ValueError("File exceeds maximum allowed size of 15 MB.")

    raw_text = extract_text_from_file(file_bytes, filename, content_type)
    if not raw_text or len(raw_text.strip()) < 10:
        raise ValueError(
            "Could not extract legible clinical text from the uploaded document. "
            "Please ensure the image or PDF has readable text or scan resolution."
        )

    extracted_fields, non_model_labs = match_clinical_entities(raw_text)

    # Compute summary statistics
    auto_filled_count = sum(1 for f in extracted_fields.values() if f["status"] == "auto_filled")
    needs_confirmation_count = sum(1 for f in extracted_fields.values() if f["status"] == "needs_confirmation")
    not_found_count = sum(1 for f in extracted_fields.values() if f["status"] == "not_found")

    initial_form_values = {k: v["value"] for k, v in extracted_fields.items()}

    # Format raw text summary snippet (truncated for security & token efficiency)
    cleaned_lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    text_summary = "\n".join(cleaned_lines[:40])
    if len(cleaned_lines) > 40:
        text_summary += f"\n... [{len(cleaned_lines) - 40} additional lines extracted]"

    # Attach display names to field details
    formatted_fields = {}
    for key, detail in extracted_fields.items():
        formatted_fields[key] = {
            **detail,
            "field": key,
            "field_name": FIELD_DISPLAY_NAMES.get(key, key)
        }

    return {
        "filename": filename,
        "file_type": content_type or "application/octet-stream",
        "total_fields": 21,
        "auto_filled_count": auto_filled_count,
        "needs_confirmation_count": needs_confirmation_count,
        "not_found_count": not_found_count,
        "extracted_fields": formatted_fields,
        "initial_form_values": initial_form_values,
        "non_model_clinical_indicators": non_model_labs,
        "raw_text_summary": text_summary
    }
