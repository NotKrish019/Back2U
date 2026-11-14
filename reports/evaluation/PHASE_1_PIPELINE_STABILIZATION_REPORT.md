# LP-RIEM-MM1 — Phase 1: Live Pipeline Stabilization Report

**Date:** 2026-11-02
**Branch:** `pre-ui-lab-production-migration` (uncommitted working tree)
**Scope:** stabilize the live app and make a reproducible baseline. No retraining.
**Constraints honoured:** M2 and M4-C were not trained. DINOv2 was not fine-tuned. Open-set thresholds are unchanged. No reports or checkpoints were deleted. No categories were added beyond the agreed seven.

> **The old four-category results (laptop/cup/shoe/bottle) are NOT reproducible.** The four-class M2 checkpoint was overwritten on 2026-10-05 by a two-class head (`laptop`, `Laptop`). The Objectron train/val/test splits are not on disk (`data/processed/test_split.jsonl` is empty). Every metric in `reports/final_evaluation.md` and `reports/model_card.md` should be treated as historical and unverifiable.

---

## 1. Active architecture (audited execution path)

```
UI (Next.js) ──► Backend FastAPI :8000 (src/api/main.py)
                  ├─ POST /api/v1/reports        → normalise category → DB → index image → auto-match search
                  ├─ POST /api/v1/retrieval/search → RealRetrievalService.search
                  ├─ GET  /api/v1/retrieval/health → ML /api/health
                  ├─ POST /api/v1/admin/reindex  → sync DB reports → ML gallery           (new)
                  └─ startup: background sync DB reports → ML gallery                     (new)
                        │ HTTP multipart
                        ▼
                 ML service :8001 (src/app/main.py) → scripts/run_inference.py::FinalInferencePipeline
                  ├─ POST /api/search   ├─ POST /api/add   ├─ GET /api/items (new)   └─ GET /api/health (new)
                  └─ GalleryStore (src/retrieval/gallery_store.py) → data/gallery/   (new, persistent)
```

### What actually runs for one image

| # | Stage | Component | Input | Preprocessing | Active? |
|---|---|---|---|---|---|
| 1 | Detection | Grounding DINO tiny (zero-shot) | **full image** | HF processor. Prompt is now the 7 canonical categories: `laptop. mobile phone. wallet. earphones. headphones. keys. book.` Box threshold 0.3, text threshold 0.3 (unchanged) | Yes |
| 2 | Category classifier | M2 head (frozen DINOv2 ViT-S/14 → 384→128→**2**) | **full image** (unchanged) | `Resize((224,224))`, ImageNet normalisation | Yes, but uninformative: both classes are "laptop" |
| 3 | Open-set decision | margin > 0.95 and entropy < 0.3 → KNOWN | classifier probabilities | — | Computed, **not enforced**. The pre-existing UI-lab bypass is kept, so UNKNOWN does not reject the query. With 2 near-identical classes, entropy is always ≥ 0.3, so every image is UNKNOWN. |
| 4 | Crop | `src/inference/crop.py::select_crop` | detections from stage 1 | Highest-scoring canonical detection. Box is clamped to the image, rejected if a side is < 32 px or the area is < 1% of the image, then padded 10%. Otherwise the full image is used, and this fallback is **recorded** in the response (`crop.source`, `crop.reason`). | **Yes (new)** |
| 5 | Instance embedding | DINOv2 ViT-S/14 (frozen) CLS → M4-C projection 384→512→256, L2 | **crop** (query and gallery) | `Resize(256, bicubic)` → `CenterCrop(224)` → ImageNet normalisation | Yes |
| 6 | Semantic evidence | SigLIP2 base p16-224 | gallery: **crop** image embedding; query: text embedding only | HF processor, `padding="max_length"` | Yes, only when text is supplied |
| 7 | Retrieval | FAISS `IndexFlatIP` (exact cosine) over persisted M4-C vectors | — | — | Yes |
| 8 | Calibration | Logistic regression `p = σ(8.4511·v + 0.7732·t − 6.3310)` | visual and text similarity | — | Yes. Operating points: > 0.8 "candidate", < 0.2 "reject" (unchanged). Ceiling with no text is 0.893. |

**Not active in the live path:**
- the Siamese ResNet50 model (`src/models/siamese_network.py`)
- `src/retrieval/faiss_index.py`
- the M4-B/M4-D variants
- `data/processed/test_split.jsonl` (empty). The gallery was previously seeded from it; it is no longer read.

## 2. Exact checkpoints (baseline, preserved)

Hashes are as reported by the running service (`GET /api/health`) and the local caches.

| Artifact | Path / ID | SHA-256 / revision |
|---|---|---|
| M4-C projection head (retrieval baseline) | `models/checkpoints/m4_c/best_val_recall_at_1.pt` | `7aef423c63a258de9da6301cb545c993cb64c81bd7f75fcf3ef73381455881eb` |
| M2 category head (2-class, `laptop`/`Laptop`) | `models/checkpoints/m2_category_head_best.pth` | `78c3ed08577a0ba1bdd5b84897b636ffb6945a356eb245a63ee38bd4c5214a51` |
| M2 label map | `data/processed/m2_categories.json` = `{"0":"laptop","1":"Laptop"}` | `32039966b2dbe0ac15583ea8847b6b3a7f23a15a951b4dd54c0fd653caf0555d` |
| Reranker / calibrator | `models/reranker_calibration.pkl` (sklearn `LogisticRegression`) | `6f9ffee1f74f3182445d80a3816b9e2d40b1e21b7686f1f10ddd12ee3b3296dd` |
| DINOv2 ViT-S/14 weights | torch hub `facebookresearch/dinov2:dinov2_vits14` | `b938bf1bc15cd2ec0feacfe3a1bb553fe8ea9ca46a7e1d8d00217f29aef60cd9` |
| Grounding DINO tiny | `IDEA-Research/grounding-dino-tiny` | HF rev `a2bb814dd30d776dcf7e30523b00659f4f141c71` |
| SigLIP2 base | `google/siglip2-base-patch16-224` | HF rev `75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2` |

**Model version string (new, single source of truth):** `src/inference/versioning.py`

```
lp-riem-mm1-phase1-crop-v1+m4c.7aef423c
└─ name ──┘ └─ pipeline rev ─┘ └ M4-C sha256[:8]
```

The pipeline revision must be bumped whenever preprocessing changes the stored embeddings. Doing so automatically invalidates incompatible persisted galleries (§3.5).

## 3. Fixes made

### 3.1 Execution-path audit (task 1)
Findings that drove the fixes below:
- The ML service embedded the **full photo** for both query and gallery.
- The gallery was an in-memory FAISS index seeded from an empty JSONL file, so it was empty after every restart.
- Every query was saved as the client-provided filename (`query_image.jpg`). Concurrent queries overwrote each other, and the name allowed path traversal.
- The backend hard-coded `mir-siamese-v0.1.0` (search) and `mir-v0.4.0` (health).
- `report_embeddings` had 0 rows. Two seeded reports (`LR-5535B1D9`, `FR-8AF9487F`) have **no `item_instance_id`** and point to `/mocks/*_macbook.jpg` files that do not exist.
- **Latent crash:** torch and faiss-cpu each bundle `libomp.dylib`. FAISS search aborts with `OMP: Error #15` unless `KMP_DUPLICATE_LIB_OK` is set. The live service only worked because unpickling the sklearn reranker sets that variable as a side effect. It is now set explicitly in `src/retrieval/gallery_store.py`.
- **Latent bug:** `ReportOut.attributes` is typed as a dict, but the ORM stores a JSON string, so any report with attributes failed to serialise. Fixed with a parsing validator in `src/api/schemas.py`.

### 3.2 Canonical categories (task 2) — `src/categories.py`
- Canonical labels: `laptop, mobile_phone, wallet, earphones, headphones, keys, book`.
- `normalize_category()` handles:
  - case and separators (`Laptop`, `mobile-phone`)
  - aliases (`iPhone`, `AirPods`, `earbuds`, `textbook`, …)
  - free text with exactly one category word (`"Black HP Victus laptop"` → `laptop`)
- Ambiguous text (`"phone and wallet"`) and unknown items (`backpack`, `notebook`) return `None`; nothing is guessed.
- `normalize_detector_label()` maps Grounding DINO's merged labels (`"laptop laptop"`, `"headphonesphones"`).
- **Backend writes** (`POST`/`PUT /reports`): `item_category` is stored canonical or `null`. The user's original wording is kept in `attributes.item_name` when it carries more than a case change. The UI already renders `null` as "Untitled Item" / "Unknown Item".
- **Historical data:** `scripts/normalize_report_categories.py` (dry-run by default; `--apply` writes a timestamped SQLite backup first; unmappable values are left unchanged and listed).
  - Applied to `app.db`: `Laptop` ×2 → `laptop`, giving `laptop` ×7.
  - Backup: `app.db.bak-20261102-111959`. 0 rows deleted.
- The M2 label map file and checkpoint are **not** modified. Classifier outputs are normalised at runtime (`laptop`/`Laptop` → `laptop`).

### 3.3 Detector crop (task 3)
- `src/inference/crop.py` selects and validates the box (rules in §1, stage 4).
- `scripts/run_inference.py` was refactored into:
  - `LiveModels`: loads the same checkpoints; every embedding method takes a PIL image.
  - `FinalInferencePipeline`: models are injectable for tests.
- M4-C now embeds the crop for queries (`infer_pil`) and gallery adds (`add_image_bytes`). SigLIP2 gallery image embeddings also use the crop.
- The query-side SigLIP2 text embedding is now computed once per query instead of once per candidate; the value is identical.
- `Dinov2ImageEncoder.encode_pil_with_patches()` was added. The path-based method delegates to it, with unchanged behaviour.
- Every `/api/search` and `/api/add` response includes `crop` (`source`, `box`, `label`, `score`, `reason`).

### 3.4 Crop regression test (task 4) — `tests/ml/test_inference_crop_regression.py`
- **Fast tests (fake models, real pipeline code):**
  - The query embedder receives exactly `image.crop(padded_box)`, pixel-identical and not the full size.
  - Gallery adds send the crop to both M4-C and SigLIP2.
  - The same object in different photos ranks first.
  - The full-image fallback is reported.
- **Mutation check:** temporarily replacing `embed_visual(crop_img)` with the full image made 3 of these tests fail. The fix was restored afterwards.
- **Real-checkpoint test** (`RUN_REAL_MODELS=1`): spies on the real `Dinov2ImageEncoder.encode_pil_with_patches` on `data/uploads/item_d80d8b6c.jpg`.
  - The encoder received a **576×1181 crop**, not the 720×1280 photo.
  - Detection: `laptop`, score 0.666.

### 3.5 Persistent gallery (task 5) — `src/retrieval/gallery_store.py`, `src/api/services/index_sync.py`
- **Store layout:** `data/gallery/manifest.json` + `visual.<gen>.npy` (N×256) + `siglip.<gen>.npy` (N×768) + content-addressed `images/<sha256>.<ext>`.
- **Atomic writes:** vector files are fsynced under a new generation name, then the manifest is swapped in with `os.replace` (the commit point). An add rolls back in memory if the write fails.
- **Load-time checks:** format, `model_version`, visual/SigLIP dimensions, and vector-count consistency.
  - On mismatch or corruption, the store is **moved aside** to `data/gallery.incompatible-<ts>/` (never overwritten or deleted).
  - The service then starts empty and `/api/health` reports `status: degraded` with `quarantined_to`.
- **Database is the source of truth.** `sync_reports_to_index()` indexes every report whose image resolves (data URL, or a file under `frontend/public` with a path-traversal guard). It upserts `report_embeddings(report_id, model_version)` and lists every skipped or failed report with a reason; nothing is dropped silently. It runs:
  - automatically in a background thread at backend startup, retrying for up to 10 minutes while the ML service loads (`BACKEND_INDEX_SYNC_ON_STARTUP=1`, the default)
  - via `POST /api/v1/admin/reindex` (admin)
  - via `python scripts/reindex_reports.py [--ml-url …]`
- Re-adding identical content for the same item is a no-op (`already_indexed`), so restarts do not duplicate vectors.

### 3.6 Unique query filenames + duplicate detection (task 6) — `src/app/main.py`
- **Query files:** saved as `data/uploads/queries/q_<uuid4>_<sha12>.jpg`, opened with `"xb"` so they can never overwrite. The client filename is ignored, which also closes the path-traversal hole. Hashes are appended to `queries.jsonl`.
- **Upload validation:** 15 MB size cap, PIL `verify()`, and a 40-megapixel limit.
- **SHA-256 on every upload:**
  - `/api/add`, same item: `already_indexed`.
  - `/api/add`, different item with identical content: indexed, with `duplicate_of: [...]` returned.
  - `/api/search`: returns `query_identical_to_items`.
- **Backend:** stores duplicates in `report.attributes.duplicate_image_of_items` for staff review.

### 3.7 Model version (task 7)
- The backend no longer hard-codes a version. `/retrieval/search` and `/retrieval/health` return the version reported by the ML service: `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`.
- If the ML service is unreachable, health reports `status: unavailable` with the last known version (`unknown` before first contact).
- `MockRetrievalService` remains `mock-v1.0`.

### 3.8 Other small changes
- `RealRetrievalService` takes an injectable HTTP client (tests pass the ML `TestClient`) and forwards `top_k`. **Behaviour change:** `/retrieval/search` now honours the request's `top_k` (schema default 10). Previously the ML service always returned 5.
- `.gitignore`: `data/gallery/`, `data/gallery.incompatible-*/`, `app.db.bak-*`.

## 4. Test results (executed 2026-11-02, Python 3.14.3, macOS, CPU)

### 4.1 Automated tests — `venv/bin/python -m pytest tests`

| Suite | Result |
|---|---|
| Baseline **before** Phase 1 (`tests/`) | 9 passed, 5 failed |
| `tests/ml/test_categories.py` (category normalisation) | 46 passed |
| `tests/ml/test_crop.py` (box validation and fallback) | 4 passed |
| `tests/ml/test_inference_crop_regression.py` | 4 passed, 1 skipped by default |
| ↳ `test_real_models_encoder_receives_crop` (run separately with `RUN_REAL_MODELS=1`) | **1 passed** (10.2 s) |
| `tests/ml/test_gallery_store.py` (restart persistence, quarantine on version/dimension/corruption mismatch, duplicates, 24 concurrent adds) | 9 passed |
| `tests/ml/test_ml_service_api.py` (20 concurrent uploads with the same filename, path traversal, duplicates, version, invalid uploads, ML restart) | 6 passed |
| `tests/api/test_phase1_backend.py` (normalisation on create/update, historical script, version, ML-down health, index bookkeeping, duplicate flag, ML+backend restart, rebuild after incompatible store, unindexable reports listed, traversal guard) | 16 passed |
| **Full `tests/` after Phase 1** | **94 passed, 5 failed, 1 skipped** |

`tests/ml` totals 69 passed + 1 skipped (46 + 4 + 4 + 9 + 6, counting parametrised cases). Adding the 16 backend tests and the 9 pre-existing passes gives the 94 below.

**The 5 failures are the same pre-existing failures as the baseline, with unchanged causes. They are not addressed in Phase 1:**
- `test_api.py::test_search_retrieval`: expects the retired mock `ml-pending` version and no running ML service, so it gets 500.
- `test_api.py::test_create_report` and `test_integration.py::test_valid_report_creation` / `test_invalid_report_creation`: the auth override isn't applied, so they get 401.
- `test_adapters.py::test_objectron_adapter`: the Objectron data is not on disk.

Running `pytest` from the repo root also errors while collecting `scratch/test_objectron_*.py`. This is pre-existing; run `pytest tests`.

### 4.2 Live API test (real uvicorn processes, real checkpoints)
Setup:
- ML service on :18001 and backend on :18000.
- A **copy** of the normalised `app.db` (7 reports: 5 with data-URL images, 2 seeded without `item_instance_id`).
- A scratch gallery directory.
- Script: `live_api_test.py` in the session scratchpad.

| # | Check | Result | Observed |
|---|---|---|---|
| A1 | ML `/api/health` exposes version and checkpoint hashes | PASS | `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`; hashes as in §2 |
| A2 | Backend **startup sync** indexes all DB reports that have images | PASS | 5/5 items in the ML gallery 15 s after the backend started |
| A3 | `scripts/reindex_reports.py`: nothing silently dropped | PASS | 5 already indexed, 0 failed; 2 skipped with reason `no_item_instance` (`LR-5535B1D9`, `FR-8AF9487F`) |
| A4 | `report_embeddings` bookkeeping | PASS | 5 rows, `model_version = lp-riem-mm1-phase1-crop-v1+m4c.7aef423c` |
| A5 | Backend `/retrieval/health` version | PASS | matches ML; `gallery_entries: 5` |
| A6 | Backend `/retrieval/search` version | PASS | correct version; no `mir-siamese` |
| A7 | **11 concurrent** `/api/search` uploads, all named `query_image.jpg` | PASS | 11 unique files; every file's bytes and SHA-256 match its request (22.9 s) |
| A8 | Duplicate detection | PASS | first add `added`; same item repeat `already_indexed`; second item `duplicate_of: ["dup_test_A"]`; search `query_identical_to_items: [A, B]`; category `Wallet` → `wallet` |
| A9 | **ML service restart** | PASS | 7 entries before and after, same item set, identical search results and scores; nothing quarantined |
| A10 | **Backend restart** | PASS | 7 reports in DB; sync: 5 already indexed, 0 re-embedded |
| A11 | Text-only search (known limitation, recorded) | recorded | **HTTP 500**: the ML `/api/search` still requires a file (422 upstream) |

## 5. Retrieval smoke comparison: full image (pre-Phase-1) vs crop (Phase 1)

> This is a 13-image smoke test, not an evaluation. It is not evidence of real-world accuracy either way.

- **Gallery:** 8 mock object photos + 5 uploaded laptop photos (12 unique contents; `item_e985fea2` and `item_f13a5f47` are byte-identical).
- **Queries:** each gallery image as-is ("self"), and a 12%-margin crop of it rotated 8° ("crop+rot").
- **Before:** the read-only audit run against the old pipeline.
- **After:** the Phase 1 pipeline with real checkpoints.

| Query set | Full image: correct #1 | Crop: correct #1 | Full image: "candidate" (> 0.8) | Crop: "candidate" (> 0.8) |
|---|---|---|---|---|
| self (13) | 13/13 (identical pair tied) | 13/13 (identical pair tied) | 13 | 13 |
| crop+rot, mock objects (8) | **8/8** | **7/8** (keys: correct item not in top 3) | 6 | 3 |
| crop+rot, laptop photos (5) | **4/5** (d80d8b6c missed; identical pair tied) | **2/5** (d80d8b6c rank 2; both copies of `test_image.jpg` not in top 3) | 0 | 0 |

**Interpretation.** Crop-only embedding, as specified, is **worse** than full-image embedding on the perturbed queries in this smoke set. The visible causes:

1. **Inconsistent box selection across views.** The 7-category detector picks different objects in multi-object scenes:
   - `test_image.jpg` (a laptop scene) is cropped to a `mobile_phone` box (0.793).
   - The keys photo is cropped as `mobile_phone` (0.637).
   - Mock bottle, calculator and notebook are also labelled `mobile_phone`.
2. **Asymmetric fallback.** For some perturbed queries the detector finds nothing, so a full-image query is matched against crop gallery entries.
3. **DINOv2's `Resize(256)` + `CenterCrop(224)` discards the ends of elongated crops.** The 576×1181 laptop crop keeps only its middle ~43% of height.

The crop path is implemented and tested as the task requires. **Whether crop-only should stay the default must be decided on a real evaluation set (Phase 2). This smoke result says it should not be assumed to be an improvement.**

## 6. Remaining limitations
1. **No working category model.**
   - M2 is a 2-class laptop/Laptop head, so perception is uninformative and every image is UNKNOWN.
   - UNKNOWN does not reject queries (pre-existing bypass, kept).
   - Grounding DINO's 7-category prompt is zero-shot and frequently mislabels (calculator, keys, bottle → `mobile_phone`).
2. **Crop policy is unvalidated** (§5). Missing pieces:
   - no category hint from the report to choose among boxes
   - no multi-box or multi-view indexing
   - no aspect-preserving resize
3. **The M2 classifier still sees the full image**, although it was trained on crops. This was deliberately left unchanged in Phase 1.
4. **Text-only search fails (HTTP 500)** because ML `/api/search` requires an image.
5. **Report updates do not re-index** a changed image. Deleting a report does not remove its vectors; the gallery is append-only.
6. **Store write cost:** the store rewrites full vector files on every add (O(N)). This is fine for a campus-scale gallery (thousands of items) and needs incremental persistence beyond that. Search is exact `IndexFlatIP`.
7. **OpenMP workaround:** `KMP_DUPLICATE_LIB_OK=True` is now explicit; production previously had it implicitly via sklearn. The proper fix is a single OpenMP runtime, for example conda `faiss-cpu` built against the same `libomp` as torch.
8. **Two seeded reports cannot be indexed** (`LR-5535B1D9`, `FR-8AF9487F`): they have no `item_instance_id`, and their images (`/mocks/lost_macbook.jpg`, `/mocks/found_macbook.jpg`) don't exist. They are reported on every sync, not dropped.
9. **The calibrator** was fitted on historical (full-image) Objectron features with an ECE of 0.22. Its probabilities are not validated for crop embeddings or campus photos.
10. **No reproducible evaluation set exists.** The original splits are gone, and the smoke set above is 13 images.
11. **No production DB migration.** Normalisation is a script with a SQLite auto-backup; for PostgreSQL, take a manual backup first. No schema changes were made: `report_embeddings` stores the model version only, and vectors live in the ML gallery store.

## 7. Files

| | Files |
|---|---|
| **New** | `src/categories.py`, `src/inference/{__init__,crop,versioning}.py`, `src/retrieval/gallery_store.py`, `src/api/services/index_sync.py`, `scripts/normalize_report_categories.py`, `scripts/reindex_reports.py`, `tests/ml/*`, `tests/api/test_phase1_backend.py`, this report |
| **Modified** | `scripts/run_inference.py`, `src/app/main.py`, `src/embeddings/dinov2_model.py`, `src/api/services/retrieval_service.py`, `src/api/routers/{retrieval,reports,admin}.py`, `src/api/main.py`, `src/api/schemas.py`, `tests/api/conftest.py`, `.gitignore` |
| **Data** | `app.db` (2 category values normalised); backup `app.db.bak-20261102-111959` |
| **Unchanged** | all checkpoints, `data/processed/m2_categories.json`, open-set / detector / reranker thresholds, existing uploads |

Phase 1 stops here. No training or threshold changes were made.
