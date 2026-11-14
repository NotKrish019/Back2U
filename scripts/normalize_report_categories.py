"""Normalise historical report.item_category values to the canonical Phase-1 labels.

Dry-run by default. With --apply, a timestamped copy of the SQLite DB is written first.
Values that cannot be mapped are left untouched and listed (never guessed, never deleted).

    python scripts/normalize_report_categories.py            # dry run
    python scripts/normalize_report_categories.py --apply
"""
import argparse
import json
import shutil
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.api.config import settings  # noqa: E402
from src.api.database import SessionLocal  # noqa: E402
from src.api import models  # noqa: E402
from src.categories import normalize_category  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    backup = None
    if args.apply and settings.DATABASE_URL.startswith("sqlite:///"):
        db_path = Path(settings.DATABASE_URL.replace("sqlite:///", "", 1))
        if not db_path.is_absolute():
            db_path = Path.cwd() / db_path
        backup = db_path.with_name(f"{db_path.name}.bak-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.copy2(db_path, backup)
    elif args.apply:
        print("Non-SQLite database: take a backup before running with --apply.", file=sys.stderr)

    db = SessionLocal()
    changes, unmapped, before, after = [], [], Counter(), Counter()
    try:
        for r in db.query(models.Report).all():
            before[r.item_category] += 1
            canonical = normalize_category(r.item_category)
            if r.item_category is None:
                after[None] += 1
                continue
            if canonical is None:
                unmapped.append({"report_id": r.report_id, "item_category": r.item_category})
                after[r.item_category] += 1
                continue
            if canonical != r.item_category:
                changes.append({"report_id": r.report_id, "from": r.item_category, "to": canonical})
                if args.apply:
                    r.item_category = canonical
            after[canonical if args.apply else r.item_category] += 1
        if args.apply:
            db.commit()
    finally:
        db.close()

    print(json.dumps({
        "mode": "apply" if args.apply else "dry-run",
        "database": settings.DATABASE_URL.split("@")[-1],
        "backup": str(backup) if backup else None,
        "before": {str(k): v for k, v in before.items()},
        "after": {str(k): v for k, v in after.items()},
        "changed": changes,
        "unmapped_left_unchanged": unmapped,
    }, indent=2))


if __name__ == "__main__":
    main()
