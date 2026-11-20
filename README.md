# Back2U — AI-Powered Campus Lost & Found

Back2U is a campus lost-and-found platform that uses **multimodal machine learning** to match
lost items with found items. A student can describe what they lost, upload a photo, or both;
Back2U finds and ranks the found items that are most likely the **same physical object**, and
campus staff confirm ownership before an item is handed back.

---

## 1. The problem

On most campuses lost property is handled through notice boards, WhatsApp groups and a front
desk. Reports are scattered, nobody can search them properly, and keyword search fails because
two people rarely describe the same object the same way ("black HP laptop" vs. "dark grey
notebook with stickers"). Most items are never returned.

## 2. Our solution

One platform where every lost and found report lives, plus an ML pipeline that compares items
the way a person would — by how they **look** and how they are **described**:

1. **Report** — a user files a *lost* or *found* report with a photo, description, category,
   location and date.
2. **Match automatically** — every new report is embedded and searched against the opposite
   kind of report; likely matches are stored as *candidate matches*.
3. **Search** — users can search any time by photo, text, or both and get a ranked list with
   confidence scores.
4. **Claim & verify** — the owner submits a claim; staff review the evidence on the staff
   dashboard and approve or reject it.

## 3. Key features

- Image, text, and image + text search over all found items
- Automatic matching when a report is created (lost ↔ found)
- Object detection + cropping so the background doesn't drive the match
- Open-set category gate (rejects photos that aren't a supported item instead of guessing)
- Calibrated confidence scores with `candidate` / `review` decisions
- Duplicate-photo detection and a persistent, versioned vector gallery
- iPhone HEIC/HEIF photo support
- Firebase login (email / phone), user report history, notifications
- Staff dashboard: overview, candidate-match review, claim approval, re-indexing
- Campus hotspot map, public browse page, item comparison view

## 4. Architecture

```text
            ┌──────────────────────────┐
  Browser → │ Frontend (Next.js 14)    │  :3000   frontend/
            └────────────┬─────────────┘
                         │ REST + Firebase ID token
            ┌────────────▼─────────────┐
            │ Backend API (FastAPI)    │  :8000   src/api/
            │ reports, claims, users,  │──── SQLite / PostgreSQL (SQLAlchemy + Alembic)
            │ admin, retrieval         │──── Firebase Admin (token verification)
            └────────────┬─────────────┘
                         │ HTTP
            ┌────────────▼─────────────┐
            │ ML Inference (FastAPI)   │  :8001   src/app/ + scripts/run_inference.py
            │ detect → embed → search  │──── FAISS gallery (data/gallery/)
            │ → rerank → calibrate     │
            └──────────────────────────┘
```

### ML pipeline

| Stage | Model | Role |
|---|---|---|
| Detection & crop | Grounding DINO (tiny), zero-shot (optional) | Only used by the `detector_crop` / `confidence_aware` crop policies. **Not run in production** (`full_image` policy), and never used to decide the category |
| Open-set gate | SigLIP2 zero-shot, temperature-calibrated, with explicit unsupported-object prompts | `SUPPORTED` / `UNCERTAIN` / `UNSUPPORTED_ITEM`; unsupported photos stop retrieval ([`docs/OPEN_SET_GATE.md`](docs/OPEN_SET_GATE.md)) |
| Instance embedding | SigLIP2 (768-d) primary baseline & DINOv2 / M4-C (256-d) | Instance-level representation matching the exact physical item across viewpoints and lighting |
| Text ↔ image | SigLIP2 (base, patch16-224) | Calibrated semantic similarity scoring for text and multimodal queries |
| Vector search | FAISS (IndexFlatIP) | Nearest-neighbour cosine search over gallery embeddings |
| Rerank & calibrate | Calibrated 4D Logistic Reranker | Fuses visual similarity, DINOv2 features, text similarity, and explicit `text_missing` indicator; auto-match only at probability ≥ 0.90 ([`docs/MATCHING_THRESHOLDS.md`](docs/MATCHING_THRESHOLDS.md)) |

The trained parts (M2 head, M4-C head, reranker) are in `models/`. The pretrained backbones
download automatically the first time the ML service starts.

Diagrams of the pipeline, user flow and architecture are in [`docs/diagrams/`](docs/diagrams).

## 5. Results

Results are reported **per dataset** and are not interchangeable. None is a campus or real-world deployment number. The campus validation set is designed but **not yet collected**. Full table: [`experiments.md`](experiments.md).

### Instance re-identification

| Dataset | Gallery | Method | Recall@1 | Recall@5 |
|---|---|---|---:|---:|
| Objectron held-out split (in-domain for M4-C, same-video views) | 24 objects / 50 photos | SigLIP2 full image | 0.94 | 1.00 |
| CO3D (never trained on; same capture session) | 59 objects | SigLIP2 full image | 0.75 | 0.86 |
| CO3D | 90 objects, clean + phone-style perturbed queries | SigLIP2 + reranker | 0.68 | n/a |
| Campus (owner photo vs. finder photo) | 28 objects (planned) | n/a | **not collected** | n/a |

On a harder, larger gallery, the true object and its best look-alike impostor score almost the same: mean cosine 0.83 vs 0.81 on CO3D. That is why the auto-match threshold is strict.

### Auto-match threshold (CO3D test split, 156 queries)

| reranker probability ≥ | precision | recall | false-match rate when the item is not in the gallery |
|---:|---:|---:|---:|
| 0.65 (old cutoff; previously no threshold was applied at all) | 0.59 | 0.40 | 0.20 |
| **0.90 (deployed)** | **0.91** | **0.13** | **0.006** |

Matches are suggestions for staff review. Ownership is established only by an approved claim.

### Open-set gate (real photographs: Wikimedia Commons + CO3D, test split)

- Supported items accepted with the correct category: **0.89**. Wrong category: 0.06. Hard-stopped: 0.02.
- Unsupported objects accepted as supported: **1/71**. Held-out object types with no prompt: **1/28**.
- AUROC, supported vs. unsupported: ≥ 0.99 for MSP, energy and max-cosine scores.

### Latency (Apple-silicon CPU, batch size 1, ~1 MP photos)

Skipping Grounding DINO in `full_image` mode cut the median warm query from **2.52 s to 0.13 s** and the gallery add from **2.59 s to 0.14 s** (`reports/benchmarks/latency_before_after.json`).

### Multimodal reranker (unchanged)

- **Features:** 4-D `[siglip_img_sim, dino_img_sim, text_sim, text_missing]`.
- **Held-out metrics:** ROC-AUC 0.98, Brier 0.036.

## 6. Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 4, Framer Motion, GSAP, Lucide |
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic, SQLite (PostgreSQL-ready) |
| Auth | Firebase Authentication (web SDK + Firebase Admin / PyJWT on the server) |
| ML | PyTorch, Hugging Face Transformers, DINOv2, Grounding DINO, SigLIP2, FAISS, scikit-learn |
| Testing | pytest (186 tests, 185 passing + 1 opt-in: unit, API, workflow, privacy, sync, gallery store, and a portable real-model regression suite on licensed photos) |

## 7. Project structure

```text
.
├── README.md
├── requirements.txt          # Python dependencies (pinned)
├── start_local.sh            # starts backend + ML service + frontend
├── .env.example              # backend settings template
├── app.db                    # SQLite database with demo reports
├── alembic/, alembic.ini     # database migrations
│
├── frontend/                 # Next.js web app (see frontend/README.md)
│
├── src/
│   ├── api/                  # Backend API: routers, models, schemas, auth, services
│   ├── app/                  # ML inference service (FastAPI)
│   ├── inference/            # cropping policy, model/version identity
│   ├── retrieval/            # persistent FAISS gallery store
│   ├── models/               # M2 category head, M4 projection heads
│   ├── embeddings/           # DINOv2 + baseline encoders
│   ├── losses/               # metric-learning losses
│   ├── data/                 # dataset schema and adapters
│   ├── evaluation/           # evaluation library (metrics, manifests)
│   └── categories.py         # canonical item categories
│
├── scripts/
│   ├── run_inference.py      # the production inference pipeline (used by src/app)
│   ├── reindex_reports.py    # rebuild the gallery from the database
│   ├── create_admin.py, init_db.py, seed_mock_data.py, normalize_report_categories.py
│   ├── datasets/             # dataset download, ingestion, splits, crops
│   ├── training/             # model training (baseline → M2 → M4 → M5 → reranker)
│   ├── evaluation/           # evaluation and diagnostics
│   └── demo/                 # command-line search and ownership-verification demos
│
├── models/                   # trained weights (M2 head, M4-C head, reranker)
├── data/processed/           # category list used at runtime
├── tests/                    # pytest suite (api/, ml/, evaluation/)
├── docs/                     # requirements, plans, design, development log, diagrams
└── reports/                  # experiment results, evaluation reports, model card
```

## 8. Setup and running

### Prerequisites
- Python 3.11 or newer (tested on 3.14)
- Node.js 18 or newer (tested on 26)
- About 3 GB of free disk space and an internet connection for the **first** start (pretrained
  models are downloaded once from Hugging Face / PyTorch Hub and cached)

### Quick start (macOS / Linux)

```bash
./start_local.sh
```

This creates `venv/`, installs Python and npm dependencies on first run, and starts:

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| Backend API docs (Swagger) | http://localhost:8000/docs |
| ML service health | http://localhost:8001/api/health |

The ML service takes a minute to load its models; searches work once `/api/health` reports `ready`.

### Manual start (any OS, three terminals)

```bash
# 1. Python environment
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. ML inference service
uvicorn src.app.main:app --port 8001

# 3. Backend API
uvicorn src.api.main:app --port 8000

# 4. Frontend
cd frontend
npm install
npm run dev                          # http://localhost:3000
```

### Configuration
- **Backend:** optional `.env` (see `.env.example`). By default it uses the bundled SQLite
  database `app.db`. To use PostgreSQL, set `DATABASE_URL` and run `alembic upgrade head`.
- **Frontend:** `frontend/.env.local` holds the Firebase web config (template:
  `frontend/.env.example`).
- **Staff access:** sign up in the app, then run
  `python scripts/create_admin.py <firebase_uid>` to give that account staff rights.

### Demo data
`app.db` contains sample lost and found reports. On startup the backend syncs their images into
the ML gallery (`data/gallery/`), so search works immediately. To rebuild the gallery manually:
`python scripts/reindex_reports.py`.

## 9. Tests

```bash
source venv/bin/activate
pytest tests
```

Result: 185 passed, 1 skipped. The skipped test is an opt-in real-model crop check that needs `RUN_REAL_MODELS=1`.

- **Fast tests:** use a temporary database (`test_app.db`), temporary galleries and fake ML models. They never touch `app.db` or `data/gallery`. Run only these with `SKIP_REAL_MODELS=1 pytest tests` (about 6 s).
- **Real-model regression suite:** `tests/ml/test_real_models_regression.py`, about 40 s. It uses the real checkpoints and 55 licensed Wikimedia Commons photos committed under `tests/assets/real_model_regression/` (manifest, ground truth, licences, pinned sha256). Its CO3D multi-view test is skipped with an explicit reason when the research-only CO3D data is absent.
- **Workflow coverage:** `tests/api/test_pipeline_repair.py` covers matching directions, the auto-match threshold, the open-set gate, index sync, found-photo privacy and the claim/approval workflow end to end.

## 10. Reproducing the ML work

Training and evaluation scripts are in `scripts/training/` and `scripts/evaluation/`; run them
from the project root with `python -m scripts.<folder>.<script>`. The development history (every
experiment, decision and result) is recorded in [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md),
with a summary table in [`docs/EXPERIMENT_LOG.md`](docs/EXPERIMENT_LOG.md). The datasets used
(Objectron, CO3D, COIL-100) are public and are **not** included; see
[`docs/planning/DATASET_STRATEGY.md`](docs/planning/DATASET_STRATEGY.md) and `scripts/datasets/`.
CO3D is licensed CC BY-NC 4.0 and is used for research evaluation only.

Raw per-query evaluation outputs (`reports/evaluation/phase2_runs/**/*.jsonl`, `*.npy`, and the
`reports/evaluation/m2_visualizations/` crops) are kept in the
[GitHub repository](https://github.com/NotKrish019/Back2U) only; the submission ZIP includes
the summary metrics and all reports, but not these large generated files.

## 11. Documentation

| Document | Contents |
|---|---|
| [`docs/requirements/PRD.md`](docs/requirements/PRD.md) | Product requirements |
| [`docs/requirements/SRD.md`](docs/requirements/SRD.md) | Software requirements and system design |
| [`docs/planning/`](docs/planning) | Master plan, implementation plan, research plan, dataset strategy |
| [`docs/design/`](docs/design) | UI design specification and implementation plan |
| [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md) | Chronological log of every step, decision and result |
| [`reports/`](reports) | Architecture notes, experiment reports, evaluation reports, model card |
| [`context.md`](context.md) | Working context: services, source of truth, request flow, workflow rules |
| [`experiments.md`](experiments.md) | Results separated by dataset (Objectron / CO3D / Commons / campus) |
| [`docs/MATCHING_THRESHOLDS.md`](docs/MATCHING_THRESHOLDS.md) | Matching directions and auto-match threshold calibration |
| [`docs/OPEN_SET_GATE.md`](docs/OPEN_SET_GATE.md) | Open-set gate design and calibration |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Found-photo privacy |
| [`docs/campus_validation/`](docs/campus_validation) | Campus validation protocol, schema, consent form |
| [`reports/PIPELINE_REPAIR_REPORT.md`](reports/PIPELINE_REPAIR_REPORT.md) | End-to-end repair: implemented / tested / not tested |

## 12. Limitations and future work

- Evaluated on Objectron, CO3D and Wikimedia Commons photos only. The campus validation set (28 objects) is specified in [`docs/campus_validation/PROTOCOL.md`](docs/campus_validation/PROTOCOL.md) but **not collected**. Every threshold is provisional until then.
- Seven canonical categories are supported: laptop, mobile phone, wallet, earphones, headphones, keys, book. Other objects get `UNSUPPORTED_ITEM` and no automatic matching.
- The auto-match threshold favours precision: it suggests about 13% of true matches automatically (CO3D). Everything else relies on people browsing their search results and on staff review.
- Grounding DINO is not run in production. It is about 2.4 s per image on CPU, so cropping would need a GPU.
- Deletion synchronization is fully implemented: deleting a report in the API dynamically removes its embedding and rebuilds FAISS indices.
