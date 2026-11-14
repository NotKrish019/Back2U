import argparse
import sys
from scripts.run_inference import FinalInferencePipeline
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="O7 - Semantic Text Search")
    parser.add_argument("--text", required=True, type=str, help="Text query (e.g. 'black laptop')")
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()
    
    pipeline = FinalInferencePipeline()
    # Dummy image path, or we can just use the semantic embeddings directly.
    # The current FinalInferencePipeline requires an image to get M4-C visual candidates first.
    # But for purely text-to-image semantic retrieval (O7), we bypass M4-C and just do FAISS search on SigLIP2 embeds.
    
    # Let's implement text-only search inside the pipeline
    import torch
    inputs = pipeline.siglip_proc(text=[args.text], images=None, return_tensors="pt", padding="max_length").to(pipeline.device)
    with torch.no_grad():
        out = pipeline.siglip.get_text_features(inputs.input_ids, inputs.attention_mask)
        t_emb = out[0]
        t_emb = t_emb / t_emb.norm(p=2, dim=-1)
        
    sims = torch.matmul(pipeline.siglip_img_embeds.to(pipeline.device), t_emb).cpu().numpy()
    
    top_indices = sims.argsort()[-args.top_k:][::-1]
    
    response = {"query": args.text, "matches": []}
    for rank, idx in enumerate(top_indices):
        g_rec = pipeline.gallery[idx]
        response["matches"].append({
            "item_id": g_rec["item_instance_id"],
            "category": g_rec["item_category"],
            "text_score": float(sims[idx]),
            "decision": "candidate" if sims[idx] > 0.2 else "review"
        })
        
    print(json.dumps(response, indent=2))
