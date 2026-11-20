"""Code-path tests for the campus evaluation script (M7).

These use synthetic images and fake models only to check discovery, consent filtering, folds and
metric bookkeeping. They are NOT campus results; real results require collected photos.
"""
import json
import subprocess
import sys
from pathlib import Path

from scripts.evaluation import campus_eval as CE
from scripts.run_inference import FinalInferencePipeline
from tests.ml.fakes import CosineReranker, FakeModels, make_image

ROOT = Path(__file__).resolve().parents[2]


COLORS = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (0, 0, 0)]


def _object(root, cat, slot, seed, consent=True, views=("view_01", "view_02", "view_03", "view_04")):
    d = root / cat / f"{cat}_{slot}"
    d.mkdir(parents=True)
    img = make_image((320, 240), box=[20 + 60 * (seed % 4), 40, 120 + 60 * (seed % 4), 200], color=COLORS[seed % 4])
    for v in views:
        img.save(d / f"{v}.png")  # same object → same pixels (synthetic)
    (d / "instance.json").write_text(json.dumps({
        "category": cat, "physical_instance_id": f"campus_val:{cat}_{slot}",
        "consent": {"granted": consent, "form_version": "v1"}, "views": {}}))


def test_discover_requires_consent_and_both_roles(tmp_path):
    _object(tmp_path, "wallet", "01", 1)
    _object(tmp_path, "wallet", "02", 2, consent=False)
    _object(tmp_path, "wallet", "03", 3, views=("view_01",))
    objs, problems = CE.discover(tmp_path)
    assert [o["id"] for o in objs] == ["campus_val:wallet_01"]
    assert any("consent" in p for p in problems) and any("found view" in p for p in problems)
    assert CE.fold_of("01") == CE.fold_of("03") == "fold_a" and CE.fold_of("02") == "fold_b"


def test_evaluate_computes_retrieval_and_threshold_metrics(tmp_path):
    for i, slot in enumerate(("01", "02", "03", "04")):
        _object(tmp_path / "raw", "book", slot, 10 + i)
    objs, _ = CE.discover(tmp_path / "raw")
    fake = FakeModels()
    fake.reranker = CosineReranker()
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "g")
    res = CE.evaluate(objs, pipe, threshold=0.99, negatives=[])
    assert res["overall"]["n"] == 8 and res["overall"]["R@1"] == 1.0
    assert res["lookalike"]["queries"] == 4
    am = res["overall"]["auto_match"]
    assert am["tp"] == 8 and am["fp_open"] == 0 and am["precision"] == 1.0
    assert set(res["by_fold"]) == {"fold_a", "fold_b"}


def test_cli_reports_not_collected_without_fabricating(tmp_path):
    r = subprocess.run([sys.executable, "scripts/evaluation/campus_eval.py", "--root", str(tmp_path / "none")],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 2
    assert json.loads(r.stdout)["status"] == "NOT_COLLECTED"
