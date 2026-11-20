# Experiments: results by dataset

Each result is kept under the dataset it was measured on. **Numbers from different datasets are not comparable, and none of them is a campus or real-world deployment result.** The detailed history before this repair is in `docs/EXPERIMENT_LOG.md` and `docs/DEVELOPMENT_LOG.md`.

| Dataset | What it is | Realism for Back2U |
|---|---|---|
| **Objectron** (held-out split, 50 photos / 24 objects) | multi-view video frames; M4-C was trained on other Objectron objects | lowest: same video, same background, and the training domain |
| **CO3D** (research-only, 90–153 objects) | multi-view turntable-style videos; never used for training | medium-low: same capture session for query and gallery |
| **Wikimedia Commons** (281 curated photos) | single real photographs from many cameras and settings | real photos, but no repeated object identity, so only category / open-set questions |
| **Campus** (planned, 28 objects × 4 views) | owner photo vs. finder photo of the same item, on different backgrounds | the target; **NOT COLLECTED** |

---

## Objectron

| Exp | Metric | Value | Source |
|---|---|---:|---|
| E005 | SigLIP2 full-image Recall@1 / R@5 / MRR | 0.94 / 1.00 / 0.97 | `docs/EXPERIMENT_LOG.md` |
| E005 | SigLIP2 + DINOv2 fusion Recall@1 | 0.96 | same |
| E005 | detector crop vs. full image | −6 to −12 pts R@1 | same |

These figures are small-sample, in-domain numbers. **Do not quote 0.94 as real-world re-identification accuracy.**

## CO3D (held out from training)

| Exp | Date | Metric | Value | Source |
|---|---|---|---:|---|
| R1 probe | 2026-11-19 | SigLIP2 full-image R@1 / R@5 / MRR, 59 objects, frame 0 → middle frame | 0.75 / 0.86 / 0.81 | scratch probe (re-run with `calibrate_match_threshold.py`) |
| R1 probe | 2026-11-19 | M4-C visual R@1 | 0.61 | same |
| R1 probe | 2026-11-19 | 0.7·SigLIP2 + 0.3·M4-C fusion R@1 / R@5 | 0.73 / 0.92 | same |
| R2 match threshold | 2026-11-20 | R@1 with 90 objects (test split, clean / perturbed) | 0.68 / 0.68 | `reports/calibration/match_threshold_calibration.json` |
| R2 | 2026-11-20 | mean cosine: true object vs. best impostor (test) | 0.83 vs 0.81 | same |
| R2 | 2026-11-20 | auto-match at reranker prob ≥ 0.65 (old cutoff): precision / recall / open-set false-match rate | 0.59 / 0.40 / 0.20 | same |
| R2 | 2026-11-20 | auto-match at **≥ 0.90 (deployed)**: precision / recall / FMR (test, 156 queries) | **0.91 / 0.13 / 0.006** | same, `configs/matching_thresholds.json` |
| G1 gate | 2026-11-20 | supported frames → correct SUPPORTED (63 test frames) | 0.90 | `reports/calibration/open_set_gate_calibration.json` |

## Wikimedia Commons (open-set gate)

Gate calibration ran on 2026-11-20 (`reports/calibration/open_set_gate_calibration.json`, test split).

| Metric | Value |
|---|---:|
| fitted temperature (NLL 2.32 → 0.26) | T = 0.0094 |
| AUROC supported vs. unsupported (MSP / energy / max-cosine) | 0.996 / 0.998 / 0.998 |
| supported → correct SUPPORTED | 0.86 |
| supported → wrong-category SUPPORTED | 0.08 (antique book bindings read as wallets) |
| supported → UNSUPPORTED_ITEM (hard stop) | 0.02 |
| in-vocabulary unsupported → SUPPORTED | 1 / 71 |
| held-out unsupported (no prompt) → SUPPORTED | 1 / 28 |
| blurred (r = 6) supported → hard stop | 0.07 |

## Latency (2026-11-20)

Setup: Apple-silicon CPU, 8 cores, torch 2.14, transformers 5.17, batch size 1, CO3D photos ~1035×1066 px, gallery of 40. Source: `reports/benchmarks/latency_before_after.json`.

| | before (detector on every request) | after (`full_image` skips detector) |
|---|---:|---:|
| warm query, median / p90 | 2.52 s / 2.87 s | **0.13 s / 0.15 s** |
| gallery add, median | 2.59 s | **0.14 s** |
| model load (cold start) | 17 s | 17 s |

Grounding DINO accounted for about 2.4 s of the 2.5 s. The SigLIP2 image embedding (~0.10 s) is now computed once per query and reused for both the gate and retrieval.

## Campus

**NOT COLLECTED.** Protocol, schema, consent form and evaluation script are ready: `docs/campus_validation/PROTOCOL.md` and `scripts/evaluation/campus_eval.py`. Running the script without photos prints `NOT_COLLECTED` and exits with code 2.
