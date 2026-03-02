"""
Train heart disease prediction model (UCI Cleveland) and save Heart.pkl.
Run from backend root: python -m scripts.train_heart_model
Reads data/heart.csv if present, else downloads Cleveland data from UCI.
Saves data/Heart.pkl with bundle: model, scaler, feature_names.
"""
import os
import sys

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
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, precision_score, recall_score, confusion_matrix

# Cleveland heart disease: 13 features + target (num: 0=no, 1-4=disease)
FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]
UCI_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data"
DATA_DIR = os.path.join(BACKEND_DIR, "data")
HEART_CSV = os.path.join(DATA_DIR, "heart.csv")
MODEL_PATH = os.path.join(DATA_DIR, "Heart.pkl")
METRICS_PATH = os.path.join(DATA_DIR, "heart_model_metrics.txt")


def load_data():
    """Load Cleveland heart data; return X (DataFrame), y (binary)."""
    local = os.path.join(DATA_DIR, "augmented_heart.csv")
    if os.path.exists(local):
        df = pd.read_csv(local)
        # Expect columns matching FEATURE_NAMES + target (e.g. target, num, disease)
        target_col = "target" if "target" in df.columns else "num"
        if target_col not in df.columns and "disease" in df.columns:
            target_col = "disease"
        y = (df[target_col] > 0).astype(int).values
        X = df[[c for c in FEATURE_NAMES if c in df.columns]]
        if list(X.columns) != FEATURE_NAMES:
            for c in FEATURE_NAMES:
                if c not in X.columns:
                    X[c] = 0
            X = X[FEATURE_NAMES]
        return X, y

    if os.path.exists(HEART_CSV):
        df = pd.read_csv(HEART_CSV)
        target_col = "target" if "target" in df.columns else "num"
        y = (df[target_col] > 0).astype(int).values
        X = df[FEATURE_NAMES]
        return X, y

    # UCI: no header, ? for missing
    df = pd.read_csv(UCI_URL, header=None)
    df.columns = FEATURE_NAMES + ["num"]
    df = df.replace("?", np.nan)
    for col in ["ca", "thal"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.fillna(df.median(numeric_only=True))
    df["ca"] = df["ca"].clip(0, 3).astype(int)
    df["thal"] = df["thal"].clip(3, 7).astype(int)
    y = (df["num"] > 0).astype(int).values
    X = df[FEATURE_NAMES]
    return X, y


def main():
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train_s, y_train)
    os.makedirs(DATA_DIR, exist_ok=True)
    bundle = {"model": model, "scaler": scaler, "feature_names": FEATURE_NAMES}
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)
    pred = model.predict(X_test_s)
    proba = model.predict_proba(X_test_s)[:, 1]
    acc = accuracy_score(y_test, pred)
    f1 = f1_score(y_test, pred)
    roc = roc_auc_score(y_test, proba)
    prec = precision_score(y_test, pred, zero_division=0)
    rec = recall_score(y_test, pred, zero_division=0)
    cm = confusion_matrix(y_test, pred)
    print(f"Saved {MODEL_PATH}")
    print(f"Accuracy: {acc:.3f}  F1: {f1:.3f}  ROC-AUC: {roc:.3f}")

    with open(METRICS_PATH, "w") as f:
        f.write("Heart model evaluation metrics\n")
        f.write("=================================\n")
        f.write(f"Accuracy:    {acc:.4f} ({acc*100:.2f}%)\n")
        f.write(f"F1 (binary): {f1:.4f}\n")
        f.write(f"Precision:   {prec:.4f}\n")
        f.write(f"Recall:      {rec:.4f}\n")
        f.write(f"ROC-AUC:     {roc:.4f}\n\n")
        f.write("Confusion matrix:\n")
        f.write(str(cm) + "\n")
    print(f"Metrics saved to {METRICS_PATH}")


if __name__ == "__main__":
    main()
