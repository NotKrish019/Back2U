"""Code-path tests for the campus evaluation script (M7, EXECUTION_PLAN §K).

These use synthetic images and fake models only to check validation, look-alike handling, metric
bookkeeping, confidence intervals and the threshold sweep. They are NOT campus results.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from scripts.evaluation import campus_eval as CE
from scripts.run_inference import FinalInferencePipeline
from src.evaluation.campus.dataset import load_dataset
from tests.evaluation.campus_fixtures import box_png, edit_meta, full_dataset, write_object
from tests.ml.fakes import CosineReranker, FakeModels

ROOT = Path(__file__).resolve().parents[2]
COLORS = [(255, 0, 0), (0, 160, 0), (0, 0, 255), (0, 0, 0)]


def _book_set(root: Path, pairs: dict) -> Path:
    """4 book objects whose views the fake models can tell apart (box colour/position per object)."""
    for i, slot in enumerate(("01", "02", "03", "04")):
        write_object(root, "book", slot, 0, lookalike_of=pairs.get(slot),
                     image_fn=lambda fname, k, i=i: box_png(COLORS[i], 6 + 18 * i, mark=k + 1))
    return root


def _pipe(tmp_path):
    fake = FakeModels()
    fake.reranker = CosineReranker()
    fake.gate_label = "book"
    return FinalInferencePipeline(models=fake, store_dir=tmp_path / "g")


def test_discover_requires_consent_and_both_roles(tmp_path):
    write_object(tmp_path, "wallet", "01", 1)
    write_object(tmp_path, "wallet", "02", 2, consent=False)
    write_object(tmp_path, "wallet", "03", 3, views=("view_01",))
    objs, problems = CE.discover(tmp_path)
    assert [o["id"] for o in objs] == ["campus_val:wallet_01"]
    assert any("consent" in p for p in problems) and any("found view" in p for p in problems)
    assert CE.fold_of("01") == CE.fold_of("03") == "fold_a" and CE.fold_of("02") == "fold_b"


def test_evaluate_uses_metadata_twins_and_reports_intervals(tmp_path):
    # twins are slots 02 and 04 here: slot numbers must not matter
    root = _book_set(tmp_path / "raw", {"02": "campus_val:book_04", "04": "campus_val:book_02"})
    rep = load_dataset(root, allow_near_duplicates=True)  # synthetic views of one box are near-duplicates
    assert rep.pairs == [("campus_val:book_02", "campus_val:book_04")]
    res = CE.evaluate(rep.objects, _pipe(tmp_path), threshold=0.99, negatives=rep.negatives)

    assert res["overall"]["n"] == 8 and res["overall"]["R@1"] == 1.0
    assert res["lookalike"]["source"] == "lookalike_of metadata"
    assert res["lookalike"]["pairs"] == 1 and res["lookalike"]["queries"] == 4
    twins = {r["object"]: r["twin"] for r in res["per_query"]}
    assert twins["campus_val:book_01"] is None and twins["campus_val:book_02"] == "campus_val:book_04"

    ci = res["overall"]["ci"]["R@1"]
    assert ci["successes"] == 8 and ci["n"] == 8 and ci["clusters"] == 4
    assert ci["ci95"][1] == 1.0 and ci["ci95"][0] < 1.0 and ci["small_sample"]
    assert res["overall"]["ci"]["MRR"].startswith("no interval")
    am = res["overall"]["auto_match"]
    assert am["tp"] == 8 and am["fp_open"] == 0 and am["precision"] == 1.0
    assert am["ci"]["precision"]["n"] == 8 and am["ci"]["coverage"]["n"] == 8
    assert set(res["by_fold"]) == {"fold_a", "fold_b"}
    assert res["gate"]["rates_supported_views"]["correct_category_SUPPORTED"]["n"] == 16


def test_cli_end_to_end_with_fake_pipeline_writes_no_configuration(tmp_path, monkeypatch):
    root = full_dataset(tmp_path / "raw")
    protected = [ROOT / "configs/matching_thresholds.json", ROOT / "configs/open_set_gate.json",
                 ROOT / "configs/campus_validation/instance.schema.json"]
    before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}

    import run_inference  # the module object campus_eval imports inside main()
    monkeypatch.setattr(run_inference, "FinalInferencePipeline", lambda store_dir: _pipe(tmp_path))
    monkeypatch.chdir(ROOT)
    out = tmp_path / "report.json"
    code = CE.main(["--root", str(root), "--out", str(out), "--dev-fold", "fold_a",
                    "--sweep-start", "0.8", "--sweep-stop", "0.9", "--sweep-step", "0.05"])
    assert code == 0
    rep = json.loads(out.read_text())
    assert rep["status"] == "OK" and rep["validation"]["status"] == "OK"
    sw = rep["threshold_sweep"]
    assert sw["selected_threshold"] is None and [r["threshold"] for r in sw["splits"]["fold_b"]["rows"]] == [0.8, 0.85, 0.9]
    assert sw["splits"]["fold_a"]["role"].startswith("development")
    assert sw["deployed_threshold"] == json.loads((ROOT / "configs/matching_thresholds.json").read_text())["auto_match_min_score"]
    assert {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in protected} == before


def test_cli_refuses_invalid_data_before_loading_models(tmp_path, monkeypatch):
    root = full_dataset(tmp_path / "raw")
    edit_meta(root / "book" / "book_01", lambda m: m.update(lookalike_of="campus_val:book_01"))
    import run_inference
    monkeypatch.setattr(run_inference, "FinalInferencePipeline",
                        lambda **k: (_ for _ in ()).throw(AssertionError("models must not load")))
    assert CE.main(["--root", str(root), "--out", str(tmp_path / "r.json")]) == 3
    assert not (tmp_path / "r.json").exists()


def test_cli_reports_not_collected_without_fabricating(tmp_path):
    r = subprocess.run([sys.executable, "scripts/evaluation/campus_eval.py", "--root", str(tmp_path / "none")],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 2
    assert json.loads(r.stdout)["status"] == "NOT_COLLECTED"
