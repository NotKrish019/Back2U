"""Index every stored report into the running ML service gallery (idempotent).

    python scripts/reindex_reports.py [--ml-url http://127.0.0.1:8001]
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.api.database import SessionLocal  # noqa: E402
from src.api.services.index_sync import sync_reports_to_index  # noqa: E402
from src.api.services.retrieval_service import RealRetrievalService  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ml-url", default=None)
    args = ap.parse_args()
    db = SessionLocal()
    try:
        summary = sync_reports_to_index(db, RealRetrievalService(ml_url=args.ml_url, timeout=300))
    finally:
        db.close()
    print(json.dumps(summary, indent=2))
    sys.exit(1 if summary["failed"] else 0)


if __name__ == "__main__":
    main()
