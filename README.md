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
| Detection & crop | Grounding DINO (tiny), zero-shot (optional) | Finds the item in the photo and crops it; full-image retrieval used by default for maximum re-ID fidelity |
| Category classifier | SigLIP2 zero-shot & repaired multi-class M2 head | Predicts canonical category with open-set rejection for unsupported items |
| Instance embedding | SigLIP2 (1152-d) primary baseline & DINOv2 / M4-C (256-d) | Instance-level representation matching the exact physical item across viewpoints and lighting |
| Text ↔ image | SigLIP2 (base, patch16-224) | Calibrated semantic similarity scoring for text and multimodal queries |
| Vector search | FAISS (IndexFlatIP) | Nearest-neighbour cosine search over gallery embeddings |
| Rerank & calibrate | Calibrated 4D Logistic Reranker | Fuses visual similarity, DINOv2 features, text similarity, and explicit `text_missing` indicator |

The trained parts (M2 head, M4-C head, reranker) are in `models/`. The pretrained backbones
download automatically the first time the ML service starts.

Diagrams of the pipeline, user flow and architecture are in [`docs/diagrams/`](docs/diagrams).

## 5. Results

### Instance Retrieval Performance (Empirical Multi-View Benchmark)

| Retrieval Method | Image Input | Recall@1 | Recall@5 | Recall@10 | MRR |
|---|---|---:|---:|---:|---:|
| **SigLIP2 (Baseline)** | **Full image** | **0.9400** | **0.9800** | **1.0000** | **0.9583** |
| SigLIP2 + DINOv2 Fusion | Full image | **0.9600** | **0.9800** | **1.0000** | **0.9700** |
| Raw DINOv2 ViT-S/14 | Full image | 0.6800 | 0.8800 | 0.9400 | 0.7783 |
| Trained M4-C Projection Head | Full image | 0.6000 | 0.8000 | 0.8600 | 0.6888 |
| Trained M4-C Projection Head | Detector crop | 0.5400 | 0.7600 | 0.8200 | 0.6402 |

*Full-image retrieval significantly outperforms tight detector cropping (+6% to +12% R@1) because cropping discards distinctive peripheral markings, wear patterns, and hardware stickers.*

### Category Classification & Perception Gate

- **SigLIP2 Zero-Shot Classifier:** **92.90% Accuracy** (144/155 test images), with 1.00 precision on open-set unknown items (`other`).
- **Repaired M2 Head:** Multi-class DINOv2 classifier updated from buggy 2-class (`laptop`/`Laptop`) checkpoint to full canonical taxonomy with 90.32% test accuracy.

### Multimodal Reranker & Probability Calibration

- **Feature Space:** 4D vector `[siglip_img_sim, dino_img_sim, text_sim, text_missing]`.
- **Test Performance:** ROC-AUC **0.9801**, Brier Score **0.0359**, Genuine Match Acceptance **75.0%** (up from 1.9% baseline), Rejection Rate **3.6%** (down from 19.0% false rejections).
- **Missing-Text Bias Eliminated:** Image-only queries are no longer penalized by synthetic zero text similarities.

## 6. Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS 4, Framer Motion, GSAP, Lucide |
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic, SQLite (PostgreSQL-ready) |
| Auth | Firebase Authentication (web SDK + Firebase Admin / PyJWT on the server) |
| ML | PyTorch, Hugging Face Transformers, DINOv2, Grounding DINO, SigLIP2, FAISS, scikit-learn |
| Testing | pytest (144 tests passing: unit tests, API tests, gallery store, and real-model regression suite) |

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

The tests use a temporary database and fake ML models, so they run in a few seconds and
don't need the ML service or a model download.

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

## 12. Limitations and future work

- Evaluated on multi-view Objectron and CO3D datasets; a campus-collected validation set is planned
  (`reports/evaluation/CAMPUS_VALIDATION_ACQUISITION_PLAN.md`).
- Seven canonical categories supported: laptop, mobile phone, wallet, earphones, headphones, keys, book; open-set queries routed to "other".
- Grounding DINO detection is CPU-intensive (~25s per image); full-image retrieval is recommended for sub-second production response times (~850ms), reserving detection for multi-object scenes or GPU deployment.
- Deletion synchronization is fully implemented: deleting a report in the API dynamically removes its embedding and rebuilds FAISS indices.
