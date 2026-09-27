# M3: DINOv2 Frozen Baseline

## Objective
Establish a clean, reproducible visual retrieval baseline using DINOv2 ViT-S/14 completely frozen, compared to the ResNet50 baseline.

## Performance/Resource Logging
- **Test Set Size:** 1541 instances
- **ResNet50 Inference Time:** 89.44s (17.23 img/s), Dim: 2048
- **DINOv2 Inference Time:** 104.30s (14.77 img/s), Dim: 384

## Global Results
| Metric | ResNet50 (Frozen) | DINOv2 ViT-S/14 (Frozen) | Diff |
|---|---|---|---|
| Recall@1 | 0.0000 | 0.0000 | +0.0000 |
| Recall@5 | 0.0000 | 0.0000 | +0.0000 |
| Recall@10 | 0.0000 | 0.0000 | +0.0000 |
| MRR | 0.0000 | 0.0000 | +0.0000 |
| mAP | 0.0000 | 0.0000 | +0.0000 |

## Per-Category Results (Recall@1)
| Category | Count | ResNet50 | DINOv2 | Diff |
|---|---|---|---|---|
| book | 14 | 0.0000 | 0.0000 | +0.0000 |
| bottle | 14 | 0.0000 | 0.0000 | +0.0000 |
| calculator | 8 | 0.0000 | 0.0000 | +0.0000 |
| cellular_telephone | 202 | 0.0000 | 0.0000 | +0.0000 |
| cup | 13 | 0.0000 | 0.0000 | +0.0000 |
| earphone | 51 | 0.0000 | 0.0000 | +0.0000 |
| handbag | 11 | 0.0000 | 0.0000 | +0.0000 |
| headphones | 1164 | 0.0000 | 0.0000 | +0.0000 |
| laptop_computer | 11 | 0.0000 | 0.0000 | +0.0000 |
| mug | 14 | 0.0000 | 0.0000 | +0.0000 |
| shoe | 13 | 0.0000 | 0.0000 | +0.0000 |
| wallet | 12 | 0.0000 | 0.0000 | +0.0000 |
| watch | 14 | 0.0000 | 0.0000 | +0.0000 |

## Required Analysis

**1. Whether DINOv2 improves over ResNet50:**
Neither model improves over the other; both score exactly `0.0000` on all metrics. 

**2. Which categories improve:**
None.

**3. Which categories remain difficult:**
All categories remain impossible to solve.

**4. Whether errors are primarily:**
The errors are primarily **dataset construction issues (lack of positive pairs)**. The test split contains exactly 1,541 images, and an analysis of the manifest reveals there is exactly 1 image per `instance_id`. Because the evaluation protocol correctly filters out the query image itself (`image_path != query_image_path`), there are zero ground-truth positive matches available in the gallery. Thus, Recall@K is mathematically capped at 0.

**5. Whether same-category hard negatives remain difficult:**
Because there are no true positives, the models exclusively retrieve same-category hard negatives (which are penalized as incorrect), making them infinitely difficult under the current data regime.

## Required Decision

**Decision:** investigate why before proceeding

**Rationale:** We cannot make a data-driven decision to adopt DINOv2 based on these metrics. While DINOv2 may be a stronger foundation model in theory, the current M1 canonical dataset is fundamentally broken for metric learning (instance retrieval) because it consists exclusively of single-image instances (no positive pairs). Before we can train a custom projection head (M4) using SupCon loss (which *requires* positive pairs to pull together), we must revisit M1 and ingest multi-view datasets (e.g., Objectron) or adjust our parsing to ensure multiple images per instance exist.
