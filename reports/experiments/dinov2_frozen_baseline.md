# M3: DINOv2 Frozen Baseline

## Objective
Establish a clean, reproducible visual retrieval baseline using DINOv2 ViT-S/14 completely frozen, compared to the ResNet50 baseline.

## Performance/Resource Logging
- **Test Set Size:** 50 instances
- **ResNet50 Inference Time:** 6.13s (8.16 img/s), Dim: 2048
- **DINOv2 Inference Time:** 6.38s (7.84 img/s), Dim: 384

## Global Results
| Metric | ResNet50 (Frozen) | DINOv2 ViT-S/14 (Frozen) | Diff |
|---|---|---|---|
| Recall@1 | 0.9600 | 0.9400 | -0.0200 |
| Recall@5 | 1.0000 | 1.0000 | +0.0000 |
| Recall@10 | 1.0000 | 1.0000 | +0.0000 |
| MRR | 0.9750 | 0.9640 | -0.0110 |
| mAP | 0.9700 | 0.9590 | -0.0110 |

## Per-Category Results (Recall@1)
| Category | Count | ResNet50 | DINOv2 | Diff |
|---|---|---|---|---|
| bottle | 15 | 1.0000 | 1.0000 | +0.0000 |
| cup | 4 | 1.0000 | 1.0000 | +0.0000 |
| laptop | 21 | 0.9048 | 0.8571 | -0.0476 |
| shoe | 10 | 1.0000 | 1.0000 | +0.0000 |
