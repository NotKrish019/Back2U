"""Build data/processed/phase2_evaluation_manifest.jsonl from instance directories.

Reads <root>/<category>/<instance>/instance.json (identity + per-view annotations). Views that are
byte-identical to an earlier view of the same instance, or listed as excluded, are left out.
Every record gets split=eval_pilot unless instance.json sets a split; the builder refuses to put
one physical instance in two splits.

    python scripts/evaluation/build_phase2_manifest.py
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.evaluation.phase2.dataset_audit import list_images  # noqa: E402
from src.evaluation.phase2.manifest import instance_split_violations, load_manifest  # noqa: E402

ROOTS = ["data/raw/real_world_instances", "data/raw/historical_objectron_crops"]
OUT = "data/processed/phase2_evaluation_manifest.jsonl"


def main():
    records, excluded = [], []
    for rel in ROOTS:
        root = ROOT / rel
        if not root.exists():
            print(f"MISSING root (no records): {rel}")
            continue
        for meta_path in sorted(root.glob("*/*/instance.json")):
            meta = json.loads(meta_path.read_text())
            views = meta.get("views", {})
            seen = {}
            for img in list_images(meta_path.parent):
                v = views.get(img.name, {})
                sha = hashlib.sha256(img.read_bytes()).hexdigest()
                if sha in seen:
                    excluded.append({"image": str(img.relative_to(ROOT)), "reason": f"byte-identical to {seen[sha]}"})
                    continue
                if v.get("exclude"):
                    excluded.append({"image": str(img.relative_to(ROOT)), "reason": v["exclude"]})
                    continue
                seen[sha] = img.name
                records.append({
                    "image_path": str(img.relative_to(ROOT)),
                    "category": meta["category"],
                    "physical_instance_id": meta["physical_instance_id"],
                    "view_id": img.stem,
                    "ground_truth_bbox": v.get("bbox"),
                    "source": meta["source"],
                    "split": meta.get("split", "eval_pilot"),
                    "verification_status": meta.get("identity_status", "UNKNOWN") + "|bbox:" + v.get("bbox_status", "none"),
                    "bbox_status": v.get("bbox_status", "none"),
                    "image_kind": meta.get("image_kind", "original_photo"),
                    "identity_basis": meta.get("identity_basis"),
                    "training_overlap_risk": meta.get("training_overlap_risk", "UNKNOWN"),
                    "origin_path": v.get("origin"),
                    "sha256": sha,
                })
    viol = instance_split_violations(records)
    if viol:
        sys.exit(f"instances in multiple splits: {viol}")
    out = ROOT / OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in records))
    load_manifest(out, ROOT)  # validates schema + files
    print(json.dumps({"records": len(records), "instances": len({r['physical_instance_id'] for r in records}),
                      "excluded": excluded, "written": OUT}, indent=1))


if __name__ == "__main__":
    main()
