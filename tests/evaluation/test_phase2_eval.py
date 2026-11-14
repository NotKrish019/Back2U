"""Phase 2 evaluation infrastructure tests (fake models; real manifest/runner/metric code)."""
import json
import shutil
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from src.evaluation.phase2 import dataset_audit as A
from src.evaluation.phase2 import detector_eval as D
from src.evaluation.phase2.manifest import ManifestError, load_manifest
from src.evaluation.phase2.preprocessing import TRANSFORM_LETTERBOX, TRANSFORM_PRODUCTION, letterbox, prepare
from src.evaluation.phase2.retrieval_eval import evaluate
from src.evaluation.phase2.runner import run


# ----------------------------------------------------------------- helpers
def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


def rec(iid, view, cat="laptop", sha=None, bbox=None):
    return {"physical_instance_id": iid, "view_id": view, "category": cat,
            "sha256": sha or f"{iid}-{view}", "image_path": f"{iid}/{view}.png", "ground_truth_bbox": bbox}


def make_img(path, color, size=(200, 120), box=None, box_color=(255, 0, 0)):
    img = Image.new("RGB", size, color)
    if box:
        img.paste(Image.new("RGB", (box[2] - box[0], box[3] - box[1]), box_color), box[:2])
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return img


class FakeModels:
    checkpoint_sha256 = "f" * 64
    model_version = "fake-eval"
    prompt = "laptop. mobile phone. wallet. earphones. headphones. keys. book."

    def __init__(self, box=(40, 20, 160, 100)):
        self.box = list(box)
        self.calls = []

    def detect(self, img):
        return [{"label": "laptop", "score": 0.5, "box": self.box}]

    def embed(self, img, transform):
        self.calls.append((img.size, transform))
        arr = np.asarray(img.convert("RGB").resize((8, 8)), dtype=np.float64).ravel() + 1.0
        if transform == TRANSFORM_LETTERBOX:
            arr = arr[::-1]
        return unit(arr).astype(np.float32)


@pytest.fixture
def dataset(tmp_path):
    """3 instances x 2 views (+1 single-view distractor) with GT boxes; colours make instances separable."""
    root = tmp_path
    lines = []
    colours = {"inst_a": (200, 30, 30), "inst_b": (30, 200, 30), "inst_c": (30, 30, 200)}
    for iid, col in colours.items():
        for v in range(2):
            p = root / "imgs" / iid / f"v{v}.png"
            make_img(p, tuple(max(0, c - 40 * v) for c in col), box=[40, 20, 160, 100], box_color=col)
            lines.append({"image_path": str(p.relative_to(root)), "category": "laptop", "physical_instance_id": iid,
                          "view_id": f"v{v}", "ground_truth_bbox": [40, 20, 160, 100], "source": "test",
                          "split": "eval_pilot", "verification_status": "TRUSTWORTHY"})
    p = root / "imgs" / "inst_d" / "v0.png"
    make_img(p, (120, 120, 120))
    lines.append({"image_path": str(p.relative_to(root)), "category": "laptop", "physical_instance_id": "inst_d",
                  "view_id": "v0", "ground_truth_bbox": [10, 10, 190, 110], "source": "test", "split": "eval_pilot",
                  "verification_status": "TRUSTWORTHY"})
    (root / "manifest.jsonl").write_text("".join(json.dumps(x) + "\n" for x in lines))
    config = {"run_name": "t", "manifest": "manifest.jsonl", "checkpoint": "fake.pt",
              "conditions": ["A_full_image", "B_detector_crop", "C_ground_truth_crop", "D_detector_crop_letterbox"],
              "output_dir": "out", "ks": [1, 2, 10]}
    return root, config, lines


# ----------------------------------------------------------------- metrics
def test_metrics_hand_computed():
    recs = [rec("a", "0"), rec("a", "1"), rec("b", "0"), rec("b", "1"), rec("c", "0")]
    e = np.array([unit([1, 0, 0]), unit([0.9, 0.1, 0]), unit([0, 1, 0]), unit([0.95, 0.05, 0.3]), unit([0, 0, 1])])
    per_q, m = evaluate(recs, e, ks=(1, 2, 10))
    by = {r["query"]: r for r in per_q}
    # hand-computed: b/1 → a(≈0.95) > c(≈0.30) > b/0(≈0.05) = rank 3; b/0 → a/1(0.110) > b/1(0.050) = rank 2
    assert [by[k]["rank"] for k in ("a/0", "a/1", "b/0", "b/1")] == [1, 1, 2, 3]
    assert by["b/1"]["hard_negative_correct"] is False and by["a/0"]["hard_negative_correct"] is True
    assert m["overall"]["n_queries"] == 4 and m["overall"]["n_skipped_queries"] == 1  # c has no positive
    assert m["overall"]["recall@1"] == 0.5
    assert m["overall"]["recall@2"] == 0.75
    assert m["overall"]["mrr"] == pytest.approx((1 + 1 + 1 / 2 + 1 / 3) / 4, abs=1e-6)
    assert m["overall"]["hard_negative_top1_accuracy"] == 0.5
    assert m["overall"]["trivial_recall_ks"] == [10]


def test_query_and_byte_identical_copies_excluded_from_gallery():
    # a/1 is a byte copy of a/0 → must not serve as a positive for a/0
    recs = [rec("a", "0", sha="X"), rec("a", "1", sha="X"), rec("a", "2"), rec("b", "0")]
    e = np.array([unit([1, 0]), unit([1, 0]), unit([0, 1]), unit([0.9, 0.1])])
    per_q, _ = evaluate(recs, e)
    q = {r["query"]: r for r in per_q}["a/0"]
    assert q["n_gallery_images"] == 2 and q["n_positive_images"] == 1
    assert q["rank"] == 2  # the only genuine positive (a/2) is far; b wins


def test_instance_aggregation_uses_max_and_ties_are_pessimistic():
    recs = [rec("a", "0"), rec("a", "1"), rec("a", "2"), rec("b", "0")]
    e = np.array([unit([1, 0]), unit([0, 1]), unit([1, 0]), unit([1, 0])])
    per_q, _ = evaluate(recs, e)
    q = {r["query"]: r for r in per_q}["a/0"]
    assert q["true_instance_score"] == pytest.approx(1.0)       # max over a/1 (0.0) and a/2 (1.0)
    assert q["rank"] == 2                                        # tie with b at 1.0 → pessimistic
    assert [t["instance"] for t in q["top"]] == ["a", "b"]       # each instance appears once


def test_hard_negative_only_counts_same_category():
    recs = [rec("a", "0"), rec("a", "1"), rec("w", "0", cat="wallet"), rec("w", "1", cat="wallet")]
    e = np.array([unit([1, 0]), unit([0.8, 0.6]), unit([0.99, 0.1]), unit([0.9, 0.2])])
    per_q, m = evaluate(recs, e)
    q = {r["query"]: r for r in per_q}["a/0"]
    assert q["rank"] == 2 and q["hardest_same_category_negative"] is None and q["hard_negative_correct"] is None
    assert m["per_category"]["laptop"]["hard_negative_top1_accuracy"] is None


def test_unnormalised_embeddings_rejected():
    with pytest.raises(ValueError):
        evaluate([rec("a", "0"), rec("a", "1")], np.array([[2.0, 0], [0, 1.0]]))


# ----------------------------------------------------------------- preprocessing
def test_letterbox_keeps_whole_object_and_aspect():
    img = Image.new("RGB", (400, 100), (255, 0, 0))
    lb = letterbox(img)
    arr = np.asarray(lb)
    assert lb.size == (224, 224)
    red_rows = np.where((arr[:, :, 0] > 200) & (arr[:, :, 1] < 50))[0]
    red_cols = np.where((arr[:, :, 0] > 200) & (arr[:, :, 1] < 50))[1]
    assert red_cols.min() == 0 and red_cols.max() == 223          # full width kept
    assert 54 <= red_rows.max() - red_rows.min() + 1 <= 57         # 400:100 → 224:56
    assert tuple(arr[0, 0]) == (124, 116, 104)                     # padding = ImageNet mean


def test_condition_inputs(tmp_path):
    img = make_img(tmp_path / "x.png", (0, 0, 0), size=(300, 200), box=[100, 50, 200, 150])
    r = {"category": "laptop", "ground_truth_bbox": [100, 50, 200, 150]}
    dets = [{"label": "laptop", "score": 0.4, "box": [90, 40, 210, 160]}]
    a, ia = prepare(img, "A_full_image", r, None)
    b, ib = prepare(img, "B_detector_crop", r, dets)
    c, ic = prepare(img, "C_ground_truth_crop", r, None)
    d, id_ = prepare(img, "D_detector_crop_letterbox", r, dets)
    assert a.size == (300, 200) and ia.transform == TRANSFORM_PRODUCTION
    assert ib.crop_box == [78, 28, 222, 172] and ib.detector_box == [90, 40, 210, 160]
    assert ic.crop_box == [90, 40, 210, 160] and ic.crop_source == "ground_truth"   # same 10% padding policy
    assert id_.crop_box == ib.crop_box and id_.transform == TRANSFORM_LETTERBOX and np.array_equal(np.asarray(b), np.asarray(d))
    with pytest.raises(ValueError):
        prepare(img, "C_ground_truth_crop", {"category": "laptop", "ground_truth_bbox": None}, None)


# ----------------------------------------------------------------- runner
def test_runner_symmetric_separate_galleries_and_reproducible(dataset):
    root, config, lines = dataset
    fake = FakeModels()
    s1 = run(config, fake, root)
    n = len(lines)
    # every image embedded exactly once per condition (query vector == gallery vector)
    assert len(fake.calls) == 4 * n
    for i, cond in enumerate(config["conditions"]):
        chunk = fake.calls[i * n:(i + 1) * n]
        assert len({t for _, t in chunk}) == 1  # one transform for query+gallery within a condition
    out = root / "out" / "t"
    keys = [json.loads((out / c / "gallery_keys.json").read_text()) for c in config["conditions"]]
    assert all(k == keys[0] for k in keys)                          # identical gallery membership
    embs = [np.load(out / c / "embeddings.npy") for c in config["conditions"]]
    assert not np.allclose(embs[0], embs[1])                        # separate per-condition galleries
    assert s1["conditions"]["A_full_image"]["n_queries"] == 6 and s1["conditions"]["A_full_image"]["n_skipped_queries"] == 1
    assert s1["model_version"] == "fake-eval" and s1["checkpoint_sha256"] == "f" * 64
    snapshot = {p.relative_to(out): p.read_bytes() for p in out.rglob("*") if p.is_file() and p.name != "run_environment.json"}
    shutil.rmtree(out)
    run(config, FakeModels(), root)
    again = {p.relative_to(out): p.read_bytes() for p in out.rglob("*") if p.is_file() and p.name != "run_environment.json"}
    assert snapshot == again                                        # byte-identical reproduction


def test_runner_blocks_gt_condition_when_any_bbox_missing(dataset):
    root, config, lines = dataset
    lines[0]["ground_truth_bbox"] = None
    (root / "manifest.jsonl").write_text("".join(json.dumps(x) + "\n" for x in lines))
    s = run(config, FakeModels(), root)
    assert s["conditions"]["C_ground_truth_crop"]["status"] == "BLOCKED"
    assert s["conditions"]["A_full_image"]["status"] == "RUN"


def test_runner_rejects_instance_in_two_splits(dataset):
    root, config, lines = dataset
    lines[1]["split"] = "test"
    (root / "manifest.jsonl").write_text("".join(json.dumps(x) + "\n" for x in lines))
    with pytest.raises(ManifestError, match="more than one split"):
        run(config, FakeModels(), root)


def test_runner_rejects_same_bytes_under_two_instances(dataset):
    root, config, lines = dataset
    shutil.copy(root / lines[0]["image_path"], root / lines[2]["image_path"])
    with pytest.raises(ManifestError, match="different instances"):
        run(config, FakeModels(), root)


def test_missing_image_and_duplicate_keys_are_fatal(dataset):
    root, config, lines = dataset
    bad = lines + [dict(lines[0])] + [dict(lines[0], view_id="v9", image_path="imgs/nope.png")]
    (root / "manifest.jsonl").write_text("".join(json.dumps(x) + "\n" for x in bad))
    with pytest.raises(ManifestError) as e:
        load_manifest(root / "manifest.jsonl", root)
    assert "image not found" in str(e.value) and "duplicate (instance, view)" in str(e.value)


def test_checkpoint_hash_mismatch_refused(dataset):
    root, config, _ = dataset
    with pytest.raises(ValueError, match="sha256"):
        run({**config, "expected_checkpoint_sha256": "0" * 64}, FakeModels(), root)


# ----------------------------------------------------------------- detector eval
def test_detector_eval_classifies_errors():
    img = Image.new("RGB", (300, 300))
    r = {"physical_instance_id": "i", "view_id": "v", "category": "keys", "ground_truth_bbox": [0, 0, 100, 100]}
    right = {"label": "keys", "score": 0.3, "box": [0, 0, 100, 100]}
    other = {"label": "mobile phone", "score": 0.6, "box": [150, 150, 300, 300]}
    misnamed = {"label": "mobile phone", "score": 0.6, "box": [5, 5, 100, 100]}
    wrong_obj = D.evaluate_image(img, r, [right, other])
    assert wrong_obj["wrong_object"] and wrong_obj["proposal_hit"] and not wrong_obj["selected_correct"]
    wrong_cat = D.evaluate_image(img, r, [misnamed])
    assert wrong_cat["wrong_category"] and not wrong_cat["correct_category_hit"]
    missed = D.evaluate_image(img, r, [other])
    assert missed["missed"] and not missed["wrong_object"]
    ok = D.evaluate_image(img, r, [right])
    assert ok["selected_correct"]
    agg = D.aggregate([wrong_obj, wrong_cat, missed, ok])
    assert agg["object_proposal_recall"] == 0.75 and agg["missed_object_rate"] == 0.25
    assert agg["multiple_object_selection_error_rate"] == 0.25 and agg["wrong_category_selection_rate"] == 0.25
    assert D.iou([0, 0, 10, 10], [5, 0, 15, 10]) == pytest.approx(1 / 3)


# ----------------------------------------------------------------- dataset audit
def test_instance_audit_counts_genuine_views(tmp_path):
    inst = tmp_path / "laptop" / "inst1"
    a = make_img(inst / "a.jpg", (10, 200, 10), box=[10, 10, 100, 60])
    shutil.copy(inst / "a.jpg", inst / "a_copy.jpg")                                  # byte duplicate
    make_img(inst / "b_flip.jpg", (200, 10, 10))                                       # augmentation
    make_img(inst / "c.jpg", (10, 10, 200), box=[50, 30, 190, 110], box_color=(250, 250, 0))
    (inst / "broken.jpg").write_bytes(b"not an image")
    (inst / "instance.json").write_text(json.dumps({"category": "laptop", "physical_instance_id": "inst1",
                                                    "identity_status": "TRUSTWORTHY"}))
    res = A.audit_instance_root(tmp_path)
    i = res["instances"][0]
    assert i["original_files"] == 5 and len(i["unreadable_files"]) == 1
    assert len(i["exact_duplicate_groups"]) == 1 and len(i["augmentation_files"]) == 1
    assert i["valid_genuine_views"] == 2 and not i["has_min_views"] and not i["m4c_eligible"]
    assert res["per_category"]["laptop"]["positive_pairs"] == 1
    assert res["per_category"]["wallet"]["instance_dirs"] == 0


def test_missing_root_is_explicit(tmp_path):
    res = A.audit_instance_root(tmp_path / "nope")
    assert res["exists"] is False and res["per_category"]["keys"]["original_images"] == 0
    assert A.audit_flat_category_dir(tmp_path / "nope", "headphones")["exists"] is False


def test_roboflow_augmentations_collapse_to_source(tmp_path):
    for name, col in [("img1_jpg.rf.0123456789abcdef.jpg", (1, 2, 3)), ("img1_jpg.rf.fedcba9876543210.jpg", (9, 9, 9)),
                      ("img2_jpg.rf.aaaaaaaabbbbbbbb.jpg", (200, 1, 1)), ("img3.jpg", (1, 200, 1))]:
        make_img(tmp_path / "pool" / name, col, box=[0, 0, 50, 50], box_color=(col[2], col[0], col[1]))
    res = A.audit_flat_category_dir(tmp_path / "pool", "headphones")
    assert res["files"] == 4 and res["augmentation_files"] == 3
    assert res["unique_source_keys"] == 3 and sorted(res["source_groups"]) == ["img1", "img2", "img3"]
