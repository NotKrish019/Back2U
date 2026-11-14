import argparse
import sys
import json
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModel

def verify_ownership(item_id, private_evidence_text):
    # Retrieve item path from gallery (simulation of database)
    gallery_path = "data/processed/test_split.jsonl"
    item_image_path = None
    with open(gallery_path, "r") as f:
        for line in f:
            if not line.strip(): continue
            rec = json.loads(line)
            if rec["item_instance_id"] == item_id:
                item_image_path = rec["image_path"]
                break
                
    if not item_image_path:
        return {"item_id": item_id, "status": "Error: Item not found in database"}
        
    # Use SigLIP2 to verify if private evidence aligns with the object
    device = "cuda" if torch.cuda.is_available() else "cpu"
    proc = AutoProcessor.from_pretrained("google/siglip2-base-patch16-224")
    model = AutoModel.from_pretrained("google/siglip2-base-patch16-224").to(device)
    model.eval()
    
    img = Image.open(item_image_path).convert("RGB")
    inputs = proc(images=[img], text=[private_evidence_text], return_tensors="pt", padding="max_length").to(device)
    
    with torch.no_grad():
        out = model(**inputs)
        i_emb = out.image_embeds[0]
        i_emb = i_emb / i_emb.norm(p=2, dim=-1)
        t_emb = out.text_embeds[0]
        t_emb = t_emb / t_emb.norm(p=2, dim=-1)
        
    sim = torch.dot(i_emb, t_emb).item()
    
    # Simple semantic threshold for evidence validation
    if sim > 0.25:
        decision = "support"
    elif sim > 0.15:
        decision = "manual review"
    else:
        decision = "reject"
        
    return {
        "item_id": item_id,
        "private_evidence": private_evidence_text,
        "semantic_consistency_score": round(sim, 4),
        "decision": decision
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="O9 - Ownership Evidence Prototype")
    parser.add_argument("--item_id", required=True, type=str, help="ID of the retrieved candidate")
    parser.add_argument("--evidence", required=True, type=str, help="Private evidence described by claimant (e.g. 'scratch on the left screen bezel')")
    args = parser.parse_args()
    
    res = verify_ownership(args.item_id, args.evidence)
    print(json.dumps(res, indent=2))
