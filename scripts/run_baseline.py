import os
import sys
import json
import numpy as np
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.embeddings.baseline_model import BaselineImageEncoder
from src.retrieval.faiss_index import RetrievalIndex
from src.evaluation.metrics import calculate_recall_at_k, calculate_mrr

def main():
    print("Loading Baseline Model (ResNet50)...")
    encoder = BaselineImageEncoder()
    index = RetrievalIndex(embedding_dimension=2048)
    
    test_split_path = Path("data/processed/test_split.jsonl")
    if not test_split_path.exists():
        print(f"Error: Could not find {test_split_path}")
        return
        
    records = []
    print("Reading test split records...")
    with open(test_split_path, 'r') as f:
        for line in f:
            if not line.strip(): continue
            records.append(json.loads(line))
            
    if not records:
        print("No records found in test split.")
        return
        
    print(f"Processing {len(records)} test images...")
    
    # Extract embeddings and add to index
    embeddings = []
    for rec in records:
        emb = encoder.encode_image(rec["image_path"]).numpy()
        index.add_item(
            item_instance_id=rec["item_instance_id"],
            embedding=emb,
            metadata={
                "category": rec["item_category"],
                "image_path": rec["image_path"]
            }
        )
        embeddings.append(emb)
        
    print("Index built successfully.")
    
    print("Evaluating Retrieval Baseline...")
    
    recall_1 = 0
    recall_5 = 0
    recall_10 = 0
    mrr_sum = 0.0
    
    for i, query_record in enumerate(records):
        query_emb = embeddings[i]
        ground_truth_id = query_record["item_instance_id"]
        
        # We query top_k + 1 because the query image itself is in the index and will be rank 1.
        # We filter it out by assuming the first result is itself (or explicitly filtering it).
        raw_results = index.search(query_emb, top_k=11)
        
        # Filter out the query image itself (usually at rank 1 with score ~1.0)
        results = [res for res in raw_results if res["metadata"].get("image_path") != query_record["image_path"]]
        
        recall_1 += calculate_recall_at_k(results, ground_truth_id, 1)
        recall_5 += calculate_recall_at_k(results, ground_truth_id, 5)
        recall_10 += calculate_recall_at_k(results, ground_truth_id, 10)
        mrr_sum += calculate_mrr(results, ground_truth_id)
        
    n = len(records)
    print("\n=== Baseline Results (Model: mir-v0.0.1-baseline) ===")
    print(f"Test Set Size: {n} images")
    print(f"Recall@1:  {recall_1 / n:.4f}")
    print(f"Recall@5:  {recall_5 / n:.4f}")
    print(f"Recall@10: {recall_10 / n:.4f}")
    print(f"MRR:       {mrr_sum / n:.4f}")

if __name__ == "__main__":
    main()
