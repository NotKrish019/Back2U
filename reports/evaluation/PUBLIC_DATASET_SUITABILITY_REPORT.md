# Public Dataset Suitability Report (Phase 2A)

**Date:** 2026-11-02 · **Scope:** feasibility audit only. No training, no production changes, no dataset downloads.
**Method:** official metadata only (index files, class lists, annotation CSVs, label files, zip central directories read with HTTP Range requests). About 1 GB of metadata was fetched in total and ≈ 10 MB of summaries kept in `data/interim/public_dataset_metadata/` (git-ignored). One sample image each was fetched from LeftInCAR and CO3D.

**Evidence labels:**
- **VERIFIED**: measured from official files during this audit.
- **DOCUMENTED**: stated by the official source, not independently measured.
- **ESTIMATE**: derived by stated arithmetic.
- **ASSUMPTION**: plausible but unverified.

## 0. Local environment and repository (VERIFIED)

| Item | Finding |
|---|---|
| Hardware | Apple M2, 8 CPU cores / 10-core GPU (MPS available, no CUDA), 16 GB RAM |
| Disk | 239 GB free on the data volume. A 6 GB processed-data budget is conservative; transient download space is not a constraint. |
| Python | 3.14.3, torch 2.14.0, protobuf available. **No video decoder** (no ffmpeg, OpenCV, PyAV, decord) and no TensorFlow. |
| Referenced files | `PRIORITY_DATA_FOUNDATION_FINAL.md`, `REAL_WORLD_DATA_COLLECTION_MASTER_GUIDE.md` and `validate_real_world_instances.py` **do not exist** (same finding as Phase 2). |
| Existing adapters | `src/data/adapters/paco_adapter.py` **does not read PACO: it fabricates mock records** (`mock_paco_<cat>_*.jpg`, constant boxes). Any historical "PACO" figures built through it are not real data. `objectron_adapter.py` reads `data/interim/objectron_manifest.jsonl`, which no longer exists. `scripts/datasets/ingest_objectron_tfrecords.py` needs TensorFlow and the empty `third_party/Objectron` checkout. |
| Local public data | None. `data/raw/` holds only the Phase 2 staging copies (2 app laptops, 10 Objectron laptop crops). |
| Storage convention | Raw → `data/raw/<source>/…`, interim → `data/interim/`, manifests → `data/processed/*.jsonl` (all git-ignored). Phase 2 manifest schema: `src/evaluation/phase2/manifest.py`. |

## 1. Dataset findings

### A. LeftInCAR
https://data.mendeley.com/datasets/dd4hw3r6dh/1 · DOI 10.17632/dd4hw3r6dh.1

| Property | Finding |
|---|---|
| License | **CC BY 4.0** (VERIFIED, Mendeley API `data_licence`) |
| Authors | Universidade do Minho (A. Santos, C. Neto, D. Ferreira, C. Loureiro, S. Dixe, H. Silva) |
| Download | One `leftincar-data.zip`, **8.39 GB** (SHA-256 `3b7904ba…ddf9a0`), plus `yolo_dataset_splitter.py`. The host supports Range requests, so individual members can be fetched (VERIFIED). |
| Content | **971 images, all uncompressed BMP**, ~3088×2076 and ~19.5 MB each (8.6 MB deflated). 934 YOLO label files; the 37 images without labels are negatives. 880 images contain several objects. Also includes `data.yaml`, plus `__MACOSX` junk to be ignored. |
| Classes (`data.yaml`) | smartphone, laptop, card, suitcase, wallet, backpack, clothing, keys, glasses, handbag |
| Boxes / images (relevant) | smartphone 376 / 294 · laptop 183 / 170 · **wallet 333 / 309** · **keys 422 / 375** · handbag 710 / 519 · backpack 384 / 360 |
| Scene (VERIFIED, 1 sample) | **Overhead fisheye roof camera inside one car.** Objects are tiny: median box area 0.2% (keys), 0.3% (wallet), 0.4% (smartphone), 1.4% (laptop); sample boxes 58×94 px (wallet), 107×102 px (keys). |
| Annotation quality | The 4 boxes on the inspected sample are correct and tight (1 image only, so overall quality is unverified). |
| Instance identity | **None.** Captured over two days (2024-09-19: 420 images, 2024-09-20: 551) in one vehicle. ASSUMPTION: a small fixed set of physical objects recurs across many images, with no identity labels. |
| Use | **M2:** category-level crops for wallet and keys, low resolution with fisheye distortion. **Detection:** small-object and clutter stress test. **M4-C:** not usable. Splits must be grouped by capture session/time to avoid the same object appearing in train and test. |

### B. Open Images V7
https://storage.googleapis.com/openimages/web/download_v7.html

| Property | Finding |
|---|---|
| License | Per-image license is recorded in the image metadata CSVs (sampled rows: **CC BY 2.0**, Flickr author and URL; VERIFIED). Annotations are CC BY 4.0 per Google's Open Images site (DOCUMENTED; the statement was not captured verbatim in this audit). |
| Scale (VERIFIED, facts page) | 9,011,219 train images with image-level labels. Boxable: train 1,743,042 images / 14,610,229 boxes; val 41,620 / 303,980; test 125,436 / 937,327. |
| Exact boxable class names (VERIFIED) | `Laptop` /m/01c648 · `Mobile phone` /m/050k8 · `Headphones` /m/01b7fy · `Book` /m/0bt_c3 · `Handbag` /m/080hkjn · `Backpack` /m/01940j. Hard negatives: `Calculator`, `Remote control`, `Tablet computer`, `Telephone`, `Computer mouse`. |
| **Image-level only (no boxes)** | `Wallet` /m/02_vjy · `Key` /m/03v3yw · `Keychain` /m/03lnq3 · `Headset` /m/03mb156 · `Coin purse` · `Smartphone` |
| **Absent** | **No earphones/earbuds class at all** |
| Val + test boxes (VERIFIED) | Laptop 305 boxes / 249 images · Mobile phone 610 / 465 · Headphones 150 / 134 · Book 3,129 / 409 (**2,027 are group-of shelf boxes**) · Handbag 309 / 259 · Backpack 126 / 98 · Calculator 64 / 56 |
| Train images per class (ESTIMATE = (val+test images) × 10.43, the official boxable-image ratio; real counts may differ ×0.5–2) | Laptop ≈ 2,600 · Mobile phone ≈ 4,850 · Headphones ≈ 1,400 · Book ≈ 4,270 (mostly group-of) · Handbag ≈ 2,700 |
| Val image-level positives (VERIFIED) | Wallet **2** · Key **0** · Keychain 6 · Headset 10. Far too rare to be a source for wallet or keys. |
| Selective download | Image IDs are filtered from the CSVs, and images are fetched individually from `s3.amazonaws.com/open-images-dataset/<split>/<id>.jpg` (sample 0.70 MB). Metadata needed: train box CSV 2,258 MB and train image-info CSV 638 MB (both can be **streamed and filtered**, not stored); val box 25 MB, test box 77 MB. |
| Instance identity | None (single-view web images). |

### C. Objectron
https://github.com/google-research-datasets/Objectron

| Property | Finding |
|---|---|
| License | **Computational Use of Data Agreement 1.0 (C-UDA-1.0)** (VERIFIED, README and LICENSE) |
| Size | Raw 1.9 TB; total 4.4 TB (DOCUMENTED) |
| Sequences (VERIFIED, official index files) | **laptop 1,473** (1,179 train / 294 test) · **book 2,023** (1,619 / 404) · also bottle 1,928, cup 2,204, shoe 2,116, camera 815, chair 1,943, bike 472, cereal_box 1,609 |
| Per-sequence files (VERIFIED by HEAD) | `videos/<seq>/video.MOV` **28.9 MB** (sample laptop/batch-13/4), `annotations/<seq>.pbdata` **0.24 MB**, `videos/<seq>/geometry.pbdata` 24.7 MB (AR session data, not needed) |
| Annotations | `annotation_data.proto` has per-frame `frame_id`, `timestamp`, and per-object 2D/3D keypoints of the 3D box plus `visibility` (VERIFIED schema). 2D boxes come from keypoint extents. |
| Identity | **One sequence = one physical object** filmed in one scene (DOCUMENTED design). Genuine multi-view. |
| Local data | Only the 10 laptop crops staged in Phase 2; no videos. |
| Caveats | Sequences may overlap the current M4-C training data (historical splits lost), so **do not use Objectron to evaluate the current checkpoint**. Every view of a sequence shares one background and lighting. Decoding needs PyAV or OpenCV, plus protobuf classes compiled from the repo schema. |

### D. CO3D v2
https://ai.meta.com/datasets/co3d-downloads/ · https://github.com/facebookresearch/co3d

| Property | Finding |
|---|---|
| License | **CC BY-NC 4.0** (VERIFIED: `LICENSE` file inside each category archive). **Non-commercial only.** |
| Size | Full dataset 5.5 TB of zips; single-sequence subset 8.9 GB (DOCUMENTED). |
| Per-category archives (VERIFIED by HEAD) | cellphone 9 zips / **140.6 GB** · laptop 8 / **135.6 GB** · book 20 / **363.0 GB** · handbag 6 / 94.0 GB · backpack 13 / 224.5 GB · remote 203.5 GB · keyboard 155.3 GB · mouse 180.4 GB · suitcase 119.9 GB |
| Sequences (VERIFIED, `sequence_annotations.jgz`) | **cellphone 1,146** · **laptop 983** · **book 2,294** · handbag 665 · backpack 1,372 · remote 1,450 · keyboard 1,090 · mouse 1,236 · suitcase 742 |
| Sequence content (VERIFIED) | ~190–200 frames per sequence, each with `images/*.jpg`, `masks/*.png`, `depths`, `depth_masks`. Average per frame: JPG 61–81 KB, mask 14–45 KB. Sample frame 356×476 (low resolution). Sequence fields: `sequence_name`, `video`, `point_cloud`, `viewpoint_quality_score`. |
| Selective download (VERIFIED) | Zip chunk `_000` is a **36–87 MB metadata-only archive** (frame and sequence annotations, set lists, LICENSE). Data chunks support HTTP Range (206); reading a data chunk's directory costs 12–20 MB. **Individual frames and masks of chosen sequences can be fetched without downloading 20 GB chunks** (tool: `scripts/evaluation/public_datasets/remote_zip.py`). The single-sequence subset has only ~1–2 sequences per category, so it is useless for instance diversity. |
| Identity | One sequence = one object instance, filmed by a crowd worker walking around it (DOCUMENTED design). ASSUMPTION, unverified: different sequences are different physical objects; a worker filming the same object twice cannot be excluded. Masks give ground-truth boxes. |
| Caveats | Non-commercial license. Each sequence has a single background. Low frame resolution. Never used by the current M4-C, so CO3D is the **cleanest independent evaluation source**. |

### E. Amazon Berkeley Objects (ABO)
https://registry.opendata.aws/amazon-berkeley-objects/

| Property | Finding |
|---|---|
| License | **CC BY 4.0** (VERIFIED: bucket `LICENSE-CC-BY-4.0.txt` and `README.md`); credit to Amazon.com required |
| Scale (VERIFIED) | 147,702 listings; 8,222 listings with spins = **8,209 spin sequences** (8,116 × 72 frames, 93 × 24); `abo-spins.tar` 42.4 GB. Individual spin frames are addressable (~20 KB each). |
| Spins by product type (VERIFIED) | Overwhelmingly furniture and home goods (CHAIR 1,159, SOFA 810, RUG 803, …). Relevant spins: **2 phone-case listings (one is actually a photo frame), 2 handbags (laptop bags), 1 "book", 0 wallets, 0 headphones, 0 laptops, 0 keys**. |
| Catalog listings (single studio images; VERIFIED) | WALLET 176 listings / 1,125 images (includes clutches) · HEADPHONES 156 / 770 (**30 earbud-like by name**) · CELLULAR_PHONE_CASE 64,853 (cases, not phones) · HANDBAG 792 · BACKPACK 258 |
| Label noise (VERIFIED examples) | `PERSONAL_COMPUTER` = USB hub; `ABIS_BOOK` = HDMI cable; `PHONE` = DECT landline |
| Identity | **Product/SKU identity only.** Several images of one listing are one *product*, not one physical consumer unit. Never usable as physical-instance positives. |

## 2. Suitability matrix

| Dataset | Taxonomy categories covered | M2 classification | Detection | Genuine multi-view | Instance retrieval | Download size (full → selective) | **Suitability** |
|---|---|---|---|---|---|---|---|
| LeftInCAR | mobile_phone, laptop, wallet, keys | Yes, but tiny fisheye crops | Yes (YOLO boxes, small objects) | No | No | 8.39 GB → ~4.7 GB transient for wallet/keys images, ~0.1 GB kept | **CATEGORY-ONLY** |
| Open Images V7 | laptop, mobile_phone, headphones, book (+ hard negatives) | Yes (thousands per class, estimated) | Yes (boxes) | No | No | ~18 TB → ~5 GB transient, ~0.9 GB kept | **M2 READY** for 4 of 7 categories |
| Objectron | laptop, book | Yes (frames) | Yes (projected 3D boxes) | **Yes** (1,473 + 2,023 sequences) | Yes, at sequence level | 1.9 TB raw → 29 MB transient per sequence, ~1.4 MB kept | **M4-C READY** (laptop, book). Do not use for evaluating the current checkpoint. |
| CO3D v2 | mobile_phone, laptop, book | Yes (frames + masks) | Yes (mask-derived) | **Yes** (1,146 + 983 + 2,294 sequences) | Yes, at sequence level | 5.5 TB → ~0.6–1.0 MB per sequence via Range | **M4-C READY** (phone, laptop, book). Non-commercial license. |
| ABO | wallet, headphones (incl. ~30 earbud listings) | Weak (studio images, noisy types) | No | Spins exist but not for our categories | **No** (SKU ≠ physical unit) | 42 GB spins → ~0.2 GB catalog subset | **SUPPLEMENTARY** (catalog). **NOT SUITABLE** (spins) |

### Coverage per taxonomy category

| Category | M2 public sources | M4-C public multi-view sources | Gap |
|---|---|---|---|
| laptop | Open Images, LeftInCAR | Objectron 1,473 + CO3D 983 | campus validation only |
| mobile_phone | Open Images, LeftInCAR | CO3D 1,146 | campus validation + hard negatives |
| book | Open Images (filter group-of), Objectron/CO3D frames | Objectron 2,023 + CO3D 2,294 | campus validation (same-title copies) |
| headphones | Open Images (~1,400 estimated), ABO 126 | **none** | **instance data** |
| wallet | LeftInCAR 309 images (tiny), ABO 176 listings | **none** | **instance data + realistic category photos** |
| keys | LeftInCAR 375 images (tiny) | **none** | **instance data + realistic category photos** |
| earphones | **none** (ABO ~30 listings only) | **none** | **everything** |

## 3. Licensing summary (not legal advice; review before any non-research use)

| Dataset | License | Key obligation / restriction |
|---|---|---|
| LeftInCAR | CC BY 4.0 | Attribution and change notice |
| Open Images | Annotations CC BY 4.0; images per-image (mostly CC BY 2.0) | Keep per-image `License`, `Author`, `OriginalURL` |
| Objectron | C-UDA-1.0 | Computational use; the data itself may only be redistributed under the same agreement |
| CO3D v2 | **CC BY-NC 4.0** | **Non-commercial only.** Acceptable for university research. Blocks commercial use of the data, and models trained on it need legal review if Back2U is ever commercialised. |
| ABO | CC BY 4.0 | Credit Amazon.com |
