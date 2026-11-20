# Back2U: working context (read this first)

Back2U is a campus lost-and-found service. A person who lost something searches with a photo and/or a description. Staff and finders file found reports. The system suggests matches, and staff approve ownership claims.

## Services

| Port | Service | Code |
|---|---|---|
| 3000 | Next.js frontend | `frontend/` |
| 8000 | FastAPI backend: reports, claims, admin, privacy, matching rules | `src/api/` |
| 8001 | ML inference: open-set gate, embeddings, gallery, reranker | `src/app/main.py`, `scripts/run_inference.py` |

Start everything with `./start_local.sh`. Both Python services bind to `127.0.0.1` only.

## Source of truth

- **The database** (`app.db`, SQLite, `DATABASE_URL`) is authoritative.
- **The ML gallery** (`data/gallery/`, git-ignored) is a derived index that can be rebuilt at any time:
  - Startup: the backend runs an incremental, idempotent sync in the background, keyed on item id, image sha256 and eligibility (open lost/found reports).
  - Manually: `python scripts/reindex_reports.py --check | --dry-run | (sync) | --rebuild`. Sync and rebuild back up `app.db` and the gallery first, and rebuild swaps a validated temporary build into place atomically.
  - Model-version changes are handled by the ML service. It quarantines an incompatible gallery at load, and the next sync rebuilds it.

## Request flow (image search)

1. **Backend: eligible set.** `src/api/services/matching.py` computes the eligible set: open reports of the *opposite* type, excluding the query's own report.
2. **ML: gate.** The full-image SigLIP2 embedding is computed and run through the open-set gate (`src/inference/open_set.py`, `configs/open_set_gate.json`).
   - `UNSUPPORTED_ITEM` stops here.
   - `UNCERTAIN` still searches, but its results can never be `candidate`.
3. **ML: retrieval.** SigLIP2 retrieval runs over the eligible items only (`allowed_ids`). The reranker probability then yields a candidate, review or reject decision.
4. **Backend: response.**
   - Every row is re-checked against the DB and enriched.
   - Found photos are replaced by a server-side blurred derivative unless the viewer is the finder, staff or an approved claimant (`src/api/services/privacy.py`).
5. **On report creation: auto-match.** A pending `CandidateMatch` is created only if the image query was `SUPPORTED`, the decision was `candidate`, and the probability is ≥ 0.90 (`configs/matching_thresholds.json`). A match is a suggestion; ownership needs an approved claim.

Grounding DINO is not used in production (`full_image` crop policy). It runs only under the `detector_crop` or `confidence_aware` policies, or with `ML_DETECTOR_MODE=always`.

## Claims workflow

- **Filing a claim:** `POST /claims` requires an open found report, a non-empty proof, no claim on one's own report, and no duplicate active claim.
- **Staff decision:** `PATCH /admin/claims/{id}` allows `pending → approved | denied` only.
- **On approval:** the report is resolved, the item gets `resolved_at`, competing claims are denied, pending matches are rejected, and the item leaves the gallery.
- **Candidate matches:** allow `pending → accepted | rejected` only.

## Errors

All errors are JSON: `{"detail": {"code": "...", "message": "..."}}`. Unhandled exceptions return `INTERNAL_ERROR` with no stack trace. The ML service being down gives `503 ML_UNAVAILABLE`, and a bad image gives `400 INVALID_IMAGE`.

## Tests

```bash
SKIP_REAL_MODELS=1 python -m pytest -q          # ~6 s, fakes only
python -m pytest -q tests/ml/test_real_models_regression.py   # ~40 s, real checkpoints + committed assets
```

- **API tests** use `test_app.db` and temporary galleries, never `app.db` or `data/gallery`.
- **Real-model assets** are licensed Commons photos in `tests/assets/real_model_regression/` (manifest, licences, pinned sha256; verify with `scripts/datasets/regression_assets.py verify`).

## Data and licences

- **CO3D** (`data/raw/co3d_research_only`) is CC BY-NC, used for research evaluation only, and never committed.
- **Campus photos** are not collected yet. See `docs/campus_validation/`.
- **Results by dataset:** `experiments.md`.
- **Design notes:** `docs/MATCHING_THRESHOLDS.md`, `docs/OPEN_SET_GATE.md`, `docs/PRIVACY.md`.

## Ownership

ML model work belongs to Krish, so retrain models only by agreement. The pipeline repair on `fix/pipeline-repair` changed inference wiring, thresholds and gating, not trained weights.
