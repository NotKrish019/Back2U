"""Keep the ML gallery in step with the reports database (the database is the source of truth).

    python scripts/reindex_reports.py --check            # read-only; exit 1 if out of sync
    python scripts/reindex_reports.py --dry-run          # show what a sync would change
    python scripts/reindex_reports.py                    # incremental sync via the running ML service
    python scripts/reindex_reports.py --rebuild          # offline full rebuild (ML service must be stopped)

Sync (default) is incremental and idempotent: it adds eligible reports that are missing,
replaces entries whose image sha256 changed, and removes gallery items whose report was
deleted, resolved or closed. Before changing anything it backs up the SQLite database and the
local gallery directory (when they are local files).

Rebuild embeds every eligible report into a *temporary* gallery next to the live one, validates
it (one entry per eligible report, matching sha256, matching model version), backs up the live
gallery, then swaps the directories with ``os.replace``. The live gallery is never modified in
place, so an interrupted rebuild leaves it untouched.

The gallery (data/gallery/) is git-ignored and fully reproducible from the database with this
script; do not commit it.
"""
import argparse
import json
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.api.config import settings  # noqa: E402
from src.api.database import SessionLocal  # noqa: E402
from src.api.services.index_sync import plan_sync, sync_reports_to_index  # noqa: E402
from src.api.services.retrieval_service import RealRetrievalService  # noqa: E402

STAMP = time.strftime("%Y%m%d-%H%M%S")


def sqlite_path() -> Path | None:
    url = settings.DATABASE_URL
    if not url.startswith("sqlite:///"):
        return None
    p = Path(url[len("sqlite:///"):])
    return p if p.is_absolute() else (Path.cwd() / p)


def backup_db() -> str | None:
    src = sqlite_path()
    if not src or not src.exists():
        return None
    dst = src.with_name(f"{src.name}.bak-{STAMP}")
    # sqlite online backup API: consistent even if the backend is writing
    with sqlite3.connect(src) as s, sqlite3.connect(dst) as d:
        s.backup(d)
    return str(dst)


def gallery_dir() -> Path:
    return Path(os.environ.get("ML_GALLERY_DIR", str(ROOT / "data" / "gallery")))


def backup_gallery() -> str | None:
    g = gallery_dir()
    if not (g / "manifest.json").exists():
        return None
    dst = g.with_name(f"{g.name}.backup-{STAMP}")
    shutil.copytree(g, dst)
    return str(dst)


def ml_is_running(url: str) -> bool:
    try:
        import requests
        return requests.get(f"{url.rstrip('/')}/api/health", timeout=3).ok
    except Exception:
        return False


def offline_rebuild(db, allow_running: bool, ml_url: str) -> dict:
    if ml_is_running(ml_url) and not allow_running:
        raise SystemExit(f"ML service is running at {ml_url}. Stop it first (it keeps the gallery in "
                         "memory and would overwrite the rebuilt one), or pass --allow-running.")
    import hashlib
    from scripts.run_inference import FinalInferencePipeline
    from src.api.services.index_sync import image_roots_from_env, resolve_report_image
    from src.api.services.matching import is_index_eligible
    from src.api import models

    live = gallery_dir()
    tmp = live.with_name(f"{live.name}.rebuild-{STAMP}")
    os.chdir(ROOT)
    pipe = FinalInferencePipeline(store_dir=tmp)
    roots = image_roots_from_env()
    expected, skipped = {}, []
    for r in db.query(models.Report).order_by(models.Report.created_at):
        if not is_index_eligible(r):
            continue
        data, how = resolve_report_image(r.image_reference, roots)
        if data is None:
            skipped.append({"report_id": r.report_id, "reason": how})
            continue
        pipe.add_image_bytes(data, r.item_instance_id, r.item_category)
        expected[r.item_instance_id] = hashlib.sha256(data).hexdigest()

    # ---- validate before touching the live gallery
    got = {row["item_id"]: row["sha256"] for row in pipe.store.items_summary()}
    problems = [i for i in expected if got.get(i) != [expected[i]]] + [i for i in got if i not in expected]
    if problems:
        raise SystemExit(f"Rebuilt gallery failed validation for {problems}; live gallery untouched, "
                         f"temporary build left at {tmp}")
    backup = backup_gallery()
    if live.exists():
        os.replace(live, live.with_name(f"{live.name}.pre-rebuild-{STAMP}"))
    os.replace(tmp, live)
    old = live.with_name(f"{live.name}.pre-rebuild-{STAMP}")
    if old.exists():
        shutil.rmtree(old)  # identical copy already kept in the backup
    return {"mode": "rebuild", "model_version": pipe.model_version, "items": len(got),
            "skipped": skipped, "gallery": str(live), "gallery_backup": backup}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="read-only; exit 1 when out of sync")
    mode.add_argument("--dry-run", action="store_true", help="print the planned changes, change nothing")
    mode.add_argument("--rebuild", action="store_true", help="offline full rebuild with atomic swap")
    ap.add_argument("--ml-url", default=None)
    ap.add_argument("--keep-stale", action="store_true", help="sync: do not remove ineligible gallery items")
    ap.add_argument("--no-backup", action="store_true", help="skip the DB/gallery backup (not recommended)")
    ap.add_argument("--allow-running", action="store_true", help="rebuild even if the ML service is up")
    args = ap.parse_args()
    ml_url = args.ml_url or settings.ML_SERVICE_URL

    db = SessionLocal()
    try:
        if args.rebuild:
            out = {"db_backup": None if args.no_backup else backup_db()}
            out.update(offline_rebuild(db, args.allow_running, ml_url))
            print(json.dumps(out, indent=2))
            return
        service = RealRetrievalService(ml_url=ml_url, timeout=300)
        if args.check:
            plan = plan_sync(db, service)
            dirty = bool(plan["to_add"] or plan["to_replace"] or
                         [x for x in plan["to_remove"] if x["reason"] != "image_missing"])
            print(json.dumps({"in_sync": not dirty, **plan}, indent=2))
            sys.exit(1 if dirty else 0)
        if args.dry_run:
            print(json.dumps(sync_reports_to_index(db, service, dry_run=True,
                                                   remove_stale=not args.keep_stale), indent=2))
            return
        backups = {} if args.no_backup else {"db_backup": backup_db(), "gallery_backup": backup_gallery()}
        summary = sync_reports_to_index(db, service, remove_stale=not args.keep_stale)
        print(json.dumps({**backups, **summary}, indent=2))
        sys.exit(1 if summary["failed"] else 0)
    finally:
        db.close()


if __name__ == "__main__":
    main()
