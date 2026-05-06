#!/usr/bin/env python3
"""
Brain MRI ResNet18 Fine-Tuning Training Script — Bonus Life AI

Fine-tunes a ResNet18 (pretrained on ImageNet) on the Brain Tumor MRI dataset.
The resulting model is saved as brain_tumor_resnet18.pth and can be copied
to app/backend/data/ to replace the shipped model.

USAGE:
  cd training/brain_mri
  python train.py --data_dir data/brain_tumor_dataset --epochs 30

REQUIREMENTS:
  pip install torch torchvision tqdm matplotlib
"""

import argparse
import os
from pathlib import Path


def build_model(num_classes: int = 4):
    import torch.nn as nn
    from torchvision import models as tv_models
    model = tv_models.resnet18(weights=tv_models.ResNet18_Weights.IMAGENET1K_V1)
    # Replace FC head — must match the head used during inference in brain_mri_service.py
    model.fc = nn.Sequential(
        nn.Linear(512, 512),
        nn.ReLU(),
        nn.Dropout(0.5),
        nn.Linear(512, num_classes),
    )
    return model


def get_transforms():
    from torchvision import transforms
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


LABELS = ["glioma", "meningioma", "notumor", "pituitary"]
# Map "notumor" folder → service's "no tumor" label at inference time


def main():
    parser = argparse.ArgumentParser(description="Fine-tune ResNet18 for brain tumor classification")
    parser.add_argument("--data_dir", default="data/brain_tumor_dataset")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--output", default="brain_tumor_resnet18.pth")
    args = parser.parse_args()

    try:
        import torch
        import torch.nn as nn
        from torch.optim import Adam
        from torch.optim.lr_scheduler import ReduceLROnPlateau
        from torchvision import datasets
        from torch.utils.data import DataLoader
    except ImportError:
        print("ERROR: torch/torchvision not installed. Run: pip install torch torchvision")
        raise

    data_root = Path(args.data_dir)
    train_dir = data_root / "Training"
    test_dir  = data_root / "Testing"

    if not train_dir.exists():
        print(f"ERROR: Training data not found at {train_dir}")
        print("Run: python download_dataset.py --source kaggle")
        raise SystemExit(1)

    train_tf, val_tf = get_transforms()
    train_ds = datasets.ImageFolder(str(train_dir), transform=train_tf)
    val_ds   = datasets.ImageFolder(str(test_dir),  transform=val_tf)

    train_dl = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_dl   = DataLoader(val_ds,   batch_size=args.batch_size, shuffle=False, num_workers=2, pin_memory=True)

    print(f"Train: {len(train_ds)} images | Val: {len(val_ds)} images")
    print(f"Classes: {train_ds.classes}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    model = build_model(num_classes=len(train_ds.classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = Adam(model.parameters(), lr=args.lr)
    scheduler = ReduceLROnPlateau(optimizer, patience=5, factor=0.3)

    best_val_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        # ─── Train ───────────────────────────────────────────
        model.train()
        train_loss, train_correct = 0.0, 0
        for X, y in train_dl:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            out = model(X)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * X.size(0)
            train_correct += (out.argmax(1) == y).sum().item()

        # ─── Validate ─────────────────────────────────────────
        model.eval()
        val_loss, val_correct = 0.0, 0
        with torch.no_grad():
            for X, y in val_dl:
                X, y = X.to(device), y.to(device)
                out = model(X)
                val_loss += criterion(out, y).item() * X.size(0)
                val_correct += (out.argmax(1) == y).sum().item()

        t_acc = train_correct / len(train_ds)
        v_acc = val_correct / len(val_ds)
        v_loss = val_loss / len(val_ds)
        scheduler.step(v_loss)

        print(f"Epoch {epoch:3d}/{args.epochs} | Train Acc: {t_acc:.4f} | Val Acc: {v_acc:.4f}")

        if v_acc > best_val_acc:
            best_val_acc = v_acc
            torch.save(model.state_dict(), args.output)
            print(f"  ✓ Saved best model (val_acc={best_val_acc:.4f}) → {args.output}")

    print(f"\nTraining complete. Best val accuracy: {best_val_acc:.4f}")
    print(f"To deploy: copy {args.output} → app/backend/data/brain_tumor_resnet18.pth")


if __name__ == "__main__":
    main()
