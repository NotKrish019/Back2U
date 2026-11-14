# Dataset Download Plan (Phase 2A — plan only, no downloads started)

**Date:** 2026-11-02.
- **Disk:** 239 GB free (VERIFIED), so the **6 GB processed-data budget is kept as proposed**. It is conservative and leaves room for a second tranche.
- **Downloads:** transient only, one file at a time, deleted after extraction.
- **Sizes:** from HTTP `HEAD`/central-directory measurements (VERIFIED) unless marked ESTIMATE.

## 1. Storage budget (first full tranche)

| Source | Selection | Network transfer | Kept on disk | Basis |
|---|---|---:|---:|---|
| CO3D v2 | cellphone 600, laptop 500, book 600 sequences × 8 frames + masks (incl. 100 held-out per category) | ≈ 2.0 GB | **≈ 1.34 GB** | Measured per-frame JPG 61/81/68 KB + mask 14/45/31 KB; metadata chunks 41/36/87 MB; directory reads 12–20 MB per data chunk |
| Objectron | laptop 400 + book 400 train-split sequences × 8 frames | ≈ 23.3 GB (800 × 29.1 MB video + annotation) | **≈ 1.5 GB** | Laptop video 28.9 MB measured; book video size ASSUMED similar; kept = 8 crops + 8 frames ≤ 1024 px + 0.24 MB annotation ≈ 1.9 MB per sequence |
| Open Images V7 | Laptop, Mobile phone, Headphones, Book (non-group-of) ≤ 1,500 images each + Calculator, Remote control, Tablet computer, Telephone ≤ 300 each (≈ 7,200 images) | ≈ 5.0 GB images + ≈ 3.0 GB metadata **streamed, not stored** | **≈ 0.9 GB** | 0.70 MB per original (sample); kept = crop + 640 px frame ≈ 0.12 MB |
| LeftInCAR | images containing wallet or keys (≤ 684; overlap unknown) via Range | ≤ 5.9 GB | **≈ 0.1 GB** | 8.6 MB per deflated BMP measured; kept = all box crops + 1024 px frame |
| ABO | WALLET (1,125) + HEADPHONES (770) catalog images, then label verification | ≈ 0.3 GB | **≤ 0.3 GB** | ESTIMATE ~150 KB per original; the 256 px variant would cut this to ~30 MB |
| Manifests, metadata, contact sheets | | — | ≈ 0.2 GB | |
| **Total** | | **≈ 40 GB transferred** | **≈ 4.3 GB kept** (< 6 GB) | Peak transient disk < 3 GB (largest streamed CSV, processed in chunks) |

**Never download:** CO3D category zips (95–363 GB each) or the full dataset (5.5 TB); Objectron TFRecords or the full 1.9 TB; `abo-spins.tar` (42 GB); the Open Images image tarballs; the full LeftInCAR zip.

## 2. Stages

### Stage 0 — tooling (no data), in a later phase on approval
- Add `av` (PyAV) or `opencv-python-headless`; Objectron only.
- Compile Objectron `annotation_data.proto` into Python classes.
- Implement `extract_sequence_views.py` (design in `HYBRID_DATASET_PLAN.md` §5).

### Stage 1 — RECOMMENDED FIRST DOWNLOAD: CO3D pilot (≈ 0.33 GB transferred, ≈ 0.12 GB kept)
- **What:** cellphone, laptop and book, 50 sequences each with `viewpoint_quality_score ≥ 0.5`, 8 frames + masks per sequence.
- **Why first:**
  - No new dependency: the frames are JPEGs and Range fetching already works.
  - The current M4-C never saw CO3D, so this gives the **first independent multi-view evaluation**.
  - Masks provide **ground-truth boxes**, which unblock Phase 2 conditions B/C/D on 3 categories.
- **Transfer breakdown:**
  - metadata chunks `_000`: 41 + 36 + 87 MB, of which only `frame_annotations.jgz`, `sequence_annotations.jgz`, `set_lists/` and `LICENSE` are needed and can be fetched as single members
  - one data-chunk directory per category (≈ 50 MB)
  - frames (≈ 120 MB)
- **Selection:** deterministic. Sequences are sorted by SHA-256 of `sequence_name` and filtered by quality, drawn from as few chunks as possible to limit directory reads. Record the chunk choice: a chunk-local sample may not be representative.

### Stage 2 — Open Images M2 subset
- Stream `oidv6-train-annotations-bbox.csv` (2.26 GB) and `train-images-boxable-with-rotation.csv` (638 MB) through a filter. **Store only the rows of the selected classes**, with `License`, `Author`, `OriginalURL` and `OriginalLandingURL` per image.
- Drop `IsDepiction=1`; for Book also drop `IsGroupOf=1`.
- Download the selected images, crop them, then delete the originals (keep a 640 px copy).

### Stage 3 — Objectron M4-C tranche
- Read the official `index/<class>_annotations_train` lists (VERIFIED: laptop 1,179, book 1,619).
- For each sequence: download `video.MOV` + `annotations/<seq>.pbdata` → extract 8 views → delete the video.
- Training only, never used to evaluate the current checkpoint.

### Stage 4 — LeftInCAR and ABO category supplements
- **LeftInCAR:** fetch `labels/*.txt` (done; 0.7 MB), then only the wallet/keys images via Range. Group splits by capture date/session.
- **ABO:** fetch WALLET/HEADPHONES catalog images by `image_id`; human label verification (drop clutches; move earbud listings to earphones).

### Stage 5 — CO3D full M4-C tranche
Extend the Stage 1 pilot to the counts in §1.

## 3. Provenance stored per record
`source`, `source_url`, `license`, `attribution` (author or dataset citation), `source_sequence_id`, `source_frame_id`/`timestamp`, `original_bbox`, `selection_scores`, `download_date`, `sha256`.

Dataset-level `LICENSE` copies go in `data/raw/<source>/LICENSE`. Open Images keeps the per-image license rows.

## 4. Reusable tool already in the repo
`scripts/evaluation/public_datasets/remote_zip.py` reads remote zip directories and members with HTTP Range requests. It was used in this audit to read CO3D and LeftInCAR metadata without downloading archives:
- CO3D directory read: 12–20 MB per 20 GB chunk
- LeftInCAR: all 934 label files for 0.7 MB
