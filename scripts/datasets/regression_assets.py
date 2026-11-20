"""Build or verify the portable real-photo assets used by tests/ml/test_real_models_regression.py.

    # build (maintainers): pick curated, licence-checked Commons photos into tests/assets/…
    python scripts/datasets/regression_assets.py build --downloaded <dir with _manifest.json> \
        --curation <curation.json> [--per-supported 5 --per-unsupported 2]

    # verify (anyone): checksums of committed files; --refetch re-downloads from the pinned
    # Commons URLs into a temp dir and checks they still hash identically.
    python scripts/datasets/regression_assets.py verify [--refetch]

Only Wikimedia Commons files under CC0 / public domain / CC BY / CC BY-SA are accepted; each one
is a 480-px-wide thumbnail rendered by Commons (same licence as the original). Attribution for
every file is written to LICENSES.md next to the images.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "tests" / "assets" / "real_model_regression"
OK_LICENCES = ("cc0", "public domain", "pdm", "cc by 2.0", "cc by 3.0", "cc by 4.0",
               "cc by-sa 2.0", "cc by-sa 3.0", "cc by-sa 4.0")
SUPPORTED = ("laptop", "mobile_phone", "wallet", "earphones", "headphones", "keys", "book")
HELD_OUT = ("stapler", "scissors", "teddy_bear", "basketball")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def plain(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def build(args):
    src = args.downloaded
    rows = json.loads((src / "_manifest.json").read_text())
    curation = json.loads(args.curation.read_text())
    excluded = {(c, i) for c, v in curation.items() if isinstance(v, dict) for i in v.get("exclude", [])}
    by_cls: dict[str, list] = {}
    for r in rows:
        idx = int(Path(r["file"]).stem.rsplit("_", 1)[1])
        lic = (r.get("license") or "").lower()
        if (r["class"], idx) in excluded or not lic.startswith(OK_LICENCES):
            continue
        r["_idx"] = idx
        by_cls.setdefault(r["class"], []).append(r)
    if ASSETS.exists():
        shutil.rmtree(ASSETS / "images", ignore_errors=True)
    (ASSETS / "images").mkdir(parents=True, exist_ok=True)
    manifest = []
    for cls, items in sorted(by_cls.items()):
        n = args.per_supported if cls in SUPPORTED else args.per_unsupported
        # prefer the calibration TEST split (sha-based, same rule as calibrate_open_set.py)
        items.sort(key=lambda r: (int(r["sha256"][:8], 16) % 10 < 6, r["_idx"]))
        for r in items[:n]:
            name = f"{cls}_{r['_idx']:02d}.jpg"
            shutil.copyfile(src / r["file"], ASSETS / "images" / name)
            kind = "supported" if cls in SUPPORTED else ("held_out_unsupported" if cls in HELD_OUT else "unsupported")
            manifest.append({
                "file": f"images/{name}", "class": cls, "kind": kind,
                "label": cls if kind == "supported" else None,
                "sha256": sha(ASSETS / "images" / name), "source": "wikimedia_commons",
                "title": r["title"], "page": r["page"], "download_url": r["thumb"],
                "license": r["license"], "author": plain(r.get("artist", "")) or "see page",
                "original_size": [r.get("w"), r.get("h")], "derivative": "480 px thumbnail rendered by Wikimedia",
            })
    (ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    lines = ["# Licences and attribution: real-photo regression assets", "",
             "All images are thumbnails (480 px wide, rendered by Wikimedia Commons) of the files below. "
             "Each keeps its original licence; CC BY-SA images are redistributed under the same licence. "
             "No image was edited.", "",
             "| File | Title | Author | Licence | Source |", "|---|---|---|---|---|"]
    for m in manifest:
        lines.append(f"| `{m['file']}` | {m['title'].replace('|', '/')} | {m['author'].replace('|', '/')[:80]} | "
                     f"{m['license']} | [Commons]({m['page']}) |")
    (ASSETS / "LICENSES.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({c: sum(1 for m in manifest if m["class"] == c) for c in sorted(by_cls)}, indent=1))
    print(f"{len(manifest)} files, {sum((ASSETS / m['file']).stat().st_size for m in manifest) / 1e6:.1f} MB")


def verify(args):
    manifest = json.loads((ASSETS / "manifest.json").read_text())
    bad = [m["file"] for m in manifest if not (ASSETS / m["file"]).exists() or sha(ASSETS / m["file"]) != m["sha256"]]
    lic = [m["file"] for m in manifest if not m["license"].lower().startswith(OK_LICENCES)]
    out = {"files": len(manifest), "checksum_mismatch_or_missing": bad, "licence_not_allowed": lic}
    if args.refetch:
        tmp = Path(tempfile.mkdtemp(prefix="b2u_assets_"))
        drift = []
        for m in manifest:
            dest = tmp / Path(m["file"]).name
            subprocess.run(["curl", "-s", "-L", "-A", "Back2U-asset-verify/1.0", "-o", str(dest), m["download_url"]])
            if not dest.exists() or sha(dest) != m["sha256"]:
                drift.append(m["file"])
        out["refetch_mismatch"] = drift
        out["note"] = "Commons may re-render thumbnails; a refetch mismatch means re-check, not corruption."
    print(json.dumps(out, indent=1))
    sys.exit(1 if bad or lic else 0)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build")
    b.add_argument("--downloaded", type=Path, required=True)
    b.add_argument("--curation", type=Path, required=True)
    b.add_argument("--per-supported", type=int, default=5)
    b.add_argument("--per-unsupported", type=int, default=2)
    v = sub.add_parser("verify")
    v.add_argument("--refetch", action="store_true")
    args = ap.parse_args()
    (build if args.cmd == "build" else verify)(args)


if __name__ == "__main__":
    main()
