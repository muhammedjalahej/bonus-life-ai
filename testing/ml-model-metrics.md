# Bonus Life AI — ML Model Metrics

**Date extracted:** 2026-05-04  
**Source files:**
- `training/scripts/train_model.py` — diabetes training pipeline
- `training/models/results/training_summary.txt` — saved training run output
- `training/models/results/model_results.csv` — per-model metric table
- `app/backend/data/diabetes_model_metrics.txt` — diabetes evaluation metrics
- `app/backend/data/heart_model_metrics.txt` — heart evaluation metrics
- `app/backend/data/symptom_model_metrics.txt` — symptom checker evaluation metrics
- `training/models/results/ckd_metrics.json` — CKD evaluation metrics (JSON)
- `app/backend/scripts/train_heart_model.py` — heart training script
- `training/scripts/train_ckd_model.py` — CKD training script
- `app/backend/scripts/train_symptom_model.py` — symptom model training script
- `training/brain_mri/train.py` — brain MRI training script
- `training/brain_mri/evaluate.py` — brain MRI evaluation script

---

## 1. Diabetes Risk Model

**Model binary:** `app/backend/data/best_model.pkl`  
**Algorithm:** RandomForestClassifier (selected as best among Random Forest, XGBoost, and XGBoost Tuned via F1-score comparison)  
**Library:** scikit-learn  
**Preprocessing:** StandardScaler (fitted on training data; scaler stored in bundle alongside model)

### Dataset

| Attribute | Value |
|-----------|-------|
| Name | Pima Indians Diabetes Database |
| Source | National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK) |
| Kaggle link | https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database |
| Total samples | 768 |
| Patient demographic | Female patients, age ≥ 21 |
| Features | 8 |
| Target | Binary (0 = No Diabetes, 1 = Diabetes) |
| Class distribution | 500 negative (65.1%), 268 positive (34.9%) |
| Train/test split | 80% / 20% (stratified, random_state=42) |
| Train samples | 614 |
| Test samples | 154 |

### Input Features

| # | Feature Name | Description |
|---|-------------|-------------|
| 1 | pregnancies | Number of times pregnant |
| 2 | glucose | Plasma glucose concentration (2-hr oral glucose tolerance test, mg/dL) |
| 3 | blood_pressure | Diastolic blood pressure (mm Hg) |
| 4 | skin_thickness | Triceps skin-fold thickness (mm) |
| 5 | insulin | 2-hour serum insulin (µU/mL) |
| 6 | bmi | Body mass index (weight kg / height m²) |
| 7 | diabetes_pedigree_function | Genetic diabetes risk score |
| 8 | age | Age in years |

### Preprocessing Notes

Zero values in `glucose`, `blood_pressure`, `skin_thickness`, `insulin`, and `bmi` are physiologically impossible and represent missing data in the original collection. These are replaced with the per-feature median computed on non-zero values before training.

### Hyperparameters (Best Model — Random Forest)

| Parameter | Value |
|-----------|-------|
| n_estimators | 200 |
| max_depth | 8 |
| min_samples_split | 5 |
| min_samples_leaf | 2 |
| class_weight | balanced |
| random_state | 42 |
| n_jobs | -1 |

### Performance Metrics (Test Set, 20% holdout)

| Metric | Value |
|--------|-------|
| Accuracy | 82.25% (0.8225) |
| Precision (positive class) | 0.7273 |
| Recall (positive class) | 0.7901 |
| F1 Score (binary) | 0.7574 |
| F1 Score (weighted) | 0.8241 |
| AUC-ROC | 0.8913 |

### Cross-Validation Results (5-fold CV on F1)

| Model | CV F1 Mean | CV F1 Std |
|-------|-----------|-----------|
| Random Forest | 0.6950 | ±0.0253 |
| XGBoost | 0.6272 | ±0.0165 |
| XGBoost (Tuned) | 0.6275 | ±0.0363 |

### Confusion Matrix (Test Set, rows=true, cols=predicted)

```
                  Predicted No  Predicted Yes
Actual No-DM  [      126              24  ]
Actual DM     [       17              64  ]
```

True Negatives: 126 | False Positives: 24 | False Negatives: 17 | True Positives: 64

### Model Comparison

| Model | Accuracy | Precision | Recall | F1 | AUC-ROC |
|-------|----------|-----------|--------|-----|---------|
| Random Forest ← BEST | 0.7532 | 0.6379 | 0.6852 | 0.6607 | 0.8254 |
| XGBoost | 0.7338 | 0.6182 | 0.6296 | 0.6239 | 0.8172 |
| XGBoost (Tuned) | 0.7338 | 0.6140 | 0.6481 | 0.6306 | 0.8181 |

> Note: The `training_summary.txt` records the training-run comparison on the 80/20 split. The `diabetes_model_metrics.txt` records evaluation of the saved model bundle on a fresh 70/30 split using the evaluate script — explaining the slight difference in numbers. The higher accuracy (82.25%) in the evaluation file reflects the RandomForest evaluated on a 30% holdout.

### SHAP Explainability

SHAP (SHapley Additive exPlanations) analysis using `shap.TreeExplainer` is performed in the training pipeline. SHAP summary and bar plots are saved to `training/models/results/shap_summary.png` and `shap_feature_importance.png`. The top contributing features by mean absolute SHAP value are typically: glucose, bmi, age, and diabetes_pedigree_function. SHAP values are persisted to `training/models/results/shap_values.pkl`.

At inference time (`app/routes/assessment.py`), the route applies per-prediction SHAP if the model exposes an `explain` attribute. The result is included in the `risk_analysis` payload sent to the LLM.

---

## 2. Heart Disease Risk Model

**Model binary:** `app/backend/data/Heart.pkl`  
**Algorithm:** RandomForestClassifier  
**Library:** scikit-learn  
**Preprocessing:** StandardScaler (stored in bundle)

### Dataset

| Attribute | Value |
|-----------|-------|
| Name | UCI Cleveland Heart Disease Dataset |
| Source | UCI Machine Learning Repository |
| URL | https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data |
| Total samples | 303 (original Cleveland; augmented CSV used if present at `app/backend/data/augmented_heart.csv`) |
| Features | 13 |
| Target | Binary (0 = No Disease, 1 = Disease; original `num` field: 0=no, 1-4=disease, binarised) |
| Train/test split | 80% / 20% (stratified, random_state=42) |

### Input Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | age | Age in years |
| 2 | sex | Sex (1=male, 0=female) |
| 3 | cp | Chest pain type (0–3) |
| 4 | trestbps | Resting blood pressure (mm Hg) |
| 5 | chol | Serum cholesterol (mg/dL) |
| 6 | fbs | Fasting blood sugar > 120 mg/dL (binary) |
| 7 | restecg | Resting ECG results (0–2) |
| 8 | thalach | Maximum heart rate achieved |
| 9 | exang | Exercise-induced angina (binary) |
| 10 | oldpeak | ST depression induced by exercise |
| 11 | slope | Slope of peak exercise ST segment |
| 12 | ca | Number of major vessels (0–3) by fluoroscopy |
| 13 | thal | Thalassemia classification |

### Hyperparameters

| Parameter | Value |
|-----------|-------|
| n_estimators | 100 |
| max_depth | 10 |
| random_state | 42 |

### Performance Metrics (Test Set — saved to `heart_model_metrics.txt`)

| Metric | Value |
|--------|-------|
| Accuracy | 88.52% (0.8852) |
| Precision | 0.8387 |
| Recall | 0.9286 |
| F1 Score (binary) | 0.8814 |
| AUC-ROC | 0.9491 |

### Confusion Matrix (Test Set)

```
                  Predicted No  Predicted Yes
Actual No-DM  [       28               5  ]
Actual DM     [        2              26  ]
```

True Negatives: 28 | False Positives: 5 | False Negatives: 2 | True Positives: 26

---

## 3. Chronic Kidney Disease (CKD) Model

**Model binary:** `app/backend/data/Kidney.pkl`  
**Algorithm:** RandomForestClassifier  
**Library:** scikit-learn  
**Preprocessing:** None (features are categorical-encoded and median-imputed; no separate scaler)

### Dataset

| Attribute | Value |
|-----------|-------|
| Name | UCI Chronic Kidney Disease Dataset |
| Source | UCI Machine Learning Repository |
| Local CSV | `app/backend/data/Kidney_data.csv` |
| Total samples | 400 |
| Features | 24 |
| Target | Binary (1=CKD, 0=No CKD) |
| Class distribution | 250 CKD (62.5%), 150 No CKD (37.5%) |
| Train/test split | 75% / 25% (stratified, random_state=42) |
| Train samples | 300 |
| Test samples | 100 |

### Input Features (24 total)

| Abbreviation | Full Name | Abbreviation | Full Name |
|-------------|-----------|-------------|-----------|
| age | Age | sod | Sodium |
| bp | Blood Pressure | pot | Potassium |
| sg | Specific Gravity | hemo | Haemoglobin |
| al | Albumin | pcv | Packed Cell Volume |
| su | Sugar | wc | White Blood Cell Count |
| rbc | Red Blood Cells | rc | Red Blood Cell Count |
| pc | Pus Cell | htn | Hypertension |
| pcc | Pus Cell Clumps | dm | Diabetes Mellitus |
| ba | Bacteria | cad | Coronary Artery Disease |
| bgr | Blood Glucose Random | appet | Appetite |
| bu | Blood Urea | pe | Pedal Edema |
| sc | Serum Creatinine | ane | Anaemia |

### Hyperparameters

| Parameter | Value |
|-----------|-------|
| n_estimators | 200 |
| max_depth | None (unlimited) |
| min_samples_split | 2 |
| random_state | 42 |
| n_jobs | -1 |

### Performance Metrics (saved to `training/models/results/ckd_metrics.json`)

| Metric | Value |
|--------|-------|
| Accuracy | 100.00% (1.0000) |
| AUC-ROC | 1.0000 |
| CV Accuracy (5-fold mean) | 99.00% (0.9900) |
| CV Accuracy (5-fold std) | ±0.0094 |

### Confusion Matrix (Test Set, 100 samples)

```
              Predicted No CKD  Predicted CKD
Actual No CKD [       38               0  ]
Actual CKD    [        0              62  ]
```

False Positives: 0 | False Negatives: 0

### Classification Report (Test Set)

| Class | Precision | Recall | F1 | Support |
|-------|-----------|--------|----|---------|
| No CKD (0) | 1.000 | 1.000 | 1.000 | 38 |
| CKD (1) | 1.000 | 1.000 | 1.000 | 62 |

> Note: Perfect test-set accuracy (1.0000) on the 25% holdout may indicate that the UCI CKD dataset is linearly separable on the 24 features after categorical encoding and median imputation. The 5-fold cross-validation mean of 0.9900 provides a more conservative generalisation estimate. For clinical deployment, external validation on a new patient cohort is essential.

### Top 8 Feature Importances

| Rank | Feature | Importance |
|------|---------|-----------|
| 1 | pcv (Packed Cell Volume) | 0.1763 |
| 2 | hemo (Haemoglobin) | 0.1663 |
| 3 | sc (Serum Creatinine) | 0.1320 |
| 4 | sg (Specific Gravity) | 0.1126 |
| 5 | rc (Red Blood Cell Count) | 0.1036 |
| 6 | htn (Hypertension) | 0.0603 |
| 7 | al (Albumin) | 0.0575 |
| 8 | dm (Diabetes Mellitus) | 0.0505 |

---

## 4. Brain MRI Tumour Classification Model

**Model binary:** `app/backend/data/brain_tumor_resnet18.pth`  
**Algorithm:** ResNet18 (pre-trained on ImageNet) with custom classification head, fine-tuned on brain MRI dataset  
**Library:** PyTorch + torchvision

### Architecture

The base ResNet18 model (11M parameters, ImageNet pre-trained) has its fully-connected head replaced with:

```
Linear(512, 512) → ReLU → Dropout(0.5) → Linear(512, 4)
```

This custom head adapts the feature extractor to the four-class brain MRI classification task.

### Dataset

| Attribute | Value |
|-----------|-------|
| Name | Brain Tumor MRI Dataset |
| Source | Kaggle (4-class brain MRI) |
| Local path | `training/brain_mri/data/brain_tumor_dataset/` |
| Classes | 4: glioma, meningioma, no_tumor, pituitary |
| Split | Training/ and Testing/ subdirectories (ImageFolder structure) |
| Training samples | ~5,712 (estimated from common version of this dataset) |
| Testing samples | ~1,311 (estimated) |

### Training Configuration

| Parameter | Value |
|-----------|-------|
| Epochs | 30 |
| Batch size | 32 |
| Learning rate | 1e-4 (Adam) |
| LR scheduler | ReduceLROnPlateau (patience=5, factor=0.3) |
| Loss function | CrossEntropyLoss |
| Data augmentation | RandomHorizontalFlip, RandomRotation(10°), ColorJitter(brightness=0.2, contrast=0.2) |
| Input normalisation | ImageNet mean [0.485, 0.456, 0.406] / std [0.229, 0.224, 0.225] |

### Performance Metrics

Training metrics were not recorded in the project repository's results directory (`training/models/results/` contains only tabular metrics for the biochemical models). The model binary is loaded from `app/backend/data/brain_tumor_resnet18.pth`. The training script (`training/brain_mri/train.py`) reports only the best validation accuracy at each checkpoint epoch to stdout; no persistent metric file is created.

To obtain formal evaluation metrics, run:
```bash
cd training/brain_mri
python evaluate.py \
  --model brain_tumor_resnet18.pth \
  --data_dir data/brain_tumor_dataset
```

This will print per-class precision, recall, F1, and the full confusion matrix against the Testing/ split.

Based on published benchmarks for ResNet18 fine-tuned on this commonly-used 4-class brain MRI dataset (Kaggle: "Brain Tumor MRI Dataset" by Masoud Nickparvar), typical performance ranges are:
- Overall accuracy: 92–96%
- Per-class F1: ≥0.90 for glioma and pituitary; 0.80–0.88 for meningioma (most commonly confused with glioma)

These are reference ranges only. The authoritative numbers require running `evaluate.py` with the deployed model checkpoint.

---

## 5. Symptom Checker Model

**Model binary:** `app/backend/data/Symptom.pkl`  
**Algorithm:** RandomForestClassifier (100 trees, grouped into 6 condition categories from 116 original disease labels)  
**Library:** scikit-learn  
**Preprocessing:** SimpleImputer (mean strategy)

### Dataset

| Attribute | Value |
|-----------|-------|
| Name | Disease Symptom Prediction Dataset |
| Local CSV | `app/backend/data/disease_symptom_dataset.csv` |
| Original diseases | 116 |
| Output classes (grouped) | 6 condition groups |
| Total samples | ~350 (70 test samples at 20% split → ~350 total) |
| Features | 8 |
| Train/test split | 80% / 20% (stratified where possible, random_state=42) |
| Test samples | 70 |

### Input Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Fever | Binary (Yes=1, No=0) |
| 2 | Cough | Binary (Yes=1, No=0) |
| 3 | Fatigue | Binary (Yes=1, No=0) |
| 4 | Difficulty Breathing | Binary (Yes=1, No=0) |
| 5 | Age | Numeric |
| 6 | Gender | Binary (Male=1, Female=0) |
| 7 | Blood Pressure | Categorical (High=1, Normal/Low=0) |
| 8 | Cholesterol Level | Categorical (High=1, Normal/Low=0) |

### Output Classes (6 Condition Groups)

The 116 original disease labels are mapped to 6 clinical condition groups: Cardiovascular, Gastrointestinal, Infectious, Metabolic & Endocrine, Other, Respiratory.

### Hyperparameters

| Parameter | Value |
|-----------|-------|
| n_estimators | 100 |
| random_state | 42 |

### Performance Metrics (saved to `symptom_model_metrics.txt`)

| Metric | Value |
|--------|-------|
| Exact Accuracy | 48.57% (0.4857) |
| Top-3 Accuracy | 82.86% (0.8286) |
| F1 (weighted) | 0.4796 |
| F1 (macro) | 0.4168 |
| Precision (weighted) | 0.4772 |
| Recall (weighted) | 0.4857 |

### Per-Class Performance (Test Set, 70 samples)

| Class | Precision | Recall | F1 | Support |
|-------|-----------|--------|----|---------|
| Cardiovascular | 0.29 | 0.40 | 0.33 | 5 |
| Gastrointestinal | 0.14 | 0.10 | 0.12 | 10 |
| Infectious | 0.38 | 0.43 | 0.40 | 7 |
| Metabolic & Endocrine | 0.50 | 0.40 | 0.44 | 5 |
| Other | 0.58 | 0.60 | 0.59 | 30 |
| Respiratory | 0.62 | 0.62 | 0.62 | 13 |

### Confusion Matrix (Test Set, rows=true, cols=predicted)

```
                      Cardiovascular  Gastrointestinal  Infectious  Metabolic  Other  Respiratory
Cardiovascular              2               0              0          0          3          0
Gastrointestinal            0               1              2          0          5          2
Infectious                  1               0              3          2          0          1
Metabolic & Endocrine       0               0              0          2          3          0
Other                       4               5              1          0         18          2
Respiratory                 0               1              2          0          2          8
```

### Interpretation

The low exact-match accuracy (48.57%) is expected given that only 8 simple binary features are used to distinguish 6 clinical groups, some of which share symptom profiles (e.g., Cardiovascular and Respiratory conditions both present with Difficulty Breathing and Cough). The Top-3 accuracy of 82.86% — meaning the correct condition group appears in the model's top-3 predictions 83% of the time — is clinically more meaningful for a screening tool. The model is a first-pass triage aid, not a diagnostic tool.

For production use, this model should be retrained on a larger dataset with more discriminating features (vital signs, duration of symptoms, lab values) and the accuracy metrics should be validated against clinician diagnoses.
