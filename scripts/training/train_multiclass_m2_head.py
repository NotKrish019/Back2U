"""Train multi-class M2 Category Head on frozen DINOv2 representations.

Covers available categories in local dataset:
- laptop
- mobile_phone
- earphones
- headphones
- book
- other (cups, bottles, shoes, cameras, bikes)
"""
import os
import sys
import json
import torch
import torch.nn as nn
from pathlib import Path
from PIL import Image
import numpy as np
from collections import Counter, defaultdict
from torchvision import transforms
from torch.utils.data import TensorDataset, DataLoader

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.models.m2_classifier import M2CategoryHead

CATEGORIES = ["book", "earphones", "headphones", "laptop", "mobile_phone", "other"]
CAT_TO_IDX = {c: i for i, c in enumerate(CATEGORIES)}
IDX_TO_CAT = {str(i): c for i, c in enumerate(CATEGORIES)}

def gather_samples(per_class_limit=100):
    samples = []
    # 1. Earphones
    ep_dir = ROOT / "data/raw/earphones"
    if ep_dir.exists():
        files = [p for p in ep_dir.glob("*.jpg")][25:25 + per_class_limit]
        for f in files:
            samples.append({"path": str(f), "category": "earphones"})
            
    # 2. Headphones
    hp_dir = ROOT / "data/raw/headphones"
    if hp_dir.exists():
        files = [p for p in hp_dir.glob("*.jpg")][25:25 + per_class_limit]
        for f in files:
            samples.append({"path": str(f), "category": "headphones"})
            
    # 3. Smartphones
    sp_dir = ROOT / "data/raw/smartphones"
    if sp_dir.exists():
        files = list(sp_dir.rglob("*.jpg"))[25:25 + per_class_limit]
        for f in files:
            samples.append({"path": str(f), "category": "mobile_phone"})
            
    # 4. Laptop
    laptop_dir = ROOT / "data/raw/objectron_images/laptop"
    if laptop_dir.exists():
        files = list(laptop_dir.rglob("*.jpg"))[25:25 + per_class_limit]
        for f in files:
            samples.append({"path": str(f), "category": "laptop"})
            
    # 5. Book
    book_dir = ROOT / "data/raw/objectron_images/book"
    if book_dir.exists():
        files = list(book_dir.rglob("*.jpg"))[25:25 + per_class_limit]
        for f in files:
            samples.append({"path": str(f), "category": "book"})
            
    # 6. Other / Unknown
    for other_cat in ["bottle", "cup", "shoe", "chair", "bike", "camera"]:
        odir = ROOT / f"data/raw/objectron_images/{other_cat}"
        if odir.exists():
            files = list(odir.rglob("*.jpg"))[10:10 + (per_class_limit // 6 + 1)]
            for f in files:
                samples.append({"path": str(f), "category": "other"})
                
    return samples

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training multi-class M2 Category Head on device: {device}", flush=True)
    
    samples = gather_samples(per_class_limit=80)
    print(f"Gathered {len(samples)} training samples across categories: {Counter(s['category'] for s in samples)}", flush=True)
    
    # Pre-extract DINOv2 features
    print("Loading DINOv2 backbone for feature extraction...", flush=True)
    backbone = torch.hub.load("facebookresearch/dinov2", "dinov2_vits14").to(device).eval()
    for p in backbone.parameters():
        p.requires_grad = False
        
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
    ])
    
    features_list = []
    labels_list = []
    
    print("Extracting DINOv2 embeddings...", flush=True)
    batch_size = 32
    for i in range(0, len(samples), batch_size):
        batch = samples[i:i+batch_size]
        tensors = []
        for s in batch:
            img = Image.open(s["path"]).convert("RGB")
            tensors.append(transform(img))
        batch_t = torch.stack(tensors).to(device)
        with torch.no_grad():
            feats = backbone(batch_t).cpu()
        features_list.append(feats)
        for s in batch:
            labels_list.append(CAT_TO_IDX[s["category"]])
            
    X = torch.cat(features_list, dim=0)
    y = torch.tensor(labels_list, dtype=torch.long)
    print(f"Feature matrix: {X.shape}, labels: {y.shape}", flush=True)
    
    # Train M2 head (nn.Sequential(Linear(384, 128), GELU(), Dropout(0.1), Linear(128, 6)))
    head = nn.Sequential(
        nn.Linear(384, 128),
        nn.GELU(),
        nn.Dropout(0.1),
        nn.Linear(128, len(CATEGORIES))
    ).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(head.parameters(), lr=1e-3, weight_decay=1e-4)
    
    dataset = TensorDataset(X, y)
    loader = DataLoader(dataset, batch_size=32, shuffle=True)
    
    head.train()
    for epoch in range(25):
        epoch_loss = 0.0
        correct = 0
        total = 0
        for bx, by in loader:
            bx, by = bx.to(device), by.to(device)
            optimizer.zero_grad()
            logits = head(bx)
            loss = criterion(logits, by)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * bx.size(0)
            preds = logits.argmax(dim=-1)
            correct += (preds == by).sum().item()
            total += bx.size(0)
            
        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1:02d} | Loss: {epoch_loss/total:.4f} | Train Acc: {correct/total:.4f}", flush=True)
            
    head.eval()
    
    # Evaluate on the 155 test samples from scratch/evaluate_category_methods.py
    from scratch.evaluate_category_methods import load_evaluation_samples
    test_samples = load_evaluation_samples(per_class_limit=25)
    
    test_correct = 0
    per_class_stats = defaultdict(lambda: {"correct": 0, "total": 0, "predicted": 0})
    
    for i in range(0, len(test_samples), batch_size):
        batch = test_samples[i:i+batch_size]
        tensors = []
        for s in batch:
            img = Image.open(s["path"]).convert("RGB")
            tensors.append(transform(img))
        batch_t = torch.stack(tensors).to(device)
        with torch.no_grad():
            feats = backbone(batch_t)
            logits = head(feats)
            preds = logits.argmax(dim=-1).cpu().numpy()
            
        for j, s in enumerate(batch):
            gt = s["category"]
            pred = CATEGORIES[preds[j]]
            per_class_stats[gt]["total"] += 1
            per_class_stats[pred]["predicted"] += 1
            if pred == gt:
                test_correct += 1
                per_class_stats[gt]["correct"] += 1
                
    test_acc = test_correct / len(test_samples)
    print(f"\nOption B (Retrained M2 Head) Test Accuracy: {test_acc:.4f} ({test_correct}/{len(test_samples)})", flush=True)
    print(f"{'Category':15s} | {'Precision':10s} | {'Recall':10s} | {'F1':10s} | {'Support':8s}", flush=True)
    print("-" * 65, flush=True)
    for c in CATEGORIES:
        tot = per_class_stats[c]["total"]
        cor = per_class_stats[c]["correct"]
        prd = per_class_stats[c]["predicted"]
        prec = cor / prd if prd > 0 else 0.0
        rec = cor / tot if tot > 0 else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0.0
        print(f"{c:15s} | {prec:10.4f} | {rec:10.4f} | {f1:10.4f} | {tot:8d}", flush=True)
        
    # Save model and categories
    os.makedirs(ROOT / "models/checkpoints", exist_ok=True)
    torch.save(head.state_dict(), ROOT / "models/checkpoints/m2_category_head_multiclass.pth")
    with open(ROOT / "data/processed/m2_categories_multiclass.json", "w") as f:
        json.dump(IDX_TO_CAT, f, indent=2)
        
    print("\nSaved multi-class head to models/checkpoints/m2_category_head_multiclass.pth", flush=True)

if __name__ == "__main__":
    main()
