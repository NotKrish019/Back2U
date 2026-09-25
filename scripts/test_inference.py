import os
import sys
import torch
import json
from pathlib import Path
from PIL import Image
from torchvision import transforms

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.models.siamese_network import SiameseNetwork
from src.retrieval.faiss_index import RetrievalIndex

def test_inference(image_path):
    device = torch.device("cpu")
    print("Loading Siamese Network...")
    model = SiameseNetwork().to(device)
    checkpoint_path = project_root / "models" / "checkpoints" / "mir_siamese_best.pth"
    
    if checkpoint_path.exists():
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        print("Model loaded successfully.")
    else:
        print("Error: No checkpoint found.")
        return
        
    model.eval()
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    print("Building FAISS index from known test split (Gallery)...")
    index = RetrievalIndex(embedding_dimension=128)
    test_split_path = project_root / "data" / "processed" / "test_split.jsonl"
    
    with open(test_split_path, 'r') as f:
        for line in f:
            if not line.strip(): continue
            rec = json.loads(line)
            try:
                img = Image.open(rec["image_path"]).convert("RGB")
                img_tensor = transform(img).unsqueeze(0).to(device)
                with torch.no_grad():
                    emb = model(img_tensor).cpu().numpy().flatten()
                
                index.add_item(
                    item_instance_id=rec.get("instance_id") or rec.get("item_instance_id"),
                    embedding=emb,
                    metadata={
                        "category": rec.get("project_category") or rec.get("item_category"),
                        "image_path": rec["image_path"]
                    }
                )
            except Exception as e:
                pass
                
    print(f"Index built with {index.index.ntotal} items.")
    
    print(f"\nProcessing Query Image: {image_path}")
    query_img = Image.open(image_path).convert("RGB")
    query_tensor = transform(query_img).unsqueeze(0).to(device)
    
    with torch.no_grad():
        query_emb = model(query_tensor).cpu().numpy().flatten()
        
    results = index.search(query_emb, top_k=5)
    
    print("\n--- TOP 5 MATCHES ---")
    for r in results:
        print(f"Similarity: {r['similarity_score']:.4f} | Category: {r['metadata']['category']} | Image: {r['metadata']['image_path']}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_inference(sys.argv[1])
    else:
        print("Provide an image path.")
