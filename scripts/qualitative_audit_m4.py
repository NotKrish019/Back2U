import os
import json
import torch
import faiss
import numpy as np
from PIL import Image
from torchvision import transforms

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead

def load_data():
    with open("data/processed/test_split.jsonl", "r") as f:
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
    records = load_data()
    print(f"Loaded {len(records)} test images")
    
    encoder = Dinov2ImageEncoder()
    proj = M4ProjectionHead(input_dim=384, hidden_dim=512, output_dim=256)
    proj.load_state_dict(torch.load("models/checkpoints/m4_c/best_val_recall_at_1.pt", weights_only=True))
    
    print("Extracting features with M4-A...")
    feats = extract_features(records, encoder, proj)
    
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
    out_file = "reports/evaluation/m4c_retrieval_visual_audit.md"
    
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# M4-C Qualitative Retrieval Audit\n\n")
        
        for cat, indices in categories.items():
            f.write(f"## Category: {cat}\n")
            queries = indices[:5] # take up to 5
            for q_idx in queries:
                q_rec = records[q_idx]
                q_feat = feats[q_idx:q_idx+1]
                
                # Search
                D, I = index.search(q_feat, 6) # top 6 to exclude self
                
                f.write(f"### Query: Instance `{q_rec['item_instance_id']}`\n")
                f.write(f"Image: `{q_rec['image_path']}`\n\n")
                
                f.write("| Rank | Instance ID | Score | Match Type |\n")
                f.write("|---|---|---|---|\n")
                
                for rank, (score, res_idx) in enumerate(zip(D[0], I[0])):
                    if res_idx == q_idx: continue # skip self
                    r_rec = records[res_idx]
                    
                    if r_rec["item_instance_id"] == q_rec["item_instance_id"]:
                        match_type = "✅ True Positive"
                    elif r_rec["item_category"] == q_rec["item_category"]:
                        match_type = "❌ Hard Negative (Same Cat)"
                    else:
                        match_type = "❌ False Match (Diff Cat)"
                        
                    f.write(f"| {rank} | `{r_rec['item_instance_id']}` | {score:.4f} | {match_type} |\n")
                f.write("\n")

if __name__ == "__main__":
    main()
