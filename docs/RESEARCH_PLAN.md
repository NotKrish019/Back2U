# Research & Experiment Plan

## Research question

> How effectively can a multimodal metric-learning system retrieve the same physical object instance when the query may contain an image, a vague text description, or both?

## Secondary questions

1. How much does task-specific metric learning improve over frozen pretrained embeddings?
2. How much do local/fine-grained features improve retrieval of visually similar objects?
3. How much does text add when no reference photograph exists?
4. How does multimodal fusion perform relative to single-modality retrieval?
5. How robust is retrieval to viewpoint, lighting, background clutter, blur and partial occlusion?

## Baselines

### B0 — category-only baseline

Use the detector/category prediction to show why category matching is insufficient.

### B1 — pretrained image embedding

Image encoder → embedding → cosine similarity.

### B2 — pretrained image-text embedding

Text encoder + image encoder → shared embedding → retrieval.

## Proposed models

### M1 — Siamese image model

Shared visual backbone + projection head + contrastive/triplet loss.

### M2 — Fine-grained model

Global image representation + local/patch representation + feature fusion.

### M3 — Multimodal retrieval

Image and text branches with a learned fusion/ranking layer.

### M4 — Context-aware ranker (optional)

Visual/text score + normalized time/location compatibility.

Context must be a secondary signal and must not overwhelm strong visual contradictions.

## Evaluation protocol

### Primary retrieval metrics

- Recall@1
- Recall@5
- Recall@10
- mAP when supported by the benchmark

### Additional measurements

- inference latency
- model parameter count
- GPU memory use
- false-match rate on hard negatives

## Critical split rule

If a dataset provides a persistent instance ID, split by **instance**, not by frame. The same physical instance must not appear in both train and test for a generalization experiment.

## Ablation matrix

| Experiment | Image | Text | Local features | Context | Purpose |
|---|---:|---:|---:|---:|---|
| E1 | ✓ | | | | image baseline |
| E2 | ✓ | | ✓ | | test fine-grained features |
| E3 | | ✓ | | | text-only baseline |
| E4 | ✓ | ✓ | | | basic multimodal |
| E5 | ✓ | ✓ | ✓ | | proposed multimodal model |
| E6 | ✓ | ✓ | ✓ | ✓ | optional context-aware system |

## Robustness experiments

Test controlled variations where the data permits:

- viewpoint changes
- brightness/illumination shifts
- background changes
- crop changes
- blur
- partial occlusion
- object scale changes

## Success criteria

Do not set arbitrary accuracy targets before measuring B1.

Use the first baseline as the reference, then define improvement targets based on:

- dataset difficulty
- faculty/project timeline
- available compute
- statistically meaningful differences

## Research reporting

Every experiment must record:

- date
- experiment ID
- dataset/subset
- split
- architecture
- hyperparameters
- training time
- metrics
- best checkpoint
- observations
- failure cases

All results must be reproducible from config + script + checkpoint path.
