import os
import sys
import json
import torch
import numpy as np
from pathlib import Path
from torchvision import transforms
from PIL import Image

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.models.siamese_network import SiameseNetwork
from src.retrieval.faiss_index import RetrievalIndex
from src.evaluation.metrics import calculate_recall_at_k, calculate_mrr

def main():
    print("Loading Trained Siamese Model...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Initialize the model and load weights
    model = SiameseNetwork().to(device)
    checkpoint_path = project_root / "models" / "checkpoints" / "mir_siamese_best.pth"
    if checkpoint_path.exists():
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        print(f"Loaded weights from {checkpoint_path}")
    else:
        print(f"Warning: Checkpoint not found at {checkpoint_path}. Using random initialization.")
        
    model.eval()
    
    # Siamese network output dimension is 128
    index = RetrievalIndex(embedding_dimension=128)
    
    # We use the same image transformation as in training
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    
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
    with torch.no_grad():
        for rec in records:
            img_path = rec["image_path"]
            try:
                img = Image.open(img_path).convert("RGB")
            except Exception as e:
                print(f"Skipping {img_path}: {e}")
                continue
                
            img_tensor = transform(img).unsqueeze(0).to(device)
            emb = model(img_tensor).cpu().numpy().flatten()
            
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
    
    print("Evaluating Custom Siamese Model...")
    
    recall_1 = 0
    recall_5 = 0
    recall_10 = 0
    mrr_sum = 0.0
    
    for i, query_record in enumerate(records):
        query_emb = embeddings[i]
        ground_truth_id = query_record["item_instance_id"]
        
        # We query top_k + 1 to filter out the query image itself
        raw_results = index.search(query_emb, top_k=11)
        
        # Filter out the query image itself
        results = [res for res in raw_results if res["metadata"].get("image_path") != query_record["image_path"]]
        
        recall_1 += calculate_recall_at_k(results, ground_truth_id, 1)
        recall_5 += calculate_recall_at_k(results, ground_truth_id, 5)
        recall_10 += calculate_recall_at_k(results, ground_truth_id, 10)
        mrr_sum += calculate_mrr(results, ground_truth_id)
        
    n = len(records)
    print("\n=== Trained Model Results (Siamese Network - Triplet Loss) ===")
    print(f"Test Set Size: {n} images")
    print(f"Recall@1:  {recall_1 / n:.4f}")
    print(f"Recall@5:  {recall_5 / n:.4f}")
    print(f"Recall@10: {recall_10 / n:.4f}")
    print(f"MRR:       {mrr_sum / n:.4f}")

if __name__ == "__main__":
    main()
