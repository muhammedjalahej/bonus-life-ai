#!/usr/bin/env python3
"""
Brain MRI Model Evaluation Script — Bonus Life AI

Evaluates a fine-tuned ResNet18 on the Brain Tumor MRI test split.
Prints per-class accuracy, precision, recall, F1, and confusion matrix.

USAGE:
  python evaluate.py --model brain_tumor_resnet18.pth --data_dir data/brain_tumor_dataset
"""

import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Evaluate Brain MRI ResNet18")
    parser.add_argument("--model", default="brain_tumor_resnet18.pth")
    parser.add_argument("--data_dir", default="data/brain_tumor_dataset")
    parser.add_argument("--batch_size", type=int, default=32)
    args = parser.parse_args()

    try:
        import torch
        import torch.nn as nn
        from torchvision import models, datasets, transforms
        from torch.utils.data import DataLoader
        from sklearn.metrics import classification_report, confusion_matrix
        import numpy as np
    except ImportError as e:
        print(f"ERROR: Missing dependency — {e}")
        print("Run: pip install torch torchvision scikit-learn")
        raise

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"ERROR: Model not found at {model_path}")
        raise SystemExit(1)

    test_dir = Path(args.data_dir) / "Testing"
    if not test_dir.exists():
        print(f"ERROR: Test data not found at {test_dir}")
        raise SystemExit(1)

    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    test_ds = datasets.ImageFolder(str(test_dir), transform=val_tf)
    test_dl = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=2)

    class_names = test_ds.classes
    num_classes = len(class_names)
    print(f"Test samples: {len(test_ds)} | Classes: {class_names}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights=None)
    model.fc = nn.Sequential(
        nn.Linear(512, 512),
        nn.ReLU(),
        nn.Dropout(0.5),
        nn.Linear(512, num_classes),
    )
    model.load_state_dict(torch.load(str(model_path), map_location=device))
    model.to(device)
    model.eval()
    print(f"Model loaded: {model_path} on {device}")

    y_true, y_pred = [], []
    with torch.no_grad():
        for X, y in test_dl:
            X = X.to(device)
            out = model(X)
            preds = out.argmax(1).cpu().numpy()
            y_pred.extend(preds)
            y_true.extend(y.numpy())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    print("\n── Classification Report ──────────────────────────────────────")
    print(classification_report(y_true, y_pred, target_names=class_names, digits=4))

    print("── Confusion Matrix ───────────────────────────────────────────")
    cm = confusion_matrix(y_true, y_pred)
    header = "".join(f"{c:>12}" for c in class_names)
    print(f"{'':20}{header}")
    for i, row in enumerate(cm):
        row_str = "".join(f"{v:>12}" for v in row)
        print(f"{class_names[i]:20}{row_str}")

    overall_acc = (y_true == y_pred).mean()
    print(f"\nOverall Accuracy: {overall_acc:.4f} ({overall_acc*100:.2f}%)")


if __name__ == "__main__":
    main()
