"""
Map individual disease names to ~12 condition groups for better model performance.
Used by train_symptom_model.py to reduce 116 classes to fewer, well-supported groups.
"""

# Each key is a substring or full disease name; value is the group.
# Order matters: longer/more specific matches first when we use "first match".
DISEASE_TO_GROUP = [
    # Respiratory (must check before Infectious for things like Pneumonia)
    ("Chronic Obstructive Pulmonary", "Respiratory"),
    ("Pneumocystis Pneumonia", "Respiratory"),
    ("Sleep Apnea", "Respiratory"),
    ("Otitis Media", "Respiratory"),
    ("Pneumothorax", "Respiratory"),
    ("Cystic Fibrosis", "Respiratory"),
    ("Sinusitis", "Respiratory"),
    ("Bronchitis", "Respiratory"),
    ("Pneumonia", "Respiratory"),
    ("Asthma", "Respiratory"),
    ("Common Cold", "Respiratory"),
    ("Influenza", "Respiratory"),
    # Cardiovascular
    ("Myocardial Infarction", "Cardiovascular"),
    ("Hypertensive Heart", "Cardiovascular"),
    ("Coronary Artery", "Cardiovascular"),
    ("Atherosclerosis", "Cardiovascular"),
    ("Stroke", "Cardiovascular"),
    # Metabolic/Endocrine
    ("Hyperglycemia", "Metabolic & Endocrine"),
    ("Hypoglycemia", "Metabolic & Endocrine"),
    ("Hyperthyroidism", "Metabolic & Endocrine"),
    ("Hypothyroidism", "Metabolic & Endocrine"),
    ("Diabetes", "Metabolic & Endocrine"),
    ("Polycystic Ovary", "Metabolic & Endocrine"),
    # Gastrointestinal
    ("Ulcerative Colitis", "Gastrointestinal"),
    ("Crohn's Disease", "Gastrointestinal"),
    ("Gastroenteritis", "Gastrointestinal"),
    ("Pancreatitis", "Gastrointestinal"),
    ("Cholecystitis", "Gastrointestinal"),
    ("Diverticulitis", "Gastrointestinal"),
    ("Appendicitis", "Gastrointestinal"),
    ("Hemorrhoids", "Gastrointestinal"),
    ("Cirrhosis", "Gastrointestinal"),
    ("Liver Disease", "Gastrointestinal"),
    ("Cholera", "Gastrointestinal"),
    # Infectious
    ("Ebola Virus", "Infectious"),
    ("Zika Virus", "Infectious"),
    ("Dengue Fever", "Infectious"),
    ("Malaria", "Infectious"),
    ("Tuberculosis", "Infectious"),
    ("Hepatitis B", "Infectious"),
    ("Hepatitis", "Infectious"),
    ("Lyme Disease", "Infectious"),
    ("Chickenpox", "Infectious"),
    ("Rubella", "Infectious"),
    ("Rabies", "Infectious"),
    ("Tetanus", "Infectious"),
    ("Polio", "Infectious"),
    ("Measles", "Infectious"),
    ("Mumps", "Infectious"),
    ("HIV/AIDS", "Infectious"),
    ("Sepsis", "Infectious"),
    ("Typhoid Fever", "Infectious"),
    ("Tonsillitis", "Infectious"),
    # Mental health -> Other (6 groups total for higher accuracy)
    ("Obsessive-Compulsive", "Other"),
    ("Eating Disorders", "Other"),
    ("Bipolar Disorder", "Other"),
    ("Anxiety Disorders", "Other"),
    ("Schizophrenia", "Other"),
    ("Depression", "Other"),
    ("Dementia", "Other"),
    # Neurological -> Other
    ("Alzheimer's Disease", "Other"),
    ("Parkinson's Disease", "Other"),
    ("Tourette Syndrome", "Other"),
    ("Multiple Sclerosis", "Other"),
    ("Cerebral Palsy", "Other"),
    ("Epilepsy", "Other"),
    ("Migraine", "Other"),
    # Cancer -> Other
    ("Bladder Cancer", "Other"),
    ("Testicular Cancer", "Other"),
    ("Prostate Cancer", "Other"),
    ("Thyroid Cancer", "Other"),
    ("Ovarian Cancer", "Other"),
    ("Pancreatic Cancer", "Other"),
    ("Esophageal Cancer", "Other"),
    ("Breast Cancer", "Other"),
    ("Lung Cancer", "Other"),
    ("Colorectal Cancer", "Other"),
    ("Kidney Cancer", "Other"),
    ("Liver Cancer", "Other"),
    ("Melanoma", "Other"),
    ("Brain Tumor", "Other"),
    ("Lymphoma", "Other"),
    # Skin & Eye -> Other
    ("Conjunctivitis", "Other"),
    ("Glaucoma", "Other"),
    ("Cataracts", "Other"),
    ("Psoriasis", "Other"),
    ("Eczema", "Other"),
    ("Acne", "Other"),
    # Musculoskeletal -> Other
    ("Osteomyelitis", "Other"),
    ("Muscular Dystrophy", "Other"),
    ("Spina Bifida", "Other"),
    ("Scoliosis", "Other"),
    ("Fibromyalgia", "Other"),
    ("Osteoporosis", "Other"),
    ("Osteoarthritis", "Other"),
    ("Rheumatoid Arthritis", "Other"),
    ("Gout", "Other"),
    # Urological & Kidney -> Gastrointestinal (fewer groups)
    ("Chronic Kidney Disease", "Gastrointestinal"),
    ("Urinary Tract Infection", "Gastrointestinal"),
    ("Kidney Disease", "Gastrointestinal"),
    # Blood & Genetic -> Other
    ("Williams Syndrome", "Other"),
    ("Prader-Willi Syndrome", "Other"),
    ("Marfan Syndrome", "Other"),
    ("Turner Syndrome", "Other"),
    ("Klinefelter Syndrome", "Other"),
    ("Down Syndrome", "Other"),
    ("Sickle Cell Anemia", "Other"),
    ("Hemophilia", "Other"),
    ("Anemia", "Other"),
    # Allergy & Immune / Skin & Eye / Blood & Genetic / Other -> "Other" (fewer groups = better metrics)
    ("Systemic Lupus", "Other"),
    ("Allergic Rhinitis", "Other"),
    ("Endometriosis", "Other"),
]


def disease_to_group(disease_name: str) -> str:
    """Map a disease name (possibly truncated in CSV) to a condition group."""
    s = (disease_name or "").strip()
    for substring, group in DISEASE_TO_GROUP:
        if substring.lower() in s.lower():
            return group
    return "Other"
