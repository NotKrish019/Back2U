# M4-D Partial Fine-Tuning Results

## Ablation Table
| Experiment | Backbone | Projection | Loss | Hard-negative sampling | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |
|---|---|---|---|---|---|---|---|---|---|
| M4-C | Frozen DINOv2 | 384->512->256 | SupCon | Top-20 (0.5) | 0.9400 | 1.0000 | 1.0000 | 0.9650 | 0.9617 |
| M4-D | Tuned Block[-1] | 384->512->256 | SupCon | Top-20 (0.5) | 0.9400 | 1.0000 | 1.0000 | 0.9650 | 0.9583 |
