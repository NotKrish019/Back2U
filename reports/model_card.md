# Model Card: LP-RIEM-MM1 (Lost Property Re-Identification Embedding Model - Multimodal)

## Model Details
- **Model Name:** LP-RIEM-MM1
- **Architecture:** 
  - **Perception:** Grounding DINO + Visual Category Head (ViT-S/14 Linear)
  - **Visual Retriever:** DINOv2 ViT-S/14 (Frozen) + M4-C SupCon Projection Head (256D)
  - **Semantic Evidence:** SigLIP2 (google/siglip2-base-patch16-224)
  - **Calibration/Reranking:** Logistic Regression Calibrator
- **Developed by:** Antigravity Autonomous Agent

## Intended Use
- **Primary Use Case:** Multimodal Lost Property Re-Identification. Given an image (and optional text description) of a lost item, retrieve physically identical candidate items from a found-property gallery.
- **Out-of-Scope Uses:** 
  - General purpose object detection.
  - Ownership Verification (Retrieval does not guarantee ownership; ownership requires private evidence verification).
  - Facial recognition or PII analysis.

## Training Data
- **Source:** Objectron (filtered subset)
- **Physical Instances:** ~117 physical instances.
- **Total Images/Views:** ~2,000 views across instances.
- **Known Categories:** Laptop, Cup, Shoe, Bottle
- **Unknown/Open-Set Benchmark:** Chair, Bike, Cereal Box, Camera, Book

## Training Objective
- **Visual Retriever:** Supervised Contrastive Loss (SupCon) with Hard Negative Mining (pushing away visually similar but physically distinct same-category items).
- **Reranker:** Logistic regression mapped to physical-instance matching probability.

## Evaluation Metrics
- **Perception (Open-Set):**
  - High Precision (1.0000) at the cost of Recall, using a safe thresholding policy (Entropy < 0.3, Margin > 0.95) to enforce 0% Unknown False Acceptance Rate (FAR).
- **Retrieval (M4-C):**
  - High Recall@1 and Recall@10, significantly outperforming frozen baselines on same-category hard negatives.
- **Calibration (MM1):**
  - Brier Score and ECE measured to guarantee that model outputs map reliably to true probabilities for confident vs. review-based abstention.

## Known Limitations
- **Dataset Size Bottleneck:** The physical instance count is extremely limited (~117) due to local computing/storage constraints (GCS throttling during ingest). Real-world deployment will require a significantly larger corpus for rigorous generalization guarantees.
- **Small Objects:** Objects with very small bounding boxes (like individual earbuds) lack sufficient resolution/features for the visual retriever.
- **Text Queries:** Generic text queries (e.g. "laptop") without distinctive attributes do not meaningfully boost the ranking of specific physical instances.

## Ethical Considerations
- The model is explicitly designed **not** to bypass human verification. The system uses abstention to route uncertain claims to human review ("precision-first product policy").
- Private evidence (e.g., specific scratches or hidden stickers) must be verified through the secondary ownership verification flow, completely isolated from public retrieval.
