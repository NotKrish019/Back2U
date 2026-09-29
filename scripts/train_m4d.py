import os
import sys
import json
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T
from PIL import Image
import numpy as np
from pathlib import Path
import argparse

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.models.m4_projection import M4ProjectionHead
from src.losses.supcon import SupervisedContrastiveLoss
from src.retrieval.faiss_index import RetrievalIndex
from scripts.run_m3_baseline import evaluate_model
from scripts.train_m4c import HardNegativeBatchSampler
import faiss

class ImageDataset(Dataset):
    def __init__(self, records):
        self.records = records
        self.transform = T.Compose([
            T.Resize(256, interpolation=T.InterpolationMode.BICUBIC),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ])
        
        instance_ids = list(set([r.get("item_instance_id") or r.get("instance_id") for r in records]))
        self.instance_to_label = {iid: idx for idx, iid in enumerate(instance_ids)}
        
        self.labels = np.array([self.instance_to_label[r.get("item_instance_id") or r.get("instance_id")] for r in records])
        
        print("Preloading images into memory...")
        self.images = []
        for r in records:
            img = Image.open(r["image_path"]).convert("RGB")
            self.images.append(self.transform(img))
        self.images = torch.stack(self.images)

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx):
        return self.images[idx], self.labels[idx], idx

class M4DFineTuneModel(nn.Module):
    def __init__(self, projection_dim=256, dropout=0.1):
        super().__init__()
        # Load backbone
        self.backbone = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
        
        # Freeze all backbone parameters
        for param in self.backbone.parameters():
            param.requires_grad = False
            
        # Unfreeze ONLY the last transformer block and the final norm
        for param in self.backbone.blocks[-1].parameters():
            param.requires_grad = True
        if hasattr(self.backbone, 'norm'):
            for param in self.backbone.norm.parameters():
                param.requires_grad = True
                
        # Projection head
        self.proj = M4ProjectionHead(input_dim=384, hidden_dim=512, output_dim=projection_dim, dropout=dropout)

    def forward(self, x):
        # We only need the CLS token
        features = self.backbone(x)
        # Projection applies L2 normalization internally
        return self.proj(features)
        
    def get_features(self, x):
        with torch.no_grad():
            return self.backbone(x)

def evaluate(model, dataset, device):
    model.eval()
    records = dataset.records
    
    with torch.no_grad():
        embeddings = []
        batch_size = 128
        for i in range(0, len(dataset.images), batch_size):
            batch_imgs = dataset.images[i:i+batch_size].to(device)
            emb = model(batch_imgs)
            embeddings.append(emb.cpu().numpy())
            
        embeddings = np.concatenate(embeddings, axis=0)
        
    index = RetrievalIndex(embedding_dimension=256)
    for i, rec in enumerate(records):
        iid = rec.get("item_instance_id") or rec.get("instance_id")
        index.add_item(iid, embeddings[i], {"image_path": rec["image_path"]})
        
    global_res, cat_res = evaluate_model("M4_D", embeddings, records, index)
    return global_res, cat_res

def compute_hard_negatives(model, dataset, device):
    """Compute hard negatives dynamically using the backbone features (or we could use frozen features as before).
    We will use the frozen features at initialization to match M4-C exactly.
    """
    model.eval()
    with torch.no_grad():
        features = []
        batch_size = 128
        for i in range(0, len(dataset.images), batch_size):
            batch_imgs = dataset.images[i:i+batch_size].to(device)
            # Use only backbone features for hard negative mining to match M4-C setup
            emb = model.get_features(batch_imgs)
            features.append(emb.cpu().numpy())
        features = np.concatenate(features, axis=0)
    return torch.tensor(features)

def train_epoch(model, dataloader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for batch_imgs, batch_labels, _ in dataloader:
        batch_imgs = batch_imgs.to(device)
        batch_labels = batch_labels.to(device)
        
        optimizer.zero_grad()
        embeddings = model(batch_imgs)
        loss = criterion(embeddings, batch_labels)
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        
    return total_loss / len(dataloader)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch_instances", type=int, default=8)
    parser.add_argument("--batch_views", type=int, default=4)
    parser.add_argument("--hard_ratio", type=float, default=0.5)
    
    # Separate learning rates
    parser.add_argument("--lr_backbone", type=float, default=1e-5)
    parser.add_argument("--lr_proj", type=float, default=1e-4)
    
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

    checkpoints_dir = Path("models/checkpoints/m4_d")
    checkpoints_dir.mkdir(parents=True, exist_ok=True)
    report_path = Path("reports/experiments/m4_d_finetuning_results.md")
    
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
    
    train_dataset = ImageDataset(train_records)
    val_dataset = ImageDataset(val_records)
    test_dataset = ImageDataset(test_records)
    
    model = M4DFineTuneModel(projection_dim=args.projection_dim, dropout=args.dropout).to(args.device)
    
    # Compute base features for the sampler using the UNTUNED backbone (to be perfectly identical to M4-C initialization)
    print("Computing initial backbone features for sampler...")
    initial_features = compute_hard_negatives(model, train_dataset, args.device)
    
    train_sampler = HardNegativeBatchSampler(
        train_dataset.labels, initial_features, train_records,
        args.batch_instances, args.batch_views, args.hard_ratio
    )
    train_loader = DataLoader(train_dataset, batch_sampler=train_sampler, num_workers=0)

    # Separate optimizers parameters
    backbone_params = []
    proj_params = []
    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        if "backbone" in name:
            backbone_params.append(param)
        elif "proj" in name:
            proj_params.append(param)
            
    optimizer = optim.AdamW([
        {"params": backbone_params, "lr": args.lr_backbone},
        {"params": proj_params, "lr": args.lr_proj}
    ], weight_decay=args.weight_decay)
    
    criterion = SupervisedContrastiveLoss(temperature=args.temperature).to(args.device)

    best_val_r1 = 0.0
    
    print("\nStarting M4-D Training (Partial Fine-Tuning)...")
    for epoch in range(args.epochs):
        t0 = time.time()
        train_loss = train_epoch(model, train_loader, optimizer, criterion, args.device)
        
        val_global, _ = evaluate(model, val_dataset, args.device)
        
        print(f"Epoch {epoch+1:02d}/{args.epochs} | Train Loss: {train_loss:.4f} | "
              f"Val R@1: {val_global['Recall@1']:.4f} | Val MRR: {val_global['MRR']:.4f} | Time: {time.time()-t0:.1f}s")
              
        if val_global['Recall@1'] > best_val_r1:
            best_val_r1 = val_global['Recall@1']
            torch.save(model.state_dict(), checkpoints_dir / "best_val_recall_at_1.pt")
            
    torch.save(model.state_dict(), checkpoints_dir / "last.pt")
    
    print("\nRunning Test Evaluation on Best Checkpoint...")
    model.load_state_dict(torch.load(checkpoints_dir / "best_val_recall_at_1.pt"))
    test_global, _ = evaluate(model, test_dataset, args.device)
    
    print("\nM4-D Test Results:")
    for k, v in test_global.items():
        print(f"{k}: {v:.4f}")
        
    # Read old M4-C results
    m4_c_results = {
        "Recall@1": 0.9400,
        "Recall@5": 1.0000,
        "Recall@10": 1.0000,
        "MRR": 0.9650,
        "mAP": 0.9617,
    }
    
    with open(report_path, "w") as f:
        f.write("# M4-D Partial Fine-Tuning Results\n\n")
        
        f.write("## Ablation Table\n")
        f.write("| Experiment | Backbone | Projection | Loss | Hard-negative sampling | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|\n")
        
        # M4-C
        f.write(f"| M4-C | Frozen DINOv2 | 384->512->256 | SupCon | Top-20 (0.5) | "
                f"{m4_c_results['Recall@1']:.4f} | {m4_c_results['Recall@5']:.4f} | {m4_c_results['Recall@10']:.4f} | {m4_c_results['MRR']:.4f} | {m4_c_results['mAP']:.4f} |\n")
        
        # M4-D
        f.write(f"| M4-D | Tuned Block[-1] | 384->512->256 | SupCon | Top-20 (0.5) | "
                f"{test_global['Recall@1']:.4f} | {test_global['Recall@5']:.4f} | {test_global['Recall@10']:.4f} | {test_global['MRR']:.4f} | {test_global['mAP']:.4f} |\n")

    print(f"\nReport written to {report_path}")

if __name__ == "__main__":
    main()
