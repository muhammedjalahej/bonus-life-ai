#!/usr/bin/env python3
"""
Brain MRI Dataset Download Script — Bonus Life AI

Downloads the Brain MRI Images for Brain Tumor Detection dataset from Kaggle.

DATASET:
  Kaggle: "Brain Tumor MRI Dataset" by Masoud Nickparvar
  URL: https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset
  Size: ~165 MB
  Classes: glioma / meningioma / notumor / pituitary

USAGE:
  # Install Kaggle CLI:
  pip install kaggle
  # Place your kaggle.json in ~/.kaggle/
  
  # Download the full dataset:
  python download_dataset.py --source kaggle

  # Just set up directory structure:
  python download_dataset.py --source sample

EXPECTED DIRECTORY STRUCTURE after download:
  training/brain_mri/data/brain_tumor_dataset/Training/glioma/
  training/brain_mri/data/brain_tumor_dataset/Training/meningioma/
  training/brain_mri/data/brain_tumor_dataset/Training/notumor/
  training/brain_mri/data/brain_tumor_dataset/Training/pituitary/
  training/brain_mri/data/brain_tumor_dataset/Testing/glioma/
  training/brain_mri/data/brain_tumor_dataset/Testing/meningioma/
  training/brain_mri/data/brain_tumor_dataset/Testing/notumor/
  training/brain_mri/data/brain_tumor_dataset/Testing/pituitary/
"""

import os
import sys
import argparse
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def download_kaggle():
    try:
        import kaggle  # noqa
    except ImportError:
        print("ERROR: kaggle package not installed. Run: pip install kaggle")
        sys.exit(1)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading Brain Tumor MRI dataset from Kaggle...")
    os.system(
        f'kaggle datasets download -d masoudnickparvar/brain-tumor-mri-dataset '
        f'-p "{DATA_DIR}" --unzip'
    )
    print(f"\nDataset downloaded to: {DATA_DIR}")
    print("Run training with: python train.py")


def create_sample_data():
    """Create placeholder directories and README."""
    sample_dir = Path(__file__).parent / "sample_data"
    sample_dir.mkdir(exist_ok=True)
    readme = sample_dir / "README.txt"
    readme.write_text(
        "Place sample brain MRI images here for quick testing.\n"
        "- sample_glioma.jpg    : A glioma MRI scan\n"
        "- sample_no_tumor.jpg  : A healthy brain MRI scan\n\n"
        "Free samples are available in the Kaggle dataset:\n"
        "  https://www.kaggle.com/datasets/masoudnickparvar/brain-tumor-mri-dataset\n"
    )
    print(f"Created sample_data at: {sample_dir}")
    print("\nTo download the full dataset, run:")
    print("  python download_dataset.py --source kaggle")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download brain MRI tumor dataset")
    parser.add_argument("--source", choices=["kaggle", "sample"], default="sample")
    args = parser.parse_args()

    if args.source == "kaggle":
        download_kaggle()
    else:
        create_sample_data()
