import os
import sys
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from pathlib import Path
import argparse
import hashlib
import faiss
from collections import defaultdict

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4BFusionModel
from src.losses.supcon import SupervisedContrastiveLoss
from src.retrieval.faiss_index import RetrievalIndex
from scripts.run_m3_baseline import evaluate_model
from scripts.train_m4 import get_manifest_hash
from scripts.train_m4c import HardNegativeBatchSampler

def cache_features_m4b(records, encoder, cache_path):
    if os.path.exists(cache_path):
        print(f"Loading cached M4-B features from {cache_path}...")
        return torch.load(cache_path)
        
    print(f"Computing DINOv2 CLS and Patch features for {len(records)} images...")
    cls_features = []
    patch_features = []
    labels = []
    
    instance_ids = list(set([r.get("item_instance_id") or r.get("instance_id") for r in records]))
    instance_to_label = {iid: idx for idx, iid in enumerate(instance_ids)}
    
    for i, rec in enumerate(records):
        cls_tok, patch_tok = encoder.encode_image_with_patches(rec["image_path"])
        cls_features.append(cls_tok)
        patch_features.append(patch_tok)
        iid = rec.get("item_instance_id") or rec.get("instance_id")
        labels.append(instance_to_label[iid])
        
        if (i+1) % 50 == 0:
            print(f"Processed {i+1}/{len(records)} images...")
                
    cls_features = torch.stack(cls_features, dim=0) # (N, 384)
    patch_features = torch.stack(patch_features, dim=0) # (N, 256, 384)
    labels = torch.tensor(labels, dtype=torch.long)
    
    cache_data = {
        "cls_features": cls_features,
        "patch_features": patch_features,
        "labels": labels,
        "instance_to_label": instance_to_label,
        "records": records
    }
    torch.save(cache_data, cache_path)
    return cache_data

class CachedM4BDataset(Dataset):
    def __init__(self, cache_data):
        self.cls_features = cache_data["cls_features"]
        self.patch_features = cache_data["patch_features"]
        self.labels = cache_data["labels"]
        self.records = cache_data["records"]
        
    def __len__(self):
        return len(self.cls_features)
        
    def __getitem__(self, idx):
        return self.cls_features[idx], self.patch_features[idx], self.labels[idx], idx

def train_epoch(model, dataloader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for batch_cls, batch_patches, batch_labels, _ in dataloader:
        batch_cls = batch_cls.to(device)
        batch_patches = batch_patches.to(device)
        batch_labels = batch_labels.to(device)
        
        optimizer.zero_grad()
        
        # We train the model to separate fused embeddings
        embeddings = model(batch_cls, batch_patches, mode="fused")
        loss = criterion(embeddings, batch_labels)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        
    return total_loss / len(dataloader)

def evaluate(model, cache_data, device, mode="fused"):
    model.eval()
    records = cache_data["records"]
    cls_features = cache_data["cls_features"]
    patch_features = cache_data["patch_features"]
    
    with torch.no_grad():
        embeddings = []
        batch_size = 128
        for i in range(0, len(cls_features), batch_size):
            b_cls = cls_features[i:i+batch_size].to(device)
            b_patch = patch_features[i:i+batch_size].to(device)
            emb = model(b_cls, b_patch, mode=mode)
            embeddings.append(emb.cpu().numpy())
            
        embeddings = np.concatenate(embeddings, axis=0)
        
    index = RetrievalIndex(embedding_dimension=256)
    for i, rec in enumerate(records):
        iid = rec.get("item_instance_id") or rec.get("instance_id")
        index.add_item(iid, embeddings[i], {"image_path": rec["image_path"]})
        
    global_res, cat_res = evaluate_model("M4_B", embeddings, records, index)
    return global_res, cat_res

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch_instances", type=int, default=8)
    parser.add_argument("--batch_views", type=int, default=4)
    parser.add_argument("--hard_ratio", type=float, default=0.5)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--temperature", type=float, default=0.1)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--projection_dim", type=int, default=256)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--alpha", type=float, default=0.5, help="Weight for global branch in fused mode")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    checkpoints_dir = Path("models/checkpoints/m4_b")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    report_path = Path("reports/experiments/m4_local_feature_results.md")
    
    def load_split(path):
        records = []
        if os.path.exists(path):
            with open(path, 'r') as f:
                records = [json.loads(line) for line in f if line.strip()]
        return records
        
    train_records = load_split("data/processed/train_split.jsonl")
    val_records = load_split("data/processed/val_split.jsonl")
    test_records = load_split("data/processed/test_split.jsonl")
    
    train_records = [r for r in train_records if os.path.exists(r["image_path"])]
    val_records = [r for r in val_records if os.path.exists(r["image_path"])]
    test_records = [r for r in test_records if os.path.exists(r["image_path"])]
    
    encoder = Dinov2ImageEncoder()
    manifest_hash = get_manifest_hash("data/processed/unified_manifest.jsonl")
    
    train_cache = cache_features_m4b(train_records, encoder, f"data/processed/m4b_train_features_{manifest_hash}.pt")
    val_cache = cache_features_m4b(val_records, encoder, f"data/processed/m4b_val_features_{manifest_hash}.pt")
    test_cache = cache_features_m4b(test_records, encoder, f"data/processed/m4b_test_features_{manifest_hash}.pt")
    
    del encoder
    torch.cuda.empty_cache()

    train_dataset = CachedM4BDataset(train_cache)
    train_sampler = HardNegativeBatchSampler(
        train_dataset.labels, train_dataset.cls_features, train_records,
        args.batch_instances, args.batch_views, args.hard_ratio
    )
    train_loader = DataLoader(train_dataset, batch_sampler=train_sampler, num_workers=0)

    model = M4BFusionModel(input_dim=384, hidden_dim=512, output_dim=args.projection_dim, dropout=args.dropout, alpha=args.alpha).to(args.device)
    criterion = SupervisedContrastiveLoss(temperature=args.temperature).to(args.device)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    best_val_r1 = 0.0
    
    print("\nStarting M4-B Training...")
    for epoch in range(args.epochs):
        t0 = time.time()
        train_loss = train_epoch(model, train_loader, optimizer, criterion, args.device)
        
        val_global, _ = evaluate(model, val_cache, args.device, mode="fused")
        
        print(f"Epoch {epoch+1:02d}/{args.epochs} | Loss: {train_loss:.4f} | "
              f"Val R@1: {val_global['Recall@1']:.4f} | Val MRR: {val_global['MRR']:.4f} | Time: {time.time()-t0:.1f}s")
              
        if val_global['Recall@1'] > best_val_r1:
            best_val_r1 = val_global['Recall@1']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_recall_at_1.pt")
            
    torch.save(model.state_dict(), checkpoints_dir / "last.pt")
    
    print("\nEvaluating Best Checkpoint...")
    model.load_state_dict(torch.load(checkpoints_dir / "best_val_recall_at_1.pt"))
    
    # Validation Alpha Sweep
    print("\nTuning Alpha on Validation Set...")
    alphas = [0.25, 0.5, 0.75]
    best_alpha = 0.5
    best_alpha_r1 = 0.0
    for a in alphas:
        model.alpha = a
        val_res, _ = evaluate(model, val_cache, args.device, mode="fused")
        print(f"Alpha {a:.2f} | Val R@1: {val_res['Recall@1']:.4f} | Val MRR: {val_res['MRR']:.4f}")
        if val_res['Recall@1'] > best_alpha_r1:
            best_alpha_r1 = val_res['Recall@1']
            best_alpha = a
            
    print(f"Selected best Alpha: {best_alpha}")
    model.alpha = best_alpha
    
    # Test Evaluation
    print("\nRunning Test Evaluation (M4-C comparison dataset)")
    test_res_global, _ = evaluate(model, test_cache, args.device, mode="global")
    test_res_local, _ = evaluate(model, test_cache, args.device, mode="local")
    test_res_fused, test_cat_fused = evaluate(model, test_cache, args.device, mode="fused")
    
    print("\n--- Test Results: Global Only (B0) ---")
    for k, v in test_res_global.items(): print(f"{k}: {v:.4f}")
    print("\n--- Test Results: Local Only (B1) ---")
    for k, v in test_res_local.items(): print(f"{k}: {v:.4f}")
    print(f"\n--- Test Results: Fused (B2, alpha={best_alpha}) ---")
    for k, v in test_res_fused.items(): print(f"{k}: {v:.4f}")
    
    m4_c_results = {
        "Recall@1": 0.9400,
        "Recall@5": 1.0000,
        "Recall@10": 1.0000,
        "MRR": 0.9650,
        "mAP": 0.9617,
    }
    
    with open(report_path, "w") as f:
        f.write("# M4-B Local Feature Results\n\n")
        
        f.write("## Ablation Table\n")
        f.write("| Experiment | Global | Local | Fusion | Hard Negatives | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")
        
        # M4-C
        f.write(f"| M4-C (Baseline) | Yes | No | N/A | Top-20 (0.5) | "
                f"{m4_c_results['Recall@1']:.4f} | {m4_c_results['Recall@5']:.4f} | {m4_c_results['Recall@10']:.4f} | {m4_c_results['MRR']:.4f} | {m4_c_results['mAP']:.4f} |\n")
        
        # M4-B Global
        f.write(f"| M4-B (Global Branch) | Yes | No | N/A | Top-20 (0.5) | "
                f"{test_res_global['Recall@1']:.4f} | {test_res_global['Recall@5']:.4f} | {test_res_global['Recall@10']:.4f} | {test_res_global['MRR']:.4f} | {test_res_global['mAP']:.4f} |\n")
                
        # M4-B Local
        f.write(f"| M4-B (Local Branch) | No | Yes | N/A | Top-20 (0.5) | "
                f"{test_res_local['Recall@1']:.4f} | {test_res_local['Recall@5']:.4f} | {test_res_local['Recall@10']:.4f} | {test_res_local['MRR']:.4f} | {test_res_local['mAP']:.4f} |\n")
                
        # M4-B Fused
        f.write(f"| M4-B (Fused) | Yes | Yes | Alpha={best_alpha} | Top-20 (0.5) | "
                f"{test_res_fused['Recall@1']:.4f} | {test_res_fused['Recall@5']:.4f} | {test_res_fused['Recall@10']:.4f} | {test_res_fused['MRR']:.4f} | {test_res_fused['mAP']:.4f} |\n")

    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
