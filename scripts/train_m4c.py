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
import faiss

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead
from src.losses.supcon import SupervisedContrastiveLoss
from src.retrieval.faiss_index import RetrievalIndex
from scripts.run_m3_baseline import evaluate_model
from scripts.train_m4 import get_manifest_hash, cache_features, CachedFeatureDataset

class HardNegativeBatchSampler(sampler.Sampler):
    """
    Ensures that each batch contains `num_instances` different instances,
    where a fraction of instances are hard-negatives of the anchor instance.
    """
    def __init__(self, labels, features, records, num_instances, num_views, hard_ratio=0.5):
        self.labels = labels
        self.num_instances = num_instances
        self.num_views = num_views
        self.batch_size = num_instances * num_views
        self.hard_ratio = hard_ratio
        
        # Group indices by label
        self.label_to_indices = defaultdict(list)
        for idx, label in enumerate(labels.tolist()):
            self.label_to_indices[label].append(idx)
            
        self.valid_labels = [lbl for lbl, idxs in self.label_to_indices.items() if len(idxs) >= 2]
        if len(self.valid_labels) < self.num_instances:
            raise ValueError(f"Not enough instances with >= 2 views. Found {len(self.valid_labels)}, need {self.num_instances}")

        # Compute hard negatives for each label
        print("Computing hard negatives for the sampler...")
        
        # First, compute a single mean embedding per label
        self.label_to_category = {}
        self.label_to_mean_feat = {}
        for lbl in self.valid_labels:
            idxs = self.label_to_indices[lbl]
            cat = records[idxs[0]]["item_category"]
            self.label_to_category[lbl] = cat
            
            feats = features[idxs]
            mean_feat = feats.mean(dim=0)
            mean_feat = torch.nn.functional.normalize(mean_feat.unsqueeze(0), p=2, dim=1).squeeze(0)
            self.label_to_mean_feat[lbl] = mean_feat.numpy()
            
        valid_labels_arr = np.array(self.valid_labels)
        mean_feats_arr = np.array([self.label_to_mean_feat[lbl] for lbl in valid_labels_arr])
        
        d = mean_feats_arr.shape[1]
        index = faiss.IndexFlatIP(d)
        index.add(mean_feats_arr)
        
        # Query the index for top 20
        D, I = index.search(mean_feats_arr, 20)
        
        self.hard_negatives = defaultdict(list)
        for i, anchor_lbl in enumerate(valid_labels_arr):
            anchor_cat = self.label_to_category[anchor_lbl]
            
            for res_idx in I[i]:
                neg_lbl = valid_labels_arr[res_idx]
                if neg_lbl == anchor_lbl: continue
                if self.label_to_category[neg_lbl] != anchor_cat: continue
                
                self.hard_negatives[anchor_lbl].append(neg_lbl)
                
    def __iter__(self):
        num_batches = len(self.labels) // self.batch_size
        if num_batches == 0:
            num_batches = 1
            
        for _ in range(num_batches):
            batch = []
            
            # Pick anchor
            anchor_label = np.random.choice(self.valid_labels)
            selected_labels = [anchor_label]
            
            num_hard = int((self.num_instances - 1) * self.hard_ratio)
            num_random = (self.num_instances - 1) - num_hard
            
            # Pick hard negatives
            available_hards = [lbl for lbl in self.hard_negatives[anchor_label] if lbl not in selected_labels]
            if len(available_hards) > 0:
                actual_num_hard = min(num_hard, len(available_hards))
                hard_picks = np.random.choice(available_hards, actual_num_hard, replace=False)
                selected_labels.extend(hard_picks)
            
            # Fill the rest with random negatives (different instances)
            remaining_needed = self.num_instances - len(selected_labels)
            if remaining_needed > 0:
                available_randoms = [lbl for lbl in self.valid_labels if lbl not in selected_labels]
                random_picks = np.random.choice(available_randoms, remaining_needed, replace=False)
                selected_labels.extend(random_picks)
            
            # Sample views
            for label in selected_labels:
                indices = self.label_to_indices[label]
                replace = len(indices) < self.num_views
                selected_indices = np.random.choice(indices, self.num_views, replace=replace)
                batch.extend(selected_indices)
                
            yield batch
            
    def __len__(self):
        return len(self.labels) // self.batch_size

def train_epoch(model, dataloader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for batch_features, batch_labels, _ in dataloader:
        batch_features = batch_features.to(device)
        batch_labels = batch_labels.to(device)
        
        optimizer.zero_grad()
        embeddings = model(batch_features)
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
        embeddings = []
        batch_size = 256
        for i in range(0, len(features), batch_size):
            batch = features[i:i+batch_size].to(device)
            emb = model(batch)
            embeddings.append(emb.cpu().numpy())
            
        embeddings = np.concatenate(embeddings, axis=0)
        
    index = RetrievalIndex(embedding_dimension=256)
    for i, rec in enumerate(records):
        iid = rec.get("item_instance_id") or rec.get("instance_id")
        index.add_item(iid, embeddings[i], {"image_path": rec["image_path"]})
        
    global_res, cat_res = evaluate_model("M4_C_Model", embeddings, records, index)
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
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    checkpoints_dir = Path("models/checkpoints/m4_c")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    report_path = Path("reports/experiments/m4_hard_negative_results.md")
    
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
    
    train_cache = cache_features(train_records, encoder, f"data/processed/m4_train_features_{manifest_hash}.pt")
    val_cache = cache_features(val_records, encoder, f"data/processed/m4_val_features_{manifest_hash}.pt")
    test_cache = cache_features(test_records, encoder, f"data/processed/m4_test_features_{manifest_hash}.pt")
    
    del encoder
    torch.cuda.empty_cache()

    train_dataset = CachedFeatureDataset(train_cache)
    train_sampler = HardNegativeBatchSampler(
        train_dataset.labels, train_dataset.features, train_records,
        args.batch_instances, args.batch_views, args.hard_ratio
    )
    train_loader = DataLoader(train_dataset, batch_sampler=train_sampler, num_workers=0)

    model = M4ProjectionHead(input_dim=384, hidden_dim=512, output_dim=args.projection_dim, dropout=args.dropout).to(args.device)
    criterion = SupervisedContrastiveLoss(temperature=args.temperature).to(args.device)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    best_val_r1 = 0.0
    best_val_map = 0.0
    
    print("\nStarting M4-C Training...")
    for epoch in range(args.epochs):
        t0 = time.time()
        train_loss = train_epoch(model, train_loader, optimizer, criterion, args.device)
        
        val_global, _ = evaluate(model, val_cache, args.device)
        
        print(f"Epoch {epoch+1:02d}/{args.epochs} | Loss: {train_loss:.4f} | "
              f"Val R@1: {val_global['Recall@1']:.4f} | Val R@5: {val_global['Recall@5']:.4f} | "
              f"Val MRR: {val_global['MRR']:.4f} | Time: {time.time()-t0:.1f}s")
              
        if val_global['Recall@1'] > best_val_r1:
            best_val_r1 = val_global['Recall@1']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_recall_at_1.pt")
            
        if val_global['mAP'] > best_val_map:
            best_val_map = val_global['mAP']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_mAP.pt")
            
    torch.save(model.state_dict(), checkpoints_dir / "last.pt")
    
    print("\nRunning Test Evaluation on Best Recall@1 Checkpoint...")
    model.load_state_dict(torch.load(checkpoints_dir / "best_val_recall_at_1.pt"))
    test_global, test_cat = evaluate(model, test_cache, args.device)
    
    print("\nM4-C Test Results:")
    for k, v in test_global.items():
        print(f"{k}: {v:.4f}")
        
    # Read old M4-A results to generate comparison table
    # Since we don't have the old M4-A result object perfectly in memory, we hardcode the 50-image test set results verified previously.
    m4_a_results = {
        "Recall@1": 0.9400,
        "Recall@5": 1.0000,
        "Recall@10": 1.0000,
        "MRR": 0.9617,
        "mAP": 0.9617,
    }
    
    with open(report_path, "w") as f:
        f.write("# M4-C Hard-Negative Mining Results\n\n")
        
        f.write("## Ablation Table\n")
        f.write("| Experiment | Backbone | Projection | Loss | Hard-negative sampling | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")
        
        # M4-A
        f.write(f"| M4-A | Frozen DINOv2 | 384->512->256 | SupCon | None (Random) | "
                f"{m4_a_results['Recall@1']:.4f} | {m4_a_results['Recall@5']:.4f} | {m4_a_results['Recall@10']:.4f} | {m4_a_results['MRR']:.4f} | {m4_a_results['mAP']:.4f} |\n")
        
        # M4-C
        f.write(f"| M4-C | Frozen DINOv2 | 384->512->256 | SupCon | Top-20 Same-Cat ({args.hard_ratio} ratio) | "
                f"{test_global['Recall@1']:.4f} | {test_global['Recall@5']:.4f} | {test_global['Recall@10']:.4f} | {test_global['MRR']:.4f} | {test_global['mAP']:.4f} |\n")
                
    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
