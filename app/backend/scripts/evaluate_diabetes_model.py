"""
Evaluate the diabetes ML model and report metrics (Accuracy, F1, ROC-AUC, etc.).
Run from backend root: python -m scripts.evaluate_diabetes_model
If data/best_model.pkl does not exist, trains a model first, then evaluates.
"""
import os
import sys

# Run from backend directory so app and data/ are on path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)

# Pima diabetes dataset (no header); column order
FEATURE_NAMES_LOWER = [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "diabetes_pedigree_function", "age",
]
FEATURE_NAMES_PASCAL = [
    "Pregnancies", "Glucose", "BloodPressure", "SkinThickness",
    "Insulin", "BMI", "DiabetesPedigreeFunction", "Age",
]
DATASET_URL = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"


def load_data():
    """Load Pima diabetes dataset; return X (DataFrame with PascalCase columns), y."""
    df = pd.read_csv(DATASET_URL, header=None)
    df.columns = FEATURE_NAMES_LOWER + ["outcome"]
    # Replace 0 in glucose/blood_pressure etc. with NaN then drop rows with missing, or fill with median
    for col in ["glucose", "blood_pressure", "skin_thickness", "insulin", "bmi"]:
        df[col] = df[col].replace(0, np.nan)
    df = df.fillna(df.median())
    X = df[FEATURE_NAMES_LOWER].copy()
    X.columns = FEATURE_NAMES_PASCAL  # match app's feature names
    y = df["outcome"].values
    return X, y


def train_and_save_model(X_train, X_test, y_train, model_path):
    """Train RandomForest, save bundle (model, scaler, feature_names) to model_path."""
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train_scaled, y_train)
    os.makedirs(os.path.dirname(model_path) or ".", exist_ok=True)
    bundle = {
        "model": model,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES_LOWER,
    }
    with open(model_path, "wb") as f:
        pickle.dump(bundle, f)
    print(f"Trained and saved model to {model_path}")
    return model, scaler, X_test_scaled, X_test


def load_model(model_path):
    """Load bundle from model_path; return model, scaler, feature_names."""
    with open(model_path, "rb") as f:
        bundle = pickle.load(f)
    model = bundle["model"]
    scaler = bundle.get("scaler")
    fn = bundle.get("feature_names", FEATURE_NAMES_LOWER)
    return model, scaler, fn


def evaluate_and_report(y_true, y_pred, y_proba=None):
    """Compute and print metrics; return dict of metrics."""
    acc = accuracy_score(y_true, y_pred)
    f1_binary = f1_score(y_true, y_pred, pos_label=1, zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    prec = precision_score(y_true, y_pred, pos_label=1, zero_division=0)
    rec = recall_score(y_true, y_pred, pos_label=1, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)
    roc_auc = None
    if y_proba is not None and len(np.unique(y_true)) >= 2:
        roc_auc = roc_auc_score(y_true, y_proba)

    print("\n" + "=" * 60)
    print("DIABETES MODEL EVALUATION METRICS")
    print("=" * 60)
    print(f"  Accuracy:           {acc:.4f}  ({acc*100:.2f}%)")
    print(f"  F1 (binary):       {f1_binary:.4f}")
    print(f"  F1 (weighted):     {f1_weighted:.4f}")
    print(f"  F1 (macro):        {f1_macro:.4f}")
    print(f"  Precision:         {prec:.4f}")
    print(f"  Recall:            {rec:.4f}")
    if roc_auc is not None:
        print(f"  ROC-AUC:           {roc_auc:.4f}")
    print("\nConfusion matrix (rows=true, cols=pred):")
    print(cm)
    print("\nClassification report:")
    print(classification_report(y_true, y_pred, target_names=["No diabetes", "Diabetes"], zero_division=0))
    print("=" * 60)

    metrics = {
        "accuracy": acc,
        "f1_binary": f1_binary,
        "f1_weighted": f1_weighted,
        "f1_macro": f1_macro,
        "precision": prec,
        "recall": rec,
        "roc_auc": roc_auc,
        "confusion_matrix": cm.tolist(),
    }
    return metrics


def main():
    model_path = os.path.join(BACKEND_DIR, "data", "best_model.pkl")
    print("Loading dataset...")
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42, stratify=y
    )

    if os.path.exists(model_path):
        print(f"Loading existing model from {model_path}")
        model, scaler, fn = load_model(model_path)
        # Ensure column order matches model (bundle may use lowercase names)
        L2P = dict(zip(FEATURE_NAMES_LOWER, FEATURE_NAMES_PASCAL))
        cols = [L2P.get(n, n) for n in fn if L2P.get(n, n) in X_test.columns]
        if not cols:
            cols = [c for c in FEATURE_NAMES_PASCAL if c in X_test.columns]
        X_test_ordered = X_test[cols].values
        if scaler is not None:
            X_test_scaled = scaler.transform(X_test_ordered)
        else:
            X_test_scaled = X_test_ordered
    else:
        print("No model found. Training new model...")
        model, scaler, X_test_scaled, _ = train_and_save_model(
            X_train, X_test, y_train, model_path
        )

    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1] if hasattr(model, "predict_proba") else None
    metrics = evaluate_and_report(y_test, y_pred, y_proba)

    # Save metrics to file for your teacher
    out_path = os.path.join(BACKEND_DIR, "data", "diabetes_model_metrics.txt")
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w") as f:
        f.write("Diabetes model evaluation metrics\n")
        f.write("=================================\n")
        f.write(f"Accuracy:    {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)\n")
        f.write(f"F1 (binary): {metrics['f1_binary']:.4f}\n")
        f.write(f"F1 (weighted): {metrics['f1_weighted']:.4f}\n")
        f.write(f"Precision:   {metrics['precision']:.4f}\n")
        f.write(f"Recall:      {metrics['recall']:.4f}\n")
        if metrics.get("roc_auc") is not None:
            f.write(f"ROC-AUC:    {metrics['roc_auc']:.4f}\n")
        f.write("\nConfusion matrix:\n")
        f.write(str(np.array(metrics["confusion_matrix"])))
    print(f"\nMetrics saved to {out_path}")


if __name__ == "__main__":
    main()
