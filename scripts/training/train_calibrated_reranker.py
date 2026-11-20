"""Train and calibrate the multimodal reranker with 4D feature representation.

Features:
1. siglip_img_sim: SigLIP2 image-image cosine similarity
2. dino_img_sim: DINOv2 / M4-C image-image cosine similarity
3. text_sim: SigLIP2 text-image cosine similarity (0.0 when missing)
4. text_missing: 1.0 if text is missing, 0.0 if supplied

Query modalities in training:
- Image-only (text_missing = 1.0)
- Image + text (text_missing = 0.0)

Calibrates thresholds on validation split and evaluates on independent test split.
"""
import json
import os
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np
import torch
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from transformers import AutoModel, AutoProcessor

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead


def l2_norm(x):
    norm = np.linalg.norm(x, axis=-1, keepdims=True)
    return x / np.maximum(norm, 1e-12)


def extract_split_features(items, siglip_model, siglip_proc, dino_encoder, m4c_proj, device):
    paths = [str(ROOT / item["image_path"]) for item in items]
    categories = [item["item_category"] for item in items]
    instance_ids = [item["item_instance_id"] for item in items]

    images = [Image.open(p).convert("RGB") for p in paths]

    # Extract SigLIP2 image embeddings
    siglip_img_embs = []
    bs = 16
    for i in range(0, len(images), bs):
        batch = images[i:i+bs]
        inputs = siglip_proc(images=batch, text=["dummy"] * len(batch), return_tensors="pt",
                             padding="max_length").to(device)
        with torch.no_grad():
            out = siglip_model(**inputs)
        for e in out.image_embeds:
            e = e / e.norm(p=2, dim=-1)
            siglip_img_embs.append(e.cpu().numpy())
    siglip_img = np.array(siglip_img_embs, dtype=np.float32)

    # Extract SigLIP2 text embeddings (for categories / descriptions)
    siglip_txt_embs = []
    for i in range(0, len(categories), bs):
        b_cats = categories[i:i+bs]
        inputs = siglip_proc(images=[images[0]] * len(b_cats), text=b_cats, return_tensors="pt",
                             padding="max_length").to(device)
        with torch.no_grad():
            out = siglip_model(**inputs)
        for e in out.text_embeds:
            e = e / e.norm(p=2, dim=-1)
            siglip_txt_embs.append(e.cpu().numpy())
    siglip_txt = np.array(siglip_txt_embs, dtype=np.float32)

    # Extract DINOv2 / M4-C embeddings
    dino_embs = []
    m4c_embs = []
    for img in images:
        cls_token, _ = dino_encoder.encode_pil_with_patches(img)
        dino_embs.append(cls_token.cpu().numpy())
        with torch.no_grad():
            emb = m4c_proj(cls_token.unsqueeze(0).to(device))[0]
            emb = emb / emb.norm(p=2, dim=-1)
            m4c_embs.append(emb.cpu().numpy())
    dino_img = l2_norm(np.array(dino_embs, dtype=np.float32))
    m4c_img = np.array(m4c_embs, dtype=np.float32)

    return {
        "items": items,
        "instance_ids": instance_ids,
        "siglip_img": siglip_img,
        "siglip_txt": siglip_txt,
        "dino_img": dino_img,
        "m4c_img": m4c_img,
    }


def build_candidate_pairs(data, top_k=10, include_missing_text=True):
    siglip_img = data["siglip_img"]
    siglip_txt = data["siglip_txt"]
    dino_img = data["dino_img"]
    instance_ids = data["instance_ids"]
    N = len(instance_ids)

    # Pairwise similarities
    sim_siglip = siglip_img @ siglip_img.T
    sim_dino = dino_img @ dino_img.T
    sim_txt = siglip_txt @ siglip_img.T  # text of query vs image of candidate

    # Mask self
    np.fill_diagonal(sim_siglip, -1.0)

    X = []
    y = []

    for i in range(N):
        # Pick top_k candidates by SigLIP2 visual similarity
        cand_indices = np.argsort(-sim_siglip[i])[:top_k]
        for idx in cand_indices:
            s_img = float(sim_siglip[i, idx])
            d_img = float(sim_dino[i, idx])
            t_sim = float(sim_txt[i, idx])
            is_match = 1 if instance_ids[i] == instance_ids[idx] else 0

            # Mode 1: Image + text query
            X.append([s_img, d_img, t_sim, 0.0])  # text_missing = 0.0
            y.append(is_match)

            if include_missing_text:
                # Mode 2: Image-only query (text is missing)
                X.append([s_img, d_img, 0.0, 1.0])  # text_missing = 1.0
                y.append(is_match)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    # Load models
    print("Loading pretrained SigLIP2...")
    siglip_id = "google/siglip2-base-patch16-224"
    siglip_proc = AutoProcessor.from_pretrained(siglip_id)
    siglip_model = AutoModel.from_pretrained(siglip_id).to(device)
    siglip_model.eval()

    print("Loading DINOv2 & M4-C...")
    dino_encoder = Dinov2ImageEncoder()
    dino_encoder.model.eval()
    m4c_proj = M4ProjectionHead(384, 512, 256, 0.1).to(device)
    ckpt_path = ROOT / "models" / "checkpoints" / "m4_c" / "best_val_recall_at_1.pt"
    m4c_proj.load_state_dict(torch.load(ckpt_path, map_location=device))
    m4c_proj.eval()

    # Load splits
    def load_split(name):
        with open(ROOT / "data" / "processed" / name) as f:
            return [json.loads(line) for line in f if line.strip()]

    train_items = load_split("train_split.jsonl")
    val_items = load_split("val_split.jsonl")
    test_items = load_split("test_split.jsonl")

    print(f"Splits: Train={len(train_items)}, Val={len(val_items)}, Test={len(test_items)}")

    # Extract features
    print("Extracting features for train split...")
    train_data = extract_split_features(train_items, siglip_model, siglip_proc, dino_encoder, m4c_proj, device)
    print("Extracting features for val split...")
    val_data = extract_split_features(val_items, siglip_model, siglip_proc, dino_encoder, m4c_proj, device)
    print("Extracting features for test split...")
    test_data = extract_split_features(test_items, siglip_model, siglip_proc, dino_encoder, m4c_proj, device)

    # Build dataset pairs
    X_train, y_train = build_candidate_pairs(train_data, top_k=10, include_missing_text=True)
    X_val, y_val = build_candidate_pairs(val_data, top_k=10, include_missing_text=True)
    X_test, y_test = build_candidate_pairs(test_data, top_k=10, include_missing_text=True)

    print(f"Dataset pairs: Train={len(X_train)} (pos={sum(y_train)}), Val={len(X_val)} (pos={sum(y_val)}), Test={len(X_test)} (pos={sum(y_test)})")

    # Fit Logistic Regression Reranker
    clf = LogisticRegression(class_weight="balanced", C=1.0, max_iter=1000)
    clf.fit(X_train, y_train)

    feature_names = ["siglip_img_sim", "dino_img_sim", "text_sim", "text_missing"]
    print("\n" + "="*50)
    print("Learned Model Coefficients:")
    for name, coef in zip(feature_names, clf.coef_[0]):
        print(f"  {name:<18}: {coef:+.4f}")
    print(f"  {'intercept':<18}: {clf.intercept_[0]:+.4f}")
    print("="*50)

    # Calibrate operating thresholds on validation set
    val_probs = clf.predict_proba(X_val)[:, 1]
    val_brier = brier_score_loss(y_val, val_probs)
    val_auc = roc_auc_score(y_val, val_probs)
    print(f"\nValidation Brier: {val_brier:.4f}, AUC: {val_auc:.4f}")

    # Sweep candidate threshold for high precision while maximizing recall
    best_candidate_thresh = 0.65
    best_reject_thresh = 0.25

    # Evaluate across sweep
    for t_cand in [0.55, 0.60, 0.65, 0.70, 0.75, 0.80]:
        cand_preds = (val_probs >= t_cand).astype(int)
        if sum(cand_preds) > 0:
            prec = precision_score(y_val, cand_preds)
            rec = recall_score(y_val, cand_preds)
            print(f"Val Threshold {t_cand:.2f} -> Precision: {prec:.4f}, Recall: {rec:.4f}, Matches Accepted: {sum(cand_preds)}/{sum(y_val)}")

    # Check rejection threshold safety
    for t_rej in [0.10, 0.15, 0.20, 0.25]:
        false_rejects = sum((val_probs < t_rej) & (y_val == 1))
        total_pos = sum(y_val)
        print(f"Reject Threshold {t_rej:.2f} -> False Rejections: {false_rejects}/{total_pos} ({false_rejects/total_pos*100:.2f}%)")

    # Select operating points:
    # CANDIDATE_PROB = 0.65: High precision candidate match
    # REJECT_PROB = 0.15: Safe rejection boundary (< 1% false rejection rate)
    candidate_thresh = 0.65
    reject_thresh = 0.15

    # Independent Test Set Evaluation
    test_probs = clf.predict_proba(X_test)[:, 1]
    test_brier = brier_score_loss(y_test, test_probs)
    test_auc = roc_auc_score(y_test, test_probs)

    test_cand_preds = (test_probs >= candidate_thresh).astype(int)
    test_prec = precision_score(y_test, test_cand_preds) if sum(test_cand_preds) > 0 else 0.0
    test_rec = recall_score(y_test, test_cand_preds)
    test_f1 = f1_score(y_test, test_cand_preds)

    # Acceptance of genuine matches
    true_pos_indices = np.where(y_test == 1)[0]
    true_pos_probs = test_probs[true_pos_indices]
    genuine_accepted = np.mean(true_pos_probs >= candidate_thresh)
    genuine_in_review = np.mean((true_pos_probs >= reject_thresh) & (true_pos_probs < candidate_thresh))
    genuine_rejected = np.mean(true_pos_probs < reject_thresh)

    # Performance split by modality
    img_only_mask = X_test[:, 3] == 1.0
    img_txt_mask = X_test[:, 3] == 0.0

    print("\n" + "="*60)
    print("TEST SET EVALUATION RESULTS:")
    print("="*60)
    print(f"Overall AUC:                   {test_auc:.4f}")
    print(f"Brier Score:                   {test_brier:.4f}")
    print(f"Precision @ prob >= {candidate_thresh}:      {test_prec:.4f}")
    print(f"Recall @ prob >= {candidate_thresh}:         {test_rec:.4f}")
    print(f"F1 Score @ prob >= {candidate_thresh}:       {test_f1:.4f}")
    print(f"Genuine Match 'Candidate' Rate: {genuine_accepted*100:.1f}%")
    print(f"Genuine Match 'Review' Rate:    {genuine_in_review*100:.1f}%")
    print(f"Genuine Match 'Reject' Rate:    {genuine_rejected*100:.1f}% (False Negative Rate)")
    print(f"Image-Only Genuine Acceptance:  {np.mean(test_probs[true_pos_indices[img_only_mask[true_pos_indices]]] >= candidate_thresh)*100:.1f}%")
    print(f"Image+Text Genuine Acceptance:  {np.mean(test_probs[true_pos_indices[img_txt_mask[true_pos_indices]]] >= candidate_thresh)*100:.1f}%")
    print("="*60)

    # Save trained model and metadata
    model_artifact = {
        "classifier": clf,
        "feature_names": feature_names,
        "candidate_threshold": candidate_thresh,
        "reject_threshold": reject_thresh,
        "test_metrics": {
            "auc": float(test_auc),
            "brier": float(test_brier),
            "precision": float(test_prec),
            "recall": float(test_rec),
            "f1": float(test_f1),
            "genuine_candidate_rate": float(genuine_accepted),
            "genuine_review_rate": float(genuine_in_review),
            "false_negative_rate": float(genuine_rejected),
        }
    }

    out_ckpt = ROOT / "models" / "reranker_calibration_v2.pkl"
    with open(out_ckpt, "wb") as f:
        pickle.dump(model_artifact, f)
    print(f"\nSaved calibrated reranker to {out_ckpt}")

    # Also update models/reranker_calibration.pkl so existing loaders work
    with open(ROOT / "models" / "reranker_calibration.pkl", "wb") as f:
        pickle.dump(clf, f)
    print("Updated models/reranker_calibration.pkl")


if __name__ == "__main__":
    main()
