import os
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from collections import Counter
from src.models.m2_classifier import M2CategoryHead

class CropCategoryDataset(Dataset):
    def __init__(self, jsonl_file, category_to_idx, transform=None):
        self.data = []
        with open(jsonl_file, 'r') as f:
            for line in f:
                if not line.strip(): continue
                r = json.loads(line)
                cat = r["item_category"]
                if cat in category_to_idx:
                    self.data.append({
                        "path": r["image_path"],
                        "label": category_to_idx[cat]
                    })
        self.transform = transform
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        item = self.data[idx]
        img = Image.open(item["path"]).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, item["label"]

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # 1. Inspect training data to find categories
    cat_counts = Counter()
    with open("data/processed/train_split.jsonl", "r") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            cat_counts[r["item_category"]] += 1
            
    print("Training Category Distribution:")
    for c, count in cat_counts.items():
        print(f"  {c}: {count}")
        
    categories = sorted(list(cat_counts.keys()))
    cat_to_idx = {c: i for i, c in enumerate(categories)}
    idx_to_cat = {i: c for i, c in enumerate(categories)}
    
    with open("data/processed/m2_categories.json", "w") as f:
        json.dump(idx_to_cat, f)
    
    # Compute class weights to handle slight imbalance
    total_samples = sum(cat_counts.values())
    class_weights = [total_samples / cat_counts[c] for c in categories]
    class_weights = torch.tensor(class_weights, dtype=torch.float32).to(device)
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
    ])
    
    train_dataset = CropCategoryDataset("data/processed/train_split.jsonl", cat_to_idx, transform)
    val_dataset = CropCategoryDataset("data/processed/val_split.jsonl", cat_to_idx, transform)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)
    
    model = M2CategoryHead(num_categories=len(categories)).to(device)
    
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(model.head.parameters(), lr=1e-3)
    
    best_val_acc = 0.0
    
    print(f"Training M2 Category Head on {len(train_dataset)} samples, validating on {len(val_dataset)}")
    
    os.makedirs("models/checkpoints", exist_ok=True)
    
    for epoch in range(15):
        model.train()
        train_loss = 0.0
        correct = 0
        total = 0
        
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            logits = model(imgs)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            preds = logits.argmax(dim=-1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            
        train_acc = correct / total
        
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                logits = model(imgs)
                preds = logits.argmax(dim=-1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)
                
        val_acc = val_correct / val_total
        print(f"Epoch {epoch+1:02d} | Train Loss: {train_loss/len(train_loader):.4f} | Train Acc: {train_acc:.4f} | Val Acc: {val_acc:.4f}")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), "models/checkpoints/m2_category_head_best.pth")
            
    print("Training complete.")

if __name__ == "__main__":
    main()
