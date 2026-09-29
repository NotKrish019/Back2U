import os
import sys
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, sampler
import numpy as np
from pathlib import Path
from collections import defaultdict
import argparse
import hashlib

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead
from src.losses.supcon import SupervisedContrastiveLoss
from src.retrieval.faiss_index import RetrievalIndex
from scripts.run_m3_baseline import evaluate_model

# ----------------- DATA CACHING & DATASET -----------------

def get_manifest_hash(manifest_path):
    h = hashlib.md5()
    with open(manifest_path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()

def cache_features(records, encoder, cache_path):
    if os.path.exists(cache_path):
        print(f"Loading cached features from {cache_path}...")
        return torch.load(cache_path)
        
    print(f"Computing DINOv2 features for {len(records)} images to cache...")
    features = []
    labels = []
    
    # Create a mapping from item_instance_id to an integer label
    instance_ids = list(set([r.get("item_instance_id") or r.get("instance_id") for r in records]))
    instance_to_label = {iid: idx for idx, iid in enumerate(instance_ids)}
    
    with torch.no_grad():
        for i, rec in enumerate(records):
            emb = encoder.encode_image(rec["image_path"])
            features.append(emb)
            iid = rec.get("item_instance_id") or rec.get("instance_id")
            labels.append(instance_to_label[iid])
            
            if (i+1) % 50 == 0:
                print(f"Processed {i+1}/{len(records)} images...")
                
    features = torch.stack(features, dim=0) # (N, 384)
    labels = torch.tensor(labels, dtype=torch.long)
    
    cache_data = {
        "features": features,
        "labels": labels,
        "instance_to_label": instance_to_label,
        "records": records
    }
    torch.save(cache_data, cache_path)
    print(f"Saved {len(records)} features to {cache_path}")
    return cache_data

class CachedFeatureDataset(Dataset):
    def __init__(self, cache_data):
        self.features = cache_data["features"]
        self.labels = cache_data["labels"]
        self.records = cache_data["records"]
        
    def __len__(self):
        return len(self.features)
        
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx], idx

# ----------------- SAMPLER -----------------

class InstanceBatchSampler(sampler.Sampler):
    """
    Ensures that each batch contains `num_instances` different instances,
    and `num_views` for each instance. Batch size = num_instances * num_views.
    """
    def __init__(self, labels, num_instances, num_views):
        self.labels = labels
        self.num_instances = num_instances
        self.num_views = num_views
        self.batch_size = num_instances * num_views
        
        # Group indices by label
        self.label_to_indices = defaultdict(list)
        for idx, label in enumerate(labels.tolist()):
            self.label_to_indices[label].append(idx)
            
        # Filter out labels that don't have enough views
        # If an instance has fewer views than requested, we can sample with replacement for that instance,
        # but the prompt warns against degenerate batches.
        # We will keep instances that have at least 2 views, and if num_views > available, we sample with replacement.
        self.valid_labels = [lbl for lbl, idxs in self.label_to_indices.items() if len(idxs) >= 2]
        if len(self.valid_labels) < self.num_instances:
            raise ValueError(f"Not enough instances with >= 2 views. Found {len(self.valid_labels)}, need {self.num_instances}")
            
    def __iter__(self):
        # Determine number of batches
        num_batches = len(self.labels) // self.batch_size
        if num_batches == 0:
            num_batches = 1
            
        for _ in range(num_batches):
            batch = []
            # Randomly select num_instances
            selected_labels = np.random.choice(self.valid_labels, self.num_instances, replace=False)
            
            for label in selected_labels:
                indices = self.label_to_indices[label]
                # Sample num_views from this label
                replace = len(indices) < self.num_views
                selected_indices = np.random.choice(indices, self.num_views, replace=replace)
                batch.extend(selected_indices)
                
            yield batch
            
    def __len__(self):
        return len(self.labels) // self.batch_size

# ----------------- TRAINING & EVALUATION -----------------

def train_epoch(model, dataloader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for batch_features, batch_labels, _ in dataloader:
        batch_features = batch_features.to(device)
        batch_labels = batch_labels.to(device)
        
        optimizer.zero_grad()
        
        # Forward pass
        embeddings = model(batch_features)
        
        # SupCon loss
        loss = criterion(embeddings, batch_labels)
        
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        
    return total_loss / len(dataloader)

def evaluate(model, cache_data, device):
    model.eval()
    records = cache_data["records"]
    features = cache_data["features"]
    
    with torch.no_grad():
        # Process all features through the projection head
        embeddings = []
        batch_size = 256
        for i in range(0, len(features), batch_size):
            batch = features[i:i+batch_size].to(device)
            emb = model(batch)
            embeddings.append(emb.cpu().numpy())
            
        embeddings = np.concatenate(embeddings, axis=0)
        
    # Build retrieval index
    index = RetrievalIndex(embedding_dimension=256)
    for i, rec in enumerate(records):
        iid = rec.get("item_instance_id") or rec.get("instance_id")
        index.add_item(iid, embeddings[i], {"image_path": rec["image_path"]})
        
    global_res, cat_res = evaluate_model("M4_Model", embeddings, records, index)
    return global_res, cat_res

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch_instances", type=int, default=8, help="P: number of instances per batch")
    parser.add_argument("--batch_views", type=int, default=4, help="K: number of views per instance")
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--temperature", type=float, default=0.1)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--projection_dim", type=int, default=256)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    # Reproducibility
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    # Output paths
    checkpoints_dir = Path("models/checkpoints/m4_a")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    report_path = Path("reports/experiments/m4_metric_learning.md")
    
    # Load data splits
    def load_split(path):
        records = []
        if os.path.exists(path):
            with open(path, 'r') as f:
                records = [json.loads(line) for line in f if line.strip()]
        return records
        
    train_records = load_split("data/processed/train_split.jsonl")
    val_records = load_split("data/processed/val_split.jsonl")
    test_records = load_split("data/processed/test_split.jsonl")
    
    if not train_records or not val_records:
        print("Missing train or val splits!")
        return

    # Filter out missing images
    train_records = [r for r in train_records if os.path.exists(r["image_path"])]
    val_records = [r for r in val_records if os.path.exists(r["image_path"])]
    test_records = [r for r in test_records if os.path.exists(r["image_path"])]
    
    print(f"Train: {len(train_records)}, Val: {len(val_records)}, Test: {len(test_records)}")

    # Cache Features
    encoder = Dinov2ImageEncoder()
    manifest_hash = get_manifest_hash("data/processed/unified_manifest.jsonl")
    
    train_cache = cache_features(train_records, encoder, f"data/processed/m4_train_features_{manifest_hash}.pt")
    val_cache = cache_features(val_records, encoder, f"data/processed/m4_val_features_{manifest_hash}.pt")
    test_cache = cache_features(test_records, encoder, f"data/processed/m4_test_features_{manifest_hash}.pt")
    
    del encoder # Free DINOv2 from memory
    torch.cuda.empty_cache()

    # DataLoaders
    train_dataset = CachedFeatureDataset(train_cache)
    train_sampler = InstanceBatchSampler(train_dataset.labels, args.batch_instances, args.batch_views)
    train_loader = DataLoader(train_dataset, batch_sampler=train_sampler, num_workers=0)

    # Model & Loss
    model = M4ProjectionHead(input_dim=384, hidden_dim=512, output_dim=args.projection_dim, dropout=args.dropout).to(args.device)
    criterion = SupervisedContrastiveLoss(temperature=args.temperature).to(args.device)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    # Training Loop
    best_val_r1 = 0.0
    best_val_map = 0.0
    
    print("\nStarting Training...")
    for epoch in range(args.epochs):
        t0 = time.time()
        train_loss = train_epoch(model, train_loader, optimizer, criterion, args.device)
        
        # Evaluate
        val_global, _ = evaluate(model, val_cache, args.device)
        
        print(f"Epoch {epoch+1:02d}/{args.epochs} | Loss: {train_loss:.4f} | "
              f"Val R@1: {val_global['Recall@1']:.4f} | Val R@5: {val_global['Recall@5']:.4f} | "
              f"Val MRR: {val_global['MRR']:.4f} | Time: {time.time()-t0:.1f}s")
              
        # Checkpoints
        if val_global['Recall@1'] > best_val_r1:
            best_val_r1 = val_global['Recall@1']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_recall_at_1.pt")
            
        if val_global['mAP'] > best_val_map:
            best_val_map = val_global['mAP']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_mAP.pt")
            
    torch.save(model.state_dict(), checkpoints_dir / "last.pt")
    
    # Final Test Evaluation
    print("\nRunning Test Evaluation on Best Recall@1 Checkpoint...")
    model.load_state_dict(torch.load(checkpoints_dir / "best_val_recall_at_1.pt"))
    test_global, test_cat = evaluate(model, test_cache, args.device)
    
    print("\nTest Results:")
    for k, v in test_global.items():
        print(f"{k}: {v:.4f}")
        
    # Write Report
    num_train_inst = len(set([r.get("item_instance_id") or r.get("instance_id") for r in train_records]))
    num_val_inst = len(set([r.get("item_instance_id") or r.get("instance_id") for r in val_records]))
    num_test_inst = len(set([r.get("item_instance_id") or r.get("instance_id") for r in test_records]))

    with open(report_path, "w") as f:
        f.write("# M4-A: Frozen DINOv2 + Projection + SupCon\n\n")
        f.write("## Objective\n")
        f.write("Determine if project-specific metric learning improves physical-instance retrieval beyond frozen DINOv2.\n\n")
        
        f.write("## Dataset\n")
        f.write(f"- Train instances: {num_train_inst} ({len(train_records)} images)\n")
        f.write(f"- Val instances: {num_val_inst} ({len(val_records)} images)\n")
        f.write(f"- Test instances: {num_test_inst} ({len(test_records)} images)\n\n")
        
        f.write("## Configuration\n")
        f.write(f"- Model: DINOv2 ViT-S/14 (Frozen) -> Linear(384->512) -> GELU -> Dropout({args.dropout}) -> Linear(512->{args.projection_dim}) -> L2 Norm\n")
        f.write(f"- Loss: SupCon (Temp: {args.temperature})\n")
        f.write(f"- Batching: {args.batch_instances} instances x {args.batch_views} views per instance\n")
        f.write(f"- Optimizer: AdamW (lr: {args.lr}, wd: {args.weight_decay})\n")
        f.write(f"- Epochs: {args.epochs}\n\n")
        
        f.write("## Global Test Results\n")
        f.write("| Metric | Score |\n")
        f.write("|---|---|\n")
        for k, v in test_global.items():
            f.write(f"| {k} | {v:.4f} |\n")
            
        f.write("\n## Per-Category Test Results (Recall@1)\n")
        f.write("| Category | Count | Recall@1 |\n")
        f.write("|---|---|---|\n")
        for cat in sorted(test_cat.keys()):
            f.write(f"| {cat} | {test_cat[cat]['count']} | {test_cat[cat]['Recall@1']:.4f} |\n")
            
        f.write("\n## Decision / Next Steps\n")
        f.write("*(To be determined based on comparison with M3)*\n")
        
    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
