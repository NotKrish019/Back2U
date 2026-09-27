import os
import sys
import json
import time
import torch
import numpy as np
from pathlib import Path
from collections import defaultdict

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.embeddings.baseline_model import BaselineImageEncoder
from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.retrieval.faiss_index import RetrievalIndex

def calculate_ap(results, ground_truth_id):
    relevant_ranks = [rank for rank, res in enumerate(results, 1) if res["item_instance_id"] == ground_truth_id]
    if not relevant_ranks:
        return 0.0
    ap = sum([ (i + 1) / rank for i, rank in enumerate(relevant_ranks) ]) / len(relevant_ranks)
    return ap

def evaluate_model(model_name, embeddings, records, index, top_k=11):
    recall_1, recall_5, recall_10, mrr_sum, ap_sum = 0, 0, 0, 0.0, 0.0
    cat_metrics = defaultdict(lambda: {"r1": 0, "r5": 0, "r10": 0, "mrr": 0.0, "ap": 0.0, "count": 0})
    
    n = len(records)
    for i, query_record in enumerate(records):
        query_emb = embeddings[i]
        ground_truth_id = query_record.get("item_instance_id") or query_record.get("instance_id")
        cat = query_record["project_category"]
        
        raw_results = index.search(query_emb, top_k=top_k)
        # Filter out the query image itself
        results = [res for res in raw_results if res["metadata"].get("image_path") != query_record["image_path"]]
        
        # Calculate metrics
        r1 = 1 if any(r["item_instance_id"] == ground_truth_id for r in results[:1]) else 0
        r5 = 1 if any(r["item_instance_id"] == ground_truth_id for r in results[:5]) else 0
        r10 = 1 if any(r["item_instance_id"] == ground_truth_id for r in results[:10]) else 0
        
        mrr = 0.0
        for rank, res in enumerate(results, 1):
            if res["item_instance_id"] == ground_truth_id:
                mrr = 1.0 / rank
                break
                
        ap = calculate_ap(results, ground_truth_id)
        
        # Global
        recall_1 += r1
        recall_5 += r5
        recall_10 += r10
        mrr_sum += mrr
        ap_sum += ap
        
        # Per-Category
        cat_metrics[cat]["r1"] += r1
        cat_metrics[cat]["r5"] += r5
        cat_metrics[cat]["r10"] += r10
        cat_metrics[cat]["mrr"] += mrr
        cat_metrics[cat]["ap"] += ap
        cat_metrics[cat]["count"] += 1
        
    global_results = {
        "Recall@1": recall_1 / n,
        "Recall@5": recall_5 / n,
        "Recall@10": recall_10 / n,
        "MRR": mrr_sum / n,
        "mAP": ap_sum / n
    }
    
    per_cat = {}
    for cat, m in cat_metrics.items():
        c = m["count"]
        per_cat[cat] = {
            "Recall@1": m["r1"] / c,
            "Recall@5": m["r5"] / c,
            "Recall@10": m["r10"] / c,
            "MRR": m["mrr"] / c,
            "mAP": m["ap"] / c,
            "count": c
        }
        
    return global_results, per_cat

def main():
    test_split_path = Path("data/processed/test_split.jsonl")
    if not test_split_path.exists():
        print(f"Error: Could not find {test_split_path}")
        return
        
    records = []
    with open(test_split_path, 'r') as f:
        for line in f:
            if line.strip(): records.append(json.loads(line))
            
    # Remove records without valid local files (in case of missing downloads)
    valid_records = []
    for r in records:
        path = r.get("source_path") or r.get("image_path")
        if os.path.exists(path):
            r["image_path"] = path
            valid_records.append(r)
            
    records = valid_records
    print(f"Processing {len(records)} valid test images...")
    
    # ------------------ ResNet50 ------------------
    print("Loading ResNet50...")
    resnet = BaselineImageEncoder()
    resnet_index = RetrievalIndex(embedding_dimension=2048)
    resnet_embs = []
    
    t0 = time.time()
    for rec in records:
        emb = resnet.encode_image(rec["image_path"]).numpy()
        resnet_embs.append(emb)
        resnet_index.add_item(rec.get("item_instance_id") or rec.get("instance_id"), emb, {"image_path": rec["image_path"]})
    resnet_time = time.time() - t0
    
    resnet_global, resnet_cat = evaluate_model("ResNet50", resnet_embs, records, resnet_index)
    
    # Free memory
    del resnet
    del resnet_index
    torch.cuda.empty_cache()
    
    # ------------------ DINOv2 ------------------
    print("Loading DINOv2 ViT-S/14...")
    dinov2 = Dinov2ImageEncoder()
    dino_index = RetrievalIndex(embedding_dimension=384)
    dino_embs = []
    
    t0 = time.time()
    for rec in records:
        emb = dinov2.encode_image(rec["image_path"]).numpy()
        dino_embs.append(emb)
        dino_index.add_item(rec.get("item_instance_id") or rec.get("instance_id"), emb, {"image_path": rec["image_path"]})
    dino_time = time.time() - t0
    
    dino_global, dino_cat = evaluate_model("DINOv2", dino_embs, records, dino_index)
    
    # ------------------ Report Generation ------------------
    report_path = Path("reports/experiments/dinov2_frozen_baseline.md")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_path, "w") as f:
        f.write("# M3: DINOv2 Frozen Baseline\n\n")
        f.write("## Objective\n")
        f.write("Establish a clean, reproducible visual retrieval baseline using DINOv2 ViT-S/14 completely frozen, compared to the ResNet50 baseline.\n\n")
        
        f.write("## Performance/Resource Logging\n")
        f.write(f"- **Test Set Size:** {len(records)} instances\n")
        f.write(f"- **ResNet50 Inference Time:** {resnet_time:.2f}s ({len(records)/resnet_time:.2f} img/s), Dim: 2048\n")
        f.write(f"- **DINOv2 Inference Time:** {dino_time:.2f}s ({len(records)/dino_time:.2f} img/s), Dim: 384\n\n")
        
        f.write("## Global Results\n")
        f.write("| Metric | ResNet50 (Frozen) | DINOv2 ViT-S/14 (Frozen) | Diff |\n")
        f.write("|---|---|---|---|\n")
        for m in ["Recall@1", "Recall@5", "Recall@10", "MRR", "mAP"]:
            r_val = resnet_global[m]
            d_val = dino_global[m]
            diff = d_val - r_val
            f.write(f"| {m} | {r_val:.4f} | {d_val:.4f} | {diff:+.4f} |\n")
            
        f.write("\n## Per-Category Results (Recall@1)\n")
        f.write("| Category | Count | ResNet50 | DINOv2 | Diff |\n")
        f.write("|---|---|---|---|---|\n")
        for cat in sorted(resnet_cat.keys()):
            r_val = resnet_cat[cat]["Recall@1"]
            d_val = dino_cat[cat]["Recall@1"]
            count = resnet_cat[cat]["count"]
            diff = d_val - r_val
            f.write(f"| {cat} | {count} | {r_val:.4f} | {d_val:.4f} | {diff:+.4f} |\n")
            
    print(f"Experiment completed. Report saved to {report_path}")

if __name__ == "__main__":
    main()
