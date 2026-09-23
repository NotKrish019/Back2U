import os
import sys
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.models.siamese_network import SiameseNetwork
from src.data.triplet_dataset import TripletDataset

def main():
    print("Initializing Siamese Network Training (Triplet Loss)...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Paths
    train_manifest = "data/processed/train_split.jsonl"
    val_manifest = "data/processed/val_split.jsonl"
    
    # Dataset and DataLoader
    print("Loading datasets...")
    train_dataset = TripletDataset(train_manifest)
    val_dataset = TripletDataset(val_manifest)
    
    # We use a small batch size to fit in basic GPUs during development
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=0)
    
    print(f"Train batches: {len(train_loader)}, Val batches: {len(val_loader)}")
    
    # Model
    model = SiameseNetwork(embedding_dim=128, freeze_backbone=True)
    model.to(device)
    
    # Loss and Optimizer
    # Triplet margin loss: max(0, d(a,p) - d(a,n) + margin)
    criterion = nn.TripletMarginLoss(margin=0.2, p=2)
    optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4, weight_decay=1e-4)
    
    num_epochs = 3
    best_val_loss = float('inf')
    
    models_dir = Path("models/checkpoints")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print("Starting training loop...")
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        
        # Training
        for i, (anchor, positive, negative) in enumerate(train_loader):
            anchor = anchor.to(device)
            positive = positive.to(device)
            negative = negative.to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            emb_a = model(anchor)
            emb_p = model(positive)
            emb_n = model(negative)
            
            # Compute loss
            loss = criterion(emb_a, emb_p, emb_n)
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
            if (i + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{num_epochs}], Step [{i+1}/{len(train_loader)}], Loss: {loss.item():.4f}")
                
            # For the proxy test, we only run 30 steps to prove it works
            if i >= 30:
                print("Stopping early for proxy dataset test...")
                break
                
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for i, (anchor, positive, negative) in enumerate(val_loader):
                anchor = anchor.to(device)
                positive = positive.to(device)
                negative = negative.to(device)
                
                emb_a = model(anchor)
                emb_p = model(positive)
                emb_n = model(negative)
                
                loss = criterion(emb_a, emb_p, emb_n)
                val_loss += loss.item()
                
                if i >= 10: # limit validation for speed in proxy
                    break
                    
        val_loss /= min(len(val_loader), 11)
        print(f"Epoch [{epoch+1}/{num_epochs}] Validation Loss: {val_loss:.4f}")
        
        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            checkpoint_path = models_dir / "mir_siamese_best.pth"
            torch.save(model.state_dict(), checkpoint_path)
            print(f"Saved new best model to {checkpoint_path}")
            
    print("Training Complete!")

if __name__ == "__main__":
    main()
