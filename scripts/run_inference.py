import os
import sys
import json
import torch
import argparse
from PIL import Image
from torchvision import transforms
import pickle
import numpy as np

from src.models.m2_classifier import M2CategoryHead
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection, AutoModel
from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead
import faiss

class FinalInferencePipeline:
    def __init__(self, device="cuda"):
        self.device = device if torch.cuda.is_available() else "cpu"
        self.load_models()
        self.load_gallery()
        
    def load_models(self):
        print("Loading Perception Models...", file=sys.stderr)
        with open("data/processed/m2_categories.json", "r") as f:
            self.idx_to_cat = json.load(f)
        self.known_categories = list(self.idx_to_cat.values())
        
        self.m2_clf = M2CategoryHead(num_categories=len(self.known_categories)).to(self.device)
        self.m2_clf.load_state_dict(torch.load("models/checkpoints/m2_category_head_best.pth", map_location=self.device))
        self.m2_clf.eval()
        
        self.gdino_proc = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-tiny")
        self.gdino = AutoModelForZeroShotObjectDetection.from_pretrained("IDEA-Research/grounding-dino-tiny").to(self.device)
        self.gdino_prompt = ". ".join(self.known_categories) + "."
        
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
        ])
        
        print("Loading M4-C Visual Retrieval Model...", file=sys.stderr)
        self.m4c_encoder = Dinov2ImageEncoder()
        for param in self.m4c_encoder.model.parameters(): param.requires_grad = False
        self.m4c_proj = M4ProjectionHead(384, 512, 256, 0.1).to(self.device)
        self.m4c_proj.load_state_dict(torch.load("models/checkpoints/m4_c/best_val_recall_at_1.pt", map_location=self.device))
        self.m4c_proj.eval()
        
        print("Loading SigLIP2 Semantic Model...", file=sys.stderr)
        self.siglip_proc = AutoProcessor.from_pretrained("google/siglip2-base-patch16-224")
        self.siglip = AutoModel.from_pretrained("google/siglip2-base-patch16-224").to(self.device)
        self.siglip.eval()
        
        print("Loading Multimodal Reranker & Calibrator...", file=sys.stderr)
        if os.path.exists("models/reranker_calibration.pkl"):
            with open("models/reranker_calibration.pkl", "rb") as f:
                self.reranker = pickle.load(f)
        else:
            self.reranker = None
            
    def load_gallery(self):
        print("Building Gallery FAISS Index...", file=sys.stderr)
        self.gallery = []
        gallery_embeds = []
        self.siglip_img_embeds = []
        
        with open("data/processed/test_split.jsonl") as f:
            for i, line in enumerate(f):
                if not line.strip(): continue
                rec = json.loads(line)
                self.gallery.append(rec)
                
                # M4-C
                try:
                    cls_token, _ = self.m4c_encoder.encode_image_with_patches(rec["image_path"])
                    cls_token = cls_token.unsqueeze(0).to(self.device)
                    emb = self.m4c_proj(cls_token)[0]
                    emb = emb / emb.norm(p=2, dim=-1)
                    gallery_embeds.append(emb.detach().cpu().numpy())
                except:
                    gallery_embeds.append(np.zeros(256, dtype=np.float32))
                
                # SigLIP
                try:
                    img = Image.open(rec["image_path"]).convert("RGB")
                    inputs = self.siglip_proc(images=[img], text=["dummy"], return_tensors="pt", padding="max_length").to(self.device)
                    with torch.no_grad():
                        out = self.siglip(**inputs)
                        se = out.image_embeds[0]
                        se = se / se.norm(p=2, dim=-1)
                        self.siglip_img_embeds.append(se.detach().cpu())
                except:
                    self.siglip_img_embeds.append(torch.zeros(768))
        
        self.siglip_img_embeds = torch.stack(self.siglip_img_embeds)
        
        # Build FAISS
        self.index = faiss.IndexFlatIP(256)
        if len(gallery_embeds) > 0:
            self.index.add(np.vstack(gallery_embeds))

    def entropy(self, probs):
        return -torch.sum(probs * torch.log(probs + 1e-8)).item()

    def run_perception(self, pil_img):
        # 1. Grounding DINO
        inputs = self.gdino_proc(images=pil_img, text=self.gdino_prompt, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.gdino(**inputs)
            
        target_sizes = torch.tensor([pil_img.size[::-1]])
        results = self.gdino_proc.post_process_grounded_object_detection(
            outputs, inputs.input_ids, threshold=0.3, text_threshold=0.3, target_sizes=target_sizes
        )[0]
        
        det_cat = None
        det_conf = 0.0
        det_proposals = []
        if len(results["scores"]) > 0:
            for i in range(len(results["scores"])):
                det_proposals.append({
                    "label": results["labels"][i],
                    "score": results["scores"][i].item()
                })
            best_idx = results["scores"].argmax().item()
            det_cat = results["labels"][best_idx]
            det_conf = results["scores"][best_idx].item()
            if det_cat not in self.known_categories:
                det_cat = None
                
        # 2. Visual Classifier
        img_t = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.m2_clf(img_t)
            probs = torch.softmax(logits, dim=-1)[0]
            
        sorted_probs, sorted_indices = torch.sort(probs, descending=True)
        top1 = sorted_probs[0].item()
        top2 = sorted_probs[1].item()
        margin = top1 - top2
        ent = self.entropy(probs)
        clf_cat = self.idx_to_cat[str(sorted_indices[0].item())]
        
        # 3. Apply M2-C Open-Set Policy (Margin > 0.95, Entropy < 0.3)
        agreement = (det_cat == clf_cat) and (det_cat is not None)
        
        decision = "UNCERTAIN"
        final_cat = clf_cat if top1 > 0.5 else None
        
        if agreement and margin > 0.95 and ent < 0.3:
            decision = "KNOWN"
            final_cat = clf_cat
        elif ent >= 0.3 or (det_cat is None and top1 < 0.9):
            decision = "UNKNOWN"
            final_cat = None
            
        return {
            "category": final_cat,
            "confidence": top1,
            "decision": decision,
            "margin": margin,
            "entropy": ent,
            "detector_proposals": det_proposals,
            "classifier_top1": top1,
            "classifier_top2": top2
        }

    def infer(self, image_path, text_query=None, top_k=5, return_debug=False):
        try:
            pil_img = Image.open(image_path).convert("RGB")
        except:
            return {"error": "Invalid image"}
            
        perception = self.run_perception(pil_img)
        
        response = {
            "perception": {
                "category": perception["category"],
                "confidence": round(perception["confidence"], 4),
                "decision": perception["decision"]
            },
            "matches": []
        }
        
        if perception["decision"] == "UNKNOWN":
            # Reject immediately
            return response
            
        # Retrieval (M4-C)
        cls_token, _ = self.m4c_encoder.encode_image_with_patches(image_path)
        cls_token = cls_token.unsqueeze(0).to(self.device)
        with torch.no_grad():
            emb = self.m4c_proj(cls_token)[0]
            emb = emb / emb.norm(p=2, dim=-1)
        
        visual_emb_np = emb.detach().cpu().numpy().reshape(1, -1)
        sims, indices = self.index.search(visual_emb_np, min(top_k * 2, len(self.gallery)))
        
        # Semantic & Reranking
        candidates = []
        for rank, idx in enumerate(indices[0]):
            g_rec = self.gallery[idx]
            v_sim = sims[0][rank]
            
            t_sim = 0.0
            if text_query:
                # Get SigLIP text embedding
                inputs = self.siglip_proc(images=[pil_img], text=[text_query], return_tensors="pt", padding="max_length").to(self.device)
                with torch.no_grad():
                    out = self.siglip(**inputs)
                    t_emb = out.text_embeds[0]
                    t_emb = t_emb / t_emb.norm(p=2, dim=-1)
                    
                g_siglip_emb = self.siglip_img_embeds[idx].to(self.device)
                t_sim = torch.dot(t_emb, g_siglip_emb).item()
                
            calibrated_prob = 0.0
            decision = "review"
            
            if self.reranker:
                # Use trained logistic regression to calibrate
                prob = self.reranker.predict_proba([[v_sim, t_sim]])[0][1]
                calibrated_prob = float(prob)
                
                # Operating point (e.g. 0.8)
                if calibrated_prob > 0.8:
                    decision = "candidate"
                elif calibrated_prob < 0.2:
                    decision = "reject"
            else:
                calibrated_prob = float(v_sim) # fallback
                
            candidates.append({
                "item_id": g_rec["item_instance_id"],
                "category": g_rec["item_category"],
                "visual_score": round(float(v_sim), 4),
                "text_score": round(float(t_sim), 4) if text_query else None,
                "final_score": round(calibrated_prob, 4),
                "decision": decision,
                "_debug": {
                    "v_sim": v_sim,
                    "t_sim": t_sim,
                    "emb_shape": list(visual_emb_np.shape)
                }
            })
            
        # Sort by final score
        candidates = sorted(candidates, key=lambda x: x["final_score"], reverse=True)[:min(top_k * 5, len(candidates))]
        
        # Instance aggregation
        aggregated = []
        seen_instances = {}
        for cand in candidates:
            iid = cand["item_id"]
            if iid not in seen_instances:
                cand["supporting_views"] = 1
                seen_instances[iid] = cand
                aggregated.append(cand)
            else:
                seen_instances[iid]["supporting_views"] += 1
                # Already sorted, so the first seen is the max score.
                
        response["matches"] = aggregated[:top_k]
        
        if return_debug:
            response["debug"] = {
                "perception": {
                    "detector_proposals": perception.get("detector_proposals", []),
                    "classifier_top1": perception.get("classifier_top1"),
                    "classifier_top2": perception.get("classifier_top2"),
                    "margin": perception.get("margin"),
                    "entropy": perception.get("entropy")
                },
                "candidates_raw": [c.get("_debug") for c in aggregated[:top_k]]
            }
            
        return response

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, type=str)
    parser.add_argument("--text", type=str, default=None)
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()
    
    pipeline = FinalInferencePipeline()
    res = pipeline.infer(args.image, args.text, args.top_k)
    print(json.dumps(res, indent=2))
