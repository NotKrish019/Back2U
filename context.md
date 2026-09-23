# Project Context — Live Memory

> **This file must be updated after every completed implementation step, experiment, feature change, architecture change, dataset change, important bug fix, or scope decision.**

## Current status

Project initialization complete. Step 0 (Project bootstrap) and Step 1 (Dataset audit) are done. Step 2 (Data ingestion) is pending.

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
