"""CO3D v2 Phase 2B pilot acquisition (research-only, CC BY-NC 4.0).

  1. Pool   = official CO3D v2 few-view **dev** sequences (set_lists_fewview_dev.json, subset "test"),
              which are sequence-disjoint from the official train split. (The official few-view
              *test* sequences ship only 3–11 frames each with withheld quality scores and 17 %
              placeholder masks, so they cannot support 5–8 diverse views — see the report.)
  2. Filter = viewpoint_quality_score >= 0.5 (sequences without a score are excluded, not guessed).
  3. Order  = ascending SHA-256(sequence_name); take the first N (default 50) per category.
  4. Reserve every selected sequence + every other dev and test sequence in
     data/processed/co3d_phase2_holdout_sequences.json (never to be used for training).
  5. Locate the sequences in the 20 GB data chunks by reading zip directories only (HTTP Range),
     then fetch ≤ 24 candidate frames + masks per sequence and keep ≤ 8 selected views.

    python scripts/datasets/co3d_pilot_acquire.py [--per-category 50] [--workers 8]
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts" / "evaluation" / "public_datasets"))
sys.path.insert(0, str(ROOT / "scripts" / "datasets"))
from remote_zip import RemoteZip  # noqa: E402
from extract_sequence_views import select_views  # noqa: E402

CATEGORIES = {"cellphone": "mobile_phone", "laptop": "laptop", "book": "book"}
LINKS = ROOT / "data/interim/public_dataset_metadata/co3d_links_full.json"
LINKS_URL = "https://raw.githubusercontent.com/facebookresearch/co3d/main/co3d/links.json"
DATA = ROOT / "data/raw/co3d_research_only"
META = DATA / "metadata"
HOLDOUT = ROOT / "data/processed/co3d_phase2_holdout_sequences.json"
MANIFEST = ROOT / "data/processed/co3d_phase2_pilot_manifest.jsonl"
SUMMARY = ROOT / "reports/evaluation/co3d_pilot/acquisition_summary.json"
LICENSE_ID = "CC-BY-NC-4.0"
ATTRIBUTION = ("CO3D v2 (Common Objects in 3D), Meta AI Research — Reizenstein et al., ICCV 2021. "
               "Licensed CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/). "
               "Frames selected/subsampled by LP-RIEM-MM1 Phase 2B; not modified otherwise.")
QUALITY_MIN = 0.5


def isnan(v):
    return v is None or (isinstance(v, float) and math.isnan(v))


def sha_order(name: str) -> str:
    return hashlib.sha256(name.encode()).hexdigest()


def load_meta(cat: str):
    seqs = json.loads(gzip.decompress((META / cat / "sequence_annotations.jgz").read_bytes()))
    sets = {}
    for group in ("train", "dev", "test"):
        d = json.loads((META / cat / "set_lists" / f"set_lists_fewview_{group}.json").read_text())
        sets[group] = {r[0] for r in d["train" if group == "train" else "test"]}
    return {s["sequence_name"]: s for s in seqs}, sets


def choose(cat: str, n: int) -> dict:
    seqs, sets = load_meta(cat)
    assert not (sets["dev"] & sets["train"]) and not (sets["test"] & sets["train"]) and not (sets["dev"] & sets["test"])
    pool = sorted(sets["dev"], key=sha_order)
    excluded = []
    eligible = []
    for s in pool:
        q = seqs[s]["viewpoint_quality_score"]
        if isnan(q):
            excluded.append({"sequence": s, "reason": "viewpoint_quality_score_missing"})
        elif q < QUALITY_MIN:
            excluded.append({"sequence": s, "reason": f"viewpoint_quality_score_{q:.3f}_below_{QUALITY_MIN}"})
        else:
            eligible.append(s)
    selected = eligible[:n]
    return {
        "co3d_category": cat, "canonical_category": CATEGORIES[cat],
        "pool": "set_lists_fewview_dev.json[test] (official few-view dev sequences)",
        "pool_size": len(pool), "eligible_after_quality_filter": len(eligible),
        "quality_filter_excluded": excluded, "requested": n, "selected": selected,
        "shortfall": max(0, n - len(selected)),
        "selected_quality": {s: round(seqs[s]["viewpoint_quality_score"], 4) for s in selected},
        "reserved_not_selected_dev": sorted(set(pool) - set(selected)),
        "reserved_official_test": sorted(sets["test"]),
        "official_train_size": len(sets["train"]),
    }


def locate(cat: str, wanted: set[str], links: dict) -> tuple[dict, dict, int]:
    """Map sequence -> RemoteZip by reading chunk directories until every sequence is found."""
    where, zips, dir_bytes = {}, {}, 0
    for url in links[cat][1:]:
        if wanted <= set(where):
            break
        z = RemoteZip(url)
        dir_bytes += z.bytes_fetched
        present = {n.split("/")[1] for n in z.members if n.count("/") >= 2} & wanted
        for s in present:
            where[s] = url
        if present:
            zips[url] = z
        print(f"  [{cat}] {url.rsplit('/', 1)[-1]}: {len(present)} selected sequences "
              f"(dir {z.bytes_fetched / 1e6:.1f} MB, found {len(where)}/{len(wanted)})", flush=True)
    return where, zips, dir_bytes


_tls = threading.local()


def _session():
    if not hasattr(_tls, "s"):
        _tls.s = requests.Session()
    return _tls.s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-category", type=int, default=50)
    ap.add_argument("--workers", type=int, default=8)
    a = ap.parse_args()
    t0 = time.time()
    download_date = time.strftime("%Y-%m-%d", time.gmtime())
    if not LINKS.exists():
        LINKS.parent.mkdir(parents=True, exist_ok=True)
        LINKS.write_text(json.dumps(requests.get(LINKS_URL, timeout=60).json()["full"]))
    links = json.loads(LINKS.read_text())

    # licence + attribution, research-only notice
    DATA.mkdir(parents=True, exist_ok=True)
    shutil.copy(META / "laptop" / "LICENSE", DATA / "LICENSE")
    (DATA / "ATTRIBUTION_AND_RESEARCH_ONLY_NOTICE.md").write_text(
        "# CO3D v2 — research-only subset (LP-RIEM-MM1 Phase 2B)\n\n" + ATTRIBUTION + "\n\n"
        "* **Non-commercial research use only.** Commercial use of these data, or of models trained or "
        "selected with them, requires separate legal review.\n"
        "* Do not redistribute, do not commit to Git (path is git-ignored), do not add to the production "
        "gallery, do not merge with commercially intended training data.\n"
        "* Source: https://github.com/facebookresearch/co3d · https://ai.meta.com/datasets/co3d-downloads/\n"
        "* Official LICENSE copied verbatim to `LICENSE` (identical in every category archive).\n")

    selection = {cat: choose(cat, a.per_category) for cat in CATEGORIES}
    HOLDOUT.parent.mkdir(parents=True, exist_ok=True)
    HOLDOUT.write_text(json.dumps({
        "purpose": "PERMANENT HOLDOUT — independent evaluation of LP-RIEM-MM1 M4-C. Never use any sequence "
                   "listed here (selected, reserved_not_selected_dev, reserved_official_test) for training.",
        "created_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset": "CO3D v2 (co3dv2_231130)", "license": LICENSE_ID,
        "selection_rule": f"official few-view dev sequences; viewpoint_quality_score >= {QUALITY_MIN}; "
                          f"ascending sha256(sequence_name); first {a.per_category} per category",
        "categories": selection}, indent=1))
    for cat, s in selection.items():
        print(f"{cat}: pool {s['pool_size']} eligible {s['eligible_after_quality_filter']} selected {len(s['selected'])} shortfall {s['shortfall']}")

    fa_all = {}
    for cat in CATEGORIES:
        sel = set(selection[cat]["selected"])
        frames = {}
        for f in json.loads(gzip.decompress((META / cat / "frame_annotations.jgz").read_bytes())):
            if f["sequence_name"] in sel:
                frames.setdefault(f["sequence_name"], []).append(f)
        fa_all[cat] = frames

    stats = {"metadata_bytes": sum(m["bytes"] for m in json.loads((META / "fetch_log.json").read_text())["members"]),
             "directory_bytes": 0, "candidate_bytes": 0}
    results, records = {}, []
    for cat, canon in CATEGORIES.items():
        wanted = set(selection[cat]["selected"])
        where, zips, dir_bytes = locate(cat, wanted, links)
        stats["directory_bytes"] += dir_bytes
        missing = wanted - set(where)

        def work(seq):
            z = zips[where[seq]]
            return seq, select_views(seq, canon, fa_all[cat][seq],
                                     lambda member: z.read_single_request(member, _session()))

        with ThreadPoolExecutor(max_workers=a.workers) as pool:
            futs = [pool.submit(work, s) for s in sorted(wanted - missing, key=sha_order)]
            for fut in as_completed(futs):
                seq, res = fut.result()
                stats["candidate_bytes"] += res.bytes_downloaded
                results[(cat, seq)] = res
                seq_dir = DATA / cat / seq
                if res.status == "accepted":
                    (seq_dir / "images").mkdir(parents=True, exist_ok=True)
                    (seq_dir / "masks").mkdir(parents=True, exist_ok=True)
                    frames_by_n = {f["frame_number"]: f for f in fa_all[cat][seq]}
                    recs_by_n = {r.frame_number: r for r in res.frames}
                    for k, fn in enumerate(res.selected):
                        jpg, png = res.images[fn]
                        img_p = seq_dir / "images" / f"frame{fn:06d}.jpg"
                        msk_p = seq_dir / "masks" / f"frame{fn:06d}.png"
                        img_p.write_bytes(jpg)
                        msk_p.write_bytes(png)
                        r, f = recs_by_n[fn], frames_by_n[fn]
                        records.append({
                            "image_path": str(img_p.relative_to(ROOT)), "category": canon,
                            "physical_instance_id": f"co3d:{seq}", "identity_status": "SOURCE_SEQUENCE",
                            "view_id": f"frame{fn:06d}", "source": "CO3D", "license": LICENSE_ID,
                            "attribution": ATTRIBUTION, "source_url": f"{where[seq]}#{f['image']['path']}",
                            "source_sequence_id": seq, "source_category": cat, "source_frame_id": fn,
                            "timestamp": f.get("frame_timestamp"), "ground_truth_bbox": r.bbox,
                            "bbox_status": "mask_derived_threshold_0.5",
                            "mask_path": str(msk_p.relative_to(ROOT)),
                            "selection_scores": {k2: v for k2, v in r.scores.items() if k2 != "dhash"},
                            "selection_rank": k, "download_date": download_date,
                            "sha256": hashlib.sha256(jpg).hexdigest(), "split": "test",
                            "co3d_split": "fewview_dev", "image_kind": "original_photo",
                            "verification_status": "PENDING_HUMAN_QC",
                            "training_overlap_risk": "NONE_KNOWN: CO3D never used by M4-C (trained on Objectron); sequence reserved as permanent holdout",
                        })
                seq_dir.mkdir(parents=True, exist_ok=True)
                (seq_dir / "selection.json").write_text(json.dumps({
                    "sequence": seq, "category": cat, "status": res.status, "reason": res.reason,
                    "geometry": res.geometry, "min_sep_deg_used": res.min_sep_used, "selected": res.selected,
                    "bytes_downloaded": res.bytes_downloaded,
                    "frames": [asdict(r) | {"scores": {k2: v for k2, v in r.scores.items() if k2 != "dhash"}}
                               for r in res.frames]}, indent=1))
                print(f"  [{cat}] {seq}: {res.status} ({res.reason}) views={len(res.selected)} "
                      f"sep={res.min_sep_used} facing={res.geometry.get('cameras_facing_object_frac')}", flush=True)
        for s in missing:
            print(f"  [{cat}] {s}: NOT FOUND in any data chunk")
            results[(cat, s)] = None

    records.sort(key=lambda r: (r["category"], r["physical_instance_id"], r["selection_rank"]))
    MANIFEST.write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in records))
    per_cat = {}
    for cat in CATEGORIES:
        rs = {s: r for (c, s), r in results.items() if c == cat}
        acc = [r for r in rs.values() if r and r.status == "accepted"]
        per_cat[cat] = {
            "selected_sequences": len(selection[cat]["selected"]), "accepted": len(acc),
            "rejected": [{"sequence": s, "reason": (r.reason if r else "not_found_in_archive")}
                         for s, r in rs.items() if not r or r.status != "accepted"],
            "views": sum(len(r.selected) for r in acc),
            "views_hist": {str(k): sum(1 for r in acc if len(r.selected) == k) for k in range(3, 9)},
            "relaxed_15deg": sum(1 for r in acc if r.min_sep_used == 15.0),
            "frame_rejection_reasons": dict(sorted(__import__("collections").Counter(
                reason for r in acc + [x for x in rs.values() if x and x.status != "accepted"]
                for fr in r.frames if fr.stage == "rejected" for reason in fr.reasons).items())),
        }
    SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY.write_text(json.dumps({"download_date": download_date, "seconds": round(time.time() - t0, 1),
                                   "transfer_bytes": stats, "per_category": per_cat,
                                   "manifest_records": len(records)}, indent=1))
    print(json.dumps({"per_category": {c: {k: v for k, v in p.items() if k != "rejected"} | {"n_rejected": len(p["rejected"])}
                                       for c, p in per_cat.items()},
                      "transfer_MB": {k: round(v / 1e6, 1) for k, v in stats.items()},
                      "records": len(records), "seconds": round(time.time() - t0, 1)}, indent=1))


if __name__ == "__main__":
    main()
