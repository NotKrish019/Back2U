"""Real-model regression suite (portable: no dependency on git-ignored data/raw).

Inputs
- Real checkpoints (models/…) and the pretrained backbones. Without them every test is skipped
  with an explicit reason.
- tests/assets/real_model_regression/: licensed Wikimedia Commons photographs with manifest,
  ground-truth labels, provenance and licence (see LICENSES.md; verify with
  ``python scripts/datasets/regression_assets.py verify``).
- Optional CO3D (research-only, never committed) for the genuine multi-view re-ID check; skipped
  with a reason when absent.

What the asset tests can and cannot show
- Gate tests use genuine photos of supported, unsupported and held-out unsupported objects.
- The asset re-ID test uses *synthetic* views (crop / colour / blur / JPEG of the same photo). It
  guards against regressions in the embedding path; it is NOT evidence of real-world re-ID.
"""
import io
import json
import os
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.run_inference import FinalInferencePipeline, LiveModels  # noqa: E402

ASSETS = ROOT / "tests/assets/real_model_regression"
CO3D = ROOT / "data/raw/co3d_research_only"
CHECKPOINTS = [ROOT / "models/checkpoints/m4_c/best_val_recall_at_1.pt", ROOT / "models/reranker_calibration.pkl"]
MISSING = [str(p.relative_to(ROOT)) for p in CHECKPOINTS if not p.exists()]

pytestmark = [
    pytest.mark.skipif(bool(MISSING), reason=f"real checkpoints not present: {MISSING}"),
    pytest.mark.skipif(os.environ.get("SKIP_REAL_MODELS") == "1", reason="SKIP_REAL_MODELS=1"),
    pytest.mark.skipif(not (ASSETS / "manifest.json").exists(),
                       reason="tests/assets/real_model_regression/manifest.json missing"),
]


def _manifest():
    return json.loads((ASSETS / "manifest.json").read_text())


def _load(m):
    return Image.open(ASSETS / m["file"]).convert("RGB")


def _phone_view(im: Image.Image, seed: int) -> Image.Image:
    """Deterministic 'second photo' stand-in: crop, brightness/colour shift, blur, JPEG q=40."""
    rng = np.random.default_rng(seed)
    w, h = im.size
    f = 0.85
    x, y = int(rng.integers(0, w - int(w * f) + 1)), int(rng.integers(0, h - int(h * f) + 1))
    im = im.crop((x, y, x + int(w * f), y + int(h * f)))
    im = ImageEnhance.Brightness(im).enhance(float(rng.uniform(0.8, 1.2)))
    im = ImageEnhance.Color(im).enhance(float(rng.uniform(0.7, 1.3)))
    im = im.filter(ImageFilter.GaussianBlur(1.0))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=40)
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


@pytest.fixture(scope="module")
def shared_models():
    return LiveModels(device="cpu")


@pytest.fixture
def real_pipeline(tmp_path, shared_models):
    return FinalInferencePipeline(models=shared_models, store_dir=tmp_path / "gallery",
                                  crop_policy="full_image", retrieval_mode="siglip")


def test_assets_match_their_pinned_checksums():
    import hashlib
    for m in _manifest():
        assert hashlib.sha256((ASSETS / m["file"]).read_bytes()).hexdigest() == m["sha256"], m["file"]
        assert m["license"] and m["page"].startswith("https://commons.wikimedia.org/")


def test_open_set_gate_on_real_photos(real_pipeline):
    rows = []
    for m in _manifest():
        p = real_pipeline.run_perception(_load(m))
        rows.append((m, p))
    sup = [(m, p) for m, p in rows if m["kind"] == "supported"]
    uns = [(m, p) for m, p in rows if m["kind"] != "supported"]
    correct = sum(p["decision"] == "SUPPORTED" and p["category"] == m["label"] for m, p in sup) / len(sup)
    wrong = sum(p["decision"] == "SUPPORTED" and p["category"] != m["label"] for m, p in sup) / len(sup)
    top1 = sum(p["candidate_category"] == m["label"] for m, p in sup) / len(sup)
    leaked = [m["file"] for m, p in uns if p["decision"] == "SUPPORTED"]
    report = {"supported_correct": correct, "supported_wrong": wrong, "top1": top1, "unsupported_leaked": leaked}
    assert top1 >= 0.85, report
    assert correct >= 0.60, report
    assert wrong <= 0.06, report
    assert len(leaked) <= max(1, int(0.1 * len(uns))), report


def test_detector_never_runs_in_full_image_mode(real_pipeline, monkeypatch):
    calls = []
    monkeypatch.setattr(real_pipeline.models, "detect", lambda *a, **k: calls.append(1) or [])
    m = next(x for x in _manifest() if x["kind"] == "supported")
    real_pipeline.add_image_bytes((ASSETS / m["file"]).read_bytes(), "item_a", m["label"])
    res = real_pipeline.infer_pil(_load(m), top_k=1)
    assert calls == [] and res["crop"]["reason"] == "full_image_policy_detector_skipped"


def test_reid_on_synthetic_views_of_real_photos(real_pipeline):
    """Regression guard only: synthetic second views (see module docstring)."""
    sup = [m for m in _manifest() if m["kind"] == "supported"]
    for m in sup:
        real_pipeline.add_image_bytes((ASSETS / m["file"]).read_bytes(), m["file"], m["label"])
    r1 = r5 = 0
    for k, m in enumerate(sup):
        res = real_pipeline.infer_pil(_phone_view(_load(m), k), top_k=5)
        ids = [x["item_id"] for x in res["matches"]]
        if res["status"] == "UNSUPPORTED_ITEM":
            continue
        r1 += bool(ids) and ids[0] == m["file"]
        r5 += m["file"] in ids
    assert r1 / len(sup) >= 0.85, (r1, len(sup))
    assert r5 / len(sup) >= 0.95, (r5, len(sup))


def test_calibrated_reranker_behavior(real_pipeline):
    reranker = real_pipeline.reranker
    assert reranker is not None
    assert reranker.predict_proba([[0.85, 0.82, 0.0, 1.0]])[0][1] >= 0.65   # genuine, image-only
    assert reranker.predict_proba([[0.40, 0.35, 0.0, 1.0]])[0][1] < 0.20    # clear negative


def test_blank_and_noise_images_never_become_supported(real_pipeline):
    rng = np.random.default_rng(0)
    for im in (Image.new("RGB", (300, 300), (255, 255, 255)), Image.new("RGB", (300, 300), (0, 0, 0)),
               Image.fromarray(rng.integers(0, 255, (300, 300, 3), dtype=np.uint8))):
        res = real_pipeline.infer_pil(im, top_k=3)
        assert res["perception"]["decision"] in ("UNCERTAIN", "UNSUPPORTED_ITEM")
        if res["perception"]["decision"] == "UNSUPPORTED_ITEM":
            assert res["status"] == "UNSUPPORTED_ITEM" and res["matches"] == []
        assert all(x["decision"] != "candidate" for x in res["matches"])


def test_end_to_end_bytes_and_gallery_sync(real_pipeline):
    m = next(x for x in _manifest() if x["kind"] == "supported")
    data = (ASSETS / m["file"]).read_bytes()
    assert real_pipeline.add_image_bytes(data, "item_sync_test", m["label"])["status"] == "added"
    assert real_pipeline.add_image_bytes(data, "item_sync_test", m["label"])["status"] == "already_indexed"
    res = real_pipeline.infer_pil(_load(m), top_k=3)
    assert res["matches"] and res["matches"][0]["item_id"] == "item_sync_test"
    assert real_pipeline.store.remove("item_sync_test") is True
    res2 = real_pipeline.infer_pil(_load(m), top_k=3, allowed_ids=None)
    assert "item_sync_test" not in [x["item_id"] for x in res2["matches"]]


@pytest.mark.skipif(not CO3D.exists(), reason="CO3D (research-only licence) not present at data/raw/co3d_research_only; "
                                             "see docs/planning/DATASET_STRATEGY.md")
def test_genuine_multiview_reid_on_co3d(real_pipeline):
    """Genuine different-viewpoint frames of the same physical object (held out from training)."""
    seqs = []
    for cat in ("laptop", "cellphone", "book"):
        for s in sorted((CO3D / cat).iterdir())[:8]:
            imgs = sorted((s / "images").glob("*.jpg"))
            if len(imgs) >= 6:
                seqs.append((s.name, imgs[0], imgs[len(imgs) // 2]))
    for name, g, _ in seqs:
        real_pipeline.add_to_gallery(str(g), name, None)
    r1 = 0
    for name, _, q in seqs:
        res = real_pipeline.infer(str(q), top_k=1)
        # a gate hard-stop (UNSUPPORTED_ITEM, ~3% of CO3D frames) returns no matches: counted as a miss
        r1 += bool(res["matches"]) and res["matches"][0]["item_id"] == name
    # CO3D probe (59-90 objects) measured R@1 0.68-0.75; with 24 objects expect clearly above chance
    assert r1 / len(seqs) >= 0.5, (r1, len(seqs))
