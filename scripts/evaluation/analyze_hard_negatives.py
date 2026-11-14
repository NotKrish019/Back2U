import os
import json
import torch
import faiss
import numpy as np
from PIL import Image

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead

def load_data(split_path):
    with open(split_path, "r") as f:
        records = [json.loads(line) for line in f if line.strip()]
    return records

def extract_features(records, encoder, proj=None):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if proj:
        proj.to(device)
        proj.eval()
        
    features = []
    with torch.no_grad():
        for r in records:
            feat = encoder.encode_image(r["image_path"])
            feat = feat.unsqueeze(0).to(device)
            if proj:
                feat = proj(feat)
            feat = torch.nn.functional.normalize(feat, p=2, dim=-1)
            features.append(feat.cpu().numpy()[0])
            
    return np.array(features, dtype=np.float32)

def main():
    train_records = load_data("data/processed/train_split.jsonl")
    print(f"Loaded {len(train_records)} training images.")
    
    # We use frozen DINOv2 to find hard negatives, or M4-A? 
    # M4-C0 says: "use the existing training embeddings to mine candidate hard negatives."
    # Let's use Frozen DINOv2 + M4-A projection (since M4-C is building upon M4-A embeddings)
    encoder = Dinov2ImageEncoder()
    proj = M4ProjectionHead(input_dim=384, hidden_dim=512, output_dim=256)
    
    proj_path = "models/checkpoints/m4_a/best_val_recall_at_1.pt"
    if os.path.exists(proj_path):
        proj.load_state_dict(torch.load(proj_path, map_location="cpu", weights_only=True))
    else:
        print("M4-A checkpoint not found, using frozen DINOv2 only.")
        proj = None
        
    print("Extracting training features...")
    feats = extract_features(train_records, encoder, proj)
    
    d = feats.shape[1]
    index = faiss.IndexFlatIP(d)
    index.add(feats)
    
    # For every training anchor, find top-K valid hard negatives
    # Valid = diff item_instance_id, same item_category
    
    k = 20 # Search deep enough to skip self and positives
    D, I = index.search(feats, k)
    
    os.makedirs("reports/evaluation", exist_ok=True)
    out_file = "reports/evaluation/hard_negative_analysis.md"
    
    print(f"Writing hard-negative analysis to {out_file}...")
    
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# M4-C0: Hard-Negative Analysis (Training Data)\n\n")
        
        # Group by category to show representative subset
        categories = {}
        for i, r in enumerate(train_records):
            cat = r["item_category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(i)
            
        for cat, indices in categories.items():
            f.write(f"## Category: {cat}\n")
            
            # Pick a few distinct physical instances in this category as anchors to show
            seen_instances = set()
            anchors_shown = 0
            
            for q_idx in indices:
                q_rec = train_records[q_idx]
                q_inst = q_rec["item_instance_id"]
                if q_inst in seen_instances: continue
                
                seen_instances.add(q_inst)
                if anchors_shown >= 3: continue # show 3 anchors per category
                anchors_shown += 1
                
                f.write(f"### Anchor: Instance `{q_inst}` (View: `{q_rec['image_path']}`)\n\n")
                f.write("| Rank | Negative Instance ID | Score | Category | Negative Image Path |\n")
                f.write("|---|---|---|---|---|\n")
                
                neg_count = 0
                for rank, (score, res_idx) in enumerate(zip(D[q_idx], I[q_idx])):
                    r_rec = train_records[res_idx]
                    r_inst = r_rec["item_instance_id"]
                    
                    # Exclude self and same physical instance
                    if r_inst == q_inst:
                        continue
                        
                    # Prioritize same category
                    if r_rec["item_category"] != cat:
                        continue
                        
                    f.write(f"| {neg_count+1} | `{r_inst}` | {score:.4f} | {r_rec['item_category']} | `{r_rec['image_path']}` |\n")
                    neg_count += 1
                    if neg_count >= 5: break # show top 5 hard negatives
                f.write("\n")

if __name__ == "__main__":
    main()
