# Model Card: LP-RIEM-MM2 (Lost Property Re-Identification & Multimodal Matching Pipeline)

## Model Details
- **Pipeline Identifier:** LP-RIEM-MM2 (Stabilized Production Pipeline)
- **Architecture Components:**
  - **Visual Retriever (Primary Baseline):** SigLIP2 (`google/siglip2-base-patch16-224`, 1152-d pooled embeddings, L2 normalized)
  - **Visual Retriever (Auxiliary/Fusion):** DINOv2 ViT-S/14 (`facebook/dinov2-small`, 384-d pooled embeddings) + Trained M4-C SupCon Projection Head (256-d)
  - **Category Perception & Gate:**
    - Primary: SigLIP2 zero-shot classification across 7 canonical categories + `other` (92.9% test accuracy)
    - Fallback/Auxiliary: Repaired Multi-Class M2 linear classification head over DINOv2 CLS tokens (`models/checkpoints/m2_category_head.pth`, 90.32% test accuracy)
  - **Object Localization:** Grounding DINO (tiny), zero-shot open-vocabulary detection. Default production policy is `full_image` with confidence-gated crop fallback.
  - **Multimodal Reranker & Calibrator:** 4D feature logistic regression calibrator (`models/reranker_calibration_v2.pkl` and `models/reranker_calibration.pkl`)
- **Developed by:** Back2U ML Engineering Team

---

## Intended Use
- **Primary Use Case:** Multimodal Lost Property Instance Re-Identification. Given an image (and optional text description) of a lost item, retrieve physically identical candidate items from a found-property gallery across diverse camera angles, lighting conditions, and backgrounds.
- **Out-of-Scope Uses:**
  - General-purpose object detection or video tracking.
  - Ownership Verification (Retrieval suggests candidate matches; ownership verification requires private evidence verification).
  - Biometric identification, facial recognition, or PII analysis.

---

## Training & Calibration Data
- **Datasets:**
  - **Objectron Multi-View Dataset:** 553+ frames across 139 physical instances partitioned into instance-disjoint splits:
    - `train_split.jsonl`: 152 items (70 distinct physical instances)
    - `val_split.jsonl`: 52 items (23 distinct physical instances)
    - `test_split.jsonl`: 50 items (24 distinct physical instances)
    - Cross-split identity leakage: 0 instances.
  - **CO3D (Common Objects in 3D):** Multi-view circular captures of everyday instances.
- **Canonical Categories:**
  - `laptop`, `mobile phone`, `wallet`, `earphones`, `headphones`, `keys`, `book`, and open-set `other`.

---

## Training & Calibration Objectives
1. **Category Head (M2 Retraining):** Cross-entropy loss over 384-d DINOv2 CLS representations across all canonical categories present in the training corpus.
2. **Instance Retriever (M4-C):** Supervised Contrastive Loss (SupCon) with hard-negative mining over physical instance IDs.
3. **Multimodal Reranker (4D Logistic Regression):** Calibrates a 4-dimensional vector `[siglip_img_sim, dino_img_sim, text_sim, text_missing]` to true posterior match probability:
   $$z = 7.8702 \cdot s_{\text{siglip}} + 9.6108 \cdot s_{\text{dino}} - 0.9549 \cdot s_{\text{text}} - 0.1049 \cdot \mathbb{I}_{\text{text\_missing}} - 12.8549$$
   $$P(\text{Match}) = \frac{1}{1 + e^{-z}}$$

---

## Quantitative Evaluation Metrics

### 1. Instance Retrieval Performance (50 Held-Out Multi-View Test Queries)

| Pipeline Configuration | Input Mode | Recall@1 | Recall@5 | Recall@10 | MRR |
|---|---|---:|---:|---:|---:|
| **SigLIP2 Alone (Primary)** | **Full image** | **0.9400** | **0.9800** | **1.0000** | **0.9583** |
| SigLIP2 + DINOv2 Score Fusion | Full image | **0.9600** | **0.9800** | **1.0000** | **0.9700** |
| Raw DINOv2 ViT-S/14 | Full image | 0.6800 | 0.8800 | 0.9400 | 0.7783 |
| Trained M4-C Projection Head | Full image | 0.6000 | 0.8000 | 0.8600 | 0.6888 |
| Trained M4-C Projection Head | Detector crop | 0.5400 | 0.7600 | 0.8200 | 0.6402 |

### 2. Category Classification Accuracy (155 Multi-View Images)

| Classifier Approach | Overall Accuracy | Canonical Precision | Open-Set `other` Precision |
|---|---:|---:|---:|
| **Option A: SigLIP2 Zero-Shot (Primary)** | **92.90%** (144/155) | 0.93 | 1.00 |
| **Option B: Multi-Class M2 Head (Retrained)** | **90.32%** (140/155) | 0.90 | N/A (closed set) |
| Buggy M2 Baseline (`laptop`/`Laptop` only) | 16.13% (25/155) | 0.16 | 0.00 |

### 3. Reranker Calibration (1,000 Independent Test Candidate Pairs)

| Metric | Legacy 2D Reranker | Repaired 4D Reranker | Improvement |
|---|---:|---:|---|
| **ROC-AUC** | 0.8120 | **0.9801** | +0.1681 (+20.7%) |
| **Brier Score** | 0.1308 | **0.0359** | -0.0949 (-72.6% error) |
| **Genuine Match Acceptance** | 1.9% | **75.0%** | +73.1% absolute |
| **Genuine Match Rejection** | 19.0% | **3.6%** | -15.4% reduction |
| **Missing-Text Bias** | Heavy Penalty | **Zero Penalty** | Handled via indicator flag |

---

## Operational Latency Profile (CPU Benchmark)

| Stage | Latency | Share | Production Optimization |
|---|---:|---:|---|
| Grounding DINO Detection | 25,674.3 ms | 93.1% | Bypassed in default full-image mode |
| SigLIP2 Image Encoding | 852.1 ms | 3.1% | Primary production visual path |
| Category Classification | 784.5 ms | 2.8% | Runs concurrently or lazily |
| M4-C Projection Embedding | 254.3 ms | 0.9% | Used when multi-head fusion enabled |
| FAISS Cosine Search | 0.03 ms | <0.01% | Microsecond sub-index search |
| 4D Calibrated Reranking | 0.004 ms | <0.01% | Instant vector arithmetic |
| **Total Query Latency (Full Image)** | **~852 ms** | **100%** | **Interactive Sub-Second Response** |

---

## Checkpoint Paths
- Primary Calibrated Reranker: `models/reranker_calibration_v2.pkl` (mirrored to `models/reranker_calibration.pkl`)
- Repaired M2 Multi-Class Category Head: `models/checkpoints/m2_category_head.pth`
- Category Metadata: `data/processed/m2_categories.json`
- M4-C Metric Learning Head: `models/checkpoints/m4_c/best_val_recall_at_1.pt`

---

## Ethical & Safety Considerations
1. **Precision-First Review:** The model abstains from automatic claiming. Matches between `REJECT_PROB` (0.15) and `CANDIDATE_PROB` (0.65) are flagged for human staff review.
2. **Private Evidence Separation:** Public retrieval indexes visual features and generic descriptions. Private ownership verification (serials, secret scratches) remains strictly confidential in backend workflows.
