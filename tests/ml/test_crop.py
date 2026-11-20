import math

from src.inference.crop import select_crop
from tests.ml.fakes import make_image


def test_valid_detection_is_cropped_with_padding():
    img = make_image((400, 300))
    crop, info = select_crop(img, [{"label": "laptop", "score": 0.6, "box": [100, 50, 300, 250]}])
    # 10% padding on a 200x200 box → 20px each side
    assert info.source == "detector"
    assert info.box == [80, 30, 320, 270]
    assert crop.size == (240, 240)
    assert info.label == "laptop"


def test_box_is_clamped_to_image_bounds():
    img = make_image((400, 300))
    crop, info = select_crop(img, [{"label": "wallet", "score": 0.5, "box": [-50, -10, 450, 320]}])
    assert info.source == "detector"
    assert info.box == [0, 0, 400, 300]
    assert crop.size == (400, 300)


def test_highest_valid_detection_wins_and_invalid_ones_are_skipped():
    img = make_image((400, 300))
    dets = [
        {"label": "chair", "score": 0.9, "box": [0, 0, 200, 200]},          # not canonical
        {"label": "laptop", "score": 0.8, "box": [10, 10, 20, 20]},         # too small
        {"label": "mobile phone", "score": 0.5, "box": [200, 100, 300, 250]},
        {"label": "laptop", "score": 0.4, "box": [0, 0, 100, 100]},
    ]
    _, info = select_crop(img, dets)
    assert info.label == "mobile_phone"
    assert info.score == 0.5


def test_fallback_is_explicit_when_nothing_valid():
    img = make_image((400, 300))
    for dets, reason_part in [
        ([], "no_detections"),
        ([{"label": "laptop", "score": 0.5, "box": [10, 10, 5, 5]}], "degenerate_box"),
        ([{"label": "laptop", "score": 0.5, "box": [math.nan, 0, 100, 100]}], "nan_box"),
        ([{"label": "laptop", "score": 0.5, "box": [500, 400, 600, 500]}], "box_outside_image"),
        ([{"label": "laptop", "score": 0.5, "box": [0, 0, 100]}], "malformed_box"),
        ([{"label": "laptop", "score": 0.5, "box": [0, 0, 40, 30]}], "box_too_small"),
    ]:
        crop, info = select_crop(img, dets)
        assert info.source == "full_image_fallback", dets
        assert reason_part in info.reason, (dets, info.reason)
        assert crop.size == img.size


def test_full_image_policy_returns_full_image_with_detection_metadata():
    img = make_image((400, 300))
    dets = [{"label": "laptop", "score": 0.85, "box": [50, 50, 200, 200]}]
    crop, info = select_crop(img, dets, policy="full_image")
    assert info.source == "full_image"
    assert crop.size == (400, 300)
    assert info.label == "laptop"
    assert info.score == 0.85
    assert info.box == [0, 0, 400, 300]


def test_confidence_aware_policy():
    img = make_image((400, 300))
    # Low confidence -> fallback to full image
    dets_low = [{"label": "laptop", "score": 0.35, "box": [50, 50, 200, 200]}]
    crop1, info1 = select_crop(img, dets_low, policy="confidence_aware", min_confidence=0.5)
    assert info1.source == "full_image_fallback"
    assert "low_confidence" in info1.reason
    assert crop1.size == (400, 300)

    # High confidence -> crops
    dets_high = [{"label": "laptop", "score": 0.85, "box": [50, 50, 200, 200]}]
    crop2, info2 = select_crop(img, dets_high, policy="confidence_aware", min_confidence=0.5)
    assert info2.source == "detector"
    assert info2.score == 0.85

    # Category mismatch -> fallback
    crop3, info3 = select_crop(img, dets_high, policy="confidence_aware", min_confidence=0.5, expected_category="wallet")
    assert info3.source == "full_image_fallback"
    assert "category_mismatch" in info3.reason
