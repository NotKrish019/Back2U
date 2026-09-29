
### 2026-09-28 02:22 — M3 / Step 5 — DINOv2 Frozen Baseline

**Change:** Implemented frozen `Dinov2ImageEncoder` (ViT-S/14) and `scripts/run_m3_baseline.py` to evaluate frozen ResNet50 against frozen DINOv2 on our 1,541-image test split.

**Files changed:** `src/embeddings/dinov2_model.py`, `scripts/run_m3_baseline.py`, `reports/experiments/dinov2_frozen_baseline.md`

**Reason:** To establish a clean, reproducible visual retrieval baseline and scientifically evaluate the pretrained visual representation of DINOv2 before fine-tuning.

**Evidence/results:** 
- Both models scored exactly 0.0000 on Recall@1, Recall@5, Recall@10, MRR, and mAP across every single category.
- Investigation revealed this is due to a fatal flaw in the M1 dataset: there is exactly 1 image per instance in the test split (and the entire dataset). Because the evaluation correctly filters out the query image, there are no valid positive matches in the gallery.

**Decision:** investigate why before proceeding. We CANNOT officially adopt DINOv2 or proceed to M4 (metric learning) until the dataset contains positive pairs. SupCon loss will fail if there are no positive pairs to pull together.

**Risks/issues:** The M1 dataset construction (specifically dropping Objectron and treating every PACO/custom image as a unique instance) broke the instance retrieval problem definition.

**Next action:** Revisit M1. We must introduce multi-view data (e.g., Objectron) or redefine instance IDs so that positive pairs exist before we can execute M4.
