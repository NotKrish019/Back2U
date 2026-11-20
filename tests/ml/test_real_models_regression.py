"""Automated regression suite verifying real models and inference pipeline.

Validates:
1. Category classification accuracy on genuine test images.
2. Recall@1 and Recall@5 on genuine multi-view object instances.
3. Calibrated reranker precision and genuine match acceptance.
4. Detection graceful degradation on unmappable/missing detections.
5. End-to-end inference and gallery synchronization.
"""
import io
import os
import sys
import json
import pytest
import numpy as np
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.run_inference import FinalInferencePipeline, LiveModels, open_image_bytes
from src.categories import normalize_category, CANONICAL_CATEGORIES
from src.retrieval.gallery_store import GalleryStore

# Check if real models should run (or run conditionally if checkpoints exist)
CHECKPOINTS_EXIST = (ROOT / "models/checkpoints/m4_c/best_val_recall_at_1.pt").exists() and \
                    (ROOT / "models/reranker_calibration.pkl").exists()

pytestmark = pytest.mark.skipif(not CHECKPOINTS_EXIST, reason="Real model checkpoints required")

@pytest.fixture(scope="module")
def shared_models():
    """Load real models once for the test module."""
    return LiveModels(device="cpu")

@pytest.fixture
def real_pipeline(tmp_path, shared_models):
    """Instantiate pipeline with shared models and isolated temporary gallery."""
    store_dir = tmp_path / "test_real_gallery"
    return FinalInferencePipeline(models=shared_models, store_dir=store_dir,
                                  crop_policy="full_image", retrieval_mode="siglip")

def test_real_model_category_classification_accuracy(shared_models):
    """Verify category classification on a suite of genuine real-world images."""
    test_cases = []
    
    # Earphones
    ep_files = list((ROOT / "data/raw/earphones").glob("*.jpg"))
    if ep_files:
        test_cases.append((ep_files[0], "earphones"))
        
    # Headphones
    hp_files = list((ROOT / "data/raw/headphones").glob("*.jpg"))
    if hp_files:
        test_cases.append((hp_files[0], "headphones"))
        
    # Smartphone
    sp_files = list((ROOT / "data/raw/smartphones").rglob("*.jpg"))
    if sp_files:
        test_cases.append((sp_files[0], "mobile_phone"))
        
    # Laptop
    lp_files = list((ROOT / "data/raw/objectron_images/laptop").rglob("frame_0000.jpg"))
    if lp_files:
        test_cases.append((lp_files[0], "laptop"))
        
    # Book
    bk_files = list((ROOT / "data/raw/objectron_images/book").rglob("frame_0000.jpg"))
    if bk_files:
        test_cases.append((bk_files[0], "book"))
        
    # Bottle (Non-canonical -> other/None)
    bt_files = list((ROOT / "data/raw/objectron_images/bottle").rglob("frame_0000.jpg"))
    if bt_files:
        test_cases.append((bt_files[0], None))
        
    # Cup (Non-canonical -> other/None)
    cp_files = list((ROOT / "data/raw/objectron_images/cup").rglob("frame_0000.jpg"))
    if cp_files:
        test_cases.append((cp_files[0], None))
    
    assert len(test_cases) >= 5, f"Expected at least 5 test images, got {len(test_cases)}"
    
    correct = 0
    for p, expected in test_cases:
        img = Image.open(p).convert("RGB")
        probs = shared_models.classify_probs(img)
        pred_idx = int(probs.argmax().item())
        pred_raw = shared_models.siglip_idx_to_cat[str(pred_idx)]
        pred_cat = normalize_category(pred_raw)
        if pred_cat == expected:
            correct += 1
            
    acc = correct / len(test_cases)
    assert acc >= 0.80, f"Expected category accuracy >= 80%, got {acc:.2f} ({correct}/{len(test_cases)})"

def test_real_model_retrieval_ranking(real_pipeline):
    """Verify instance-level retrieval recall on physical instances."""
    # Find 4 objectron instances having both frame_0000.jpg and frame_0001.jpg
    queries = []
    
    candidates = []
    for cat in ["laptop", "book"]:
        cat_dir = ROOT / f"data/raw/objectron_images/{cat}"
        if not cat_dir.exists():
            continue
        for sub in cat_dir.iterdir():
            if sub.is_dir():
                f0 = sub / "frame_0000.jpg"
                f1 = sub / "frame_0001.jpg"
                if f0.exists() and f1.exists():
                    candidates.append((sub.name, cat, f0, f1))
                    if len(candidates) >= 4:
                        break
        if len(candidates) >= 4:
            break
            
    assert len(candidates) >= 3, f"Expected at least 3 instances, found {len(candidates)}"
    
    for inst_id, cat, f0, f1 in candidates:
        real_pipeline.add_to_gallery(str(f0), inst_id, cat)
        queries.append((str(f1), inst_id))
        
    recall_at_1 = 0
    recall_at_5 = 0
    for q_path, target_id in queries:
        res = real_pipeline.infer(q_path, top_k=5)
        matches = res.get("matches", [])
        if matches and matches[0]["item_id"] == target_id:
            recall_at_1 += 1
        if any(m["item_id"] == target_id for m in matches):
            recall_at_5 += 1
            
    r1 = recall_at_1 / len(queries)
    r5 = recall_at_5 / len(queries)
    assert r1 >= 0.70, f"Expected Recall@1 >= 0.70, got {r1:.2f} ({recall_at_1}/{len(queries)})"
    assert r5 >= 0.85, f"Expected Recall@5 >= 0.85, got {r5:.2f} ({recall_at_5}/{len(queries)})"

def test_calibrated_reranker_behavior(real_pipeline):
    """Verify reranker accepts genuine matches without image-only penalty."""
    reranker = real_pipeline.reranker
    assert reranker is not None, "Calibrated reranker must be loaded"
    
    # 1. High visual similarity (genuine match), image-only query (text_missing = 1.0, text_sim = 0.0)
    # [siglip_sim, dino_sim, text_sim, text_missing]
    feat_genuine_img_only = [[0.85, 0.82, 0.0, 1.0]]
    prob_genuine = reranker.predict_proba(feat_genuine_img_only)[0][1]
    assert prob_genuine >= 0.65, f"Genuine image-only match should pass candidate threshold, got {prob_genuine:.3f}"
    
    # 2. Hard negative pair (moderate/low similarity)
    feat_negative = [[0.40, 0.35, 0.0, 1.0]]
    prob_neg = reranker.predict_proba(feat_negative)[0][1]
    assert prob_neg < 0.20, f"Negative candidate should be rejected or marked low, got {prob_neg:.3f}"

def test_detection_failure_graceful_degradation(real_pipeline):
    """Verify that when detector finds no proposals or unknown objects, retrieval gracefully succeeds."""
    # Blank white image (no objects detectable)
    blank = Image.new("RGB", (300, 300), (255, 255, 255))
    res = real_pipeline.infer_pil(blank, top_k=3)
    
    assert res is not None
    assert "matches" in res
    assert res["crop"]["source"] in ("full_image", "full_image_fallback")
    assert res["perception"]["decision"] in ("UNKNOWN", "UNCERTAIN")

def test_end_to_end_bytes_and_gallery_sync(real_pipeline, tmp_path):
    """Verify end-to-end inference from raw bytes, item addition, and subsequent removal sync."""
    img = Image.new("RGB", (224, 224), (100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    data = buf.getvalue()
    
    # 1. Add item from bytes
    add_res = real_pipeline.add_image_bytes(data, "item_sync_test", "book")
    assert add_res["status"] == "added"
    assert "item_sync_test" in real_pipeline.store.item_ids()
    
    # 2. Query and verify item appears
    q_res = real_pipeline.infer_pil(img, top_k=3)
    found_ids = [m["item_id"] for m in q_res.get("matches", [])]
    assert "item_sync_test" in found_ids
    
    # 3. Synchronize deletion
    removed = real_pipeline.store.remove("item_sync_test")
    assert removed is True
    assert "item_sync_test" not in real_pipeline.store.item_ids()
    
    # 4. Query again: deleted item must not be retrieved
    q_res2 = real_pipeline.infer_pil(img, top_k=3)
    found_ids2 = [m["item_id"] for m in q_res2.get("matches", [])]
    assert "item_sync_test" not in found_ids2
