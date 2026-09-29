import os
import json
import torch
import numpy as np
from pathlib import Path

from src.models.m4_projection import M4BFusionModel

def load_data(split_path):
    with open(split_path, "r") as f:
        records = [json.loads(line) for line in f if line.strip()]
    return records

def compute_similarity(f_q, f_r):
    return float(np.dot(f_q, f_r))

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    cache_path = "data/processed/m4b_test_features_6906c9a84e0eabefea4c891808b7e0f5.pt"
    if not os.path.exists(cache_path):
        print(f"Cache {cache_path} not found.")
        return
        
    cache = torch.load(cache_path)
    records = cache["records"]
    cls_features = cache["cls_features"]
    patch_features = cache["patch_features"]
    
    model = M4BFusionModel(input_dim=384, hidden_dim=512, output_dim=256, dropout=0.1, alpha=0.25).to(device)
    model.load_state_dict(torch.load("models/checkpoints/m4_b/best_val_recall_at_1.pt", weights_only=True))
    model.eval()
    
    print("Computing features...")
    with torch.no_grad():
        global_feats = []
        local_feats = []
        fused_feats = []
        
        batch_size = 128
        for i in range(0, len(cls_features), batch_size):
            b_cls = cls_features[i:i+batch_size].to(device)
            b_patch = patch_features[i:i+batch_size].to(device)
            
            g = model(b_cls, b_patch, mode="global").cpu().numpy()
            l = model(b_cls, b_patch, mode="local").cpu().numpy()
            f = model(b_cls, b_patch, mode="fused").cpu().numpy()
            
            global_feats.append(g)
            local_feats.append(l)
            fused_feats.append(f)
            
        global_feats = np.concatenate(global_feats, axis=0)
        local_feats = np.concatenate(local_feats, axis=0)
        fused_feats = np.concatenate(fused_feats, axis=0)
        
    out_file = "reports/evaluation/m4b_retrieval_visual_audit.md"
    os.makedirs("reports/evaluation", exist_ok=True)
    
    print(f"Writing audit to {out_file}...")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# M4-B Qualitative Retrieval Audit (Global vs Local Analysis)\n\n")
        
        categories = {}
        for i, r in enumerate(records):
            cat = r["item_category"]
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(i)
            
        for cat, indices in categories.items():
            f.write(f"## Category: {cat}\n")
            
            # Show a few queries
            seen = set()
            for q_idx in indices:
                q_inst = records[q_idx].get("item_instance_id") or records[q_idx].get("instance_id")
                if q_inst in seen: continue
                seen.add(q_inst)
                
                f.write(f"### Query: Instance `{q_inst}`\n")
                f.write(f"Image: `{records[q_idx]['image_path']}`\n\n")
                
                # Get similarities for all candidates
                sims = []
                for r_idx in indices:
                    if r_idx == q_idx: continue
                    
                    r_inst = records[r_idx].get("item_instance_id") or records[r_idx].get("instance_id")
                    match_type = "✅ True Positive" if r_inst == q_inst else "❌ Hard Negative (Same Cat)"
                    
                    g_sim = compute_similarity(global_feats[q_idx], global_feats[r_idx])
                    l_sim = compute_similarity(local_feats[q_idx], local_feats[r_idx])
                    f_sim = compute_similarity(fused_feats[q_idx], fused_feats[r_idx])
                    
                    sims.append((r_inst, match_type, g_sim, l_sim, f_sim))
                    
                # Sort by fused similarity descending
                sims.sort(key=lambda x: x[4], reverse=True)
                
                f.write("| Rank | Instance ID | Match Type | Global Sim | Local Sim | Fused Sim |\n")
                f.write("|---|---|---|---|---|---|\n")
                
                for rank, (r_inst, m_type, g_sim, l_sim, f_sim) in enumerate(sims[:5]):
                    f.write(f"| {rank+1} | `{r_inst}` | {m_type} | {g_sim:.4f} | {l_sim:.4f} | {f_sim:.4f} |\n")
                f.write("\n")

if __name__ == "__main__":
    main()
