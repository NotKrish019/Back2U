# Antigravity Agent Instructions

## Read first

Before doing any implementation work, read these files in order:

1. `README.md`
2. `PRD.md`
3. `SRD.md`
4. `IMPLEMENTATION_PLAN.md`
5. `DATASET_STRATEGY.md`
6. `RESEARCH_PLAN.md`
7. `context.md`

Do not start coding until these have been read.

## Mission

Build a technically substantial **multimodal instance-retrieval system for lost-and-found**, where the application is a thin deployment layer around the ML system.

The primary engineering objective is to learn and evaluate representations that can distinguish **individual physical instances**, not merely object categories.

## Non-negotiable principles

### 1. ML-first

Do not optimize for UI polish before the ML baseline and evaluation pipeline work.

### 2. No fake AI

Do not use Gemini/OpenAI/other hosted APIs as the core matching model.

External APIs may be used for genuinely peripheral utilities only, and only after documenting why they are needed.

### 3. No unsupported claims

Do not claim the system identifies the exact object unless the evaluation protocol supports that claim.

Prefer wording such as:

- `candidate match`
- `retrieval score`
- `top-k retrieved candidates`
- `ownership verification confidence`

### 4. Reproducibility

Every training experiment must record:

- dataset version/subset
- split strategy
- random seed
- model/backbone
- frozen/unfrozen layers
- image size
- batch size
- learning rate
- optimizer
- loss
- epochs
- hardware
- metrics
- checkpoint path

### 5. Prevent data leakage

Never create a train/test split that places different frames or near-duplicate views of the **same physical instance** into both train and test when the purpose is to test instance generalization.

Prefer instance-disjoint splits where possible.

### 6. Baseline first

Before proposing an improvement, implement and measure a simple baseline.

Examples:

- pretrained image encoder + cosine similarity
- off-the-shelf text/image embedding baseline

### 7. Incremental development

Complete one plan step at a time.

At the end of every step:

1. Run tests/checks.
2. Record results.
3. Update `context.md`.
4. Record any new decision or deviation.
5. Only then move to the next step.

### 8. `context.md` is mandatory project memory

`context.md` must be updated after:

- every completed implementation step
- every feature addition/change
- every architecture change
- every dataset addition/removal
- every preprocessing change
- every training change
- every evaluation change
- every important bug fix
- every scope decision

Each update should include:

- date/time
- what changed
- files changed
- why it changed
- evidence/results
- new risks/issues
- next action

### 9. Don't download massive datasets blindly

First inspect metadata, category coverage, license/access conditions, and approximate disk requirements. Download only the subset necessary for the current milestone.

### 10. Keep RAG separate from visual retrieval

Do not describe vector similarity over image/text embeddings as “RAG”.

If RAG is later added, it must be a separate module for static text knowledge such as campus policy, reporting instructions, or FAQ content. It must not replace the trained multimodal retrieval model.

## Preferred implementation style

- Python
- PyTorch
- torchvision / timm where appropriate
- Hugging Face Transformers where appropriate
- OpenCV / Pillow
- NumPy / pandas
- scikit-learn for classical baselines and metrics
- FAISS or pgvector for nearest-neighbour retrieval
- FastAPI for model API
- PostgreSQL/SQLite for application metadata depending on scale
- React/Next.js for frontend only after ML core stabilizes

Use the smallest dependency set that satisfies the task.

## Compute-aware rule

Assume student-level hardware unless the user explicitly provides better compute.

Prefer:

- pretrained backbones
- frozen backbone + trainable projection head initially
- mixed precision when stable
- smaller image resolutions for iteration
- sampled/filtered dataset subsets
- gradient accumulation when needed

Do not start with full-model training from random initialization.

## Security/privacy defaults

- Never expose hidden ownership-verification attributes publicly.
- Do not store biometric data; facial recognition is out of scope.
- Avoid collecting unnecessary personal data.
- Keep uploaded photos and descriptions private by default.
- Do not log raw user descriptions in production logs.

## Definition of a good implementation

A feature is not complete merely because it runs. It must have:

- implementation
- test/check
- measurable outcome where applicable
- documentation
- `context.md` update

## If requirements conflict

Use this priority:

1. Correctness and evaluation validity
2. Data/license compliance
3. Reproducibility
4. ML quality
5. System reliability
6. UX polish

## Never do

- Do not invent dataset fields that do not exist.
- Do not silently change the problem definition.
- Do not replace the trained model with an API without explicit approval.
- Do not report fabricated metrics.
- Do not use random web images as training data without checking usage rights.
- Do not add RAG just because retrieval exists.
- Do not merge train and test instances to inflate results.
