"""Human-QC contact sheets for the CO3D pilot (5 % of accepted sequences, all categories).

Each sheet = one sequence: for every selected view, the full frame with the mask-derived box drawn,
the mask-derived crop, and the frame number. Optional extra sheets show the most similar
cross-sequence pairs (from an evaluation run's embeddings) for the repeated-unit check.

    python scripts/evaluation/co3d_pilot_contact_sheets.py [--pairs-from reports/evaluation/phase2_runs/co3d_pilot/C_ground_truth_crop]
"""
import argparse
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data/processed/co3d_phase2_pilot_manifest.jsonl"
OUT = ROOT / "reports/evaluation/co3d_pilot/contact_sheets"
FRACTION = 0.05
TILE = 200


def tile(img: Image.Image, label: str) -> Image.Image:
    img = img.copy()
    img.thumbnail((TILE, TILE))
    t = Image.new("RGB", (TILE, TILE + 16), "white")
    t.paste(img, ((TILE - img.width) // 2, 16))
    ImageDraw.Draw(t).text((3, 2), label, fill="black")
    return t


def sheet(recs: list[dict], title: str, path: Path):
    rows = []
    for r in recs:
        img = Image.open(ROOT / r["image_path"]).convert("RGB")
        x0, y0, x1, y1 = r["ground_truth_bbox"]
        full = img.copy()
        ImageDraw.Draw(full).rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=3)
        crop = img.crop((x0, y0, x1, y1))
        s = r["selection_scores"]
        rows.append((tile(full, f"frame {r['source_frame_id']}  full"),
                     tile(crop, f"crop {s.get('crop_w')}x{s.get('crop_h')} sharp {s.get('sharpness_lapvar', 0):.0f}")))
    cols = 4  # 2 views per row → full+crop pairs
    per_row = cols // 2
    n_rows = math.ceil(len(rows) / per_row)
    W, H = cols * TILE + (cols + 1) * 6, n_rows * (TILE + 22) + 40
    canvas = Image.new("RGB", (W, H), (235, 235, 235))
    d = ImageDraw.Draw(canvas)
    d.text((8, 8), title, fill="black")
    for k, (a, b) in enumerate(rows):
        r_, c_ = divmod(k, per_row)
        x = 6 + c_ * 2 * (TILE + 6)
        y = 34 + r_ * (TILE + 22)
        canvas.paste(a, (x, y))
        canvas.paste(b, (x + TILE + 6, y))
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs-from", help="condition dir with embeddings.npy + gallery_keys.json")
    ap.add_argument("--n-pairs", type=int, default=6)
    a = ap.parse_args()
    recs = [json.loads(l) for l in MANIFEST.read_text().splitlines() if l.strip()]
    by_seq = defaultdict(list)
    for r in recs:
        by_seq[(r["category"], r["source_sequence_id"])].append(r)
    by_cat = defaultdict(list)
    for (cat, seq) in by_seq:
        by_cat[cat].append(seq)
    n_total = max(1, round(len(by_seq) * FRACTION))
    cats = sorted(by_cat)
    quota = {c: n_total // len(cats) + (1 if i < n_total % len(cats) else 0) for i, c in enumerate(cats)}
    sampled = []
    for c in cats:
        order = sorted(by_cat[c], key=lambda s: hashlib.sha256(f"qc:{s}".encode()).hexdigest())
        sampled += [(c, s) for s in order[:quota[c]]]
    index = []
    for cat, seq in sampled:
        rs = sorted(by_seq[(cat, seq)], key=lambda r: r["source_frame_id"])
        p = OUT / f"{cat}__{seq}.jpg"
        sheet(rs, f"{cat} | co3d:{seq} | {len(rs)} views | QC sample", p)
        index.append({"category": cat, "sequence": seq, "views": len(rs), "sheet": str(p.relative_to(ROOT))})
        print("sheet", p.name)

    pairs = []
    if a.pairs_from:
        d = ROOT / a.pairs_from
        emb = np.load(d / "embeddings.npy")
        keys = json.loads((d / "gallery_keys.json").read_text())
        inst = [k.split("/")[0] for k in keys]
        sims = emb @ emb.T
        best = {}
        for i in range(len(keys)):
            for j in range(i + 1, len(keys)):
                if inst[i] != inst[j]:
                    pair = tuple(sorted((inst[i], inst[j])))
                    if sims[i, j] > best.get(pair, (-1,))[0]:
                        best[pair] = (float(sims[i, j]), keys[i], keys[j])
        top = sorted(best.items(), key=lambda kv: -kv[1][0])[:a.n_pairs]
        rec_by_key = {f"{r['physical_instance_id']}/{r['view_id']}": r for r in recs}
        for (ia, ib), (s, ka, kb) in top:
            ra = sorted([r for r in recs if r["physical_instance_id"] == ia], key=lambda r: r["source_frame_id"])[:4]
            rb = sorted([r for r in recs if r["physical_instance_id"] == ib], key=lambda r: r["source_frame_id"])[:4]
            p = OUT / f"pair__{ia.split(':')[1]}__{ib.split(':')[1]}.jpg"
            sheet(ra + rb, f"REPEATED-UNIT CHECK cos={s:.3f} | top: {ia} (first 4) vs {ib} (last 4)", p)
            pairs.append({"a": ia, "b": ib, "max_view_cosine": round(s, 4), "category_a": rec_by_key[ka]["category"],
                          "category_b": rec_by_key[kb]["category"], "sheet": str(p.relative_to(ROOT))})
            print("pair sheet", p.name, round(s, 3))
    (OUT / "index.json").write_text(json.dumps({"qc_fraction": FRACTION, "n_sequences_total": len(by_seq),
                                                "sampled": index, "cross_sequence_pairs": pairs}, indent=1))


if __name__ == "__main__":
    main()
