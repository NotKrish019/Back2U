"""Audit real-world physical-instance data and category-level pools (read-only).

    python scripts/evaluation/audit_real_world_data.py [--out reports/evaluation/phase2_audit/audit.json]

Never modifies data. Missing roots are reported explicitly (exists: false), never skipped silently.
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from src.evaluation.phase2.dataset_audit import audit_flat_category_dir, audit_instance_root  # noqa: E402

INSTANCE_ROOTS = {
    "real_world_instances": "data/raw/real_world_instances",
    "historical_objectron_crops": "data/raw/historical_objectron_crops",
}
# Category pools named in ingest scripts / earlier reports. Audited if present.
CATEGORY_POOLS = {
    "data/raw/headphones": "headphones",
    "data/raw/earphones": "earphones",
    "data/raw/smartphones": "mobile_phone",
    "data/raw/objectron_images": None,
    "data/raw/paco_images": None,
    "data/raw/coil-100": None,
    "data/raw/images": None,
}


def strip(inst):
    return {k: v for k, v in inst.items() if k != "files"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="reports/evaluation/phase2_audit/real_world_audit.json")
    args = ap.parse_args()
    report = {"instance_roots": {}, "category_pools": {}}
    for name, rel in INSTANCE_ROOTS.items():
        res = audit_instance_root(ROOT / rel)
        res["instances"] = [strip(i) for i in res["instances"]]
        report["instance_roots"][name] = res
    for rel, cat in CATEGORY_POOLS.items():
        res = audit_flat_category_dir(ROOT / rel, cat)
        res.pop("source_groups", None)
        report["category_pools"][rel] = res
    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=1, sort_keys=True, default=str))

    for name, res in report["instance_roots"].items():
        print(f"\n[{name}] {res['root']} exists={res['exists']}")
        for cat, pc in res["per_category"].items():
            print(f"  {cat:13s} dirs={pc['instance_dirs']:3d} originals={pc['original_images']:3d} "
                  f"genuine_views={pc['valid_genuine_views']:3d} >=3views={pc['instances_with_ge3_views']:3d} "
                  f"trusted={pc['trustworthy_instances']:3d} m4c_eligible={pc['m4c_eligible_instances']:3d} "
                  f"pos_pairs={pc['positive_pairs']}")
        for i in res["instances"]:
            print(f"    {i['physical_instance_id']:28s} files={i['original_files']} views={i['valid_genuine_views']} "
                  f"dups={len(i['exact_duplicate_groups'])} near={len(i['near_duplicate_groups'])} "
                  f"identity={i['identity_status']} eligible={i['m4c_eligible']}")
    print("\n[category pools]")
    for rel, res in report["category_pools"].items():
        print(f"  {rel:28s} exists={res['exists']}" + (f" files={res['files']} unique_sources~{res['estimated_unique_sources']}" if res["exists"] else ""))
    print("\nwritten:", out)


if __name__ == "__main__":
    main()
