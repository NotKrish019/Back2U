import os
import json
import torch
import numpy as np
import pickle
from sklearn.metrics import brier_score_loss, precision_score
from torchvision import transforms
from PIL import Image

from src.models.m2_classifier import M2CategoryHead
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection, AutoModel
from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead

def entropy(probs):
    return -torch.sum(probs * torch.log(probs + 1e-8)).item()

def calculate_ece(probs, labels, n_bins=10):
    bin_limits = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_mask = (probs >= bin_limits[i]) & (probs < bin_limits[i+1])
        if np.any(bin_mask):
            bin_acc = np.mean(labels[bin_mask])
            bin_conf = np.mean(probs[bin_mask])
            ece += (np.sum(bin_mask) / len(probs)) * np.abs(bin_acc - bin_conf)
    return ece

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("Running Final Evaluation Suite...")
    
    # 1. Perception Evaluation (M2-C logic)
    print("Evaluating Perception...")
    with open("data/processed/m2_categories.json", "r") as f:
        idx_to_cat = json.load(f)
    known_categories = list(idx_to_cat.values())
    
    m2_clf = M2CategoryHead(num_categories=len(known_categories)).to(device)
    m2_clf.load_state_dict(torch.load("models/checkpoints/m2_category_head_best.pth", map_location=device))
    m2_clf.eval()
    
    gdino_proc = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-tiny")
    gdino = AutoModelForZeroShotObjectDetection.from_pretrained("IDEA-Research/grounding-dino-tiny").to(device)
    gdino_prompt = ". ".join(known_categories) + "."
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
    ])
    
    # Load targets and unknowns
    test_items = []
    with open("data/processed/test_split.jsonl") as f:
        for line in f:
            if line.strip(): test_items.append((json.loads(line), True))
            
    unknown_categories = ["chair", "bike", "cereal_box", "camera", "book"]
    unknowns_added = {c: 0 for c in unknown_categories}
    with open("data/interim/objectron_manifest.jsonl") as f:
        skipped = {c: 0 for c in unknown_categories}
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            cat = r["item_category"]
            if cat in unknown_categories:
                if skipped[cat] < 20:
                    skipped[cat] += 1
                    continue
                if unknowns_added[cat] < 20:
                    test_items.append((r, False))
                    unknowns_added[cat] += 1
                    
    tps, fps, fns, unknown_fps, unknown_total = 0, 0, 0, 0, 0
    for item, is_known in test_items:
        try:
            pil_img = Image.open(item["image_path"]).convert("RGB")
        except: continue
        
        inputs = gdino_proc(images=pil_img, text=gdino_prompt, return_tensors="pt").to(device)
        with torch.no_grad(): out = gdino(**inputs)
        results = gdino_proc.post_process_grounded_object_detection(
            out, inputs.input_ids, threshold=0.3, text_threshold=0.3, target_sizes=torch.tensor([pil_img.size[::-1]])
        )[0]
        
        det_cat = None
        if len(results["scores"]) > 0:
            best_idx = results["scores"].argmax().item()
            if results["labels"][best_idx] in known_categories:
                det_cat = results["labels"][best_idx]
                
        img_t = transform(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = m2_clf(img_t)
            probs = torch.softmax(logits, dim=-1)[0]
            
        sorted_probs, sorted_indices = torch.sort(probs, descending=True)
        top1 = sorted_probs[0].item()
        margin = top1 - sorted_probs[1].item()
        ent = entropy(probs)
        clf_cat = idx_to_cat[str(sorted_indices[0].item())]
        
        agreement = (det_cat == clf_cat) and (det_cat is not None)
        dec = "KNOWN" if agreement and margin > 0.95 and ent < 0.3 else ("UNKNOWN" if ent >= 0.3 else "UNCERTAIN")
        
        if is_known:
            if dec == "KNOWN" and clf_cat == item["item_category"]: tps += 1
            elif dec == "KNOWN": fps += 1; fns += 1
            else: fns += 1
        else:
            unknown_total += 1
            if dec == "KNOWN": unknown_fps += 1
            
    perc_precision = tps / (tps + fps) if (tps + fps) > 0 else 0
    perc_recall = tps / sum(1 for _, k in test_items if k)
    perc_far = unknown_fps / unknown_total if unknown_total > 0 else 0
    
    # 2. Retrieval & Calibration Evaluation
    print("Evaluating Retrieval & Calibration...")
    m4c_encoder = Dinov2ImageEncoder()
    for param in m4c_encoder.model.parameters(): param.requires_grad = False
    m4c_proj = M4ProjectionHead(384, 512, 256, 0.1).to(device)
    m4c_proj.load_state_dict(torch.load("models/checkpoints/m4_c/best_val_recall_at_1.pt", map_location=device))
    m4c_proj.eval()
    
    siglip_proc = AutoProcessor.from_pretrained("google/siglip2-base-patch16-224")
    siglip = AutoModel.from_pretrained("google/siglip2-base-patch16-224").to(device)
    siglip.eval()
    
    with open("models/reranker_calibration.pkl", "rb") as f:
        reranker = pickle.load(f)
        
    targets = [t[0] for t in test_items if t[1]]
    target_embeds = []
    target_siglip_img = []
    target_siglip_txt = []
    
    for rec in targets:
        # M4C
        cls_token, _ = m4c_encoder.encode_image_with_patches(rec["image_path"])
        cls_token = cls_token.unsqueeze(0).to(device)
        emb = m4c_proj(cls_token)[0]
        emb = emb / emb.norm(p=2, dim=-1)
        target_embeds.append(emb.detach().cpu())
        
        # SigLIP
        img = Image.open(rec["image_path"]).convert("RGB")
        inputs = siglip_proc(images=[img], text=[rec["item_category"]], return_tensors="pt", padding="max_length").to(device)
        with torch.no_grad():
            out = siglip(**inputs)
            i_emb = out.image_embeds[0]
            i_emb = i_emb / i_emb.norm(p=2, dim=-1)
            t_emb = out.text_embeds[0]
            t_emb = t_emb / t_emb.norm(p=2, dim=-1)
            target_siglip_img.append(i_emb.detach().cpu())
            target_siglip_txt.append(t_emb.detach().cpu())
            
    target_embeds = torch.stack(target_embeds)
    target_siglip_img = torch.stack(target_siglip_img)
    target_siglip_txt = torch.stack(target_siglip_txt)
    
    sim_m4c = torch.mm(target_embeds, target_embeds.t())
    sim_m4c.fill_diagonal_(-1.0)
    
    r1, r5, r10, mrr = 0, 0, 0, 0
    X, y = [], []
    for i in range(len(targets)):
        sims = sim_m4c[i]
        top_idx = torch.topk(sims, 10).indices
        
        # Retrieval Metrics
        rank = -1
        for r, idx in enumerate(top_idx):
            if targets[i]["item_instance_id"] == targets[idx]["item_instance_id"]:
                rank = r + 1
                break
        if rank > 0:
            mrr += 1.0 / rank
            if rank <= 1: r1 += 1
            if rank <= 5: r5 += 1
            if rank <= 10: r10 += 1
            
        # Calibration Data
        for idx in top_idx:
            v_sim = sims[idx].item()
            t_sim = torch.dot(target_siglip_txt[i], target_siglip_img[idx]).item()
            is_match = int(targets[i]["item_instance_id"] == targets[idx]["item_instance_id"])
            X.append([v_sim, t_sim])
            y.append(is_match)
            
    num_q = len(targets)
    r1, r5, r10, mrr = r1/num_q, r5/num_q, r10/num_q, mrr/num_q
    
    X = np.array(X); y = np.array(y)
    probs = reranker.predict_proba(X)[:, 1]
    brier = brier_score_loss(y, probs)
    ece = calculate_ece(probs, y)
    
    report = f"""# Final Overnight Summary

## 1. Completed Milestones
- M1 Dataset Repair
- M3 Frozen Baseline
- M4-A, M4-C Metric Learning (Hard Negatives)
- M2-A, M2-B, M2-C Open-Set Perception & Category Gate
- M5 SigLIP2 Multimodal Baseline & Reranking
- O3/O4 Multimodal Reranker and Calibration (Logistic Regression)
- O5-O8 Inference Paths (Image, Text, Image+Text via `scripts/run_inference.py` wrappers)
- O9 Ownership Evidence Prototype

## 2. Incomplete Milestones
- O12/O14 Package best checkpoint and generate model card (Partial: The models are saved, but a formal model card markdown has not been deeply populated yet).
- Large-scale product-level testing (Due to Objectron dataset size limitations).

## 3. Final Validated Model Architecture
- **Perception:** Grounding DINO (Proposal) + DINOv2 ViT-S/14 Linear Head (Verification)
- **Open-Set Decision:** Entropy + Margin Thresholds
- **Instance Retrieval:** Frozen DINOv2 + M4-C Projection Head (256D, SupCon + Hard Negatives)
- **Semantic Evidence:** Frozen SigLIP2 (Text-to-Image verification)
- **Reranking/Calibration:** Logistic Regression (Outputs calibrated probabilities)

## 4. Best Checkpoints
- `models/checkpoints/m4_c/best_val_recall_at_1.pt` (Instance Embeddings)
- `models/checkpoints/m2_category_head_best.pth` (Category Gate)
- `models/reranker_calibration.pkl` (Calibrated Reranker)

## 5. Final Metrics
### Perception (Open-Set)
- Known Precision: {perc_precision:.4f}
- Known Recall: {perc_recall:.4f}
- Unknown False Accept Rate: {perc_far:.4f}

### Retrieval (M4-C Instance Re-ID)
- Recall@1: {r1:.4f}
- Recall@5: {r5:.4f}
- Recall@10: {r10:.4f}
- MRR: {mrr:.4f}

### Calibration & Reranking
- Brier Score: {brier:.4f}
- Expected Calibration Error (ECE): {ece:.4f}

## 6. Known Failure Modes & Remaining Risks
- **Object Crops:** Tiny objects (like single earbuds) often lack enough visual features for the M4-C head.
- **Reranking Limitations:** Coarse text queries (e.g. "laptop") do not improve Top-10 ranking; text must be detailed to be effective.
- **Dataset Size:** The physical instance pool is ~117 instances (throttled due to compute). Real-world performance requires a larger corpus to guarantee generalizability.

## 7. Commands
**Inference:**
`python scripts/run_inference.py --image path/to/img.jpg --text "black laptop"`

**Ownership Verification:**
`python scripts/verify_ownership.py --item_id objectron_123 --evidence "scratch on lid"`
"""

    os.makedirs("reports", exist_ok=True)
    with open("reports/final_evaluation.md", "w") as f:
        f.write(report)
    with open("reports/final_overnight_summary.md", "w") as f:
        f.write(report)
        
    print("Final evaluation written to reports/final_overnight_summary.md")

if __name__ == "__main__":
    main()
