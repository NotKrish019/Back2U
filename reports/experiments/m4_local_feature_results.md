# M4-B Local Feature Results

## Ablation Table
| Experiment | Global | Local | Fusion | Hard Negatives | Recall@1 | Recall@5 | Recall@10 | MRR | mAP |
|---|---|---|---|---|---|---|---|---|---|
| M4-C (Baseline) | Yes | No | N/A | Top-20 (0.5) | 0.9400 | 1.0000 | 1.0000 | 0.9650 | 0.9617 |
| M4-B (Global Branch) | Yes | No | N/A | Top-20 (0.5) | 0.9200 | 1.0000 | 1.0000 | 0.9550 | 0.9483 |
| M4-B (Local Branch) | No | Yes | N/A | Top-20 (0.5) | 0.9200 | 1.0000 | 1.0000 | 0.9550 | 0.9500 |
| M4-B (Fused) | Yes | Yes | Alpha=0.25 | Top-20 (0.5) | 0.9000 | 1.0000 | 1.0000 | 0.9450 | 0.9400 |
