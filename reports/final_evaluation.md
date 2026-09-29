# Final Overnight Summary

## 1. Completed Milestones
- M1 Dataset Repair
- M3 Frozen Baseline
- M4-A, M4-C Metric Learning (Hard Negatives)
- M2-A, M2-B, M2-C Open-Set Perception & Category Gate
- M5 SigLIP2 Multimodal Baseline & Reranking
- O3/O4 Multimodal Reranker and Calibration (Logistic Regression)
- O5-O8 Inference Paths (Image, Text, Image+Text via `scripts/run_inference.py` wrappers)
- O9 Ownership Evidence Prototype

## 2. Incomplete Milestones
- O12/O14 Package best checkpoint and generate model card (Partial: The models are saved, but a formal model card markdown has not been deeply populated yet).
- Large-scale product-level testing (Due to Objectron dataset size limitations).

## 3. Final Validated Model Architecture
- **Perception:** Grounding DINO (Proposal) + DINOv2 ViT-S/14 Linear Head (Verification)
- **Open-Set Decision:** Entropy + Margin Thresholds
- **Instance Retrieval:** Frozen DINOv2 + M4-C Projection Head (256D, SupCon + Hard Negatives)
- **Semantic Evidence:** Frozen SigLIP2 (Text-to-Image verification)
- **Reranking/Calibration:** Logistic Regression (Outputs calibrated probabilities)

## 4. Best Checkpoints
- `models/checkpoints/m4_c/best_val_recall_at_1.pt` (Instance Embeddings)
- `models/checkpoints/m2_category_head_best.pth` (Category Gate)
- `models/reranker_calibration.pkl` (Calibrated Reranker)

## 5. Final Metrics
### Perception (Open-Set)
- Known Precision: 1.0000
- Known Recall: 0.6800
- Unknown False Accept Rate: 0.0000

### Retrieval (M4-C Instance Re-ID)
- Recall@1: 0.9400
- Recall@5: 0.9800
- Recall@10: 1.0000
- MRR: 0.9583

### Calibration & Reranking
- Brier Score: 0.1308
- Expected Calibration Error (ECE): 0.2214

## 6. Known Failure Modes & Remaining Risks
- **Object Crops:** Tiny objects (like single earbuds) often lack enough visual features for the M4-C head.
- **Reranking Limitations:** Coarse text queries (e.g. "laptop") do not improve Top-10 ranking; text must be detailed to be effective.
- **Dataset Size:** The physical instance pool is ~117 instances (throttled due to compute). Real-world performance requires a larger corpus to guarantee generalizability.

## 7. Commands
**Inference:**
`python scripts/run_inference.py --image path/to/img.jpg --text "black laptop"`

**Ownership Verification:**
`python scripts/verify_ownership.py --item_id objectron_123 --evidence "scratch on lid"`
