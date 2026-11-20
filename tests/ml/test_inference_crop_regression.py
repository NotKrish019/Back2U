"""Regression: the active inference path must embed the detector crop, not the full photo."""
import os
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from scripts.run_inference import FinalInferencePipeline
from tests.ml.fakes import FakeModels, make_image, to_jpeg_bytes

ROOT = Path(__file__).resolve().parents[2]

# Red object at [200,100,300,200] on a white 400x300 photo.
OBJ_BOX = [200, 100, 300, 200]
PADDED = (190, 90, 310, 210)  # 10% padding of a 100x100 box


@pytest.fixture
def photo(tmp_path):
    img = make_image((400, 300), box=OBJ_BOX, color=(255, 0, 0))
    path = tmp_path / "photo.png"
    img.save(path)
    return img, path


def _mostly_red(pil: Image.Image) -> float:
    arr = np.asarray(pil.convert("RGB"), dtype=np.int32)
    red = (arr[..., 0] > 200) & (arr[..., 1] < 60) & (arr[..., 2] < 60)
    return red.mean()


def test_search_embeds_detector_crop_not_full_image(tmp_path, photo):
    img, path = photo
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.55, "box": OBJ_BOX}])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery", crop_policy="detector_crop")

    res = pipe.infer(str(path), top_k=3)

    assert len(fake.visual_inputs) == 1
    seen = fake.visual_inputs[0]
    assert seen.size == (PADDED[2] - PADDED[0], PADDED[3] - PADDED[1]) != img.size
    assert np.array_equal(np.asarray(seen), np.asarray(img.crop(PADDED)))
    assert _mostly_red(seen) > 0.6 and _mostly_red(img) < 0.1
    assert res["crop"]["source"] == "detector"
    assert res["crop"]["box"] == list(PADDED)
    assert res["model_version"] == FakeModels.model_version
    # detector was prompted with the canonical categories
    assert fake.detect_prompts[0] == "laptop. mobile phone. wallet. earphones. headphones. keys. book."


def test_production_default_embeds_full_image(tmp_path, photo):
    img, path = photo
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.55, "box": OBJ_BOX}])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery")  # default crop_policy="full_image"

    res = pipe.infer(str(path), top_k=3)

    assert res["crop"]["source"] == "full_image"
    assert res["crop"]["box"] == [0, 0, img.size[0], img.size[1]]
    assert fake.visual_inputs[0].size == img.size
    assert fake.siglip_image_inputs[0].size == img.size


def test_confidence_aware_cropping(tmp_path, photo):
    img, path = photo
    # Low confidence -> fallback to full image
    fake_low = FakeModels(detections=[{"label": "laptop", "score": 0.35, "box": OBJ_BOX}])
    pipe_low = FinalInferencePipeline(models=fake_low, store_dir=tmp_path / "g1", crop_policy="confidence_aware")
    res_low = pipe_low.infer(str(path), top_k=3)
    assert res_low["crop"]["source"] == "full_image_fallback"

    # High confidence -> crops
    fake_high = FakeModels(detections=[{"label": "laptop", "score": 0.85, "box": OBJ_BOX}])
    pipe_high = FinalInferencePipeline(models=fake_high, store_dir=tmp_path / "g2", crop_policy="confidence_aware")
    res_high = pipe_high.infer(str(path), top_k=3)
    assert res_high["crop"]["source"] == "detector"


def test_gallery_add_embeds_crop_for_m4c_and_siglip(tmp_path, photo):
    img, path = photo
    fake = FakeModels(detections=[{"label": "wallet", "score": 0.4, "box": OBJ_BOX}])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery", crop_policy="detector_crop")

    out = pipe.add_to_gallery(str(path), "item_a", "Wallet")

    assert out["status"] == "added" and out["category"] == "wallet"
    expected = np.asarray(Image.open(path).convert("RGB").crop(PADDED))
    assert np.array_equal(np.asarray(fake.visual_inputs[0]), expected)
    assert np.array_equal(np.asarray(fake.siglip_image_inputs[0]), expected)
    assert pipe.store.entries[0].crop["source"] == "detector"


def test_query_crop_matches_gallery_crop_of_same_object_in_different_photo(tmp_path):
    """Same object, different background/position: crop-based embeddings must match exactly."""
    gallery_img = make_image((400, 300), box=[50, 50, 150, 150], color=(0, 0, 255))
    query_img = make_image((640, 480), bg=(0, 200, 0), box=[400, 300, 500, 400], color=(0, 0, 255))

    def detect(pil):
        box = [50, 50, 150, 150] if pil.size == (400, 300) else [400, 300, 500, 400]
        return [{"label": "book", "score": 0.5, "box": box}]

    fake = FakeModels(detect_fn=detect)
    fake.gate_label = "book"  # classifier agrees with the detector, so the crop is used
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery", crop_policy="detector_crop")
    pipe.add_image_bytes(to_jpeg_bytes(gallery_img), "item_blue", "book")
    pipe.add_image_bytes(to_jpeg_bytes(make_image((400, 300), seed=1)), "item_noise", "book")
    q = tmp_path / "q.png"
    query_img.save(q)
    # pad region of the query differs (green vs white) so compare the core box only via ranking
    res = pipe.infer(str(q), top_k=2)
    assert res["matches"][0]["item_id"] == "item_blue"


def test_full_image_fallback_is_reported(tmp_path, photo):
    _, path = photo
    fake = FakeModels(detections=[])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery", crop_policy="detector_crop")
    res = pipe.infer(str(path))
    assert res["crop"]["source"] == "full_image_fallback"
    assert res["crop"]["reason"] == "no_detections"
    assert fake.visual_inputs[0].size == (400, 300)


@pytest.mark.skipif(os.environ.get("RUN_REAL_MODELS") != "1",
                    reason="set RUN_REAL_MODELS=1 to load the real checkpoints (~1 min)")
def test_real_models_encoder_receives_crop(tmp_path):
    """Same regression through the real checkpoints: spy on the DINOv2 encoder input."""
    os.chdir(ROOT)
    pipe = FinalInferencePipeline(store_dir=tmp_path / "gallery")
    encoder = pipe.models.m4c_encoder
    received = []
    original = encoder.encode_pil_with_patches

    def spy(pil):
        received.append(pil.size)
        return original(pil)

    encoder.encode_pil_with_patches = spy
    photo_path = ROOT / "data" / "uploads" / "item_d80d8b6c.jpg"  # laptop on a cluttered desk
    full_size = Image.open(photo_path).size

    res = pipe.infer(str(photo_path), top_k=1)

    assert res["crop"]["source"] == "detector", res["crop"]
    x0, y0, x1, y1 = res["crop"]["box"]
    assert received == [(x1 - x0, y1 - y0)]
    assert received[0] != full_size
    print("REAL crop:", res["crop"], "full:", full_size)


def test_full_image_policy_skips_detector_entirely(tmp_path, photo):
    """M5: in full_image mode Grounding DINO must not run, for queries or gallery adds."""
    img, path = photo
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.9, "box": OBJ_BOX}])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery")  # full_image default
    pipe.add_image_bytes(to_jpeg_bytes(img), "item_x", "laptop")
    res = pipe.infer(str(path))
    assert fake.detect_prompts == []
    assert res["crop"]["source"] == "full_image"
    assert res["crop"]["reason"] == "full_image_policy_detector_skipped"
    assert res["timings"]["detector_s"] == 0.0
    # the full-image SigLIP embedding is computed once and reused for gate + retrieval
    assert len(fake.siglip_image_inputs) == 2  # 1 gallery add + 1 query


def test_detector_mode_always_restores_detection(tmp_path, photo, monkeypatch):
    _, path = photo
    monkeypatch.setenv("ML_DETECTOR_MODE", "always")
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.9, "box": OBJ_BOX}])
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery")
    res = pipe.infer(str(path))
    assert len(fake.detect_prompts) == 1
    assert res["crop"]["reason"] == "full_image_policy"


def test_detector_cannot_override_uncertain_classifier(tmp_path, photo):
    """M4: a confident detector box must not turn an uncertain/unsupported gate into SUPPORTED."""
    _, path = photo
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.99, "box": OBJ_BOX}])
    fake.gate_label = "backpack"
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery", crop_policy="detector_crop")
    res = pipe.infer(str(path))
    assert res["perception"]["decision"] == "UNSUPPORTED_ITEM"
    assert res["status"] == "UNSUPPORTED_ITEM"
    assert res["matches"] == []
