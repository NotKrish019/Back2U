"""Benchmark retrieval methods on held-out test data.

Compares:
1. SigLIP2 (full image vs detector crop)
2. Raw DINOv2 ViT-S/14 (full image vs detector crop)
3. M4-C (full image vs detector crop)
4. Score Fusion (SigLIP2 + DINOv2)
5. Score Fusion (SigLIP2 + M4-C)
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
import torch
from PIL import Image
from transformers import AutoModel, AutoProcessor, AutoModelForZeroShotObjectDetection

from src.categories import detector_prompt, normalize_detector_label
from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.inference.crop import select_crop
from src.models.m4_projection import M4ProjectionHead


def l2_norm(x):
    norm = np.linalg.norm(x, axis=-1, keepdims=True)
    return x / np.maximum(norm, 1e-12)


def compute_metrics(sim_matrix, is_pos_matrix):
    n_queries = sim_matrix.shape[0]
    recalls = {1: 0, 5: 0, 10: 0}
    mrr = 0.0
    valid_q = 0

    for i in range(n_queries):
        pos_mask = is_pos_matrix[i]
        if not np.any(pos_mask):
            continue
        valid_q += 1
        sims = sim_matrix[i]
        sorted_indices = np.argsort(-sims)
        rank = -1
        for r, idx in enumerate(sorted_indices):
            if pos_mask[idx]:
                rank = r + 1
                break
        if rank > 0:
            mrr += 1.0 / rank
            if rank <= 1: recalls[1] += 1
            if rank <= 5: recalls[5] += 1
            if rank <= 10: recalls[10] += 1

    if valid_q == 0:
        return {"R@1": 0.0, "R@5": 0.0, "R@10": 0.0, "MRR": 0.0, "n_queries": 0}
    return {
        "R@1": round(recalls[1] / valid_q, 4),
        "R@5": round(recalls[5] / valid_q, 4),
        "R@10": round(recalls[10] / valid_q, 4),
        "MRR": round(mrr / valid_q, 4),
        "n_queries": valid_q,
    }


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")

    # Load test split
    test_path = ROOT / "data" / "processed" / "test_split.jsonl"
    with open(test_path) as f:
        items = [json.loads(line) for line in f if line.strip()]

    print(f"Loaded {len(items)} items from {test_path}")

    # Ground truth positive matrix (excluding diagonal)
    N = len(items)
    is_pos = np.zeros((N, N), dtype=bool)
    for i in range(N):
        for j in range(N):
            if i != j and items[i]["item_instance_id"] == items[j]["item_instance_id"]:
                is_pos[i, j] = True

    # Load images
    full_images = []
    for item in items:
        p = ROOT / item["image_path"]
        img = Image.open(p).convert("RGB")
        full_images.append(img)

    # 1. Detection and cropping
    print("Running Grounding DINO detection...")
    gdino_id = "IDEA-Research/grounding-dino-tiny"
    gdino_proc = AutoProcessor.from_pretrained(gdino_id)
    gdino = AutoModelForZeroShotObjectDetection.from_pretrained(gdino_id).to(device)
    gdino.eval()
    prompt = detector_prompt()

    crop_images = []
    crop_sources = []
    for img in full_images:
        inputs = gdino_proc(images=img, text=prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = gdino(**inputs)
        res = gdino_proc.post_process_grounded_object_detection(
            outputs, inputs.input_ids, threshold=0.3, text_threshold=0.3,
            target_sizes=torch.tensor([img.size[::-1]]),
        )[0]
        labels = res.get("text_labels", res.get("labels"))
        dets = [
            {"label": str(labels[i]), "score": float(res["scores"][i]),
             "box": [float(v) for v in res["boxes"][i].tolist()]}
            for i in range(len(res["scores"]))
        ]
        crop, info = select_crop(img, dets)
        crop_images.append(crop)
        crop_sources.append(info.source)

    print(f"Crop sources count: {np.unique(crop_sources, return_counts=True)}")

    # 2. Extract SigLIP2 embeddings
    print("Extracting SigLIP2 embeddings...")
    siglip_id = "google/siglip2-base-patch16-224"
    siglip_proc = AutoProcessor.from_pretrained(siglip_id)
    siglip_model = AutoModel.from_pretrained(siglip_id).to(device)
    siglip_model.eval()

    def get_siglip_embs(img_list):
        embs = []
        bs = 16
        for i in range(0, len(img_list), bs):
            batch = img_list[i:i+bs]
            inputs = siglip_proc(images=batch, text=["dummy"]*len(batch), return_tensors="pt",
                                 padding="max_length").to(device)
            with torch.no_grad():
                out = siglip_model(**inputs)
            for e in out.image_embeds:
                e = e / e.norm(p=2, dim=-1)
                embs.append(e.cpu().numpy())
        return np.array(embs, dtype=np.float32)

    siglip_full = get_siglip_embs(full_images)
    siglip_crop = get_siglip_embs(crop_images)

    # 3. Extract Raw DINOv2 and M4-C embeddings
    print("Extracting DINOv2 & M4-C embeddings...")
    dinov2_encoder = Dinov2ImageEncoder()
    dinov2_encoder.model.eval()
    m4c_proj = M4ProjectionHead(384, 512, 256, 0.1).to(device)
    ckpt_path = ROOT / "models" / "checkpoints" / "m4_c" / "best_val_recall_at_1.pt"
    m4c_proj.load_state_dict(torch.load(ckpt_path, map_location=device))
    m4c_proj.eval()

    def get_dino_and_m4c_embs(img_list):
        dino_embs = []
        m4c_embs = []
        for img in img_list:
            cls_token, _ = dinov2_encoder.encode_pil_with_patches(img)
            dino_embs.append(cls_token.cpu().numpy())
            with torch.no_grad():
                emb = m4c_proj(cls_token.unsqueeze(0).to(device))[0]
                emb = emb / emb.norm(p=2, dim=-1)
                m4c_embs.append(emb.cpu().numpy())
        return l2_norm(np.array(dino_embs, dtype=np.float32)), np.array(m4c_embs, dtype=np.float32)

    dino_full, m4c_full = get_dino_and_m4c_embs(full_images)
    dino_crop, m4c_crop = get_dino_and_m4c_embs(crop_images)

    # Compute similarity matrices (self-similarity set to -1)
    def sim_mat(embs):
        sim = embs @ embs.T
        np.fill_diagonal(sim, -1.0)
        return sim

    results = {}

    # SigLIP2
    sim_siglip_full = sim_mat(siglip_full)
    results["SigLIP2 (Full Image)"] = compute_metrics(sim_siglip_full, is_pos)

    sim_siglip_crop = sim_mat(siglip_crop)
    results["SigLIP2 (Detector Crop)"] = compute_metrics(sim_siglip_crop, is_pos)

    # Raw DINOv2
    sim_dino_full = sim_mat(dino_full)
    results["Raw DINOv2 (Full Image)"] = compute_metrics(sim_dino_full, is_pos)

    sim_dino_crop = sim_mat(dino_crop)
    results["Raw DINOv2 (Detector Crop)"] = compute_metrics(sim_dino_crop, is_pos)

    # M4-C
    sim_m4c_full = sim_mat(m4c_full)
    results["M4-C (Full Image)"] = compute_metrics(sim_m4c_full, is_pos)

    sim_m4c_crop = sim_mat(m4c_crop)
    results["M4-C (Detector Crop)"] = compute_metrics(sim_m4c_crop, is_pos)

    # Fusion (SigLIP2 + DINOv2)
    sim_fusion_dino = 0.6 * sim_siglip_full + 0.4 * sim_dino_full
    np.fill_diagonal(sim_fusion_dino, -1.0)
    results["Fusion: SigLIP2 + DINOv2 (Full)"] = compute_metrics(sim_fusion_dino, is_pos)

    # Fusion (SigLIP2 + M4-C)
    sim_fusion_m4c = 0.6 * sim_siglip_full + 0.4 * sim_m4c_full
    np.fill_diagonal(sim_fusion_m4c, -1.0)
    results["Fusion: SigLIP2 + M4-C (Full)"] = compute_metrics(sim_fusion_m4c, is_pos)

    # Print summary table
    print("\n" + "="*75)
    print(f"{'Retrieval Method':<35} | {'R@1':<7} | {'R@5':<7} | {'R@10':<7} | {'MRR':<7}")
    print("="*75)
    for method, m in results.items():
        print(f"{method:<35} | {m['R@1']:<7.4f} | {m['R@5']:<7.4f} | {m['R@10']:<7.4f} | {m['MRR']:<7.4f}")
    print("="*75)

    out_file = ROOT / "reports" / "evaluation" / "benchmark_comparison_results.json"
    with open(out_file, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved results to {out_file}")


if __name__ == "__main__":
    main()
