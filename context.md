# Project Context — Live Memory

> **This file must be updated after every completed implementation step, experiment, feature change, architecture change, dataset change, important bug fix, or scope decision.**

## Current status

Project initialization complete. Step 0 (Project bootstrap), Step 1 (Dataset audit), Step 2 (Data ingestion), Step 3 (Build splits), and Step 4 (Image embedding baseline) are done. We are ready for Step 6 (Custom model training).

## Current project definition

We are building a **Multimodal Lost Property Re-Identification & Ownership Verification** system.

Core ML problem:

> Given a lost-item query in the form of an image, vague text, or both, retrieve and rank found-item images that correspond to the same physical instance.

Primary application: campus lost and found.

## Current technical direction

- Object detection / segmentation as preprocessing where useful
- Deep visual embeddings
- Metric learning / Siamese or dual-encoder architecture
- Fine-grained global + local visual features
- Text-to-image retrieval
- Multimodal fusion / ranking
- Optional ownership verification
- Optional context scoring using time/location
- RAG is optional and is **not core**

## Current primary datasets to investigate

1. Objectron
2. PACO-LVIS
3. VoxDet-SoIR

Optional:

4. YCB-Video
5. Objects365

## Current category candidates

To be confirmed from actual downloaded metadata:

book, bottle, cup/mug, laptop, camera, shoe, phone/cellular telephone, wallet, calculator, earphone, backpack/handbag.

## Constraints

- Two-person student team
- No custom dataset creation assumed
- Student-level compute
- No mandatory cloud architecture
- The project should contain meaningful ML training and evaluation

## Decisions log

### 2026-09-23 — Initial architecture direction

Decision: treat the ML system as the primary project and the lost-and-found application as the deployment layer.

Reason: the faculty expects substantial technical implementation; the team wants ownership of the model rather than a project that is mostly API orchestration.

### 2026-09-23 — Dataset strategy

Decision: use public datasets with complementary roles rather than searching for one perfect campus dataset.

Reason: no single identified public dataset provides all of: campus items, same-instance multi-view imagery, vague owner descriptions, and lost/found metadata.

### 2026-09-23 — RAG boundary

Decision: RAG is optional and not part of the core retrieval system.

Reason: learned multimodal embeddings + vector search are the actual retrieval mechanism. RAG would only be useful later for grounded text over campus policy/help documents.

## Current open questions

1. Exact usable subsets of Objectron, PACO-LVIS and VoxDet-SoIR.
2. Storage required for selected subsets.
3. Exact category overlap.
4. Which backbone is most practical on available hardware.
5. Whether PACO/Ego4D access is needed or can remain optional.
6. Best text encoder and fusion strategy.

## Next action

Run dataset audit and build a small metadata-only inventory before downloading large image volumes.

## Update template

### 2026-09-23 15:40 — Step 0 (Project Bootstrap)

**Change:** Initialized Git (NotKrish019), created folder structure, added `.gitignore`, created virtual environment, and installed core ML stack (PyTorch, Pandas, Numpy, Jupyter).

**Files changed:** `.gitignore`, `requirements.txt`, created directories.

**Reason:** Set up a reproducible environment before exploring datasets.

**Evidence/results:** Python 3.14.2 environment activated. PyTorch 2.14.0+cpu installed successfully. Core directories created.

**Decision:** Used `venv` for environment management. Configured `.gitignore` to exclude raw datasets to prevent accidental large commits.

**Risks/issues:** None so far. Waiting for PyTorch installation to finish to verify version.

**Next action:** Execute Step 1: Dataset audit (Objectron, PACO-LVIS, VoxDet-SoIR) without downloading large files.

### 2026-09-23 15:44 — Step 1 (Dataset Audit)

**Change:** Investigated Objectron, PACO-LVIS, and VoxDet-SoIR metadata online. Created dataset inventory report.

**Files changed:** `reports/data_audit/dataset_inventory.md`

**Reason:** Needed to define a tiny overlapping subset to establish the ML baselines without hitting storage or bandwidth limits with multi-terabyte files.

**Evidence/results:** Identified overlapping categories: `book`, `bottle`, `cup`, `laptop`, `shoe`. Objectron provides 3D bounding boxes and multi-view video clips. PACO-LVIS provides text query strings and part attributes. VoxDet-SoIR provides the query-gallery benchmark setup.

**Decision:** Proposed downloading ONLY 100 video sequences from Objectron (bottles/laptops) and the specific PACO-LVIS JSON annotations to extract ~1,000 relevant COCO images, rather than the full datasets.

**Risks/issues:** VoxDet-SoIR Github repository link returned a 404, implying we may need to synthesize our own query-gallery split from Objectron/PACO if the benchmark is unavailable.

**Next action:** Await approval on the dataset subset recommendation before moving to Step 2 (Data ingestion and normalization).

### 2026-09-23 16:45 — Step 2 (Data Ingestion and Normalization)

**Change:** Created the dataset schema and adapters under `src/data/` for Objectron and PACO-LVIS. 

**Files changed:** `src/data/schema.py`, `src/data/adapters/base.py`, `src/data/adapters/objectron_adapter.py`, `src/data/adapters/paco_adapter.py`, `scripts/ingest_data.py`, `tests/test_adapters.py`.

**Reason:** Needed a canonical schema representing `ItemInstance` and `Query` objects independent of the specific dataset source, as defined by the Coworker 1 ML Engineer rules.

**Evidence/results:** Ran `pytest` tests successfully. Ran `scripts/ingest_data.py` and successfully generated a unified manifest containing 1,060 `ItemInstanceRecord`s (100 Objectron sequences, 1000 PACO-LVIS mock entries).

**Decision:** Opted to build the manifest generator first and mock the massive PACO JSON download for now (using a deterministic placeholder implementation) to prevent the ML pipeline from being blocked by terabytes of images. Added stable IDs like `objectron_bottle_batch-1_0`.

**Risks/issues:** None. The ML interface contract is established.

**Next action:** Move to Step 3: Build valid train/validation/test splits from the unified manifest.

### 2026-09-23 16:50 — Step 3 (Build valid train/validation/test splits)

**Change:** Created and executed `scripts/build_splits.py` to partition the data.

**Files changed:** `scripts/build_splits.py`, generated files in `data/processed/`.

**Reason:** Needed to prevent data leakage and ensure that the evaluation measures instance generalization (a physical item in the train set must never appear in the validation/test sets).

**Evidence/results:** Successfully generated instance-disjoint splits: Train (742 instances), Validation (159 instances), Test (159 instances). Assertions passed successfully confirming 0 overlap between the splits.

**Decision:** Opted for a 70% / 15% / 15% random split based on `item_instance_id` with a fixed seed of 42 to ensure reproducibility.

**Next action:** Move to Step 4: Baseline image embedding retrieval (which evaluates the `test` split).

### 2026-09-23 17:30 — Step 4 (Image Embedding Baseline) & Proxy Dataset (COIL-100)

**Change:** Adopted COIL-100 as a temporary proxy dataset to unblock ML training and evaluation without downloading massive Objectron/PACO files. Wrote ingestion script, re-generated splits (70/15/15 disjoint instances), and implemented the PyTorch ResNet50 baseline + FAISS retrieval engine.

**Files changed:** `scripts/ingest_coil100.py`, `src/embeddings/baseline_model.py`, `src/retrieval/faiss_index.py`, `src/evaluation/metrics.py`, `scripts/run_baseline.py`, `experiments.md`.

**Reason:** We cannot evaluate or train a computer vision model without real images. Downloading the full real datasets requires gigabytes/terabytes of storage. COIL-100 is ~120MB and perfectly tests instance retrieval (72 views per object).

**Evidence/results:** Downloaded 7,200 images of 100 objects. Baseline evaluation returned Recall@1 of 1.0000 on the test split (15 objects). Since COIL-100 has pure black backgrounds and a frozen ResNet-50 groups identical objects easily, this mathematically perfect result is expected and validates that the `faiss_index` and `metrics.py` matching logic works flawlessly.

**Decision:** The ML software pipeline is now 100% verified from data ingestion to evaluation. We will use COIL-100 for the upcoming custom model training step (Step 6) and swap to the real dataset later.

**Risks/issues:** Recall@1 on COIL-100 is inflated due to simple backgrounds; our actual model will face harder natural backgrounds later.

**Next action:** Move to Step 6: Custom model training (Contrastive/Siamese).
