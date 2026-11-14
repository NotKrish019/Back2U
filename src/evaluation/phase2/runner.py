"""Run the preprocessing comparison for one config. Models are injected (tests use fakes)."""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image

from src.evaluation.phase2 import manifest as M
from src.evaluation.phase2.preprocessing import CONDITIONS, NEEDS_DETECTOR, NEEDS_GT_BBOX, prepare
from src.evaluation.phase2.retrieval_eval import evaluate

EVAL_CODE_REVISION = "phase2-eval-v1"


def _git_state(root: Path) -> dict:
    def run(*args):
        try:
            return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=10).stdout.strip()
        except Exception:
            return None
    return {"branch": run("branch", "--show-current"), "commit": run("rev-parse", "--short", "HEAD"),
            "dirty": bool(run("status", "--porcelain"))}


def blocked_reason(condition: str, records: list[dict], precropped: bool) -> str | None:
    if condition in NEEDS_GT_BBOX:
        missing = [M.record_key(r) for r in records if r["ground_truth_bbox"] is None]
        if missing:
            return f"{len(missing)}/{len(records)} records lack a verified ground_truth_bbox (e.g. {missing[0]})"
    if precropped and condition in NEEDS_DETECTOR | NEEDS_GT_BBOX:
        return "inputs are stored historical crops; original frames are unavailable"
    return None


def run(config: dict, models, root: Path) -> dict:
    """Execute every requested condition; write artifacts; return the summary dict."""
    records = M.load_manifest(root / config["manifest"], root)
    records = M.filter_records(records, config.get("sources"), config.get("categories"), config.get("splits"))
    records = sorted(records, key=M.record_key)
    if not records:
        raise M.ManifestError("no records left after filtering")
    viol = M.instance_split_violations(records)
    if viol:
        raise M.ManifestError(f"instances in more than one split: {viol}")
    cross = M.cross_instance_duplicates(records)
    if cross:
        raise M.ManifestError(f"identical image bytes under different instances: {cross}")

    if config.get("expected_checkpoint_sha256") and models.checkpoint_sha256 != config["expected_checkpoint_sha256"]:
        raise ValueError(f"checkpoint sha256 {models.checkpoint_sha256} != expected {config['expected_checkpoint_sha256']}")

    out = root / config["output_dir"] / config["run_name"]
    out.mkdir(parents=True, exist_ok=True)
    precropped = bool(config.get("inputs_are_precropped", False))
    ks = tuple(config.get("ks", (1, 5, 10)))
    images = {M.record_key(r): Image.open(r["_abs_path"]).convert("RGB") for r in records}

    conditions = config["conditions"]
    unknown = [c for c in conditions if c not in CONDITIONS]
    if unknown:
        raise ValueError(f"unknown conditions {unknown}")

    # one detector pass per image, shared by every detector-based condition
    detections = {}
    if any(c in NEEDS_DETECTOR for c in conditions) and not precropped:
        for r in records:
            detections[M.record_key(r)] = models.detect(images[M.record_key(r)])
        (out / "detections.json").write_text(json.dumps(detections, indent=1, sort_keys=True))

    gallery_keys = [M.record_key(r) for r in records]
    summary = {"conditions": {}, "gallery_keys_sha256": hashlib.sha256("\n".join(gallery_keys).encode()).hexdigest()}
    for cond in conditions:
        reason = blocked_reason(cond, records, precropped)
        if reason:
            summary["conditions"][cond] = {"status": "BLOCKED", "reason": reason}
            continue
        cdir = out / cond
        cdir.mkdir(exist_ok=True)
        prep_rows, vecs = [], []
        for r in records:  # query and gallery share one embedding per image → symmetric preprocessing
            key = M.record_key(r)
            inp, info = prepare(images[key], cond, r, detections.get(key))
            vecs.append(models.embed(inp, info.transform))
            prep_rows.append({"record": key, **info.to_dict()})
        emb = np.vstack(vecs).astype(np.float32)
        per_query, metrics = evaluate(records, emb, ks)
        np.save(cdir / "embeddings.npy", emb)
        (cdir / "gallery_keys.json").write_text(json.dumps(gallery_keys, indent=1))
        (cdir / "preprocessing.jsonl").write_text("".join(json.dumps(x, sort_keys=True) + "\n" for x in prep_rows))
        (cdir / "predictions.jsonl").write_text("".join(json.dumps(x, sort_keys=True) + "\n" for x in per_query))
        (cdir / "metrics.json").write_text(json.dumps(metrics, indent=1, sort_keys=True))
        summary["conditions"][cond] = {"status": "RUN", "transform": prep_rows[0]["transform"],
                                       "crop_sources": _count(prep_rows, "crop_source"), **metrics["overall"]}

    info = {
        "eval_code_revision": EVAL_CODE_REVISION,
        "run_name": config["run_name"],
        "evidence_level": config.get("evidence_level", "EXPLORATORY"),
        "model_version": models.model_version,
        "checkpoint": config.get("checkpoint"),
        "checkpoint_sha256": models.checkpoint_sha256,
        "detector_prompt": getattr(models, "prompt", None),
        "manifest": config["manifest"],
        "manifest_sha256": hashlib.sha256((root / config["manifest"]).read_bytes()).hexdigest(),
        "filters": {k: config.get(k) for k in ("sources", "categories", "splits")},
        "inputs_are_precropped": precropped,
        "n_records": len(records),
        "n_instances": len({r["physical_instance_id"] for r in records}),
        "config": config,
    }
    (out / "metrics_summary.json").write_text(json.dumps({**info, **summary}, indent=1, sort_keys=True))
    (out / "run_environment.json").write_text(json.dumps(
        {"git": _git_state(root), "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, indent=1))
    return {**info, **summary, "output_dir": str(out)}


def _count(rows, key):
    out = {}
    for r in rows:
        out[r[key]] = out.get(r[key], 0) + 1
    return out
