"""
Train symptom checker model (condition-group prediction from symptoms + profile).
Maps 116 diseases to ~12 condition groups for better metrics. Saves Symptom.pkl and symptom_model_metrics.txt.
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore", message="The number of unique classes")

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

import pickle
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    classification_report,
)

from scripts.disease_to_group import disease_to_group

DATA_DIR = os.path.join(BACKEND_DIR, "data")
CSV_PATH = os.path.join(DATA_DIR, "disease_symptom_dataset.csv")
MODEL_PATH = os.path.join(DATA_DIR, "Symptom.pkl")
METRICS_PATH = os.path.join(DATA_DIR, "symptom_model_metrics.txt")
FEATURE_NAMES = [
    "Fever", "Cough", "Fatigue", "Difficulty Breathing",
    "Age", "Gender", "Blood Pressure", "Cholesterol Level",
]


def main():
    if not os.path.exists(CSV_PATH):
        print(f"Dataset not found at {CSV_PATH}. Please add disease_symptom_dataset.csv")
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    # Map each disease to a condition group (12 groups instead of 116 diseases)
    df["Group"] = df["Disease"].astype(str).map(disease_to_group)
    le = LabelEncoder()
    df["GroupEncoded"] = le.fit_transform(df["Group"])

    # Map categorical columns
    for col in ["Fever", "Cough", "Fatigue", "Difficulty Breathing", "Outcome Variable"]:
        df[col] = df[col].map({"Yes": 1, "No": 0}).fillna(0).astype(int)
    df["Gender"] = df["Gender"].map({"Male": 1, "Female": 0}).fillna(0).astype(int)
    bp_map = {"High": 1, "Normal": 0, "Low": 0}
    df["Blood Pressure"] = df["Blood Pressure"].map(bp_map).fillna(0).astype(int)
    df["Cholesterol Level"] = df["Cholesterol Level"].map(bp_map).fillna(0).astype(int)

    X = df[FEATURE_NAMES]
    y = df["GroupEncoded"]

    imputer = SimpleImputer(strategy="mean")
    X_imputed = imputer.fit_transform(X)

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X_imputed, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = train_test_split(
            X_imputed, y, test_size=0.2, random_state=42
        )

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1_weighted = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    f1_macro = f1_score(y_test, y_pred, average="macro", zero_division=0)
    prec_weighted = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec_weighted = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    n_classes = len(le.classes_)
    cm = confusion_matrix(y_test, y_pred)

    # Top-3 accuracy: true label in model's top-3 predicted classes
    y_test_arr = np.asarray(y_test)
    proba = model.predict_proba(X_test)
    top3_pred = np.argsort(proba, axis=1)[:, -3:]
    top3_correct = np.array([y_test_arr[i] in top3_pred[i] for i in range(len(y_test_arr))])
    top3_acc = top3_correct.mean()

    labels_in_test = sorted(set(y_test) | set(y_pred))
    target_names_test = [le.classes_[i] for i in labels_in_test]
    report = classification_report(
        y_test, y_pred, labels=labels_in_test, target_names=target_names_test, zero_division=0
    )

    model_data = {
        "model": model,
        "label_encoder": le,
        "imputer": imputer,
        "feature_names": FEATURE_NAMES,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_data, f)
    print(f"Saved {MODEL_PATH}")

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        f.write("Symptom checker model evaluation metrics (condition groups)\n")
        f.write("============================================================\n")
        f.write(f"Number of classes (groups): {n_classes}\n")
        f.write(f"Test samples:               {len(y_test)}\n\n")
        f.write(f"Accuracy (exact):  {acc:.4f} ({acc*100:.2f}%)\n")
        f.write(f"Top-3 accuracy:    {top3_acc:.4f} ({top3_acc*100:.2f}%)\n")
        f.write(f"F1 (weighted):     {f1_weighted:.4f}\n")
        f.write(f"F1 (macro):       {f1_macro:.4f}\n")
        f.write(f"Precision:        {prec_weighted:.4f}\n")
        f.write(f"Recall:           {rec_weighted:.4f}\n\n")
        f.write("Classification report:\n")
        f.write(report)
        f.write("\nConfusion matrix (test set):\n")
        f.write(f"Shape: {cm.shape}\n")
        f.write(str(cm) + "\n")
    print(f"Metrics saved to {METRICS_PATH}")
    print(f"Accuracy: {acc:.3f}  Top-3: {top3_acc:.3f}  F1 (weighted): {f1_weighted:.3f}")


if __name__ == "__main__":
    main()
