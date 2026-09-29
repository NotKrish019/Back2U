# M4-C Hard-Negative Mining Results

## Ablation Table
| Experiment | Backbone | Projection | Loss | Hard-negative sampling | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |
|---|---|---|---|---|---|---|---|---|---|
| M4-A | Frozen DINOv2 | 384->512->256 | SupCon | None (Random) | 0.9400 | 1.0000 | 1.0000 | 0.9617 | 0.9617 |
| M4-C | Frozen DINOv2 | 384->512->256 | SupCon | Top-20 Same-Cat (0.5 ratio) | 0.9400 | 1.0000 | 1.0000 | 0.9650 | 0.9617 |
