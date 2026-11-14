# Phase 2 — Physical-Instance Data Audit (M4-C)

**Date:** 2026-11-02 · **M4-C training status: NOT STARTED** (prohibited in Phase 2).

Definitions used throughout:
- **Genuine view:** a distinct original photograph of the object. Byte copies, augmentations and consecutive-frame near-duplicates are excluded.
- **Trustworthy identity:** every view demonstrably shows the same single physical object. For Objectron that means one video sequence; for app photos, a consistent unique sticker layout.
- **M4-C-eligible instance:** a trustworthy instance with **≥ 3 genuine views** and **original photos on disk**. Derived crops alone are not enough.

Raw audit output: `reports/evaluation/phase2_audit/real_world_audit.json`.

## 1. Previously reported vs verified

| Category | Previously reported | Verified on disk | ≥ 2 views | ≥ 3 views | M4-C-eligible | Positive pairs | Same-category hard negatives |
|---|---|---:|---:|---:|---:|---:|---|
| laptop | 35 genuine Objectron instances | **12** (2 app + 10 Objectron) | 10 | 1 | **0** | 12 | yes (12 laptops; u001 and u002 share a sticker) |
| mobile_phone | 0 | 0 | 0 | 0 | 0 | 0 | none |
| wallet | 0 | 0 | 0 | 0 | 0 | 0 | none |
| earphones | 0 | 0 | 0 | 0 | 0 | 0 | none |
| headphones | 0 | 0 | 0 | 0 | 0 | 0 | none |
| keys | 0 | 0 | 0 | 0 | 0 | 0 | none |
| book | 0 | 0 | 0 | 0 | 0 | 0 | none |

The previously reported **35** Objectron laptop instances could not be found. Only the 10 that survive as M2 visualization crops are on disk.

## 2. Per-instance detail (laptop)

| Instance | Source | Files | Genuine views | Duplicates | Identity | Originals local | Training-overlap risk |
|---|---|---:|---:|---|---|---|---|
| laptop_app_u001 (space-grey MacBook) | Back2U app upload | 2 | 2 | — | TRUSTWORTHY (sticker layout; owner confirmation pending) | yes | none known (uploaded after the checkpoint; M4-C trained on Objectron only) |
| laptop_app_u002 (black HP Victus) | Back2U app upload | 3 | 2 | 1 byte-identical copy (also = `/test_image.jpg`) | TRUSTWORTHY (as above) | yes | none known |
| objectron_laptop_batch-13_12 | Objectron crop | 3 | 3 | — | TRUSTWORTHY (one video) | **no** (crops only) | **UNVERIFIED** |
| objectron_laptop_batch-13_35 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-17_6 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-22_4 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-24_13 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-2_41 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-5_37 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-9_39 | Objectron crop | 2 | 2 | — | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-29_3 | Objectron crop | 2 | **1** | 1 near-duplicate (consecutive frame, dHash 0, mean pixel diff 6.9) | TRUSTWORTHY | no | UNVERIFIED |
| objectron_laptop_batch-17_27 | Objectron crop | 1 | 1 | — | TRUSTWORTHY | no | UNVERIFIED |

- **Training overlap (Objectron crops):** these images came from the historical `test_split.jsonl` used by `scripts/training/run_m2_perception.py`. By the original design that split was instance-disjoint from M4-C training, but the split files are gone, so **non-overlap cannot be proven**. Results on them must not be presented as independent test evidence.
- **View order:** the `view_recNN` index is the order of the old test loop, not the video frame number.

## 3. Readiness

| Category | Instance-data readiness |
|---|---|
| laptop | **NEEDS MORE DATA**: 12 trustworthy instances, 0 eligible. Every app instance needs ≥ 1 more view; the Objectron originals are needed (public dataset). |
| mobile_phone, wallet, earphones, headphones, keys, book | **NOT AVAILABLE** |

Roboflow and scraped category pools, wherever they are, **cannot** supply physical instances. Augmentations are not physical views, and single-view scraped images carry no instance identity.

## 4. Staged data (git-ignored, copies only; originals untouched)
- `data/raw/real_world_instances/laptop/laptop_app_u00{1,2}/` holds copies of `data/uploads/item_*.jpg`, plus an `instance.json` recording identity, provenance and assistant-verified boxes.
- `data/raw/historical_objectron_crops/laptop/<sequence>/` holds copies of `reports/evaluation/m2_visualizations/crop_objectron_laptop_*.jpg`, plus an `instance.json`.
- `data/processed/phase2_evaluation_manifest.jsonl`: 23 records, 12 instances, all `split = eval_pilot`. Two files are excluded with reasons: one byte copy and one near-duplicate.

**No TRAIN/VALIDATION/TEST split was created.** With 12 laptop-only instances there are not enough trustworthy identities, so everything is evaluation-only (`eval_pilot`). The builder and runner refuse any instance that appears in more than one split.
