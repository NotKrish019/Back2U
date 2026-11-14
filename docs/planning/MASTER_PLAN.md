# MASTER PLAN — Multimodal Lost Property Re-Identification & Ownership Verification

**Document:** `MASTER_PLAN.md`  
**Version:** 1.0  
**Status:** Authoritative execution roadmap + technical handover  
**Date:** 2026-09-28  
**Executor:** Antigravity  
**North Star:** Build a precision-first, multimodal, instance-aware lost-property recovery engine that can abstain when evidence is insufficient.

---

# 0. HOW TO USE THIS DOCUMENT

This file is the **master execution contract** for the project.

Antigravity must read, in this order:

1. `context.md` — current live project state
2. This `MASTER_PLAN.md` — execution order, gates and non-negotiable rules
3. The detailed technical handover in **Part II** — architecture and implementation specification
4. Existing source code/tests before modifying anything

`context.md` is the live memory. This document is the master plan. Existing source files remain the implementation source of truth.

The project is not considered complete because code exists. A milestone is complete only when its **exit criteria are measured and documented**.

---

# 1. NORTH STAR

The target system is:

```text
USER QUERY
(image / text / both)
       |
       v
OPEN-SET PERCEPTION
       |
       v
CATEGORY GATE
(confidence + agreement + abstention)
       |
       v
INSTANCE ENCODER
(DINOv2 + custom projection)
       |
       +--------------------+
       |                    |
   GLOBAL FEATURES      LOCAL FEATURES
       |                    |
       +---------+----------+
                 |
                 v
         INSTANCE EMBEDDING
                 |
                 v
              FAISS
                 |
                 v
          TOP-K CANDIDATES
                 |
                 v
         MULTIMODAL RERANKER
     visual + text + attributes
           + optional context
                 |
                 v
        CALIBRATED DECISION
                 |
          +------+------+
          |             |
       confident      uncertain
          |             |
          v             v
   candidate/claim   abstain/review
          |
          v
 OWNERSHIP EVIDENCE
          |
          v
       HANDOVER
```

The system must answer four separate questions:

```text
1. WHAT is this object?
2. WHICH physical instance is it?
3. HOW confident is the system?
4. WHAT evidence supports the ownership claim?
```

Do not merge these into one model output or one unexplained score.

---

# 2. THE ARCHITECTURAL PARADIGM SHIFT

The project is **not** primarily an object-classification system.

The important task is:

```text
OBJECT RECOGNITION
"This is a phone."

versus

INSTANCE RE-IDENTIFICATION
"This is the same physical phone as item #137."
```

The detector/perception model is therefore a **gate**, not the project's entire brain.

The core ML contribution is the chain:

```text
category-aware perception
+
instance metric learning
+
hard-negative discrimination
+
multimodal retrieval
+
uncertainty calibration
+
ownership evidence
```

---

# 3. RESOURCE CONTRACT

## 3.1 Storage

```text
Processed training corpus target: 5–6 GB
Hard cap: ~6 GB
```

The project must optimize:

> **useful learning signal per GB**

not raw image count.

## 3.2 Compute

Assume:

- student-level GPU/CPU resources
- no multi-GPU cluster
- no mandatory cloud
- limited VRAM
- training time matters

Use:

- frozen-backbone caching
- mixed precision where available
- configurable batch size
- gradient accumulation
- checkpoint resume
- early stopping

## 3.3 Data philosophy

Do not blindly target `500–1000 images/category`.

Prioritize:

```text
unique physical instances
+
viewpoint diversity
+
appearance diversity
+
background diversity
+
hard negatives
+
annotation quality
```

---

# 4. FROZEN ARCHITECTURAL DECISIONS

These decisions should not be reversed without evidence and a `context.md` entry.

### AD-001 — Separate perception from re-identification

Detector answers **what**. Metric encoder answers **which physical object**.

### AD-002 — Use pretrained perception

Do not train a giant detector from scratch as the project's primary contribution.

### AD-003 — Custom training belongs in the embedding system

Train the domain-specific instance representation, projection heads, hard-negative strategy and ranking/calibration components.

### AD-004 — Keep the real corpus small

The final processed corpus is capped at approximately 6 GB.

### AD-005 — Preserve an unknown/uncertain state

Forced classification is prohibited.

### AD-006 — Matching is not ownership proof

Visual similarity produces candidates. Private evidence supports ownership verification.

### AD-007 — Context is a prior

Time/location may affect ranking but cannot override strong visual contradiction.

### AD-008 — RAG is not core

RAG may later support policy/FAQ/help information, not the ML retrieval engine.

---

# 5. COMPETITIVE DIFFERENTIATOR — WHAT WE ARE ACTUALLY BUILDING

Do not market the project simply as:

> AI-powered lost and found.

That is too generic. Commercial and campus-oriented systems already advertise AI matching, image analysis, text search, notifications, QR/OTP workflows, verification and audit features.

The defensible project-level distinction is:

> **Instance-Aware Evidence Matching**

The system deliberately combines:

```text
open-set perception
+
physical-instance re-identification
+
local distinctive-feature representation
+
hard-negative learning
+
multimodal image/text agreement
+
calibrated uncertainty
+
explicit abstention
+
private ownership evidence
```

The key product behavior is:

> **Prefer an honest uncertain result over a confident wrong registration.**

Do not claim that no other product anywhere uses similar techniques. The project differentiator is the specific ML architecture and evaluation framework being implemented here.

---

# 6. MASTER EXECUTION MAP

The original 13-step list is reorganized into gated milestones so that Antigravity cannot add complexity without evidence.

```text
M0  Repository + contracts frozen
 |
 v
M1  Data selection + 5–6 GB corpus
 |
 v
M2  Perception benchmark
 |
 v
M3  DINOv2 frozen baseline
 |
 v
M4  Custom metric-learning model
 |
 v
M5  Hard-negative mining
 |
 v
M6  Open-set category gate + abstention
 |
 v
M7  Multimodal text/image retrieval
 |
 v
M8  Reranking + calibration
 |
 v
M9  Ownership evidence
 |
 v
M10 Final evaluation + ablation
 |
 v
M11 Product/API integration
 |
 v
M12 Final demo + technical package
```

Every milestone has:

```text
objective
inputs
implementation
tests
metrics
exit gate
context.md update
```

---

# 7. M0 — REPOSITORY + CONTRACTS FROZEN

## Objective

Understand the actual repository before changing it.

## Required inspection

```text
context.md
src/
scripts/
tests/
requirements.txt
experiments.md
.gitignore
```

## Deliverables

```text
reports/architecture/current_ml_architecture.md
reports/architecture/ml_design_decisions.md
```

## Required checks

- existing schema understood
- existing adapters understood
- existing split logic understood
- existing FAISS implementation understood
- existing baseline reproducible
- no duplicate pipeline introduced

## Exit gate

```text
[ ] baseline test suite passes
[ ] current data flow documented
[ ] current experiment state documented
[ ] no schema break introduced
```

---

# 8. M1 — DATA SELECTION + 5–6 GB CORPUS

## Objective

Construct the smallest useful real-world training corpus.

## Dataset responsibilities

### Objectron

Use primarily for:

- same-instance multi-view positives
- viewpoint invariance
- physical-object representation

### PACO-LVIS

Use primarily for:

- natural scenes
- attribute variation
- segmentation/crops
- different physical instances
- hard negatives

### COIL-100

Use only for:

- smoke tests
- retrieval implementation validation

### Objects365

Optional only when a genuine category gap justifies it.

## Initial Tier A categories

```text
mobile phone
laptop
book
bottle
cup / mug
shoe
wallet
handbag
earphone
calculator
camera
watch
```

Tier B is added only after Tier A evaluation:

```text
backpack
slipper
computer mouse
remote control
pouch
hat
helmet
pen
pencil
scarf
sweater
```

## Selection objective

Use configurable weighted criteria. Initial weights:

```text
instance diversity       0.30
view diversity           0.20
appearance diversity     0.15
background diversity     0.15
hard-negative value      0.10
annotation quality       0.10
```

These are tunable starting values.

## Storage gate

Before downloading large image volumes, generate:

```text
reports/data_selection/storage_estimate.md
```

The processed corpus must remain <= configured hard cap.

## Exit gate

```text
[ ] all source category mappings verified
[ ] selected subset manifest exists
[ ] estimated processed corpus <=6 GB
[ ] source provenance preserved
[ ] instance-aware split plan exists
```

---

# 9. M2 — PERCEPTION BENCHMARK

## Objective

Determine whether custom category-detector training is actually necessary.

## Create a curated benchmark

Use approximately 100–300 evaluation images including:

- easy cases
- clutter
- poor lighting
- occlusion
- small objects
- multiple similar categories
- unknown objects

Keep this benchmark independent of model-training data.

## Compare

At minimum, compare:

```text
existing/current detector
pretrained detector
open-vocabulary detector such as Grounding DINO
```

Do not assume one will win. Measure it.

## Failure decomposition

Tag each failure:

```text
P1 no proposal
P2 wrong box
P3 wrong category
P4 uncertain category
P5 small-object failure
P6 occlusion failure
P7 background confusion
```

## Special diagnostic cases

### Book

Determine whether the failure is:

```text
detection
classification
crop
```

### Phone

Determine whether generic rectangular shape is causing confusion.

### Earphone

Inspect scale, crop, and segmentation quality.

## Exit gate

The repository must contain evidence for one of:

```text
PRETRAINED PERCEPTION IS SUFFICIENT
```

or:

```text
TARGETED FINE-TUNING IS JUSTIFIED
```

Do not train a new detector merely because the project uses ML.

---

# 10. M3 — DINOv2 FROZEN INSTANCE BASELINE

## Objective

Establish a strong visual retrieval baseline before custom training.

Use:

```text
DINOv2 ViT-S/14
```

Initial state:

```text
backbone = frozen
```

## Representation

Extract:

```text
global feature = CLS token
local feature = pooled patch tokens
```

Initial projections:

```text
384 -> 512 -> 256
```

for both global/local branches where compatible.

L2-normalize vectors.

## Fusion

```text
visual = alpha * global + (1-alpha) * local
```

Tune `alpha` on validation data.

## Compare against

```text
existing ResNet50 baseline
```

## Exit gate

Measure:

```text
Recall@1
Recall@5
Recall@10
MRR
mAP
```

plus per-category results.

---

# 11. M4 — CUSTOM METRIC LEARNING

## Objective

Train the project's main custom ML component.

## Primary loss

Start with:

```text
Supervised Contrastive Loss
```

## Positive definition

Strongest source:

```text
same physical Objectron instance
but different views
```

Do not manufacture identities that do not exist in metadata.

## Negative definition

Prioritize:

```text
different physical instance
same category
```

before trivial cross-category negatives.

## Auxiliary category head

Train:

```text
embedding -> category logits
```

using cross-entropy as a secondary objective.

## Compute strategy

Start with:

```text
DINOv2 frozen
projection heads trainable
```

Cache frozen backbone outputs where practical.

## Exit gate

Custom model must be compared against both:

```text
ResNet50 baseline
DINOv2 frozen baseline
```

If it does not improve, diagnose rather than simply extending training.

---

# 12. M5 — HARD-NEGATIVE MINING

## Objective

Teach the model:

```text
same category != same physical instance
```

## Hard-negative process

```text
TRAIN embeddings
      |
      v
nearest wrong instances
      |
      v
same-category filtering
      |
      v
hard-negative batch construction
      |
      v
retraining
```

Examples:

```text
black phone A vs black phone B
black wallet A vs black wallet B
white shoe A vs white shoe B
silver laptop A vs silver laptop B
```

## Leakage rule

Hard-negative mining must never use test labels to construct training data.

## Exit gate

Dedicated benchmark must show whether hard-negative performance improves.

---

# 13. M6 — OPEN-SET CATEGORY GATE + ABSTENTION

## Objective

Prevent wrong automatic registration.

The system must support:

```text
KNOWN
UNKNOWN
UNCERTAIN
```

## Evidence sources

Potential signals:

```text
detector confidence
visual category head
SigLIP category semantic score
```

## Behavior

Example of agreement:

```text
detector      -> book 0.91
category head -> book 0.88
semantic      -> book 0.93
```

→ accept as known category, subject to calibration.

Example of disagreement:

```text
detector      -> book 0.62
category head -> phone 0.58
semantic      -> phone 0.63
```

→ `CATEGORY_UNCERTAIN`.

## Unknown benchmark

Use non-target objects to test rejection.

Measure:

```text
unknown rejection rate
false acceptance
known precision
known recall
```

## Exit gate

No automatic registration until unknown handling and threshold behavior are validated.

---

# 14. M7 — MULTIMODAL RETRIEVAL

## Objective

Support:

```text
image -> image
text -> image
image + text -> image
```

## Text/image model

Use a suitable SigLIP2 checkpoint initially frozen.

## Image-only

Primary:

```text
custom instance embedding
```

Secondary:

```text
semantic image embedding
```

## Text-only

Use:

```text
text -> found image similarity
```

## Image + text

Create feature vector containing:

```text
visual_similarity
text_image_similarity
category_agreement
attribute_agreement
```

Add context later.

## Multi-image query

Baseline:

```text
normalized weighted mean
```

of image embeddings.

Do not build an attention transformer first.

## Exit gate

Report image-only, text-only and multimodal results separately.

---

# 15. M8 — RE-RANKING + CALIBRATION

## Objective

Convert multiple evidence signals into a trustworthy ranking/decision.

## Initial feature vector

```text
visual_similarity
text_image_similarity
category_match
color_match
material_match
pattern_match
location_compatibility
time_compatibility
```

## Ranker

Start with:

```text
logistic regression
```

or a very small MLP.

Do not start with a large generative re-ranker.

## Context policy

Context is a prior.

It must never overpower severe visual mismatch.

## Calibration

Raw similarity is not probability.

Start with:

```text
logistic calibration
```

Compare against isotonic regression only if justified.

## Category-specific thresholds

Where enough validation data exists, calibrate thresholds per category.

## Precision-first gate

Suggested engineering target:

```text
>=98% precision
```

for the dedicated high-confidence automatic-action benchmark.

This is a project target, not a guaranteed outcome.

If it cannot be achieved reliably:

```text
manual review
```

is the correct system behavior.

---

# 16. M9 — OWNERSHIP EVIDENCE

## Objective

Separate:

```text
candidate retrieval
```

from:

```text
ownership verification
```

## Public information

Potentially safe:

```text
category
general color
approximate date
approximate location
safe/blurred image
```

## Private information

Potentially protected:

```text
specific sticker location
specific scratch
hidden marking
owner description
private serial/model information
```

Only use information actually supplied by the legitimate owner or obtained through the authorized workflow.

## Process

```text
retrieval candidate
      |
      v
claim
      |
      v
private evidence request
      |
      v
evidence consistency
      |
      v
staff/system verification
      |
      v
handover
```

Visual similarity alone is never ownership proof.

---

# 17. M10 — FINAL EVALUATION + ABLATION

## Retrieval metrics

```text
Recall@1
Recall@5
Recall@10
MRR
mAP
```

## Category metrics

```text
precision
recall
F1
confusion matrix
false-positive rate
false-negative rate
```

## Open-set metrics

```text
unknown rejection
false acceptance
AUROC where appropriate
```

## Calibration metrics

```text
Brier score
ECE
calibration curves
precision at operating threshold
coverage vs precision
```

## Hard-negative metrics

```text
Top-1
Top-5
false-match rate
```

## Required ablation ladder

```text
A ResNet50 baseline
B DINOv2 frozen
C DINOv2 + projection + SupCon
D C + hard negatives
E D + local features
F E + SigLIP2
G F + learned re-ranker
H G + context
```

The project must be able to explain which component actually improved which metric.

---

# 18. M11 — PRODUCT/API INTEGRATION

Only integrate after ML interfaces are stable.

Recommended endpoints:

```text
POST /match/image
POST /match/text
POST /match/multimodal
```

Expected decision states:

```text
NO_OBJECT
UNKNOWN_CATEGORY
CATEGORY_UNCERTAIN
NO_RELIABLE_MATCH
CANDIDATE_MATCHES
HIGH_CONFIDENCE_CANDIDATE
OWNERSHIP_REVIEW
VERIFIED_RETURN
```

No fake probabilities or hardcoded scores.

---

# 19. M12 — FINAL DEMO + TECHNICAL PACKAGE

Demonstrate at minimum:

### Demo A — same item, different view

The same physical object should retrieve across viewpoints.

### Demo B — hard negative

Two visually similar objects of the same category must be separated.

### Demo C — vague text

Example:

```text
"black leather wallet with a small silver logo"
```

### Demo D — image + text

Show whether multimodal evidence improves/changes ranking.

### Demo E — unknown object

A chair or unrelated object should be rejected as unknown rather than forced into a target class.

### Demo F — ownership evidence

A retrieved candidate must require additional private evidence before handover.

---

# 20. DATASET GOVERNANCE RULES

## Never

- download the entire source datasets
- exceed the ~6 GB processed cap without a documented exception
- randomly split images from the same physical instance
- invent physical-instance IDs
- treat PACO images as same-instance positives without genuine identity linkage
- use test information for hard-negative mining
- retain unnecessary full-resolution duplicates
- silently discard large amounts of data

## Always

- preserve source provenance
- maintain stable IDs
- validate image integrity
- validate split leakage
- document storage estimates
- document category selection reasons
- hash manifests/configs where practical

---

# 21. FAILURE-DRIVEN WORKFLOW

When a result is poor:

```text
OBSERVE
  ↓
CLASSIFY FAILURE
  ↓
LOCATE SYSTEM LAYER
  ↓
FORM HYPOTHESIS
  ↓
CHANGE ONE MAJOR VARIABLE
  ↓
RUN CONTROLLED EXPERIMENT
  ↓
MEASURE
  ↓
DOCUMENT
```

Do not use:

```text
poor result
  ↓
add more random images
```

as the default response.

---

# 22. FAILURE TAXONOMY

Use these labels consistently:

```text
F1 object not detected
F2 wrong category
F3 correct category / wrong instance
F4 correct instance outside Top-K
F5 correct match rejected
F6 false positive
F7 text semantic mismatch
F8 context overweighted
F9 data/annotation issue
```

This taxonomy must appear in error-analysis reports.

---

# 23. COMPUTE-SAVING POLICY

Whenever the backbone is frozen:

```text
raw image
  ↓
backbone
  ↓
cache features
  ↓
train lightweight heads
```

Do not recompute expensive frozen features unnecessarily.

Progressive unfreezing:

```text
frozen
  ↓
last block
  ↓
last 2 blocks
```

Only continue if validation evidence justifies the extra compute.

Never unfreeze the whole backbone by default.

---

# 24. EXPERIMENT CONTROL

Every experiment requires:

```text
experiment_id
timestamp
git_commit
dataset_manifest_hash
config_hash
seed
model
loss
learning_rate
batch_size
epochs
freeze_state
metrics
checkpoint
notes
```

Recommended registry:

```text
reports/experiments/experiment_registry.csv
```

No important experiment result should exist only in terminal output.

---

# 25. REPRODUCIBILITY CONTRACT

A reported result must be reproducible from:

```text
code version
+
dataset manifest
+
configuration
+
seed
+
checkpoint
```

Use deterministic seeds wherever practical and document unavoidable nondeterminism.

---

# 26. CONTEXT.MD CHANGE-CONTROL RULE

`context.md` is mandatory live project memory.

After EVERY:

- implementation step
- model change
- dataset change
- architecture change
- experiment
- threshold change
- bug fix
- feature change
- scope decision
- evaluation change

update it.

Use:

```text
### YYYY-MM-DD HH:MM — <Step / Decision>

**Change:**

**Files changed:**

**Reason:**

**Evidence/results:**

**Decision:**

**Risks/issues:**

**Next action:**
```

The evidence section must contain real measured results only.

---

# 27. STOP CONDITIONS

Antigravity must stop and produce a documented decision before:

```text
adding >1 GB of new training data
changing backbone family
unfreezing a major portion of the backbone
changing embedding dimensionality
changing loss function
changing train/val/test strategy
adding a new data source
expanding category scope
changing confidence thresholds
adding a new major model component
```

The decision record must contain:

```text
problem
hypothesis
expected benefit
cost
experiment
result
decision
```

---

# 28. PRIORITY WHEN RESOURCES ARE LIMITED

If compute/time becomes constrained, prioritize:

```text
1. category reliability
2. instance retrieval
3. hard-negative benchmark
4. abstention/calibration
5. text-to-image retrieval
6. image + text reranking
7. ownership evidence
8. context scoring
9. UI polish
```

Never sacrifice:

```text
instance-disjoint evaluation
truthful metrics
unknown handling
```

just to add features.

---

# 29. DEFINITION OF DONE

The project is technically complete only when the following exist:

```text
[ ] reproducible dataset manifest
[ ] processed corpus <=6 GB
[ ] verified split isolation
[ ] perception benchmark
[ ] DINOv2 frozen baseline
[ ] custom metric-learning model
[ ] hard-negative mining
[ ] category gate
[ ] unknown/abstention path
[ ] multimodal text-image branch
[ ] learned/calibrated reranker
[ ] score calibration
[ ] FAISS retrieval
[ ] ownership evidence prototype
[ ] retrieval evaluation
[ ] category evaluation
[ ] open-set evaluation
[ ] calibration evaluation
[ ] hard-negative evaluation
[ ] ablation study
[ ] error analysis
[ ] experiment registry
[ ] updated context.md
[ ] tests passing
[ ] final demo scenarios
```

---

# 30. FINAL PROJECT POSITIONING

Use this as the technical positioning statement:

> **The system treats campus lost-property recovery as a fine-grained instance re-identification problem rather than a generic lost-and-found search problem. It separates object perception from physical-instance retrieval, learns a domain-specific visual representation with multi-view and hard-negative supervision, combines visual and natural-language evidence, calibrates uncertainty, and preserves private ownership evidence. When the evidence is insufficient, the system abstains instead of forcing a match.**

Do not claim global uniqueness.

Claim the specific technical architecture, experiments and measured results that the repository actually demonstrates.

---

# 31. ANTIGRAVITY MASTER EXECUTION LOOP

For every milestone:

```text
READ context.md
      ↓
INSPECT existing code
      ↓
IDENTIFY smallest required change
      ↓
IMPLEMENT
      ↓
RUN TESTS
      ↓
RUN CONTROLLED EXPERIMENT
      ↓
MEASURE
      ↓
WRITE REPORT
      ↓
UPDATE context.md
      ↓
CHECK git diff/status
      ↓
PASS MILESTONE GATE?
      |
   +--+--+
   |     |
  YES     NO
   |      |
   v      v
 NEXT   DIAGNOSE
```

Do not proceed because the code merely runs.

Proceed because the evidence shows that the current stage is sufficiently reliable to justify the next stage.

---

# 32. ONE-SENTENCE NORTH STAR

> **Build the most trustworthy physical-item retrieval system possible within student-level storage and compute constraints by maximizing useful learning signal, distinguishing object category from physical identity, ranking multimodal evidence, and abstaining whenever the evidence is not strong enough.**

---

# PART II — DETAILED TECHNICAL HANDOVER

The following section is the previously established detailed ML handover. It remains part of the implementation specification and should be read after the master roadmap above.

---

# Antigravity Master Handover
## Multimodal Lost Property Re-Identification & Ownership Verification

**Document type:** Engineering + ML master handover  
**Status:** Authoritative implementation specification  
**Date:** 2026-09-27  
**Audience:** Antigravity coding agent, ML engineer, backend engineer, project maintainers  
**Primary objective:** Define and implement the project's actual ML system end-to-end without wasting storage/compute on an unnecessarily large detector dataset.

---

# 0. EXECUTIVE DIRECTIVE

Read this document completely before changing code.

Also read the existing:

```text
context.md
```

`context.md` is the project's live memory and must remain synchronized with implementation reality.

The project is **not** an ordinary digital lost-and-found portal.

The ML problem is:

> Given a lost-item query consisting of an image, vague natural-language text, or both, retrieve and rank found-item images that are likely to correspond to the **same physical object instance**, while avoiding unsafe automatic decisions when confidence is insufficient.

The central technical distinction is:

```text
OBJECT RECOGNITION
"What kind of object is this?"
```

versus:

```text
INSTANCE RE-IDENTIFICATION
"Which physical object is this?"
```

These are separate problems and must be implemented as separate stages.

The system must NOT be designed around a single custom detector trained from scratch on thousands of images.

The recommended architecture is:

```text
                         USER QUERY
                    image / text / both
                             |
                             v
                +---------------------------+
                |  OPEN-SET PERCEPTION      |
                |  object proposal/category |
                +---------------------------+
                             |
                             v
                +---------------------------+
                | CATEGORY VERIFICATION     |
                | confidence + abstention   |
                +---------------------------+
                             |
                             v
                +---------------------------+
                | INSTANCE EMBEDDING        |
                | DINOv2 + custom metric     |
                | learning head              |
                +---------------------------+
                             |
                             v
                    VECTOR RETRIEVAL
                         FAISS
                             |
                             v
                +---------------------------+
                | MULTIMODAL RE-RANKER      |
                | visual + text + attributes |
                | optional context           |
                +---------------------------+
                             |
                             v
                +---------------------------+
                | OWNERSHIP EVIDENCE LAYER  |
                | private verification       |
                +---------------------------+
                             |
                  +----------+----------+
                  |                     |
                  v                     v
              confident             uncertain
                  |                     |
                  v                     v
          candidate matches       ABSTAIN / REVIEW
```

The model is allowed to say:

> `UNKNOWN / LOW CONFIDENCE / MANUAL REVIEW REQUIRED`

This is a required capability, not an error condition.

---

# 1. PROJECT DEFINITION

## 1.1 Product

A campus lost-and-found system that helps students and administrators recover physical property.

## 1.2 Core ML task

Fine-grained multimodal instance retrieval:

```text
lost query
    |
    +-- image
    +-- text
    +-- image + text
    |
    v
rank found-item records
    |
    v
same physical instance candidates
```

## 1.3 Secondary ML task

Reliable object/category recognition:

```text
photo
  |
  v
object proposal
  |
  v
category
  |
  v
confidence / abstention
```

## 1.4 Optional ML/context task

Use non-visual information as a ranking prior:

```text
time
location
building
day
found zone
loss zone
```

Context MUST NOT override strong visual contradictions.

Example:

```text
visual similarity = very low
location similarity = very high
```

must NOT automatically produce a high match score.

---

# 2. CURRENT PROJECT STATE

According to the current `context.md`, the following are complete:

- Step 0 — project bootstrap
- Step 1 — dataset audit
- Step 2 — data ingestion/normalization
- Step 3 — instance-disjoint train/validation/test splits
- Step 4 — image embedding baseline
- COIL-100 proxy experiment

Existing implementation includes:

```text
src/data/
src/embeddings/
src/retrieval/
src/evaluation/
scripts/
tests/
```

Existing baseline used:

```text
ResNet50
FAISS
Recall@1
```

COIL-100 produced:

```text
Recall@1 = 1.0000
```

This result is ONLY a pipeline-validation result.

Do NOT present COIL-100 = 1.0 as evidence that the actual lost-and-found problem is solved.

COIL-100's clean object-centric imagery and simple backgrounds make it substantially easier than real campus photographs.

---

# 3. THE CORE ARCHITECTURAL CORRECTION

Do not continue trying to solve all of the following with a single custom detector:

```text
object detection
+
category classification
+
physical instance identity
+
visual retrieval
+
text/image alignment
+
ownership verification
```

That architecture is unnecessary and difficult to train with student-level compute.

Instead:

## Stage A — Perception

Determine:

```text
Is there a relevant object?
Where is it?
What category might it belong to?
How confident are we?
```

## Stage B — Category verification

Cross-check the proposed category using a second semantic mechanism.

## Stage C — Instance representation

Produce an embedding designed for physical-instance comparison.

## Stage D — Retrieval

Search all indexed found objects using vector similarity.

## Stage E — Multimodal ranking

Combine image, text and optional context.

## Stage F — Ownership evidence

Treat matching and proving ownership as separate decisions.

---

# 4. COMPETITIVE LANDSCAPE RESEARCH

This section is intentionally included because the project needs defensible differentiation.

Do not use the claim:

> "Our application is unique because it uses AI to match lost items."

That is no longer defensible.

Publicly documented systems already advertise combinations of:

- AI item matching
- image recognition/photo analysis
- text matching
- confidence scores
- QR access
- email/SMS notifications
- OTP/PIN/recovery codes
- audit trails
- location tracking
- dashboards
- ownership verification
- cloud image storage

Examples include Nuvlost, Laika, iLost, Chargerback, Foundrop, and multiple public campus-oriented software projects.

### Nuvlost

Nuvlost publicly describes:

- AI item matching
- natural-language and photo analysis
- visual search
- confidence scoring
- QR reporting
- high-value item protection
- one-time recovery codes
- multi-building support
- notifications
- analytics

Therefore these features are NOT sufficient as the project's primary differentiator.

Source:
https://nuvlost.com/university-lost-and-found

https://nuvlost.com/ai-lost-and-found

### Laika

Laika publicly describes:

- AI photo intake
- generated category/description
- plain-language search
- high-value item blurring
- ownership verification
- ID verification
- PIN handover
- audit trails

Therefore:

```text
"AI + photo + text search + secure handover"
```

is also not by itself a sufficient differentiator.

Source:
https://laikacampus.com/

### iLost

iLost publicly operates as a search engine for lost and found property.

Its public workflow includes:

- found-item photos
- item descriptions
- categories
- user lost reports
- image upload
- time/location information
- claim workflows
- verification/privacy controls
- search across found items

Source:
https://ilost.co/search

https://ilost.co/business/other

### Chargerback

Chargerback publicly advertises:

- AI
- image recognition
- chain of custody
- encrypted data
- PII protection
- reporting
- touchless returns

Therefore:

```text
"we use image recognition"
```

is not an adequate differentiator.

Source:
https://admin.chargerback.com/default.asp

### Foundrop

Foundrop publicly emphasizes:

- registered property inventories
- serial numbers
- owner matching
- manufacturer/model/color search
- secure contact
- law-enforcement and university use

Therefore a serial-number-based ownership concept is also prior art.

Source:
https://www.foundrop.com/
https://www.foundrop.com/faq

### Public student/open-source systems

There are already public projects describing:

- AI vision tagging
- multimodal matching
- YOLO
- OpenCLIP
- TF-IDF
- fraud detection
- location/time similarity
- claim workflows
- OTP handover

Examples:

CampusFind:
https://github.com/Arav-Arun/CampusFind

Lost & Found Tracking System:
https://github.com/Lost-and-Found-Tracking-System/lost-and-found-system

Smart Campus Lost & Found Hub:
https://github.com/itskiishan/Smart-Campus-Lost-and-Found-Hub

A 2026 student/research project, SmartFind, describes image + text similarity using MobileNet and TensorFlow.js.

Source:
https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6483219

---

# 5. PROJECT DIFFERENTIATOR

The project differentiation should therefore be technical and ML-specific.

## 5.1 Proposed positioning

> **Instance-Aware Evidence Matching for Lost Property**

The system does not stop at:

```text
"This looks like a phone."
```

or:

```text
"This found item resembles the description."
```

It attempts to model:

```text
"This visual query belongs to the same physical instance
as this found-item record, despite viewpoint/background/lighting
changes, and the system can explain why it ranked that candidate."
```

## 5.2 Differentiator 1 — Instance-first retrieval

Train the custom visual component around physical-instance similarity rather than only category classification.

```text
same item, different view
        ->
      close

different item, same category
        ->
      far
```

This is the most important technical differentiator.

## 5.3 Differentiator 2 — Open-world abstention

The system must not force every query into one of the known categories.

Example:

```text
book        0.44
phone       0.38
tablet      0.11
wallet      0.07
```

Output:

```text
UNKNOWN / CATEGORY UNCERTAIN
```

rather than:

```text
phone
```

This is important because false registration can make the entire recovery workflow worse.

## 5.4 Differentiator 3 — Evidence-preserving ownership verification

Retrieval and ownership verification are separate.

A high visual similarity does not itself prove ownership.

The system should preserve optional hidden evidence such as:

- owner-provided distinctive description
- privately stored visual attributes
- unique sticker/marking description
- non-public distinguishing feature
- user-provided serial/model information

The claimant can then be asked to supply evidence that was not publicly exposed in the listing.

This reduces the risk of someone seeing a public image and claiming an item based only on generic appearance.

Do not claim that this workflow is unprecedented globally. Treat it as the project's proposed implementation differentiator.

## 5.5 Differentiator 4 — Evidence breakdown for every match

Instead of returning:

```text
Match = 91%
```

return something conceptually closer to:

```text
Visual instance similarity:       0.91
Category agreement:              0.99
Text/image agreement:            0.84
Attribute agreement:             0.88
Context compatibility:           0.73

Final ranking score:             0.89
Decision:                         REVIEW / HIGH-CONFIDENCE CANDIDATE
```

The exact numbers must be calibrated rather than invented.

## 5.6 Differentiator 5 — Category-specific thresholds

A phone and a book do not necessarily have the same error characteristics.

Thresholds must therefore be learned/calibrated per category where validation data support it.

Example:

```text
book:
    acceptance threshold = learned from validation

wallet:
    acceptance threshold = learned from validation
```

Do not use one universal magic number such as:

```text
similarity > 0.80 => match
```

without calibration.

---

# 6. DATASET STRATEGY

## 6.1 Storage target

Final processed training corpus:

```text
TARGET: 5–6 GB maximum
HARD CAP: 6 GB unless explicitly documented
```

The objective is:

> maximum learning signal per GB

not maximum number of images.

## 6.2 Do not chase 500–1,000 images per category blindly

500–1,000 images per class is NOT a universal ML requirement.

The more important quantities are:

```text
unique physical instances
+
view diversity
+
hard negatives
+
background diversity
+
appearance diversity
+
annotation quality
```

For re-identification:

```text
100 instances × 6 useful views
```

can be more useful than:

```text
1,000 nearly identical images
```

for some training objectives.

## 6.3 Dataset roles

### Objectron

Use Objectron primarily for:

- multi-view learning
- same-instance positives
- viewpoint invariance
- object-centric geometry
- cross-view retrieval

Objectron officially contains about 15K annotated videos and more than 4M annotated images across:

```text
bikes
books
bottles
cameras
cereal boxes
chairs
cups
laptops
shoes
```

The official documentation emphasizes object-centric multi-view capture, where the camera moves around an object.

Source:
https://github.com/google-research-datasets/Objectron

### PACO-LVIS

Use PACO primarily for:

- natural image conditions
- category/attribute learning
- segmentation/object crops
- hard negatives
- appearance variation

PACO-LVIS provides tens of thousands of annotated images and object masks, plus attributes involving:

- color
- pattern/marking
- material
- transparency

The official taxonomy includes:

```text
handbag
book
bottle
cellular_telephone
cup
hat
helmet
laptop_computer
mug
remote_control
shoe
slipper_(footwear)
wallet
watch
calculator
earphone
mouse_(computer_equipment)
pen
pencil
scarf
sweater
...
```

Source:
https://github.com/facebookresearch/paco/blob/main/docs/PACO_DATASET.md

IMPORTANT:

PACO-LVIS does not provide a universal cross-image physical-instance identity for all LVIS images. Do NOT invent same-instance positives from unrelated images.

Use Objectron for strong same-instance positives.

### COIL-100

Keep COIL-100 only for:

- pipeline smoke tests
- debugging
- retrieval sanity checks

Do not report it as real-world performance.

### Objects365

Do not download the full dataset.

Use it only if a genuinely important target category is missing from the primary sources.

Example:

```text
backpack
```

may require an additional source.

---

# 7. INITIAL CATEGORY SCOPE

Do not start with 25+ categories.

Use a focused first release.

## Tier A — Core

```text
1. mobile phone
2. laptop
3. book
4. bottle
5. cup / mug
6. shoe
7. wallet
8. handbag
9. earphone
10. calculator
11. camera
12. watch
```

## Tier B — Expansion

```text
13. backpack
14. slipper
15. computer mouse
16. remote control
17. pouch
18. hat
19. helmet
20. pen/pencil
21. scarf
22. sweater
```

Tier B should be added only after Tier A is stable.

## Category mapping requirement

Create a canonical mapping:

```text
project_category
source_dataset
source_category
availability
selection_reason
```

Never assume source taxonomy names.

For example:

```text
project_category = mobile_phone
PACO_LVIS_category = cellular_telephone
```

may be correct, but the mapping must be verified from metadata.

---

# 8. DATA SAMPLING ALGORITHM

Do NOT randomly download 5–6 GB.

Create a deterministic selector.

The selector should optimize approximately for:

```text
0.30 instance diversity
0.20 view diversity
0.15 appearance diversity
0.15 background/context diversity
0.10 hard-negative usefulness
0.10 annotation quality
```

These weights are starting parameters, not immutable scientific constants.

The selector must be configurable.

## 8.1 Objectron sampling

For each selected sequence:

1. preserve the sequence/video identity as the physical-instance ID
2. do not use every adjacent frame
3. select temporally separated frames
4. prefer meaningful viewpoint changes
5. reject blurry/near-duplicate frames
6. preserve several views per instance

Initial target:

```text
~4–8 useful views per selected instance
```

Adjust based on storage and actual diversity.

## 8.2 PACO sampling

Prioritize:

- object size large enough for useful crop
- clear segmentation
- natural backgrounds
- different colors
- different patterns
- different materials
- different logos/markings
- different scenes
- different viewpoints
- partial occlusion

Avoid excessive duplicates.

## 8.3 Hard-negative selection

For each core category, intentionally include similar-but-different items.

Examples:

```text
black phone A vs black phone B
black wallet A vs black wallet B
white sneaker A vs white sneaker B
silver laptop A vs silver laptop B
blue bottle A vs blue bottle B
```

This is required.

---

# 9. IMAGE PROCESSING

Where annotations permit:

```text
source image
    |
    v
object bounding box / segmentation
    |
    v
crop + configurable margin
    |
    v
resize / normalize
    |
    v
training image
```

Use object crops for the re-identification branch.

Preserve metadata linking the crop back to:

```text
source dataset
source image ID
source annotation ID
source instance ID where available
```

Do not destroy provenance.

Maintain two representations where useful:

```text
object crop
full image context
```

The crop is primary for instance representation.

The full image can be used by the perception stage or context-aware experiments.

---

# 10. SPLITTING RULES

## 10.1 Objectron

Physical-instance split is mandatory.

A sequence/instance MUST exist in only one split.

```text
TRAIN ∩ VAL = empty
TRAIN ∩ TEST = empty
VAL   ∩ TEST = empty
```

Use:

```text
70 / 15 / 15
seed = 42
```

unless an existing documented split is preferred for a specific benchmark.

## 10.2 PACO-LVIS

Because PACO-LVIS does not universally provide cross-image physical identity, do not pretend it has Objectron-style instance labels.

Use image/annotation-disjoint splits for PACO-derived category/attribute experiments.

Do not allow the exact same source image/annotation to enter multiple splits.

---

# 11. RECOMMENDED ML STACK

The default research stack should be:

## 11.1 Perception

Primary research choice:

**Grounding DINO**

Purpose:

- open-set object proposal
- text-prompted categories
- category candidates
- fallback for classes not covered by ordinary closed-set detectors

Grounding DINO is designed for open-set detection using textual inputs.

Paper:
https://arxiv.org/abs/2303.05499

Repository:
https://github.com/IDEA-Research/GroundingDINO

The repository code is Apache-2.0, but checkpoint-specific terms must still be checked before redistribution.

## 11.2 Visual instance backbone

**DINOv2 ViT-S/14**

Purpose:

- strong pretrained visual representation
- image retrieval
- patch-level features
- lightweight enough for student-scale adaptation

DINOv2 ViT-S/14 has 21M parameters and a 384-dimensional embedding space in the published model family.

The official model card explicitly lists image retrieval via nearest neighbours as a supported use.

Sources:
https://github.com/facebookresearch/dinov2
https://arxiv.org/abs/2304.07193

DINOv2 code and model weights are released under Apache 2.0.

## 11.3 Multimodal semantic encoder

**Google SigLIP2 base patch16 224**

Purpose:

- text-image similarity
- vague text query handling
- image/text semantic verification
- multimodal score

Model:
`google/siglip2-base-patch16-224`

The published checkpoint is Apache-2.0.

Sources:
https://huggingface.co/google/siglip2-base-patch16-224
https://arxiv.org/abs/2502.14786

SigLIP2 provides separate image and text encoders.

## 11.4 Vector index

Keep existing FAISS implementation.

Use:

```text
cosine similarity
```

by L2-normalizing embeddings before indexing.

---

# 12. EXACT CUSTOM VISUAL MODEL

The project should actually train a model, but train the right thing.

## 12.1 Backbone

```text
DINOv2 ViT-S/14
```

Initial phase:

```text
BACKBONE = FROZEN
```

Train:

```text
projection head
metric-learning objective
category head
```

Only unfreeze the final one or two backbone blocks after the frozen-backbone experiment is complete and justified.

## 12.2 Global branch

Extract the DINO class token.

```text
CLS
 |
v
Linear(384 -> 512)
 |
v
GELU
 |
v
Dropout
 |
v
Linear(512 -> 256)
 |
v
L2 normalize
```

Output:

```text
global_embedding = 256D
```

## 12.3 Local branch

Use patch tokens.

Perform an efficient pooling mechanism such as:

```text
patch tokens
    |
    v
GeM / attention pooling
    |
    v
Linear
    |
    v
256D
    |
    v
L2 normalize
```

Do not store every patch vector in FAISS initially.

Use pooled local representation.

## 12.4 Combined visual representation

Initially:

```text
global_embedding = 256D
local_embedding  = 256D
```

Combine with normalized weighted fusion:

```text
visual_embedding =
    alpha * global_embedding
    +
    (1-alpha) * local_embedding
```

where:

```text
0 <= alpha <= 1
```

Tune `alpha` on validation data.

Do not assume 0.5 is optimal.

## 12.5 Why global + local?

Global features answer:

```text
overall object appearance
```

Local features help preserve:

```text
sticker
logo
button layout
camera arrangement
label
pattern
small distinctive marking
damage
```

These details are important to physical-instance identification.

---

# 13. TRAINING OBJECTIVE

The objective is NOT simple category cross-entropy alone.

Use a metric-learning objective.

## 13.1 Primary loss

Start with:

**Supervised Contrastive Loss**

Positive:

```text
same physical instance
```

Negative:

```text
different physical instance
```

The SupCon formulation explicitly pulls same-class positives together and pushes different samples apart.

Paper:
https://arxiv.org/abs/2004.11362

## 13.2 Hard-negative emphasis

Within a batch, prioritize:

```text
same category + visually similar + different instance
```

over trivial negatives.

Example:

```text
phone A
phone B
```

is a more useful negative than:

```text
phone
shoe
```

for this project.

## 13.3 Optional secondary metric loss

Evaluate:

**Proxy Anchor Loss**

as an experiment if SupCon is unstable or converges slowly.

Paper:
https://arxiv.org/abs/2003.13911

Do not implement several losses simultaneously without an ablation.

Start simple.

---

# 14. CATEGORY HEAD

The visual encoder can also have an auxiliary category head.

```text
visual_feature
    |
    v
Linear
    |
    v
number_of_core_categories
```

Use:

```text
CrossEntropyLoss
```

as a secondary task.

The category head exists to improve category discrimination.

It must NOT replace the instance metric-learning objective.

---

# 15. TRAINING STAGES

## Stage 0 — Existing baseline

Keep:

```text
ResNet50 + FAISS
```

for comparison.

## Stage 1 — DINOv2 frozen retrieval

Run:

```text
DINOv2
+
nearest-neighbor retrieval
```

without training.

This tells us how much performance is obtained from a strong pretrained representation.

## Stage 2 — Custom projection head

Train:

```text
DINOv2 frozen
+
global/local projection heads
+
SupCon
+
category auxiliary loss
```

## Stage 3 — Hard-negative training

Enable category-aware hard-negative sampling.

## Stage 4 — Partial backbone fine-tuning

Only if Stage 2/3 results justify it:

```text
unfreeze final transformer block
```

then:

```text
possibly final 2 blocks
```

Use a significantly smaller learning rate for the backbone than for the heads.

## Stage 5 — Multimodal ranking

Add:

```text
SigLIP2 text/image similarity
```

and train/calibrate a lightweight re-ranker.

Do NOT fine-tune the entire SigLIP2 model initially.

---

# 16. MULTIMODAL MATCHING

Store two image representations for every found item:

```text
visual_reid_embedding
siglip_image_embedding
```

## 16.1 Image query

Use:

```text
visual instance similarity
```

as the main score.

SigLIP semantic similarity can provide secondary evidence.

## 16.2 Text query

Use:

```text
SigLIP text -> found-item image
```

as the primary semantic retrieval signal.

Example:

```text
"black leather wallet with a small silver logo"
```

## 16.3 Image + text query

Compute at least:

```text
S_visual
S_text_image
S_category
S_attribute
S_context
```

Then use a learned/calibrated ranker.

Initial feature vector:

```text
[
    visual_similarity,
    text_image_similarity,
    category_match,
    color_match,
    material_match,
    pattern_match,
    location_compatibility,
    time_compatibility
]
```

Use a simple MLP or logistic regression first.

Do not start with a large transformer re-ranker.

---

# 17. SCORE DESIGN

Do not expose an arbitrary "AI percentage."

Use calibrated scores internally.

Conceptually:

```text
raw_visual
raw_text
raw_category
raw_attribute
raw_context
```

then:

```text
final_score = calibrated_reranker(features)
```

The ranking system must log every component.

Example internal object:

```json
{
  "visual_score": 0.0,
  "text_score": 0.0,
  "category_score": 0.0,
  "attribute_score": 0.0,
  "context_score": 0.0,
  "final_score": 0.0,
  "decision": "candidate|review|reject"
}
```

Do not fabricate calibration values.

---

# 18. CATEGORY CONFIDENCE AND ABSTENTION

This is mandatory.

## 18.1 Category evidence

At minimum consider:

```text
detector category score
+
visual category head
+
SigLIP text-image category score
```

If they agree strongly:

```text
accepted
```

If they disagree:

```text
review / unknown
```

## 18.2 Example

```text
Detector:
book = 0.91

Category classifier:
book = 0.88

SigLIP:
book = 0.93
```

→ strong category agreement.

But:

```text
Detector:
book = 0.62

Classifier:
phone = 0.58

SigLIP:
phone = 0.63
```

→ disagreement.

Output:

```text
CATEGORY UNCERTAIN
```

## 18.3 Automatic registration rule

Never auto-register solely because:

```text
top_class = X
```

The system must require:

```text
confidence threshold
AND
margin / agreement condition
AND
known-category condition
```

The thresholds must be learned/calibrated on validation data.

---

# 19. OPEN-SET EVALUATION

This project needs an "unknown" benchmark.

Use non-target categories as unknown examples.

Example:

```text
known:
book
phone
laptop
bottle
...

unknown:
chair
bicycle
table
dog
television
...
```

The system should learn to reject unknown objects.

Measure:

- false acceptance of unknowns
- known-class precision
- known-class recall
- unknown rejection rate
- AUROC where meaningful
- per-category thresholds

This directly addresses the project's primary false-registration concern.

---

# 20. RETRIEVAL EVALUATION

Measure:

```text
Recall@1
Recall@5
Recall@10
MRR
mAP
```

Run separate evaluation for:

1. all categories
2. each category
3. same-category hard negatives
4. cross-view retrieval
5. image-to-image
6. text-to-image
7. image+text retrieval

Do not rely on one aggregate number.

A model that gets:

```text
excellent bottle retrieval
terrible phone retrieval
```

must not be summarized as "good overall."

---

# 21. CATEGORY DETECTION EVALUATION

Report:

```text
precision
recall
F1
confusion matrix
false-positive rate
false-negative rate
unknown rejection rate
```

Especially inspect:

```text
book ↔ laptop
phone ↔ remote
earphone ↔ other electronics
cup ↔ mug
shoe ↔ slipper
wallet ↔ handbag/pouch
```

The list should be adjusted based on actual confusion matrices.

---

# 22. HARD-NEGATIVE BENCHMARK

Create a special benchmark containing:

```text
same category
same color
similar shape
different physical item
```

Examples:

```text
black phone A vs black phone B
black wallet A vs black wallet B
white shoes A vs white shoes B
silver laptops A vs silver laptops B
```

Measure:

```text
Top-1 identity accuracy
Top-5 identity recall
false match rate
```

This benchmark is more representative of the actual problem than easy cross-category retrieval.

---

# 23. REAL-WORLD STRESS TESTS

The project must explicitly test:

## Viewpoint

```text
front
side
rear
top
angled
```

## Lighting

```text
bright
dim
warm
cool
shadow
```

## Background

```text
desk
floor
bag
classroom
bed
outdoor
clutter
```

## Occlusion

```text
partial object visibility
object behind another object
hand holding object
```

## Scale

```text
large object
small object in scene
```

## Appearance

```text
different cases
stickers
logos
patterns
wear
scratches
```

Do not claim real-world robustness unless these tests are actually run.

---

# 24. OWNERSHIP VERIFICATION DESIGN

Do not conflate:

```text
"looks like the same item"
```

with:

```text
"this person owns the item."
```

A candidate match should transition through:

```text
retrieval candidate
        |
        v
ownership claim
        |
        v
evidence verification
        |
        v
staff/handover approval
```

## 24.1 Public information

Safe to expose:

```text
category
general color
general location
approximate date
blurred image if necessary
```

## 24.2 Private evidence

Potentially keep private:

```text
specific sticker placement
distinctive damage
hidden marking
owner-provided detailed description
serial/model information supplied by owner
```

Do not invent facts that are not observable or user-provided.

## 24.3 Claim scoring

A claim should evaluate:

```text
retrieval similarity
+
private evidence consistency
+
category consistency
+
optional second-image consistency
```

Do not automatically release high-value items based solely on visual similarity.

---

# 25. TEXT GENERATION / ATTRIBUTE EXTRACTION

Where structured dataset attributes exist, preserve them.

Examples:

```text
color = black
material = leather
pattern = plain
marking = logo
```

Convert them into deterministic text templates where useful.

Example:

```text
"black leather wallet with logo"
```

Do not pretend this is a human-authored caption if it is template-generated.

Store:

```text
text_source = structured_attribute_template
```

This enables reproducible multimodal experiments.

---

# 26. DATA SCHEMA EXTENSIONS

Do not break the existing schema.

Extend it if necessary.

Recommended fields:

```text
item_instance_id
source_dataset
source_image_id
source_annotation_id
project_category
bbox
segmentation_path
global_embedding_path
local_embedding_path
siglip_embedding_path
attributes
split
```

Optional:

```text
text_description
text_source
context_time
context_location
```

All IDs must be stable.

---

# 27. RECOMMENDED DIRECTORY STRUCTURE

Use existing structure where possible.

Proposed additions:

```text
src/
  perception/
    detector.py
    category_gate.py
    abstention.py

  embeddings/
    dinov2_backbone.py
    visual_projection.py
    local_features.py
    siglip_encoder.py

  training/
    datasets.py
    samplers.py
    losses.py
    trainer.py
    hard_negative_mining.py

  retrieval/
    faiss_index.py
    search.py

  multimodal/
    fusion.py
    reranker.py
    calibration.py

  ownership/
    evidence.py
    claim_scoring.py

  evaluation/
    retrieval_metrics.py
    detection_metrics.py
    open_set_metrics.py
    calibration_metrics.py

scripts/
  audit_dataset_metadata.py
  select_training_subset.py
  estimate_storage.py
  download_selected_data.py
  preprocess_object_crops.py
  build_training_pairs.py
  train_metric_model.py
  evaluate_reid.py
  evaluate_category_gate.py
  evaluate_open_set.py
  run_ablation.py

reports/
  data_selection/
  experiments/
  evaluation/
```

Do not create duplicate implementations of existing functionality.

Inspect the current repository first.

---

# 28. REQUIRED EXPERIMENT MATRIX

Run these in order.

## Experiment A

```text
ResNet50 baseline
```

Already exists.

## Experiment B

```text
DINOv2 ViT-S/14 frozen
nearest-neighbor retrieval
```

## Experiment C

```text
DINOv2 frozen
+
projection head
+
SupCon
```

## Experiment D

```text
Experiment C
+
hard negative sampling
```

## Experiment E

```text
Experiment D
+
local feature branch
```

## Experiment F

```text
Experiment E
+
SigLIP2 text/image semantic score
```

## Experiment G

```text
Experiment F
+
learned/calibrated re-ranker
```

## Experiment H

```text
Experiment G
+
context features
```

Context should be an ablation, not silently mixed into the core visual metric.

---

# 29. ABLATION TABLE

Every experiment must be logged in a machine-readable CSV/JSON and a human-readable Markdown report.

Required columns:

```text
experiment_id
backbone
trained_layers
loss
hard_negative_sampling
local_features
text_branch
context_branch
Recall@1
Recall@5
Recall@10
MRR
mAP
category_macro_precision
category_macro_recall
unknown_rejection
notes
```

This allows the project to demonstrate which components actually contribute.

---

# 30. DATA QUALITY GATES

Before training, fail the pipeline if:

```text
missing images > 0
corrupt images > 0
invalid annotations > 0
duplicate IDs > 0
split leakage > 0
unexpected category > 0
```

Near-duplicate imagery should be reported.

Do not silently remove large numbers of samples.

---

# 31. STORAGE MANAGEMENT

The final processed corpus must remain under the configured hard cap.

Use a configuration file such as:

```yaml
storage:
  target_gb: 5.0
  hard_cap_gb: 6.0
```

The selector must estimate:

```text
raw storage
processed storage
metadata storage
embedding storage
```

Important:

Embeddings can be substantially smaller than raw images.

Therefore, after training data preparation, consider storing:

```text
float16 embeddings
```

where accuracy remains acceptable.

Do not convert blindly; measure numerical impact.

---

# 32. COMPUTE MANAGEMENT

The system is intended for student-level hardware.

Do NOT assume:

```text
multi-GPU
large VRAM
cloud cluster
```

Training must support:

- mixed precision where available
- gradient accumulation
- configurable batch size
- checkpoint resume
- early stopping
- cached embeddings
- frozen-backbone training

The most important compute-saving rule:

> Cache frozen backbone embeddings whenever possible.

For example:

```text
DINOv2 frozen
       |
       v
precompute embeddings
       |
       v
train projection/reranker
```

This avoids repeatedly forwarding the full dataset through the backbone.

---

# 33. BACKBONE FINE-TUNING POLICY

Never start by unfreezing the whole DINOv2 model.

Order:

```text
frozen backbone
    |
    v
projection head
    |
    v
hard-negative improvements
    |
    v
last block
    |
    v
last 2 blocks
```

Only progress if validation results justify it.

Log:

```text
GPU memory
epoch time
best validation Recall@1
```

---

# 34. FAILURE POLICY

If a category performs poorly:

DO NOT immediately respond by downloading 5,000 more images.

First diagnose:

```text
annotation quality?
class imbalance?
bad crops?
insufficient unique instances?
background leakage?
small-object problem?
confusing negative classes?
pretrained model limitation?
threshold calibration?
```

Then select the smallest intervention that addresses the actual failure.

---

# 35. BOOK FAILURE SPECIFICALLY

The current system has already shown poor performance on books.

Before increasing book data blindly, perform:

```text
1. category audit
2. crop audit
3. detector proposal audit
4. category classifier audit
5. DINOv2 embedding audit
6. confusion analysis
```

Check whether the failure is:

```text
book not detected
```

or:

```text
book detected but classified incorrectly
```

or:

```text
book classified correctly but re-identification fails
```

These are three different failures.

---

# 36. MOBILE PHONE FAILURE SPECIFICALLY

Phones are particularly difficult at instance level because many objects share:

```text
rectangular geometry
dark color
similar screen appearance
```

Therefore phone training must contain:

```text
different brands
different cases
different colors
front views
rear views
camera layouts
screen states
stickers
scratches
partial views
```

The objective is not:

```text
"phone detector"
```

but:

```text
"phone instance discrimination"
```

---

# 37. EARPHONE FAILURE SPECIFICALLY

Earphones are challenging because:

```text
small object size
thin geometry
occlusion
wire/earbud confusion
similar shapes
```

Do not expect a detector to solve them reliably from generic images alone.

For earphones:

- prioritize segmentation/cropping quality
- use larger crop resolution when possible
- use contextual full-image input
- evaluate false positives separately
- treat low-confidence predictions as review cases

---

# 38. UNKNOWN CATEGORY HANDLING

The system should have:

```text
KNOWN
UNKNOWN
UNCERTAIN
```

not merely:

```text
CLASS A
CLASS B
CLASS C
```

Example API response:

```json
{
  "status": "uncertain",
  "category": null,
  "confidence": 0.0,
  "candidates": [
    {"category": "book", "score": 0.0},
    {"category": "laptop", "score": 0.0}
  ],
  "requires_review": true
}
```

Do not force a category.

---

# 39. RETRIEVAL API CONTRACT

The retrieval API should eventually support:

```text
POST /match/image
POST /match/text
POST /match/multimodal
```

Conceptually:

```json
{
  "query": {
    "image": "...",
    "text": "...",
    "category_hint": null
  },
  "filters": {
    "status": "found",
    "campus": "..."
  },
  "top_k": 10
}
```

Response:

```json
{
  "status": "ok",
  "category": "wallet",
  "category_confidence": 0.0,
  "matches": [
    {
      "item_id": "...",
      "final_score": 0.0,
      "visual_score": 0.0,
      "text_score": 0.0,
      "attribute_score": 0.0,
      "context_score": 0.0,
      "decision": "candidate"
    }
  ]
}
```

The numerical thresholds must be configured, not hard-coded throughout the codebase.

---

# 40. INDEXING STRATEGY

For every found item:

```text
1. detect/crop
2. category verification
3. DINOv2 embedding
4. local/global fusion
5. SigLIP image embedding
6. store metadata
7. add to FAISS
```

Index metadata:

```text
item_id
category
campus
location
timestamp
embedding_id
```

Never store only the vector without traceable item metadata.

---

# 41. SEARCH STRATEGY

Use hierarchical search where possible:

```text
query
  |
  v
category candidates
  |
  v
candidate category filter
  |
  v
FAISS visual retrieval
  |
  v
top-N candidates
  |
  v
multimodal re-ranking
```

This is more efficient than running an expensive multimodal reranker against every item.

---

# 42. MULTI-IMAGE QUERY

Support multiple user images when possible.

Example:

```text
front photo
rear photo
side photo
```

Combine embeddings:

```text
query_embedding =
normalized(weighted_mean(image_embeddings))
```

or use learned attention later.

At minimum, support:

```text
mean normalized embeddings
```

as a deterministic baseline.

Do not treat each photo independently and discard the other views.

---

# 43. TEXT QUERY NORMALIZATION

User descriptions are expected to be vague.

Examples:

```text
"black wallet"
"my blue bottle"
"white laptop with stickers"
"earphones with black case"
"book I lost near library"
```

Normalize text only enough to remove obvious noise.

Do NOT use a large generative model as the core matching engine.

Use SigLIP2 embeddings as the semantic text representation.

Optional structured extraction:

```text
category
color
material
pattern
brand
distinctive feature
location
time
```

Store extracted fields separately.

---

# 44. CONTEXT SCORE

Context should act as a prior.

Example:

```text
loss location = Library
found location = Library

time difference = 2 hours
```

This increases plausibility.

But:

```text
visual similarity = poor
```

must still suppress the final score.

Implement context as:

```text
small, learnable feature contribution
```

not:

```text
hard rule
```

---

# 45. PRIVACY / SECURITY REQUIREMENTS

The ML system must not leak private ownership evidence.

Do not expose:

```text
hidden distinguishing attributes
internal similarity feature vectors
private metadata
other claimant information
```

High-value item images may need to be:

```text
blurred
partially hidden
staff-only
```

until ownership verification.

Do not use face recognition.

Do not infer the identity of the owner from an image.

---

# 46. RAG BOUNDARY

RAG is NOT CORE.

Do not introduce RAG into:

```text
object detection
instance retrieval
visual similarity
multimodal ranking
```

RAG may later be added for:

```text
campus lost-and-found policy
handover procedure
FAQ
administrative rules
```

This must remain a separate feature.

---

# 47. RESEARCH JUSTIFICATION

The chosen architecture is grounded in existing research:

### DINOv2

Provides strong general visual features and explicitly supports image retrieval via nearest neighbours.

Source:
https://arxiv.org/abs/2304.07193

### Supervised Contrastive Learning

Provides a principled way to pull related samples together and separate non-related samples.

Source:
https://arxiv.org/abs/2004.11362

### Proxy Anchor Loss

Useful as a deep metric-learning alternative when pairwise approaches are inconvenient or converge poorly.

Source:
https://arxiv.org/abs/2003.13911

### SigLIP / SigLIP2

Provides an image-text representation space suitable for text-image similarity and retrieval.

Sources:
https://arxiv.org/abs/2303.15343
https://arxiv.org/abs/2502.14786

### Grounding DINO

Provides open-set/object detection using category names or referring expressions.

Source:
https://arxiv.org/abs/2303.05499

---

# 48. WHY NOT TRAIN A GIANT DETECTOR?

Because the project's main objective is not:

```text
COCO-style object detection
```

It is:

```text
fine-grained physical-item retrieval
```

A detector only answers:

```text
"What is there?"
```

The project needs to answer:

```text
"Which stored physical object is this?"
```

These are different representations.

---

# 49. WHY PRETRAINED MODELS ARE NOT "CHEATING"

Using pretrained models does not remove meaningful ML work.

The actual research/engineering contribution is:

```text
domain-specific instance metric learning
+
hard-negative construction
+
multimodal fusion
+
open-set rejection
+
calibration
+
evidence-based ownership verification
```

A student project should prefer adapting a strong foundation rather than attempting to reproduce foundation-model pretraining from scratch.

---

# 50. MODEL OUTPUT HIERARCHY

The model should return:

```text
Level 1:
object proposal

Level 2:
category

Level 3:
category confidence

Level 4:
instance embedding

Level 5:
retrieved candidates

Level 6:
multimodal evidence score

Level 7:
decision state
```

Decision state:

```text
NO_OBJECT
UNKNOWN_CATEGORY
LOW_CONFIDENCE
CANDIDATE_MATCHES
HIGH_CONFIDENCE_CANDIDATE
OWNERSHIP_REVIEW
VERIFIED_RETURN
```

Do not collapse all of these into one "AI confidence" value.

---

# 51. TRAINING DATA FOR POSITIVES / NEGATIVES

## Positive

Strongest:

```text
same Objectron sequence/physical instance,
different views
```

Other positives may be:

```text
same explicitly linked item record
same user-provided multi-image item
```

provided the identity linkage is real.

## Negative

Prioritize:

```text
different instance, same category
```

Then:

```text
different category
```

## Hard negative

Use similarity pre-mining:

```text
DINOv2 nearest neighbours
+
different instance ID
```

These become valuable hard negatives.

This creates an iterative loop:

```text
train model
   |
   v
embed training/validation samples
   |
   v
find nearest wrong matches
   |
   v
add hard negatives
   |
   v
retrain
```

Do not perform hard-negative mining across validation/test labels in a way that leaks evaluation information.

---

# 52. EVALUATION LEAKAGE WARNING

Do not mine hard negatives using test labels.

Valid:

```text
TRAIN -> TRAIN hard-negative mining
VAL -> validation evaluation
TEST -> final evaluation
```

Invalid:

```text
TEST -> choose training negatives based on test similarity/labels
```

The final test set must remain untouched until the final evaluation.

---

# 53. CALIBRATION

Similarity values are not automatically probabilities.

Do not display:

```text
0.86 similarity = 86% chance of same object
```

unless calibrated.

Use validation data to learn:

```text
similarity -> probability / decision threshold
```

Possible methods:

- temperature scaling
- logistic calibration
- isotonic calibration

Start with logistic calibration for simplicity.

---

# 54. CATEGORY-SPECIFIC CALIBRATION

Where enough validation data exists:

```text
P(match | score, category)
```

may be calibrated separately.

For example:

```text
phones
wallets
books
bottles
```

can have different score distributions.

This should be measured rather than assumed.

---

# 55. FAILURE TAXONOMY

Every failed prediction should be tagged into one of:

```text
F1 = object not detected
F2 = wrong category
F3 = correct category, wrong instance
F4 = correct instance outside top-K
F5 = correct match but confidence rejected
F6 = false positive
F7 = text semantic mismatch
F8 = context over-weighting
F9 = annotation/data issue
```

Create error reports from these tags.

This is more actionable than a single accuracy value.

---

# 56. SUCCESS CRITERIA

Do not define success as:

```text
"model trains successfully"
```

The system is successful only if it demonstrates improvement across the correct tasks.

Minimum evaluation package:

```text
category precision/recall
+
unknown rejection
+
Recall@1/5/10
+
MRR/mAP
+
hard-negative evaluation
+
text-to-image retrieval
+
image+text retrieval
+
ablation study
```

For automatic registration, adopt a precision-first deployment gate.

Initial target:

```text
high confidence automatic actions should operate only
at a validated high-precision threshold.

A reasonable initial engineering target is >=98% precision
on the held-out automatic-registration benchmark.
```

This is a target for experimentation, not a guaranteed result.

If the model cannot meet the precision target:

```text
do not force registration
```

use:

```text
manual review
```

---

# 57. CRITICAL ANTI-PATTERNS

Never:

- train from scratch if a strong pretrained backbone solves the representation problem
- judge the system only by overall accuracy
- use COIL-100 = 1.0 as real-world evidence
- claim 500–1,000 images/class is universally required
- create random image splits across the same physical instance
- use PACO-LVIS as if it contained universal cross-image instance identities
- force every unknown object into a known category
- use a single similarity threshold without calibration
- let location/time overpower visual evidence
- expose private ownership evidence publicly
- add RAG to the core retrieval engine
- download entire multi-terabyte datasets unnecessarily
- commit raw datasets to Git
- rewrite functioning modules without inspection
- silently change schema names
- report invented metrics

---

# 58. IMPLEMENTATION ORDER

Antigravity should execute in this order.

## Step 1 — Repository audit

Inspect:

```text
context.md
src/
scripts/
tests/
requirements.txt
experiments.md
```

Produce:

```text
reports/architecture/current_ml_architecture.md
```

## Step 2 — Dataset audit update

Verify actual:

```text
Objectron
PACO-LVIS
optional Objects365
```

metadata.

Produce:

```text
reports/data_selection/category_inventory.md
```

## Step 3 — Build 5–6 GB selector

Implement:

```text
selection criteria
storage estimator
instance-aware sampling
hard-negative candidate generation
```

## Step 4 — Build processed corpus

Produce:

```text
train
val
test
```

with leakage validation.

## Step 5 — DINOv2 frozen baseline

Compare against:

```text
ResNet50 baseline
```

## Step 6 — Train projection head

Implement:

```text
global branch
local branch
SupCon
category auxiliary loss
```

## Step 7 — Hard-negative mining

Implement training-only hard-negative mining.

## Step 8 — Evaluate category gate

Add:

```text
Grounding DINO
+
category verification
+
abstention
```

## Step 9 — Add SigLIP2

Implement:

```text
image embedding
text embedding
text-image score
```

## Step 10 — Multimodal re-ranker

Train:

```text
small logistic/MLP re-ranker
```

using validation training features only.

## Step 11 — Calibration

Implement:

```text
category calibration
match-score calibration
abstention thresholds
```

## Step 12 — Ownership evidence

Implement the evidence layer after retrieval works.

## Step 13 — Final evaluation

Run complete:

```text
category
open-set
instance retrieval
multimodal
hard-negative
ablation
```

evaluation.

---

# 59. REQUIRED DOCUMENTATION OUTPUTS

Create or update:

```text
reports/
  architecture/
    current_ml_architecture.md
    ml_design_decisions.md

  data_selection/
    category_inventory.md
    selected_subset.md
    storage_estimate.md
    dataset_statistics.md

  experiments/
    experiment_matrix.md
    baseline_results.md
    metric_learning_results.md
    multimodal_results.md

  evaluation/
    category_report.md
    open_set_report.md
    retrieval_report.md
    hard_negative_report.md
    error_analysis.md
```

---

# 60. EXPERIMENT REGISTRY

Every run must have:

```text
experiment_id
timestamp
git_commit
dataset_manifest_hash
config_hash
seed
model
loss
learning_rate
batch_size
epochs
backbone_freeze_state
metrics
checkpoint
```

Example:

```text
EXP-006
seed=42
DINOv2-ViT-S/14
SupCon
projection=256
local_features=true
hard_negatives=true
```

No experiment result should exist only in terminal output.

---

# 61. REPRODUCIBILITY

Every experiment must be reproducible from:

```text
manifest
config
seed
code version
checkpoint
```

Set random seeds for:

```text
Python
NumPy
PyTorch
data-loader workers
```

where practical.

Document any nondeterministic operations.

---

# 62. MODEL CHECKPOINT POLICY

Save:

```text
best_val_recall_at_1.pt
best_val_mAP.pt
last.pt
```

Do not save checkpoints every epoch unless needed.

Store the training configuration with the checkpoint.

---

# 63. FINAL SYSTEM ARCHITECTURE

The target system should look like this:

```text
                               USER
                                |
                 +--------------+--------------+
                 |                             |
              IMAGE                           TEXT
                 |                             |
                 v                             v
        Grounding DINO                    SigLIP2 Text
                 |                             |
                 v                             |
           object crop                        |
                 |                             |
                 v                             |
          category gate                       |
          /    |     \                         |
         /     |      \                        |
 detector   DINO cls   SigLIP                   |
 score      category   category                 |
         \     |      /                         |
          \    |     /                          |
           +---+----+                           |
               |                                |
          category decision                     |
               |                                |
               v                                |
       DINOv2 instance encoder                  |
               |                                |
       +-------+--------+                       |
       |                |                       |
   global features   local features             |
       |                |                       |
       +-------+--------+                       |
               |                                |
               v                                |
       visual instance vector                  |
               |                                |
               v                                |
             FAISS <----------------------------+
               |
             Top-K
               |
               v
      multimodal re-ranker
               |
      +--------+---------+
      |        |         |
    visual   text      context
      |        |         |
      +--------+---------+
               |
               v
       calibrated decision
               |
       +-------+--------+
       |                |
   high confidence   uncertain
       |                |
       v                v
   candidate list    manual review
       |
       v
 ownership evidence
       |
       v
 verified handover
```

---

# 64. WHAT MAKES THIS A SERIOUS ML PROJECT

The technical contribution is not merely:

```text
YOLO + website
```

or:

```text
CLIP + database
```

The actual ML system contains:

```text
1. open-set visual perception
2. category verification
3. instance-aware metric learning
4. global/local feature fusion
5. hard-negative mining
6. multimodal image-text alignment
7. learned re-ranking
8. score calibration
9. open-set rejection
10. evidence-based ownership verification
```

This is substantially more meaningful than simply adding an AI API to a CRUD application.

---

# 65. FINAL DIFFERENTIATION STATEMENT

Use the following conceptual statement in technical documentation/presentations:

> **Most lost-and-found systems focus on digitizing reports, search, notifications, and generic similarity matching. This project treats lost-property recovery as a fine-grained instance re-identification problem. It separates category recognition from physical-instance retrieval, learns a domain-specific visual embedding using multi-view and hard-negative supervision, combines it with text-image semantics, calibrates uncertainty, and preserves private evidence for ownership verification. The system can abstain rather than forcing an unreliable match.**

Important:

Do NOT state:

> "No other lost-and-found system does this."

That claim is not established by the available public evidence.

State instead:

> "This is the technical differentiation we are intentionally implementing and evaluating."

---

# 66. CURRENT RESEARCH BASIS / SOURCES

## Core datasets

Objectron:
https://github.com/google-research-datasets/Objectron

PACO:
https://github.com/facebookresearch/paco
https://github.com/facebookresearch/paco/blob/main/docs/PACO_DATASET.md

## Visual representation

DINOv2:
https://arxiv.org/abs/2304.07193
https://github.com/facebookresearch/dinov2

## Multimodal representation

SigLIP:
https://arxiv.org/abs/2303.15343

SigLIP2:
https://arxiv.org/abs/2502.14786
https://huggingface.co/google/siglip2-base-patch16-224

## Detection

Grounding DINO:
https://arxiv.org/abs/2303.05499
https://github.com/IDEA-Research/GroundingDINO

YOLO-World:
https://openaccess.thecvf.com/content/CVPR2024/html/Cheng_YOLO-World_Real-Time_Open-Vocabulary_Object_Detection_CVPR_2024_paper.html

Current Ultralytics YOLO26:
https://docs.ultralytics.com/models/yolo26

## Metric learning

Supervised Contrastive Learning:
https://arxiv.org/abs/2004.11362

Proxy Anchor Loss:
https://arxiv.org/abs/2003.13911

## Competitive landscape

Nuvlost:
https://nuvlost.com/university-lost-and-found
https://nuvlost.com/ai-lost-and-found

Laika:
https://laikacampus.com/

iLost:
https://ilost.co/search
https://ilost.co/business/other

Chargerback:
https://admin.chargerback.com/default.asp

Foundrop:
https://www.foundrop.com/
https://www.foundrop.com/faq

Public campus projects:
https://github.com/Arav-Arun/CampusFind
https://github.com/Lost-and-Found-Tracking-System/lost-and-found-system
https://github.com/itskiishan/Smart-Campus-Lost-and-Found-Hub

---

# 67. LICENSING NOTE

Before distributing a trained model or dataset:

Verify the current terms for:

```text
Objectron data
PACO source data
DINOv2 weights
SigLIP2 checkpoint
Grounding DINO checkpoint
any Ultralytics component
```

Important distinctions:

- repository/code license != dataset license
- model license != training data license
- a model being open-source does not automatically grant redistribution rights to the source dataset

Objectron is released under a Computational Use of Data Agreement 1.0.

PACO's GitHub repository code is MIT-licensed, but the underlying datasets originate from LVIS/Ego4D and must be checked under their own terms.

DINOv2 code and weights are Apache 2.0.

SigLIP2 checkpoint `google/siglip2-base-patch16-224` is listed as Apache-2.0.

Grounding DINO repository code is Apache-2.0; verify checkpoint-specific conditions.

Do not make legal conclusions; document the terms and flag anything requiring human/legal review.

---

# 68. REQUIRED context.md UPDATE RULE

After EVERY:

- implementation step
- dataset change
- architecture change
- model change
- experiment
- bug fix
- scope decision
- threshold change
- evaluation change

update:

```text
context.md
```

Use:

```text
### YYYY-MM-DD HH:MM — <Step / Change>

**Change:**

**Files changed:**

**Reason:**

**Evidence/results:**

**Decision:**

**Risks/issues:**

**Next action:**
```

Never write fictitious evidence.

---

# 69. DEFINITION OF DONE

The ML system is not complete until the repository contains:

```text
[ ] reproducible dataset manifest
[ ] <=6 GB processed corpus
[ ] verified train/val/test separation
[ ] DINOv2 frozen baseline
[ ] trained metric-learning head
[ ] hard-negative strategy
[ ] category gate
[ ] unknown/abstention mechanism
[ ] SigLIP2 text-image branch
[ ] multimodal re-ranker
[ ] calibration
[ ] FAISS retrieval
[ ] ownership evidence prototype
[ ] category metrics
[ ] open-set metrics
[ ] retrieval metrics
[ ] hard-negative metrics
[ ] ablation study
[ ] error analysis
[ ] updated context.md
[ ] reproducible experiment registry
[ ] tests passing
```

---

# 70. FINAL INSTRUCTION TO ANTIGRAVITY

Do not interpret this document as permission to immediately implement everything at once.

Proceed incrementally.

At each stage:

```text
inspect
→ implement
→ test
→ measure
→ document
→ update context.md
→ continue
```

Do not skip measurement.

Do not compensate for weak results by blindly increasing dataset size.

When performance is poor, identify the failure layer first:

```text
perception
category
representation
retrieval
multimodal fusion
calibration
ownership verification
```

Then address that layer.

The ultimate goal is not to build the largest model.

The ultimate goal is to build the **most reliable lost-property re-identification system that can be trained, evaluated, explained and deployed within student-level resource constraints**.

---

# 71. ONE-SENTENCE NORTH STAR

> **Build a precision-first, multimodal, instance-aware lost-property recovery engine that can recognize what an item is, distinguish one physical item from another of the same category, retrieve candidates from images or vague text, use contextual evidence without overriding visual evidence, and abstain whenever the evidence is insufficient.**
