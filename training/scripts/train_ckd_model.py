"""
CKD (Chronic Kidney Disease) Model Training Script.
Trains a RandomForest on all 24 CKD features from the UCI dataset.
Saves bundle to app/backend/data/Kidney.pkl and metrics to training/models/results/.

Usage: python training/scripts/train_ckd_model.py
Run from the project root: c:\\Users\\moham\\OneDrive\\Desktop\\Bonus Life Ai
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, classification_report, roc_auc_score, confusion_matrix
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent.parent
DATA_PATH = ROOT / "app" / "backend" / "data" / "Kidney_data.csv"
MODEL_OUT = ROOT / "app" / "backend" / "data" / "Kidney.pkl"
RESULTS_DIR = ROOT / "training" / "models" / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# The 24 feature column names (as they appear in the CSV)
FEATURE_COLS = [
    "age", "bp", "sg", "al", "su",
    "rbc", "pc", "pcc", "ba",
    "bgr", "bu", "sc", "sod", "pot", "hemo", "pcv", "wc", "rc",
    "htn", "dm", "cad", "appet", "pe", "ane",
]

# Map from the user-facing field names to CSV column names
USER_TO_CSV = {
    "age": "age",
    "blood_pressure": "bp",
    "specific_gravity": "sg",
    "albumin": "al",
    "sugar": "su",
    "red_blood_cells": "rbc",
    "pus_cell": "pc",
    "pus_cell_clumps": "pcc",
    "bacteria": "ba",
    "blood_glucose_random": "bgr",
    "blood_urea": "bu",
    "serum_creatinine": "sc",
    "sodium": "sod",
    "potassium": "pot",
    "hemoglobin": "hemo",
    "packed_cell_volume": "pcv",
    "white_blood_cell_count": "wc",
    "red_blood_cell_count": "rc",
    "hypertension": "htn",
    "diabetes_mellitus": "dm",
    "coronary_artery_disease": "cad",
    "appetite": "appet",
    "pedal_edema": "pe",
    "anemia": "ane",
}


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """Apply the same preprocessing as the original model.py, extended to all 24 features."""
    df = df.copy()

    # Drop id if present
    if "id" in df.columns:
        df.drop("id", axis=1, inplace=True)

    # Categorical → numeric encodings
    df["rbc"] = df["rbc"].replace({"normal": 0, "abnormal": 1})
    df["pc"] = df["pc"].replace({"normal": 0, "abnormal": 1})
    df["pcc"] = df["pcc"].replace({"notpresent": 0, "present": 1})
    df["ba"] = df["ba"].replace({"notpresent": 0, "present": 1})
    df["htn"] = df["htn"].replace({"yes": 1, "no": 0})

    df["dm"] = df["dm"].replace({"\tyes": "yes", " yes": "yes", "\tno": "no"})
    df["dm"] = df["dm"].replace({"yes": 1, "no": 0})

    df["cad"] = df["cad"].replace({"\tno": "no"})
    df["cad"] = df["cad"].replace({"yes": 1, "no": 0})

    df["appet"] = df["appet"].replace({"good": 1, "poor": 0, "no": np.nan})
    df["pe"] = df["pe"].replace({"yes": 1, "no": 0})
    df["ane"] = df["ane"].replace({"yes": 1, "no": 0})

    # Fix classification label
    if "classification" in df.columns:
        df["classification"] = df["classification"].replace({"ckd\t": "ckd"})
        df["classification"] = [1 if i == "ckd" else 0 for i in df["classification"]]

    # Convert object columns that should be numeric
    for col in ["pcv", "wc", "rc", "bgr", "sod", "pot"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Fill missing values with median (per feature)
    for col in FEATURE_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    return df


def main():
    print(f"[CKD] Loading dataset from {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"[CKD] Shape: {df.shape}")

    df = preprocess(df)

    X = df[FEATURE_COLS]
    y = df["classification"]

    print(f"[CKD] Class distribution:\n{y.value_counts().to_dict()}")
    print(f"[CKD] Features used: {FEATURE_COLS}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ---- Evaluate ----
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, output_dict=True)

    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")

    fi = dict(zip(FEATURE_COLS, model.feature_importances_.tolist()))

    metrics = {
        "accuracy": round(acc, 4),
        "roc_auc": round(auc, 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "feature_importances": fi,
        "n_estimators": 200,
        "features": FEATURE_COLS,
        "user_to_csv_map": USER_TO_CSV,
    }

    metrics_path = RESULTS_DIR / "ckd_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[CKD] Metrics saved to {metrics_path}")
    print(f"[CKD] Accuracy:  {acc:.4f}")
    print(f"[CKD] ROC-AUC:   {auc:.4f}")
    print(f"[CKD] CV Acc:    {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save bundle (same format as diabetes/heart models)
    bundle = {
        "model": model,
        "feature_names": FEATURE_COLS,       # CSV column names order
        "user_to_csv": USER_TO_CSV,           # API field → CSV column
        "label_map": {1: "CKD", 0: "No CKD"},
    }
    with open(MODEL_OUT, "wb") as f:
        pickle.dump(bundle, f)
    print(f"[CKD] Model saved to {MODEL_OUT}")

    # Also save to training/models/
    train_model_path = ROOT / "training" / "models" / "Kidney.pkl"
    train_model_path.parent.mkdir(parents=True, exist_ok=True)
    with open(train_model_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"[CKD] Model copy saved to {train_model_path}")

    print("\n[CKD] Top 8 feature importances:")
    sorted_fi = sorted(fi.items(), key=lambda x: x[1], reverse=True)
    for fname, imp in sorted_fi[:8]:
        print(f"  {fname:25s}: {imp:.4f}")


if __name__ == "__main__":
    main()
