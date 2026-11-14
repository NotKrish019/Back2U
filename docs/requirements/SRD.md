# Software Requirements Document (SRD)

## 1. System overview

The system is composed of five logical layers:

```text
Frontend
   ↓
Application API
   ↓
Retrieval Orchestrator
   ├── Object Detection / Segmentation
   ├── Visual Encoder
   ├── Text Encoder
   ├── Instance Retrieval Model
   ├── Attribute/Part Module
   └── Multimodal Ranker
   ↓
Vector Index + Metadata Database
```

## 2. Functional requirements

### FR-01 Lost report

The system shall allow a user to submit:

- free-text description
- optional reference image
- approximate loss location
- approximate loss time
- category if known

### FR-02 Found report

The system shall allow a finder to submit:

- image
- approximate found location
- approximate found time
- optional textual description

### FR-03 Object localization

The system shall detect or segment relevant object regions before instance embedding where applicable.

### FR-04 Visual embedding

The system shall produce a vector representation for an object crop.

### FR-05 Text embedding

The system shall produce a vector representation for natural-language descriptions.

### FR-06 Instance retrieval

The system shall compare a query representation against a gallery of found-item representations and return ranked candidates.

### FR-07 Multimodal retrieval

The system shall support a query containing image, text, or both.

### FR-08 Candidate ranking

The ranking layer shall allow multiple evidence sources to contribute to candidate ranking.

### FR-09 Verification

The system shall support an optional private verification flow for top candidates.

### FR-10 Explainability

The system shall expose understandable evidence such as:

- matching object category
- matching attributes
- visual similarity
- contextual agreement

It shall not expose hidden verification attributes to other users.

## 3. Machine-learning requirements

### ML-01 Baseline

Implement at least one pretrained embedding baseline before training a task-specific model.

### ML-02 Metric learning

Implement a trainable instance-retrieval model using a Siamese/dual-encoder style architecture or equivalent metric-learning formulation.

### ML-03 Hard negatives

Training/evaluation shall include visually similar but different physical instances wherever the dataset supports this.

### ML-04 Instance-disjoint evaluation

The evaluation split must avoid leakage of the same physical instance across train and test when measuring instance generalization.

### ML-05 Multimodal model

Implement text-to-image retrieval and image-to-image retrieval, then an image + text fusion or ranking strategy.

### ML-06 Ablation

Compare at least:

1. image-only baseline
2. trained image-only model
3. text-only or image-text baseline
4. multimodal model

### ML-07 Metrics

Primary metrics:

- Recall@1
- Recall@5
- Recall@10
- mAP where appropriate
- Precision@K where appropriate

Secondary metrics:

- inference latency
- model size
- failure rate
- robustness under viewpoint/lighting/occlusion changes

## 4. Data requirements

The initial implementation shall prioritize public datasets. Candidate data sources and roles are documented in `DATASET_STRATEGY.md`.

## 5. Non-functional requirements

### NFR-01 Reproducibility

Every experiment shall have a configuration file and a recorded seed.

### NFR-02 Modularity

Detection, embedding, retrieval, ranking, and API layers shall be replaceable independently.

### NFR-03 Performance

The prototype should support practical single-query inference on student hardware.

### NFR-04 Privacy

Do not expose raw uploaded images publicly. Do not store unnecessary personally identifiable information.

### NFR-05 Observability

The system shall log experiment metadata and application errors without storing sensitive user content unnecessarily.

## 6. Suggested project structure

```text
lost-found-ml/
├── README.md
├── AGENTS.md
├── PRD.md
├── SRD.md
├── IMPLEMENTATION_PLAN.md
├── DATASET_STRATEGY.md
├── RESEARCH_PLAN.md
├── context.md
├── experiments.md
├── configs/
├── data/
│   ├── raw/           # ignored from git
│   ├── interim/       # ignored from git
│   └── processed/     # ignored from git unless tiny metadata is safe
├── notebooks/
├── src/
│   ├── data/
│   ├── detection/
│   ├── embeddings/
│   ├── retrieval/
│   ├── multimodal/
│   ├── evaluation/
│   └── api/
├── tests/
├── scripts/
├── checkpoints/       # ignored from git
└── frontend/
```

## 7. Suggested API contracts

### POST `/v1/index/found-item`

Input:

- image
- metadata

Output:

- item_id
- category
- embedding_id
- extracted attributes

### POST `/v1/search`

Input:

- optional image
- optional text
- optional location/time
- top_k

Output:

- ranked candidate list
- scores
- evidence summary

### POST `/v1/verify`

Input:

- candidate_id
- claimant answers

Output:

- verification outcome
- evidence summary

## 8. RAG boundary

RAG is optional and not part of the core retrieval architecture.

If added, use it only for document-grounded information such as:

- campus lost-and-found rules
- office timings
- claim procedure
- contact information
- privacy/retention policy

RAG must not be used as a substitute for the learned image/text retrieval model.
