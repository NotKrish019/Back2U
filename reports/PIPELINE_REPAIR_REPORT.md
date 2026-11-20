# Back2U: end-to-end product and ML pipeline repair, engineering report

**Branch:** `fix/pipeline-repair` (from `main` @ `81d4adc`). **Date:** 2026-11-21. **Status:** uncommitted; awaiting review.

No model was retrained. Trained weights (M2, M4-C, reranker) are unchanged. The work changed wiring, gating, thresholds, sync, privacy and workflow rules.

## 0. Audit findings (M0)

| # | Problem | Evidence |
|---|---|---|
| A1 | Category confidence stuck at ~0.2 | zero-shot `softmax(cos×10)`; fitted temperature is 0.0094, so the old logits were ~10× too flat (NLL 2.32 vs 0.26) |
| A2 | Detector overrode an unsure classifier | rendered backpack → "headphones", bottle → "mobile_phone" (probe) |
| A3 | `UNKNOWN` ignored; retrieval always ran | `infer_pil` comment "bypass kept as-is" |
| A4 | Grounding DINO on every query and every add, even in `full_image` mode | 2.4 s of a 2.5 s query |
| A5 | `/search` had no type filter: a lost search could return lost reports | `retrieval.py` filtered only `status == "open"` |
| A6 | Auto-match had no threshold: every opposite-type top-5 hit became a pending match | `reports.py` |
| A7 | Index sync treated "item id present" as indexed: no sha check, no stale or orphan removal | `index_sync.py`; live gallery held a resolved report, an orphan, and one stale photo |
| A8 | Found photos: CSS-only blur on search, **no blur** on item detail and list; ML service served gallery originals under `/data` | `BLURRED_` prefix + CSS; `StaticFiles(DATA_DIR)` |
| A9 | Real-model tests depended on git-ignored `data/raw` → 2 failures on any other machine | `test_real_models_regression.py` |
| A10 | Claims: no state machine; claims on closed items allowed | `PATCH` accepted any status string |

## 1. Implemented, tested, partially tested, not tested

### Implemented and tested (automated tests in the repo)

| Milestone | What | Tests |
|---|---|---|
| **M1** DB is source of truth | `index_sync.plan_sync/sync_reports_to_index`: keyed on item id + **set of image sha256** + eligibility (open lost/found). Adds missing items, replaces changed photos, removes resolved/closed/deleted/orphan items, and reports missing images without deleting their embeddings. Idempotent. Startup sync uses the same code. `scripts/reindex_reports.py --check / --dry-run / sync / --rebuild`; sync and rebuild back up `app.db` (SQLite online backup) and the gallery. Rebuild builds into a temp dir, validates, backs up, then `os.replace` swaps. ML `/api/items` now returns per-item sha256; `/api/add` takes `replace`. Editing a report photo re-indexes with replace. | `test_sync_*` (stale/orphan removal, idempotence, photo change, missing image, shared item instance), `test_editing_report_photo_reindexes_with_replace`, existing restart/quarantine tests |
| **M2** directions | `src/api/services/matching.py` is the single home of the rules. `/search` takes `query_type` (default `lost` → open **found** only) and `exclude_report_id`. The ML service ranks only `allowed_ids`, so ineligible items cannot crowd out eligible ones, and the backend re-checks every row. Auto-match uses the same function in the new report's direction. | `test_lost_search_returns_only_open_found_reports`, `test_found_query_returns_only_open_lost_and_never_itself`, `test_ineligible_items_cannot_crowd_out_eligible_ones`, `test_deleted_report_disappears_*`, unit test of the rules |
| **M3** auto-match threshold | `should_auto_match` requires an image query, gate `SUPPORTED`, ML decision `candidate`, and reranker probability ≥ `auto_match_min_score` (configurable by `configs/matching_thresholds.json`, env `AUTO_MATCH_MIN_SCORE`, provisional default 0.90). Calibrated on CO3D positives and hard negatives with closed- and open-set protocols (§2). Text-only never auto-matches. | `test_new_found_report_auto_matches_*`, `test_new_lost_report_*threshold_env`, `test_text_only_reports_never_auto_match`, policy unit tests |
| **M4** open-set gate | Classifier-only gate with calibrated temperature and explicit unsupported prompts. The detector is informational. `UNSUPPORTED_ITEM` returns a structured status, no retrieval, no matches. `UNCERTAIN` searches but never auto-matches. Search page explains the unsupported case. | `test_unsupported_item_stops_*`, `test_uncertain_item_*`, `test_detector_cannot_override_uncertain_classifier`, real-model `test_open_set_gate_on_real_photos`, `test_blank_and_noise_images_never_become_supported` |
| **M5** latency | Detector skipped when the crop policy is `full_image` (queries and adds); `ML_DETECTOR_MODE=always` restores it. Full-image SigLIP2 embedding computed once and reused for gate and retrieval. Per-stage timings returned. Benchmark script records machine, versions, resolution and batch size. | `test_full_image_policy_skips_detector_entirely`, `test_detector_mode_always_restores_detection`, real-model `test_detector_never_runs_in_full_image_mode` |
| **M6** portable real-model tests | 55 licensed Commons photos in `tests/assets/real_model_regression/` with manifest, ground truth, provenance, `LICENSES.md` and pinned sha256. `scripts/datasets/regression_assets.py build/verify --refetch` is the downloader/verifier. Repo-relative paths. Explicit skip reasons (missing checkpoints / assets / CO3D). **Both previous failures resolved.** | 8/8 real-model tests pass (~40 s) |
| **M8** workflow | Claims: open found report only, not own, non-empty proof, no duplicate active claim. Staff `pending → approved/denied` only (409 otherwise). Approval resolves the report, sets `resolved_at`, denies competing claims, rejects pending matches for that report, and removes it from the gallery. Candidate matches `pending → accepted/rejected` only. | `test_end_to_end_found_lost_automatch_claim_approve`, `test_staff_can_deny_a_claim_and_item_stays_open` |
| **M9** privacy | Real server-side blurred derivative (≤ 320 px, Gaussian r = 6% of the long side, JPEG) for found photos in list, detail, search and matches. Original only for the finder, staff or an approved claimant. No fallback to the original. ML service no longer serves gallery originals. | `test_found_photo_is_really_blurred_*` (sharpness < 15% of the original), `test_found_photo_original_only_for_*`, `test_lost_photos_are_not_blurred`, `test_matches_endpoint_blurs_*`, `test_gallery_images_are_not_served_by_url` |
| Errors | Structured `{detail: {code, message}}` across search, claims and admin. Global handlers in both services return `INTERNAL_ERROR` without traces. ML outage → 503 `ML_UNAVAILABLE`; bad image → 400 `INVALID_IMAGE`. Token-dumping debug prints removed from auth. Frontend parses `detail.message`. | `test_invalid_image_is_a_structured_400`, `test_ml_outage_is_a_structured_503`, `test_unhandled_errors_are_structured_without_traceback` |
| **M7** framework | `docs/campus_validation/PROTOCOL.md` (objects, views, naming, splits, consent, privacy, manual steps), `CONSENT_FORM.md`, `configs/campus_validation/instance.schema.json`, updated template, `scripts/evaluation/campus_eval.py`. Uses the production pipeline; reports R@1/R@5/MRR, threshold P/R/F1, open-set FMR, look-alike confusion, gate decisions, per fold; skips objects without consent; prints `NOT_COLLECTED` without data. | `tests/ml/test_campus_eval.py` (synthetic code-path test, clearly not results) |

**Suite:** 185 passed, 1 skipped (opt-in `RUN_REAL_MODELS=1` crop test); 44 s with real models, about 6 s with `SKIP_REAL_MODELS=1`. Baseline before the work: 143 passed, 2 real-model failures.

### Partially tested

- **Live system (manual, 2026-11-21):**
  - Backups: `app.db.bak-20261121-000212`, `app.db.bak-20261121-000332`, `data/gallery.backup-20261121-000*`.
  - `--check` found 1 stale photo, 1 resolved report and 1 orphan. `--dry-run` matched that plan, the sync applied it, and a second `--check` reported in sync.
  - Reports (23) and candidate matches (19) are unchanged.
  - HTTP smoke tests: lost search returned only open found reports with blurred photos in 0.18 s; found search returned only lost reports; a backpack photo got `UNSUPPORTED_ITEM` with no results; an invalid image got a structured 400; an anonymous item detail got a 3.9 KB blurred derivative instead of the 114 KB original.
- **Frontend:**
  - Type-checks. `/`, `/search` and `/browse` return 200.
  - The unsupported-item message and `apiErrorMessage` were not exercised in a browser.
  - The item page relies on the server-blurred image; its CSS blur remains as an extra layer.
- **Offline `--rebuild`:** code path written, but not executed against the live gallery; incremental sync was sufficient. It refuses to run while the ML service is up.
- **Image + text auto-match:** uses the same threshold, but the threshold was calibrated on image-only pairs.
- **Thresholds are provisional:**
  - Auto-match: the test-split precision at 0.90 is 0.91 on 22 auto-matches, below the 0.95 target. Calibration precision was 1.00.
  - Gate: calibrated on web photos plus CO3D, not campus photos.

### Not yet tested or done

- **Campus validation: photos not collected.** No campus number exists. Collection is a manual step (§7 of the protocol, about half a day for 2 people).
- **The 19 existing pending matches** were created under the old no-threshold rule. They were left untouched (real data). Staff can review them, or a one-off re-score could be run with approval.
- **Seeded demo images:** `frontend/public/mocks/*` remain publicly reachable by direct URL (documented in `docs/PRIVACY.md`).
- **Model versioning:** `model_version` does not encode crop policy or gate config. Changing the crop policy needs a manual `--rebuild`.
- **Not done here:** concurrency and load testing; multi-worker deployment (the gallery is per-process); a GPU path for the detector.

## 2. Key measured results (details in `experiments.md`)

- **Auto-match (CO3D, held-out objects):**
  - At the old 0.65 cutoff, 20% of searches whose item was not present would still have produced a false auto-match, with precision 0.59.
  - At 0.90: precision 0.91, recall 0.13, open-set false-match rate 0.006.
  - True and impostor similarities overlap heavily (0.83 vs 0.81). Re-ID on CO3D is R@1 0.68–0.75, not the 0.94 measured on Objectron.
- **Gate (real photos, test split):**
  - 0.89 of supported photos accepted with the correct category; 0.02 hard-stopped.
  - Unsupported objects accepted as supported: 1/71; held-out types: 1/28.
- **Latency:** median warm query 2.52 s → 0.13 s and gallery add 2.59 s → 0.14 s, from skipping Grounding DINO.

## 3. Files

- **New:**
  - `src/api/services/{matching,privacy}.py`, `src/inference/open_set.py`
  - `configs/{open_set_gate,matching_thresholds}.json`, `configs/campus_validation/instance.schema.json`
  - `scripts/evaluation/{calibrate_open_set,calibrate_match_threshold,benchmark_latency,campus_eval}.py`, `scripts/datasets/regression_assets.py`
  - `tests/api/test_pipeline_repair.py`, `tests/ml/test_campus_eval.py`, `tests/assets/real_model_regression/`
  - `docs/{MATCHING_THRESHOLDS,OPEN_SET_GATE,PRIVACY}.md`, `docs/campus_validation/`
  - `context.md`, `experiments.md`, `reports/calibration/`, `reports/benchmarks/`
- **Changed:**
  - Backend: routers (retrieval, reports, claims, admin), `schemas`, `auth`, `main`, `services/{index_sync,retrieval_service}`
  - ML service and pipeline: `src/app/main.py`, `scripts/run_inference.py`, `src/retrieval/gallery_store.py`, `src/inference/crop.py`, `scripts/reindex_reports.py`
  - Frontend: `frontend/src/services/api.ts`, `frontend/src/app/search/page.tsx`
  - Tests updated for the intended contract changes (structured errors, search direction).
- **Not committed:**
  - `app.db` is modified locally by sync bookkeeping. It holds real user data, so do not commit it without review.
  - Git-ignored and not to be committed: gallery backups and CO3D.
