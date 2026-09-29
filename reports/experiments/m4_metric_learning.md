# M4-A: Frozen DINOv2 + Projection + SupCon

## Objective
Determine if project-specific metric learning improves physical-instance retrieval beyond frozen DINOv2.

## Dataset
- Train instances: 70 (152 images)
- Val instances: 23 (52 images)
- Test instances: 24 (50 images)

## Configuration
- Model: DINOv2 ViT-S/14 (Frozen) -> Linear(384->512) -> GELU -> Dropout(0.1) -> Linear(512->256) -> L2 Norm
- Loss: SupCon (Temp: 0.1)
- Batching: 8 instances x 2 views per instance
- Optimizer: AdamW (lr: 0.0001, wd: 0.0001)
- Epochs: 10

## Global Test Results
| Metric | Score |
|---|---|
| Recall@1 | 0.9400 |
| Recall@5 | 1.0000 |
| Recall@10 | 1.0000 |
| MRR | 0.9617 |
| mAP | 0.9583 |

## Per-Category Test Results (Recall@1)
| Category | Count | Recall@1 |
|---|---|---|
| bottle | 15 | 1.0000 |
| cup | 4 | 1.0000 |
| laptop | 21 | 0.9048 |
| shoe | 10 | 0.9000 |

## Decision / Next Steps
*(To be determined based on comparison with M3)*
