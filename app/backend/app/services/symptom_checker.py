"""ML-based symptom checker: predicts top-k condition groups and returns example disease names."""

import os
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Absolute path to Symptom.pkl so it works regardless of server cwd
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_MODEL_PATH = str(_BACKEND_ROOT / "data" / "Symptom.pkl")
CSV_PATH = str(_BACKEND_ROOT / "data" / "disease_symptom_dataset.csv")
MAX_EXAMPLE_DISEASES = 8

FEATURE_NAMES = [
    "Fever", "Cough", "Fatigue", "Difficulty Breathing",
    "Age", "Gender", "Blood Pressure", "Cholesterol Level",
]

# Fallback when CSV/import fails: show at least these example diseases per group
FALLBACK_GROUP_DISEASES = {
    "Respiratory": ["Influenza", "Asthma", "Common Cold", "Bronchitis", "Pneumonia", "Sinusitis"],
    "Infectious": ["Dengue Fever", "Malaria", "Hepatitis", "Tuberculosis", "Chickenpox", "Lyme Disease"],
    "Cardiovascular": ["Stroke", "Hypertension", "Coronary Artery Disease"],
    "Metabolic & Endocrine": ["Diabetes", "Hyperthyroidism", "Hypothyroidism"],
    "Gastrointestinal": ["Gastroenteritis", "Pancreatitis", "Ulcerative Colitis", "Crohn's Disease", "Cirrhosis"],
    "Cancer": ["Liver Cancer", "Kidney Cancer", "Lung Cancer", "Breast Cancer", "Colorectal Cancer"],
    "Neurological": ["Migraine", "Epilepsy", "Multiple Sclerosis", "Parkinson's Disease", "Alzheimer's Disease"],
    "Mental Health": ["Depression", "Anxiety Disorders", "Bipolar Disorder"],
    "Musculoskeletal": ["Rheumatoid Arthritis", "Osteoarthritis", "Osteoporosis", "Fibromyalgia"],
    "Skin & Eye": ["Eczema", "Psoriasis", "Acne", "Conjunctivitis", "Cataracts", "Glaucoma"],
    "Urological & Kidney": ["Urinary Tract Infection", "Kidney Disease", "Chronic Kidney Disease"],
    "Blood & Genetic": ["Anemia", "Hemophilia", "Sickle Cell Anemia", "Down Syndrome"],
    "Allergy & Immune": ["Allergic Rhinitis", "Systemic Lupus"],
    "Other": ["Endometriosis", "Fibromyalgia"],
}


class SymptomCheckerService:
    """Load Symptom.pkl and predict top-k condition groups; attach example disease names per group."""

    def __init__(self, model_path: str = None):
        self.model_path = model_path or os.getenv("SYMPTOM_MODEL_PATH", DEFAULT_MODEL_PATH)
        self._model_data = None
        self._group_to_diseases: Dict[str, List[str]] = {}

    def _load_group_to_diseases(self) -> None:
        """Build mapping group_name -> list of disease names from the dataset."""
        if self._group_to_diseases:
            return
        try:
            import sys
            if str(_BACKEND_ROOT) not in sys.path:
                sys.path.insert(0, str(_BACKEND_ROOT))
            import pandas as pd
            from scripts.disease_to_group import disease_to_group
            if not os.path.exists(CSV_PATH):
                return
            df = pd.read_csv(CSV_PATH)
            df["Group"] = df["Disease"].astype(str).map(disease_to_group)
            g = df.groupby("Group")["Disease"].apply(lambda x: sorted(x.unique().astype(str).tolist()))
            self._group_to_diseases = g.to_dict()
        except Exception as e:
            logger.warning(f"Could not load group->diseases mapping: {e}")

    def _load(self) -> bool:
        if self._model_data is not None:
            return True
        try:
            if not os.path.exists(self.model_path):
                logger.warning(f"Symptom model not found at {self.model_path}")
                return False
            with open(self.model_path, "rb") as f:
                self._model_data = pickle.load(f)
            self._load_group_to_diseases()
            logger.info(f"Symptom checker model loaded from {self.model_path}")
            return True
        except Exception as e:
            logger.error(f"Symptom model load failed: {e}")
            return False

    def predict_top_k(
        self,
        fever: int,
        cough: int,
        fatigue: int,
        difficulty_breathing: int,
        age: float,
        gender: int,
        blood_pressure: int,
        cholesterol: int,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Return list of {disease, probability} for top-k diseases."""
        if not self._load():
            return []
        import numpy as np
        import pandas as pd

        model = self._model_data["model"]
        le = self._model_data["label_encoder"]
        imputer = self._model_data.get("imputer")
        feature_names = self._model_data.get("feature_names", FEATURE_NAMES)

        row = [
            fever, cough, fatigue, difficulty_breathing,
            age, gender, blood_pressure, cholesterol,
        ]
        X = np.array([row], dtype=np.float64)
        if imputer is not None:
            X = imputer.transform(X)
        df = pd.DataFrame(X, columns=feature_names)

        if not hasattr(model, "predict_proba"):
            pred = model.predict(df)[0]
            group_name = le.inverse_transform([pred])[0]
            examples = (self._group_to_diseases.get(group_name) or FALLBACK_GROUP_DISEASES.get(group_name, []))[:MAX_EXAMPLE_DISEASES]
            if not examples:
                examples = [group_name]
            return [{"disease": group_name, "probability": 1.0, "disease_examples": examples}]

        probs = model.predict_proba(df)[0]
        top_indices = probs.argsort()[-top_k:][::-1]
        out = []
        for i in top_indices:
            group_name = le.inverse_transform([i])[0]
            examples = (self._group_to_diseases.get(group_name) or FALLBACK_GROUP_DISEASES.get(group_name, []))[:MAX_EXAMPLE_DISEASES]
            if not examples:
                examples = [group_name]  # ensure frontend always has something to show
            out.append({
                "disease": group_name,
                "probability": float(probs[i]),
                "disease_examples": examples,
            })
        return out


# Singleton for use in routes
_symptom_checker: SymptomCheckerService = None


def get_symptom_checker() -> SymptomCheckerService:
    global _symptom_checker
    if _symptom_checker is None:
        _symptom_checker = SymptomCheckerService()
    return _symptom_checker
