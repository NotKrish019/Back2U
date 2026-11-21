"""Create the campus validation-only manifest (planned slots) and the training-exclusion registry,
and check collected photos against the protocol. Never invents photographs.

    python scripts/evaluation/campus_validation_plan.py            # (re)build plan + manifest + registry
    python scripts/evaluation/campus_validation_plan.py --check     # verify collected photos vs protocol
                                                                    # exit 0 ok, 1 problems, 2 nothing collected

Layout for collected photos (git-ignored):
    data/raw/campus_validation/<category>/<instance_id>/view_0{1..4}.jpg + instance.json
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from src.categories import CANONICAL_CATEGORIES  # noqa: E402

RAW = ROOT / "data/raw/campus_validation"
MANIFEST = ROOT / "data/processed/campus_validation_manifest.jsonl"
REGISTRY = ROOT / "data/processed/training_exclusion_registry.json"

VIEW_PROTOCOL = {
    "view_01": {"role": "owner", "background": "A", "viewpoint": "top_down_or_front", "clutter": False},
    "view_02": {"role": "owner", "background": "A", "viewpoint": "oblique_45deg_or_back", "clutter": False},
    "view_03": {"role": "found", "background": "B", "viewpoint": "side_or_low_angle", "clutter": False},
    "view_04": {"role": "found", "background": "B_or_C", "viewpoint": "any_different_from_view_03", "clutter": True},
}
LOOKALIKE_PAIRS = {  # slots 01+02 must be a look-alike pair; 03+04 may be distinct
    "laptop": "two same-model/colour laptops (slots 01/02 = existing app laptops u001 MacBook + u002 HP Victus are NOT look-alikes → use 03/04 as the same-model pair, e.g. two space-grey MacBooks)",
    "mobile_phone": "same phone model in different cases (01/02); also photograph a calculator and a charger as negatives (not instances)",
    "wallet": "two wallets of the same colour and style",
    "earphones": "two identical charging cases distinguished only by a small mark",
    "headphones": "two headphones of the same model",
    "keys": "two similar key rings",
    "book": "two copies of the same title/edition",
}
EXISTING = {  # genuine photographs already in the repo (Phase 2 staging); never invented
    ("laptop", "01"): ("data/raw/real_world_instances/laptop/laptop_app_u001", ["view_01.jpg", "view_02.jpg"]),
    ("laptop", "02"): ("data/raw/real_world_instances/laptop/laptop_app_u002", ["view_01.jpg", "view_02.jpg"]),
}


def build():
    records = []
    instances = []
    for cat in CANONICAL_CATEGORIES:
        for slot in ("01", "02", "03", "04"):
            iid = f"campus_val:{cat}_{slot}"
            instances.append(iid)
            existing = EXISTING.get((cat, slot))
            ex_views = {}
            if existing:
                meta = json.loads((ROOT / existing[0] / "instance.json").read_text())
                for k, name in enumerate(existing[1], 1):
                    p = ROOT / existing[0] / name
                    ex_views[f"view_0{k}"] = {"image_path": str(p.relative_to(ROOT)),
                                              "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
                                              "ground_truth_bbox": meta["views"][name]["bbox"],
                                              "bbox_status": meta["views"][name]["bbox_status"],
                                              "source_instance": meta["physical_instance_id"]}
            for view_id, proto in VIEW_PROTOCOL.items():
                ev = ex_views.get(view_id)
                records.append({
                    "physical_instance_id": iid, "category": cat, "view_id": view_id,
                    "role": proto["role"], "required_background": proto["background"],
                    "required_viewpoint": proto["viewpoint"], "required_clutter": proto["clutter"],
                    "lookalike_slot": slot in ("01", "02"),
                    "image_path": ev["image_path"] if ev else None,
                    "sha256": ev["sha256"] if ev else None,
                    "ground_truth_bbox": ev["ground_truth_bbox"] if ev else None,
                    "bbox_status": ev["bbox_status"] if ev else "pending_human_annotation",
                    "source": "campus_validation", "license": "internal (owner consent required)",
                    "split": "validation_holdout",
                    "status": "EXISTING_PHOTO_PROTOCOL_UNVERIFIED" if ev else "PLANNED_NOT_COLLECTED",
                    "verification_status": "PENDING",
                    "reserved_from_training": True, "reserved_from_calibration": True,
                    "notes": (f"existing app photo of {ev['source_instance']}; background/viewpoint roles must be "
                              "confirmed by the collector" if ev else ""),
                })
    MANIFEST.write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in records))
    holdout = json.loads((ROOT / "data/processed/co3d_phase2_holdout_sequences.json").read_text())
    co3d_ids = sorted({s for c in holdout["categories"].values()
                       for k in ("selected", "reserved_not_selected_dev", "reserved_official_test") for s in c[k]})
    REGISTRY.write_text(json.dumps({
        "purpose": "Physical instances / sequences that must NEVER enter training or calibration data.",
        "rules": ["Any future training or calibration manifest builder must load this file and refuse matching ids.",
                  "Merging identities (QC) does not release anything from this registry."],
        "campus_validation_instances": instances,
        "app_photo_instances": ["laptop_app_u001", "laptop_app_u002"],
        "co3d_reserved_sequences": {"source_file": "data/processed/co3d_phase2_holdout_sequences.json",
                                    "count": len(co3d_ids), "ids": co3d_ids},
    }, indent=1))
    collected = sum(1 for r in records if r["image_path"])
    print(json.dumps({"instances": len(instances), "view_slots": len(records), "existing_photos_assigned": collected,
                      "planned_not_collected": len(records) - collected, "manifest": str(MANIFEST.relative_to(ROOT)),
                      "registry": str(REGISTRY.relative_to(ROOT)), "co3d_reserved": len(co3d_ids)}, indent=1))


def check():
    """Protocol check for photos placed under data/raw/campus_validation/ (none exist yet)."""
    from src.evaluation.phase2.dataset_audit import audit_instance_root
    try:  # .heic views are allowed by the schema; decode them as production does
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except ImportError:
        pass
    if not RAW.exists():
        print("BLOCKED: data/raw/campus_validation/ does not exist — no campus photos collected yet.")
        return 2
    res = audit_instance_root(RAW)
    if not res["instances"]:
        print("BLOCKED: data/raw/campus_validation/ contains no object folders — nothing to check.")
        return 2
    problems = []
    for inst in res["instances"]:
        meta = json.loads((Path(inst["dir"]) / "instance.json").read_text()) if (Path(inst["dir"]) / "instance.json").exists() else {}
        views = meta.get("views", {})
        bgs = {v.get("background") for v in views.values() if v.get("background")}
        vps = {v.get("viewpoint") for v in views.values() if v.get("viewpoint")}
        clutter = any(v.get("clutter") for v in views.values())
        boxes = all(v.get("bbox") and v.get("bbox_status") == "human_verified" for v in views.values()) and views
        for cond, msg in [(inst["valid_genuine_views"] >= 4, "fewer than 4 genuine views"),
                          (len(bgs) >= 2, "fewer than 2 backgrounds"), (len(vps) >= 2, "fewer than 2 viewpoints"),
                          (clutter, "no cluttered view"), (boxes, "missing human-verified boxes")]:
            if not cond:
                problems.append(f"{inst['physical_instance_id']}: {msg}")
    print(json.dumps({"instances_found": len(res["instances"]), "problems": problems}, indent=1))
    return 1 if problems else 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    sys.exit(check() if a.check else (build() or 0))
