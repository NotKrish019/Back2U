# M2-B Visual Category Head + Category Gate

## Objective
Build a lightweight visual category classifier that provides an independent second opinion for category recognition, in order to address Grounding DINO's missed valid objects (P1 failures), while preserving precision.

## Experimental Setup
- **Dataset**: `train_split.jsonl` (Train), `val_split.jsonl` (Val), `test_split.jsonl` (Test).
- **Categories**: laptop, cup, shoe, bottle (Note: book and camera were excluded because they lacked training samples).
- **Training Samples**: 152 instances (laptop: 43, cup: 41, bottle: 36, shoe: 32).
- **Validation Samples**: 52 instances.
- **Test Samples**: 70 instances (50 known targets + 20 unknown "chair" objects).
- **Architecture**: Frozen DINOv2 ViT-S/14 (384-D) -> Linear(384, 128) -> GELU -> Dropout(0.1) -> Linear(128, 4).
- **Loss**: Weighted CrossEntropyLoss (to account for slight class imbalance).
- **Optimizer**: AdamW (lr=1e-3).

## Metrics

| Configuration | Precision | Recall | F1 Score | Unknown False Accept Rate (FAR) |
|---------------|-----------|--------|----------|---------------------------------|
| **A: Grounding DINO** | 0.9574 | 0.9000 | 0.9278 | 0.4000 (8/20) |
| **B: Visual Classifier** | 1.0000 | 1.0000 | 1.0000 | 1.0000 (20/20) |
| **C: Combined Gate** | 1.0000 | 0.9600 | 0.9796 | 0.2500 (5/20) |

## Decision
**Keep the Combined Category Gate.** 
Combining the two independent signals successfully improved Recall (from 90.00% to 96.00%) by correctly recovering objects that Grounding DINO missed (using the `CATEGORY_CANDIDATE_FROM_VISUAL_MODEL` fallback). Furthermore, the Category Gate improved Precision to 1.0000 (correcting Grounding DINO's false positives) and significantly reduced the False Acceptance Rate on unknown objects (chairs) down to 25.00%.

The visual classifier alone is incapable of rejecting unknowns (FAR = 100%), and Grounding DINO alone struggled with recall (90%). The combined logic perfectly leverages the strengths of both layers.
