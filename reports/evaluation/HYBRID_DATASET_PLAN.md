# Hybrid Dataset Plan (Phase 2A — design only, nothing downloaded or trained)

**Date:** 2026-11-02. All counts are from `PUBLIC_DATASET_SUITABILITY_REPORT.md`.

## 1. Principles
1. **Identity comes from the source, never inferred.** A positive pair is two frames of **one source sequence** (Objectron or CO3D), or two photos of one campus-collected object. Byte copies, augmentations, single-view images, and images of the same *product/SKU* (ABO) are never positives.
2. **Instance ID format:** `<source>:<sequence_id>`, for example `co3d:76_7593_15953` or `objectron:laptop/batch-13/4`. `identity_status` is `SOURCE_SEQUENCE` until a human spot-check sets it to `TRUSTWORTHY`.
3. **Grouped splits.** Every frame of one sequence, every crop of one LeftInCAR capture session, and every augmentation of one source go to the same split.
4. **Licenses travel with records.** Each record carries `source`, `license`, `attribution`, `source_url`, plus `original_frame_id`/`timestamp` for videos.
5. **Independent evaluation.** The current M4-C checkpoint may have seen Objectron sequences, so **CO3D (never used) and the campus set are the evaluation sources for it.** Objectron is used for training only.

## 2. M2 (category recognition)

| Category | Primary | Supplementary | Notes |
|---|---|---|---|
| laptop | Open Images `Laptop` boxes | LeftInCAR laptop crops; Objectron/CO3D frames (1 frame per sequence for M2, so instances are not over-weighted) | — |
| mobile_phone | Open Images `Mobile phone` | LeftInCAR smartphone; CO3D cellphone frames | Exclude `IsDepiction=1` (15 + 21 in val/test) |
| book | Open Images `Book` with **`IsGroupOf=0` only** | Objectron/CO3D book frames | 65% of OI book boxes are group-of shelves |
| headphones | Open Images `Headphones` | ABO HEADPHONES catalog minus earbud listings (label-verified) | — |
| wallet | **campus photos** | LeftInCAR wallet crops (tiny, fisheye); ABO WALLET catalog (verify; drop clutches) | No realistic public source |
| keys | **campus photos** | LeftInCAR keys crops (tiny); OI `Keychain` image-level (6 in val) | No realistic public source |
| earphones | **campus photos** | ABO ~30 earbud listings (label-verified) | No public source |
| hard negatives (not classes) | OI `Calculator`, `Remote control`, `Tablet computer`, `Telephone`; LeftInCAR `card`, `glasses` | Phase 2 observed calculator, charger and notebook detected as `mobile_phone` | Train as "other" / open-set negatives |

Per-class cap for a first M2 dataset: **≤ 1,500 images**, to limit imbalance against the campus-collected classes. Source-specific test splits keep OI and campus images separate, so scores can be reported per domain.

## 3. M4-C (physical-instance re-identification)

| Category | Training sequences (proposed first tranche) | Evaluation of the current checkpoint | Gap |
|---|---|---|---|
| laptop | Objectron train 400 + CO3D 400 | CO3D held-out 100 + campus | — |
| mobile_phone | CO3D 500 | CO3D held-out 100 + campus | — |
| book | Objectron train 400 + CO3D 500 | CO3D held-out 100 + campus | — |
| headphones, wallet, keys, earphones | **campus collection only** (`MANUAL_COLLECTION_REQUIREMENTS.md`) | campus | no public multi-view |
| ABO | **not used for M4-C positives.** Optional later: SKU-level viewpoint-invariance auxiliary task, labelled `identity_level=SKU` and never mixed with physical-unit pairs. | — | — |

**Selection within a source:**
- Prefer sequences with a valid `viewpoint_quality_score` (CO3D: ≥ 0.5, which keeps 792 of 983 laptop sequences).
- Prefer higher-resolution frames.
- Use the official train/test index lists (Objectron) and CO3D set lists so the held-out sequences are documented.

**Hard negatives:**
- **Same category:** other sequences of the same category in the same split. CO3D's crowd-sourced phones and laptops include many same-model units.
- **Cross-category:** calculator, remote, tablet, charger.

**Known shortcut risk:** every view of a sequence shares one background, and the model could learn backgrounds instead of objects. Mitigations:
1. Train on **mask- or box-cropped** frames (CO3D masks, Objectron box projections).
2. Mine negatives across sequences that have similar backgrounds.
3. Measure on the campus set, where views of one object deliberately use different backgrounds.

## 4. Per-sequence processing contract
For each selected sequence:
1. **Keep:** the source sequence ID, category, source, license, attribution and URL.
2. **Extract** 8 representative frames (minimum 5), using the selection algorithm in §5.
3. **Remove** near-identical frames: dHash Hamming ≤ 4 (`src/evaluation/phase2/dataset_audit.dhash`) and a minimum time gap.
4. **Retain** viewpoint variation: farthest-point sampling over camera direction.
5. **Store:** the object crop (production padding policy, 10%), a downscaled full frame (longest side ≤ 1024 px), and the box.
6. **Delete** the source video or zip member after extraction. Never cache full videos or unused frames.
7. **Write manifest records** using the Phase 2 schema (`image_path`, `category`, `physical_instance_id`, `view_id`, `ground_truth_bbox`, `source`, `split`, `verification_status`), plus `license`, `attribution`, `source_sequence_id`, `source_frame_id`, `timestamp`, `selection_scores`.
8. **Spot-check:** a human reviews a contact sheet for 5% of sequences, confirming one object, correct category and box. Then `identity_status` → `TRUSTWORTHY`.

## 5. Frame-extraction design (proposal; not implemented in Phase 2A)
`scripts/datasets/extract_sequence_views.py --source {co3d,objectron,video} --sequence-id ID --category CAT [--video PATH | --remote-zip URL] --n-views 8`

**Existing components reused:**
- `scripts/evaluation/public_datasets/remote_zip.py`: CO3D member fetch over HTTP Range (already working).
- `src/evaluation/phase2/dataset_audit.dhash`: near-duplicate detection.
- `src/inference/crop.select_crop`: same padding/validation policy as production.
- `src/categories.py`: canonical labels.

**New dependency, needed only for Objectron:** PyAV (`av`) or `opencv-python-headless` to decode `video.MOV` at selected frame indices, plus Python classes compiled from Objectron's `annotation_data.proto`. CO3D frames are already JPEGs, so it needs no decoder.

**Algorithm:**
1. **Candidates.**
   - CO3D: rows of `frame_annotations.jgz` for the sequence (frame number, timestamp, camera R/T, mask path, image size).
   - Objectron: `FrameAnnotation`s from `annotations/<seq>.pbdata` (frame_id, timestamp, 2D keypoints, visibility).
2. **Object box.** CO3D: tight box of the mask (threshold 0.5). Objectron: extent of the 9 projected keypoints, clamped to the frame.
3. **Quality gates.**
   - visibility ≥ 0.5 (Objectron) or mask area ≥ 1% of the frame (CO3D)
   - box truncation ≤ 20%
   - crop side ≥ 64 px
   - sharpness: variance of the Laplacian on the grey crop, dropping the sequence's bottom 25%
   - exposure: mean luminance in [30, 225]
4. **Viewpoint diversity.**
   - CO3D: unit viewing directions from camera R; greedy farthest-point sampling with a minimum 25° separation.
   - Objectron: use camera poses if `geometry.pbdata` is fetched; otherwise use the 2D keypoint configuration and timestamps (uniform in time, ≥ 0.5 s apart).
5. **Near-duplicate rejection.** Drop a candidate if its crop dHash is within 4 bits of an already-selected crop.
6. **Output.** Up to `n_views` frames written as crops plus downscaled frames, each with its `frame_id`, `timestamp`, box, scores and selection reason. Sequences with fewer than 3 surviving views are recorded as `rejected` with the reason.
7. **Provenance.** Write `instance.json` in the Phase 2 layout, so `audit_real_world_data.py` and `build_phase2_manifest.py` work unchanged.

Videos and zip members are streamed to a temporary file, processed and deleted. Peak transient disk is one video (~29 MB).

## 6. What unblocks immediately
A CO3D pilot (cellphone, laptop, book; 50 sequences each) supplies:
- the first independent multi-view evaluation of the current M4-C
- **mask-derived ground-truth boxes**, which unblock Phase 2 condition C (oracle crop)
- real detector-versus-ground-truth IoU for three categories

All three run with the existing Phase 2 evaluation scripts, without code changes to production.
