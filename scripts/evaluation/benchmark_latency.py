"""Per-stage latency benchmark of the live pipeline: before (detector always) vs after (detector
skipped in full_image mode), cold vs warm. Uses a temporary gallery; never touches data/gallery.

    python scripts/evaluation/benchmark_latency.py --images <dir of jpgs> [--n 20] [--gallery 50]

Records machine, library versions, image resolution and batch size (always 1: the service embeds
one request at a time).
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))


def stats(xs):
    xs = sorted(xs)
    return {"n": len(xs), "mean": round(statistics.mean(xs), 4), "median": round(statistics.median(xs), 4),
            "p90": round(xs[int(0.9 * (len(xs) - 1))], 4), "min": round(xs[0], 4), "max": round(xs[-1], 4)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--images", type=Path, required=True)
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--gallery", type=int, default=50)
    ap.add_argument("--out", type=Path, default=ROOT / "reports/benchmarks/latency_before_after.json")
    args = ap.parse_args()

    import numpy as np
    import torch
    import transformers
    from PIL import Image

    imgs = sorted(p for p in args.images.rglob("*.jpg"))
    if len(imgs) < args.n + args.gallery:
        raise SystemExit(f"need {args.n + args.gallery} images, found {len(imgs)}")
    rng = np.random.default_rng(0)
    rng.shuffle(imgs)
    gallery_imgs, query_imgs = imgs[: args.gallery], imgs[args.gallery: args.gallery + args.n]
    sizes = [Image.open(p).size for p in query_imgs]

    from run_inference import FinalInferencePipeline, LiveModels
    os.chdir(ROOT)
    t0 = time.perf_counter()
    models = LiveModels(device="cpu")
    load_s = time.perf_counter() - t0

    out = {
        "machine": {"platform": platform.platform(), "processor": platform.processor() or platform.machine(),
                    "python": platform.python_version(), "cpu_count": os.cpu_count(),
                    "torch": torch.__version__, "transformers": transformers.__version__,
                    "device": models.device, "torch_threads": torch.get_num_threads()},
        "setup": {"batch_size": 1, "queries": len(query_imgs), "gallery_items": len(gallery_imgs),
                  "query_resolution_median": [int(statistics.median(s[0] for s in sizes)),
                                              int(statistics.median(s[1] for s in sizes))],
                  "images_dir": str(args.images), "crop_policy": "full_image", "retrieval_mode": "siglip"},
        "model_load_s": round(load_s, 2),
        "modes": {},
    }
    for mode in ("always", "auto"):  # before, after
        os.environ["ML_DETECTOR_MODE"] = mode
        tmp = tempfile.mkdtemp(prefix=f"b2u_bench_{mode}_")
        pipe = FinalInferencePipeline(models=models, store_dir=tmp)
        add_times = []
        for i, p in enumerate(gallery_imgs):
            t = time.perf_counter()
            pipe.add_image_bytes(p.read_bytes(), f"item_{i}", None)
            add_times.append(time.perf_counter() - t)
        per_stage, totals, cold = {}, [], None
        for k, p in enumerate(query_imgs):
            im = Image.open(p).convert("RGB")
            timings = {}
            t = time.perf_counter()
            pipe.infer_pil(im, top_k=5, timings=timings)
            dt = time.perf_counter() - t
            if k == 0:
                cold = {"total_s": round(dt, 4), **timings}
                continue  # first query after gallery build = cold-ish; excluded from warm stats
            totals.append(dt)
            for s, v in timings.items():
                per_stage.setdefault(s, []).append(v)
        out["modes"]["before_detector_always" if mode == "always" else "after_detector_skipped"] = {
            "gallery_add_s": stats(add_times),
            "query_first_s": cold,
            "query_warm_total_s": stats(totals),
            "query_warm_stages_s": {s: stats(v) for s, v in per_stage.items()},
        }
        print(mode, json.dumps(out["modes"], indent=1)[-600:], flush=True)
    b = out["modes"]["before_detector_always"]["query_warm_total_s"]["median"]
    a = out["modes"]["after_detector_skipped"]["query_warm_total_s"]["median"]
    ba = out["modes"]["before_detector_always"]["gallery_add_s"]["median"]
    aa = out["modes"]["after_detector_skipped"]["gallery_add_s"]["median"]
    out["summary"] = {"query_median_before_s": b, "query_median_after_s": a, "query_speedup_x": round(b / a, 2),
                      "add_median_before_s": ba, "add_median_after_s": aa, "add_speedup_x": round(ba / aa, 2)}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(out, indent=1))
    print(json.dumps(out["summary"], indent=1))


if __name__ == "__main__":
    main()
