# Current ML Architecture Report

**Date:** 2026-09-28
**Status:** Audit (Pre-M1)

## Overview
The current machine learning architecture is functional and has completed a 20-epoch training run. However, it operates on a legacy paradigm (Siamese ResNet50) that is now deprecated by the `MASTER_PLAN.md` specification.

## 1. Perception & Preprocessing
*   **Clutter Removal:** Currently uses a pre-trained `fasterrcnn_mobilenet_v3` (`scripts/filter_clutter.py`) to detect and remove images containing "person" or "food" classes to prevent the model from learning irrelevant features.
*   **Bounding Boxes:** Objectron/PACO crops are handled in ingestion scripts (`scripts/preprocess_object_crops.py`).
*   **Master Plan Gap:** The system currently lacks an open-set perception module (like Grounding DINO) to handle text-prompted bounding boxes and category verification.

## 2. Visual Representation & Training
*   **Architecture:** Siamese Neural Network (`src/models/siamese_network.py`).
*   **Backbone:** ResNet50 (from `torchvision`).
*   **Objective Function:** Triplet Margin Loss (via `src/data/triplet_dataset.py` and `scripts/train.py`).
*   **Training Status:** Successfully trained on a custom combined dataset of 9,693 records (PACO + Custom Headphones/Earphones) on a GTX 1650 GPU.
*   **Master Plan Gap:** The Master Plan dictates moving to **DINOv2 (ViT-S/14)** with a frozen backbone and training a custom projection head using **Supervised Contrastive Loss (SupCon)**. The Triplet/ResNet50 setup will be deprecated.

## 3. Retrieval Engine
*   **Index:** FAISS (`src/retrieval/faiss_index.py`).
*   **Status:** Successfully integrated with the FastAPI backend (`src/api/routers/retrieval.py`).
*   **Master Plan Gap:** Currently only supports Image -> Image search. Multimodal text queries (`SigLIP2`) and ranking fusion still need to be built.

## 4. Evaluation
*   **Metrics:** Recall@1/5/10 and MRR are currently implemented (`src/evaluation/metrics.py`). Evaluated via `scripts/evaluate_siamese.py`.
*   **Master Plan Gap:** Lacks open-set evaluation (rejection of unknowns) and a dedicated hard-negative benchmark (visually identical items).

## Conclusion
The repository has a solid engineering foundation (data pipelines, FAISS, PyTorch loops, FastAPI, PostgreSQL). The upcoming milestones will focus on swapping the ResNet50 proxy out for the DINOv2/Grounding DINO architecture defined in the master plan.
