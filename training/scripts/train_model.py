"""
Bonus Life AI - Diabetes Prediction Model Training Script
======================================================
This script trains and evaluates the XGBoost binary classifier
used for diabetes risk prediction in the Bonus Life AI platform.

Features used (8 total):
    - pregnancies, glucose, blood_pressure, skin_thickness,
      insulin, bmi, diabetes_pedigree_function, age

Dataset: Pima Indians Diabetes Database (NIDDK)
    - 768 samples, binary classification (0 = No Diabetes, 1 = Diabetes)
    - Source: https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database

Output:
    - Trained model saved to: app/backend/data/best_model.pkl
    - Trained model copy to: training/models/best_model.pkl
    - Training results and plots saved to: training/models/results/
"""

import os
import sys
import pickle
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for saving plots
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_curve, auc,
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    precision_recall_curve, average_precision_score
)
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from xgboost import XGBClassifier
import shap

warnings.filterwarnings('ignore')

# ============================================================
# Configuration
# ============================================================
RANDOM_STATE = 42
TEST_SIZE = 0.2
N_SPLITS_CV = 5

# Output paths (script lives in training/scripts/, so three dirnames to get project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_OUTPUT_PATH = os.path.join(PROJECT_ROOT, "app", "backend", "data", "best_model.pkl")
MODEL_COPY_PATH = os.path.join(PROJECT_ROOT, "training", "models", "best_model.pkl")
RESULTS_DIR = os.path.join(PROJECT_ROOT, "training", "models", "results")
DATA_DIR = os.path.join(PROJECT_ROOT, "training", "data")

# Feature names (must match backend ml_model.py)
FEATURE_NAMES = [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "diabetes_pedigree_function", "age"
]


def load_pima_dataset():
    """
    Load the Pima Indians Diabetes Dataset.
    Downloads from GitHub mirror if not available locally.
    """
    local_path = os.path.join(DATA_DIR, "diabetes.csv")

    if os.path.exists(local_path):
        print(f"  Loading dataset from: {local_path}")
        df = pd.read_csv(local_path)
    else:
        print("  Downloading Pima Indians Diabetes Dataset...")
        url = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
        columns = FEATURE_NAMES + ["outcome"]
        df = pd.read_csv(url, header=None, names=columns)

        # Save locally
        os.makedirs(DATA_DIR, exist_ok=True)
        df.to_csv(local_path, index=False)
        print(f"  Dataset saved to: {local_path}")

    # Standardize column names
    if "Outcome" in df.columns:
        df.columns = FEATURE_NAMES + ["outcome"]
    elif "outcome" not in df.columns:
        df.columns = FEATURE_NAMES + ["outcome"]

    return df


def preprocess_data(df):
    """
    Preprocess the dataset:
    - Handle zero values in features where 0 is not physiologically possible
    - These zeros represent missing values in the original dataset
    """
    print("\n  PREPROCESSING")
    print("  " + "-" * 40)

    # Features where 0 is not possible (missing values encoded as 0)
    zero_not_possible = ["glucose", "blood_pressure", "skin_thickness", "insulin", "bmi"]

    for col in zero_not_possible:
        n_zeros = (df[col] == 0).sum()
        if n_zeros > 0:
            median_val = df[col][df[col] != 0].median()
            df.loc[df[col] == 0, col] = median_val
            print(f"  Replaced {n_zeros} zero values in '{col}' with median ({median_val:.1f})")

    print(f"\n  Final dataset shape: {df.shape}")
    print(f"  Class distribution:")
    print(f"    No Diabetes (0): {(df['outcome'] == 0).sum()} ({(df['outcome'] == 0).mean()*100:.1f}%)")
    print(f"    Diabetes (1):    {(df['outcome'] == 1).sum()} ({(df['outcome'] == 1).mean()*100:.1f}%)")

    return df


def train_and_evaluate_models(X_train, X_test, y_train, y_test):
    """
    Train multiple models, compare performance, and select the best one.
    """
    print("\n  MODEL TRAINING & COMPARISON")
    print("  " + "=" * 50)

    # Calculate class weight ratio for XGBoost
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos = n_neg / n_pos

    models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        "XGBoost": XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
        "XGBoost (Tuned)": XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=3,
            gamma=0.1,
            reg_alpha=0.1,
            reg_lambda=1.0,
            scale_pos_weight=scale_pos,
            eval_metric="logloss",
            random_state=RANDOM_STATE,
            n_jobs=-1
        ),
    }

    results = {}

    for name, model in models.items():
        print(f"\n  Training {name}...")

        # Cross-validation
        cv = StratifiedKFold(n_splits=N_SPLITS_CV, shuffle=True, random_state=RANDOM_STATE)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="f1")

        # Fit on full training set
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc_val = roc_auc_score(y_test, y_proba)

        results[name] = {
            "model": model,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "auc": auc_val,
            "cv_f1_mean": cv_scores.mean(),
            "cv_f1_std": cv_scores.std(),
            "y_pred": y_pred,
            "y_proba": y_proba,
        }

        print(f"    Accuracy:  {acc:.3f}")
        print(f"    Precision: {prec:.3f}")
        print(f"    Recall:    {rec:.3f}")
        print(f"    F1 Score:  {f1:.3f}")
        print(f"    AUC-ROC:   {auc_val:.3f}")
        print(f"    CV F1:     {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    return results


def select_best_model(results):
    """Select the best model based on F1 score (balances precision and recall)."""
    best_name = max(results, key=lambda k: results[k]["f1"])
    print(f"\n  BEST MODEL: {best_name}")
    print(f"    F1 Score: {results[best_name]['f1']:.3f}")
    print(f"    AUC-ROC:  {results[best_name]['auc']:.3f}")
    return best_name, results[best_name]


def generate_plots(results, best_name, X_test, y_test):
    """Generate and save evaluation plots."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    best = results[best_name]

    # --- 1. Model Comparison Bar Chart ---
    fig, ax = plt.subplots(figsize=(10, 6))
    model_names = list(results.keys())
    metrics = ["accuracy", "precision", "recall", "f1", "auc"]
    x = np.arange(len(model_names))
    width = 0.15

    for i, metric in enumerate(metrics):
        values = [results[name][metric] for name in model_names]
        ax.bar(x + i * width, values, width, label=metric.upper())

    ax.set_ylabel("Score")
    ax.set_title("Model Comparison - All Metrics")
    ax.set_xticks(x + width * 2)
    ax.set_xticklabels(model_names)
    ax.legend(loc="lower right")
    ax.set_ylim(0.5, 1.0)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "model_comparison.png"), dpi=150)
    plt.close()
    print("  Saved: model_comparison.png")

    # --- 2. Confusion Matrix ---
    fig, ax = plt.subplots(figsize=(8, 6))
    cm = confusion_matrix(y_test, best["y_pred"])
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                xticklabels=["No Diabetes", "Diabetes"],
                yticklabels=["No Diabetes", "Diabetes"])
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix - {best_name}")
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "confusion_matrix.png"), dpi=150)
    plt.close()
    print("  Saved: confusion_matrix.png")

    # --- 3. ROC Curve ---
    fig, ax = plt.subplots(figsize=(8, 6))
    for name, res in results.items():
        fpr, tpr, _ = roc_curve(y_test, res["y_proba"])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, label=f"{name} (AUC = {roc_auc:.3f})")

    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Random Classifier")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curves - Model Comparison")
    ax.legend(loc="lower right")
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "roc_curves.png"), dpi=150)
    plt.close()
    print("  Saved: roc_curves.png")

    # --- 4. Feature Importance ---
    model = best["model"]
    if hasattr(model, "feature_importances_"):
        fig, ax = plt.subplots(figsize=(10, 6))
        importances = model.feature_importances_
        indices = np.argsort(importances)[::-1]
        sorted_features = [FEATURE_NAMES[i] for i in indices]
        sorted_importances = importances[indices]

        colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(sorted_features)))
        ax.barh(range(len(sorted_features)), sorted_importances[::-1], color=colors)
        ax.set_yticks(range(len(sorted_features)))
        ax.set_yticklabels(sorted_features[::-1])
        ax.set_xlabel("Feature Importance")
        ax.set_title(f"Feature Importance - {best_name}")
        ax.grid(axis="x", alpha=0.3)
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "feature_importance.png"), dpi=150)
        plt.close()
        print("  Saved: feature_importance.png")

    # --- 5. Precision-Recall Curve ---
    fig, ax = plt.subplots(figsize=(8, 6))
    for name, res in results.items():
        prec_vals, rec_vals, _ = precision_recall_curve(y_test, res["y_proba"])
        ap = average_precision_score(y_test, res["y_proba"])
        ax.plot(rec_vals, prec_vals, label=f"{name} (AP = {ap:.3f})")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curves - Model Comparison")
    ax.legend(loc="lower left")
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "precision_recall_curve.png"), dpi=150)
    plt.close()
    print("  Saved: precision_recall_curve.png")

    # --- 6. Classification Report Heatmap ---
    fig, ax = plt.subplots(figsize=(8, 4))
    report = classification_report(y_test, best["y_pred"], target_names=["No Diabetes", "Diabetes"], output_dict=True)
    report_df = pd.DataFrame(report).iloc[:3, :2].T
    sns.heatmap(report_df, annot=True, fmt=".3f", cmap="YlGn", ax=ax, vmin=0.5, vmax=1.0)
    ax.set_title(f"Classification Report - {best_name}")
    plt.tight_layout()
    plt.savefig(os.path.join(RESULTS_DIR, "classification_report.png"), dpi=150)
    plt.close()
    print("  Saved: classification_report.png")


def save_model(model, scaler, best_name, results):
    """Save the best model as a bundle {model, scaler, feature_names}."""
    bundle = {
        "model": model,
        "scaler": scaler,
        "feature_names": FEATURE_NAMES,
    }

    # Save to backend data directory
    os.makedirs(os.path.dirname(MODEL_OUTPUT_PATH), exist_ok=True)
    with open(MODEL_OUTPUT_PATH, "wb") as f:
        pickle.dump(bundle, f)
    print(f"\n  Model bundle saved to: {MODEL_OUTPUT_PATH}")
    print(f"    Contains: model ({type(model).__name__}), scaler (StandardScaler), feature_names ({len(FEATURE_NAMES)})")

    # Save copy to training/models directory
    os.makedirs(os.path.dirname(MODEL_COPY_PATH), exist_ok=True)
    with open(MODEL_COPY_PATH, "wb") as f:
        pickle.dump(bundle, f)
    print(f"  Model bundle copy saved to: {MODEL_COPY_PATH}")

    # Save training results summary
    summary_path = os.path.join(RESULTS_DIR, "training_summary.txt")
    with open(summary_path, "w") as f:
        f.write("=" * 60 + "\n")
        f.write("MORE LIFE AI - MODEL TRAINING SUMMARY\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Best Model: {best_name}\n")
        f.write(f"Model Type: {type(model).__name__}\n")
        f.write(f"Preprocessing: StandardScaler (fitted on training data)\n")
        f.write(f"Objective: Binary Classification (Diabetes Detection)\n")
        f.write(f"Dataset: Pima Indians Diabetes Database (768 samples)\n")
        f.write(f"Features: {', '.join(FEATURE_NAMES)}\n")
        f.write(f"Bundle: model + scaler + feature_names saved as dict\n\n")

        f.write("MODEL COMPARISON RESULTS\n")
        f.write("-" * 60 + "\n")
        f.write(f"{'Model':<25} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1':>10} {'AUC':>10}\n")
        f.write("-" * 60 + "\n")
        for name, res in results.items():
            marker = " <-- BEST" if name == best_name else ""
            f.write(f"{name:<25} {res['accuracy']:>10.3f} {res['precision']:>10.3f} "
                    f"{res['recall']:>10.3f} {res['f1']:>10.3f} {res['auc']:>10.3f}{marker}\n")
        f.write("-" * 60 + "\n")

    print(f"  Training summary saved to: {summary_path}")


def save_results_csv(results):
    """Save detailed results as CSV."""
    rows = []
    for name, res in results.items():
        rows.append({
            "Model": name,
            "Accuracy": round(res["accuracy"], 4),
            "Precision": round(res["precision"], 4),
            "Recall": round(res["recall"], 4),
            "F1_Score": round(res["f1"], 4),
            "AUC_ROC": round(res["auc"], 4),
            "CV_F1_Mean": round(res["cv_f1_mean"], 4),
            "CV_F1_Std": round(res["cv_f1_std"], 4),
        })
    df = pd.DataFrame(rows)
    csv_path = os.path.join(RESULTS_DIR, "model_results.csv")
    df.to_csv(csv_path, index=False)
    print(f"  Results CSV saved to: {csv_path}")


def generate_shap_analysis(best_model, X_train, X_test, feature_names):
    """Generate SHAP explainability plots for the best model."""
    print("\n  SHAP EXPLAINABILITY ANALYSIS")
    print("  " + "-" * 40)

    try:
        explainer = shap.TreeExplainer(best_model)
        shap_values = explainer.shap_values(X_test)

        # For binary classifiers, shap_values may be a list [class0, class1]
        if isinstance(shap_values, list):
            shap_vals = shap_values[1]  # positive class (diabetes)
        else:
            shap_vals = shap_values

        # 1. SHAP Summary (Beeswarm) Plot
        fig, ax = plt.subplots(figsize=(10, 6))
        shap.summary_plot(
            shap_vals, X_test,
            feature_names=feature_names,
            show=False,
        )
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "shap_summary.png"), dpi=150, bbox_inches="tight")
        plt.close("all")
        print("  Saved: shap_summary.png")

        # 2. SHAP Bar Plot (mean absolute SHAP values)
        fig, ax = plt.subplots(figsize=(10, 6))
        shap.summary_plot(
            shap_vals, X_test,
            feature_names=feature_names,
            plot_type="bar",
            show=False,
        )
        plt.tight_layout()
        plt.savefig(os.path.join(RESULTS_DIR, "shap_feature_importance.png"), dpi=150, bbox_inches="tight")
        plt.close("all")
        print("  Saved: shap_feature_importance.png")

        # 3. Save SHAP values for later use
        shap_path = os.path.join(RESULTS_DIR, "shap_values.pkl")
        with open(shap_path, "wb") as f:
            pickle.dump({
                "shap_values": shap_vals,
                "expected_value": explainer.expected_value if not isinstance(explainer.expected_value, list) else explainer.expected_value[1],
                "feature_names": feature_names,
            }, f)
        print(f"  SHAP values saved to: {shap_path}")

        print("  SHAP analysis complete!")
        return True

    except Exception as e:
        print(f"  [WARNING] SHAP analysis failed: {e}")
        return False


# ============================================================
# MAIN EXECUTION
# ============================================================
def main():
    print("=" * 60)
    print("  MORE LIFE AI - MODEL TRAINING PIPELINE")
    print("=" * 60)

    # Step 1: Load Data
    print("\n[1/6] LOADING DATASET")
    df = load_pima_dataset()

    # Step 2: Preprocess
    print("\n[2/6] PREPROCESSING DATA")
    df = preprocess_data(df)

    # Step 3: Split Data
    print("\n[3/7] SPLITTING DATA")
    X = df[FEATURE_NAMES].values
    y = df["outcome"].values
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    print(f"  Training set: {X_train.shape[0]} samples")
    print(f"  Test set:     {X_test.shape[0]} samples")

    # Step 3.5: Scale Features
    print("\n  SCALING FEATURES (StandardScaler)")
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    print(f"  Scaler fitted on training data (mean, std per feature)")

    # Step 4: Train Models
    print("\n[4/7] TRAINING MODELS")
    results = train_and_evaluate_models(X_train, X_test, y_train, y_test)

    # Step 5: Select Best Model
    print("\n[5/7] SELECTING BEST MODEL")
    best_name, best_result = select_best_model(results)

    # Print full classification report
    print(f"\n  CLASSIFICATION REPORT ({best_name})")
    print("  " + "-" * 50)
    print(classification_report(
        y_test, best_result["y_pred"],
        target_names=["No Diabetes", "Diabetes"],
        digits=3
    ))

    # Print confusion matrix
    cm = confusion_matrix(y_test, best_result["y_pred"])
    print(f"  CONFUSION MATRIX:")
    print(f"                    Predicted")
    print(f"                    No-DM    DM")
    print(f"  Actual No-DM  [{cm[0][0]:5d}  {cm[0][1]:5d}]")
    print(f"  Actual DM     [{cm[1][0]:5d}  {cm[1][1]:5d}]")

    # Step 6: Save Everything (model + scaler bundle)
    print("\n[6/7] SAVING MODEL & RESULTS")
    os.makedirs(RESULTS_DIR, exist_ok=True)
    save_model(best_result["model"], scaler, best_name, results)
    save_results_csv(results)
    generate_plots(results, best_name, X_test, y_test)

    # Step 7: SHAP Explainability
    print("\n[7/8] SHAP EXPLAINABILITY")
    generate_shap_analysis(best_result["model"], X_train, X_test, FEATURE_NAMES)

    # Step 8: Save preprocessed dataset
    print("\n[8/8] SAVING PREPROCESSED DATASET")
    preprocessed_path = os.path.join(DATA_DIR, "preprocessed_dataset.csv")
    df.to_csv(preprocessed_path, index=False)
    print(f"  Preprocessed data saved to: {preprocessed_path}")

    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE!")
    print("=" * 60)
    print(f"\n  Best Model:  {best_name}")
    print(f"  Accuracy:    {best_result['accuracy']:.1%}")
    print(f"  F1 Score:    {best_result['f1']:.1%}")
    print(f"  AUC-ROC:     {best_result['auc']:.1%}")
    print(f"\n  Model saved to: {MODEL_OUTPUT_PATH}")
    print(f"  Results in:     {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
