import os
import json
import torch
import faiss
import numpy as np
from PIL import Image
from torchvision import transforms

from src.models.m4_projection import M4ProjectionHead
from scripts.train_m4d import M4DFineTuneModel, ImageDataset

def load_data():
    with open("data/processed/test_split.jsonl", "r") as f:
        records = [json.loads(line) for line in f if line.strip()]
    return records

def extract_features(dataset, model, device):
    model.eval()
    features = []
    with torch.no_grad():
        batch_size = 128
        for i in range(0, len(dataset.images), batch_size):
            batch_imgs = dataset.images[i:i+batch_size].to(device)
            emb = model(batch_imgs)
            features.append(emb.cpu().numpy())
    return np.concatenate(features, axis=0)

def main():
    records = load_data()
    print(f"Loaded {len(records)} test images")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dataset = ImageDataset(records)
    
    model = M4DFineTuneModel(projection_dim=256, dropout=0.1).to(device)
    model.load_state_dict(torch.load("models/checkpoints/m4_d/best_val_recall_at_1.pt", weights_only=True))
    
    print("Extracting features with M4-D...")
    feats = extract_features(dataset, model, device)
    
    # Build index
    d = feats.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(feats)
    
    # Audit
    categories = {}
    for i, r in enumerate(records):
        cat = r["item_category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(i)
        
    os.makedirs("reports/evaluation", exist_ok=True)
    out_file = "reports/evaluation/m4d_retrieval_visual_audit.md"
    
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# M4-D Qualitative Retrieval Audit\n\n")
        
        for cat, indices in categories.items():
            f.write(f"## Category: {cat}\n")
            
            seen_instances = set()
            for q_idx in indices:
                q_inst = records[q_idx].get("item_instance_id") or records[q_idx].get("instance_id")
                if q_inst in seen_instances: continue
                seen_instances.add(q_inst)
                
                f.write(f"### Query: Instance `{q_inst}`\n")
                f.write(f"Image: `{records[q_idx]['image_path']}`\n\n")
                f.write("| Rank | Instance ID | Score | Match Type |\n")
                f.write("|---|---|---|---|\n")
                
                D, I = index.search(feats[q_idx:q_idx+1], 5)
                for rank, (score, res_idx) in enumerate(zip(D[0], I[0])):
                    r_inst = records[res_idx].get("item_instance_id") or records[res_idx].get("instance_id")
                    
                    if r_inst == q_inst:
                        match_type = "✅ True Positive"
                    elif records[res_idx]["item_category"] == cat:
                        match_type = "❌ Hard Negative (Same Cat)"
                    else:
                        match_type = "❌ False Match (Diff Cat)"
                        
                    f.write(f"| {rank+1} | `{r_inst}` | {score:.4f} | {match_type} |\n")
                f.write("\n")
                
if __name__ == "__main__":
    main()
