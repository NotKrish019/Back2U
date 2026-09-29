# OVERNIGHT EXECUTION MASTER PROMPT
## Multimodal Lost Property Re-Identification & Ownership Verification

**Document:** `OVERNIGHT_EXECUTION_MASTER_PROMPT.md`  
**Purpose:** Autonomous, sequential overnight implementation handover for Antigravity  
**Priority:** Reliability > completeness > novelty > speed  
**North Star:** Build the strongest validated ML system possible under current student-level compute/storage constraints, without fabricating results or skipping scientific gates.

---

# 0. DIRECTIVE TO ANTIGRAVITY

You are continuing the project unattended for an extended execution window.

Your job is to move the project forward **through every feasible ML phase**, in strict dependency order, while automatically handling failures and fallback paths.

DO NOT stop after completing one phase merely because a later phase could theoretically require user confirmation.

DO NOT repeatedly ask for confirmation.

DO NOT sit idle waiting for a perfect dataset or model result.

Instead:

```text
inspect
→ validate
→ implement
→ test
→ measure
→ document
→ update context.md
→ commit
→ proceed
```

If a phase fails:

```text
diagnose
→ classify failure
→ use the defined fallback
→ rerun the minimum necessary experiment
→ document the failure
→ continue to the next feasible stage
```

The system MUST NEVER:

- fabricate metrics
- claim an experiment succeeded when it did not
- overwrite a negative result with an optimistic interpretation
- train using test data
- leak test information into training
- silently change the dataset/split
- silently change model definitions
- create fake positive pairs
- treat semantic similarity as physical-instance identity
- force uncertain objects into known categories
- declare ownership solely from visual similarity
- invent data because a source download failed

The objective is to finish the execution window with a **real, reproducible trained checkpoint and as much of the complete ML pipeline implemented and validated as the available hardware/data allow**.

If a large phase cannot be completed due to network or compute limitations, finish all locally feasible work around it and leave the repository in a clean, documented state.

---

# 1. READ THESE FILES FIRST

Before doing anything else, inspect:

```text
docs/context.md
context.md                         # if present as legacy/root copy
MASTER_PLAN.md                     # if present
antigravity_ml_master_handover.md  # if present
requirements.txt
experiments.md
```

Then inspect:

```text
src/
scripts/
tests/
reports/
```

Do NOT assume the repository structure from memory.

---

# 2. CURRENT PROJECT STATE

The project is:

> **Multimodal Lost Property Re-Identification & Ownership Verification**

Core task:

> Given an image, vague text, or both, retrieve and rank found-item records corresponding to the same physical item, while handling uncertainty and separating matching from ownership verification.

The project has already established a modular architecture.

---

# 3. COMPLETED MILESTONES

## M0 — Repository / architecture

COMPLETE.

## M1 — Dataset construction and repair

COMPLETE.

The original identity-labeling problem was repaired.

The current Objectron strategy preserves:

```text
physical instance
    ├── view 1
    ├── view 2
    ├── view 3
    ├── ...
```

Objectron sequence identity is mapped to canonical `item_instance_id`.

Bounding boxes are used to generate object-centric crops.

Instance-disjoint splits are enforced.

Current known limitation:

```text
~117 physical instances remain available locally after GCS throttling.
```

Do not fabricate a larger identity pool.

---

## M3 — Frozen visual baseline

COMPLETE.

Candidate visual backbone:

```text
DINOv2 ViT-S/14
```

The system uses a compact visual representation for retrieval and FAISS for nearest-neighbor search.

---

## M4-A — DINOv2 + SupCon projection head

COMPLETE.

Architecture:

```text
384
 ↓
512
 ↓
GELU
 ↓
Dropout
 ↓
256
 ↓
L2 normalization
```

Backbone:

```text
DINOv2 frozen
```

Primary loss:

```text
Supervised Contrastive Loss
```

---

## M4-C — Hard-negative mining

COMPLETE / CURRENT METRIC CHAMPION.

Hard negatives are mined from training embeddings.

Preferred negative:

```text
different physical instance
+
same category
+
high visual similarity
```

Current reported configuration uses a mixed strategy with approximately 50% hard-negative-oriented batch composition.

Do not assume this ratio is universally optimal.

---

## M4-B — Naive local feature branch

TESTED AND REJECTED.

Patch-token GeM pooling degraded the controlled benchmark.

Current policy:

```text
DO NOT USE NAIVE LOCAL BRANCH IN PRIMARY MODEL
```

Keep the negative result for research/ablation documentation.

---

## M4-D — Partial DINOv2 fine-tuning

TESTED AND REJECTED/DEFERRED.

Only the final transformer block was unfrozen.

It did not produce held-out improvement and slightly degraded mAP.

Current policy:

```text
DINOv2 remains frozen for the current training regime.
```

Further fine-tuning is deferred until substantially more physical-instance data becomes available.

Do not attempt another backbone-unfreezing experiment unless explicitly justified by a new evidence-based decision.

---

## M2-A — Grounding DINO perception benchmark

COMPLETE.

Initial benchmark demonstrated:

```text
Precision ≈ 0.9574–1.0000 depending on controlled subset/version
Recall     ≈ 0.8286–0.9000 depending on benchmark/version
```

Known issues included:

```text
no proposal
incorrect bounding box
wrong category
ambiguous proposals
```

Books and cameras were difficult in earlier experiments.

---

## M2-B — Visual Category Head + Category Gate

COMPLETE for the current closed-set benchmark, but open-set behavior remains a hardening task.

The relevant category head was trained using currently available classes:

```text
laptop
cup
shoe
bottle
```

Do NOT claim it has learned categories for which it had no valid training supervision.

A previously reported controlled result was approximately:

```text
Combined Gate:
Precision = 1.0000
Recall    = 0.9600
F1        = 0.9796
```

An unknown-chair subset previously produced:

```text
Unknown FAR = 0.25
```

This means M2-B is not yet a final open-set solution.

---

# 4. CURRENT IN-FLIGHT M5

The earlier M5 semantic experiment accidentally used:

```text
google/siglip-base-patch16-224
```

instead of SigLIP2.

That historical experiment must remain clearly labeled as original SigLIP, not SigLIP2.

The corrected experiment uses:

```text
google/siglip2-base-patch16-224
```

Its role is:

```text
text-image semantic evidence
```

NOT physical-instance identity.

Preferred architecture:

```text
M4-C physical retrieval
        ↓
Top-N candidates
        ↓
SigLIP2 semantic evidence
        ↓
reranking / verification
```

Do not replace the physical-instance embedding with generic semantic text-image similarity.

---

# 5. CURRENT M2-C STATUS

M2-C Open-Set Rejection and Calibration has been implemented/evaluated provisionally.

A current provisional run reported:

```text
Validation-selected threshold:
margin > 0.0
entropy < 0.7

Test:
Precision = 1.0000
Recall    = 0.9000
Unknown FAR = 0.0000
```

Treat this as **provisional**, because the benchmark is still small and the unknown taxonomy is evolving.

The unknown evaluation may include:

```text
chair
bike
cereal_box
camera
book
```

IMPORTANT:

`camera` and `book` may be intended future target categories in the product.

Therefore distinguish:

```text
UNKNOWN TO CURRENT CLASSIFIER
```

from:

```text
UNKNOWN TO FINAL PRODUCT TAXONOMY
```

Do not use future target categories as permanent unknown-world negatives in the final open-set benchmark unless the final taxonomy explicitly excludes them.

---

# 6. PRIMARY ARCHITECTURE TO PRESERVE

The current architecture is:

```text
                         USER QUERY
                     image / text / both
                              |
                              v
                   +---------------------+
                   | Perception          |
                   | Grounding DINO      |
                   +----------+----------+
                              |
                              v
                    Category Gate
                    /           \
                 known       uncertain/unknown
                   |                 |
                   v                 v
             DINOv2 + M4-C      manual/review
                   |
                   v
             FAISS Retrieval
                   |
                   v
                Top-N
                   |
                   v
             SigLIP2 evidence
                   |
                   v
           Multimodal reranking
                   |
                   v
             calibration
                   |
             +-----+------+
             |            |
          confident    uncertain
             |            |
             v            v
          candidate     review
             |
             v
     ownership evidence
```

Do not collapse this into one monolithic model.

---

# 7. OVERNIGHT OBJECTIVES

Complete as many of the following as the evidence and hardware permit:

```text
O1  Finish corrected M5 SigLIP2 benchmark
O2  Finish/strengthen M2-C open-set benchmark
O3  Build final multimodal reranker
O4  Add calibration and operating-point selection
O5  Integrate category gate with visual retrieval
O6  Build full image→retrieval inference path
O7  Build text→image retrieval path
O8  Build image+text retrieval path
O9  Build ownership-evidence prototype
O10 Build final evaluation suite
O11 Run final ablation comparisons
O12 Package the best validated model checkpoint
O13 Build reproducible inference entry point
O14 Generate model card / technical summary
O15 Update docs/context.md after every milestone
O16 Run repository and integration tests
O17 Commit source/report/config changes
```

Do not try to complete everything simultaneously.

---

# 8. EXECUTION PRIORITY

Use this priority order:

```text
1. Finish and validate corrected M5
2. Stabilize M2-C open-set behavior
3. Integrate M4-C retrieval with perception
4. Build multimodal reranking
5. Calibrate confidence / abstention
6. Implement ownership evidence
7. Run final evaluation
8. Package best validated checkpoint
9. Documentation and reproducibility
```

If compute becomes constrained, prioritize:

```text
core inference path
>
evaluation
>
calibration
>
ownership prototype
>
additional experiments
```

---

# 9. O1 — FINISH CORRECTED M5 SIGLIP2

## Objective

Use the exact model:

```text
google/siglip2-base-patch16-224
```

as a frozen image-text encoder.

Do NOT silently substitute original SigLIP or another checkpoint.

---

## M5-A — Text-only semantic retrieval

Test queries such as:

```text
laptop
bottle
shoe
cup
```

plus richer descriptions where supported.

Measure:

```text
Recall@1
Recall@5
Recall@10
MRR
mAP
```

Label this clearly as:

```text
semantic text-to-image retrieval
```

not physical-instance identity.

---

## M5-B — Attribute text

Use actual supported metadata:

```text
black laptop
blue bottle
white shoe
```

and attribute-rich descriptions where valid.

Do not invent physical details.

---

## M5-C — Top-N semantic reranking

Preferred architecture:

```text
M4-C visual retrieval
        ↓
Top-N candidates
        ↓
SigLIP2 similarity
        ↓
semantic reranking
```

Test whether text helps within the candidate set.

Do not make SigLIP2 the primary physical-instance retriever unless a separate controlled experiment proves that it is beneficial.

---

## M5-D — Conflict tests

Create examples such as:

```text
image = laptop
text = shoe
```

and:

```text
image = shoe
text = bottle
```

Observe whether the system appropriately maintains physical visual evidence rather than blindly following contradictory text.

---

# 10. O2 — M2-C OPEN-SET HARDENING

## Objective

The system must distinguish:

```text
KNOWN
UNKNOWN
UNCERTAIN
```

The desired behavior is:

```text
known + confident → continue
uncertain           → review
unknown             → reject / review
```

---

## O2-A — Separate taxonomies

Maintain:

```text
known_current_taxonomy
unknown_current_taxonomy
known_final_taxonomy
unknown_final_taxonomy
```

This is especially important because some categories such as `book` and `camera` may transition from unknown to known later.

---

## O2-B — Expand unknown benchmark

Use multiple unrelated non-target categories where practical:

```text
chair
table
keyboard
monitor
plant
bicycle
```

Do not use a future product target class as a permanent unknown negative.

---

## O2-C — Feature audit

Collect distributions for:

```text
top-1 classifier confidence
top-2 confidence
margin
after-softmax entropy
Grounding DINO confidence
proposal count
detector/classifier agreement
```

Inspect each feature's ability to separate known and unknown examples.

---

## O2-D — Threshold selection

Use validation only.

Do not optimize final thresholds on test.

Investigate:

```text
precision
coverage
unknown rejection
false acceptance
```

The preferred operating regime is precision-first.

---

## O2-E — Decision region

Implement three regions where data support it:

```text
high-confidence known
→ accepted category

ambiguous region
→ UNCERTAIN / REVIEW

strongly unsupported
→ UNKNOWN / REJECT
```

Do not force every image into a known class.

---

## O2 gate

M2-C is sufficient to move forward when:

```text
explicit unknown handling exists
thresholds are validation-derived
unknown failures are measured
known-class recall remains usable
```

It does not require perfect open-set performance.

---

# 11. O3 — MULTIMODAL RERANKER

## Objective

Combine the evidence without destroying the physical-instance signal.

Candidate-level feature vector:

```text
visual_instance_similarity
text_image_similarity
category_agreement
attribute_consistency
optional context features
```

Start with:

```text
logistic regression
```

or a very small MLP.

Do not build a large transformer reranker.

---

# 12. RERANKER DATA SPLIT

Training:

```text
TRAIN only
```

Validation:

```text
VAL only
```

Final:

```text
TEST only after all choices are frozen
```

Do not use test labels to fit the reranker.

---

# 13. MISSING-FEATURE HANDLING

Missing metadata is not negative evidence.

Example:

```text
material = missing
```

must not mean:

```text
material mismatch
```

Represent missingness explicitly.

---

# 14. O4 — CALIBRATION

Calibrate decision scores so that:

```text
model score
```

is not confused with:

```text
probability of correctness
```

Start with logistic calibration.

Compare isotonic only if useful.

Evaluate:

```text
Brier score
Expected Calibration Error
calibration curve
precision at operating threshold
coverage
```

---

# 15. CATEGORY-SPECIFIC CALIBRATION

Where there are enough validation examples:

```text
phone threshold
wallet threshold
laptop threshold
book threshold
```

may be learned separately.

Where there is insufficient data:

```text
fall back to global calibration
```

Document the fallback.

---

# 16. O5 — INTEGRATE CATEGORY GATE + RETRIEVAL

Build the end-to-end visual pipeline:

```text
image
 ↓
Grounding DINO
 ↓
Category Gate
 ↓
object crop
 ↓
DINOv2 + M4-C
 ↓
FAISS
 ↓
Top-K candidates
```

If the category gate is uncertain:

```text
DO NOT silently behave as though the category were known.
```

Return a review state or safe fallback.

---

# 17. O6 — FINAL IMAGE INFERENCE ENTRY POINT

Create or standardize:

```text
scripts/run_inference.py
```

Input:

```text
image path
```

Output must contain at least:

```json
{
  "perception": {
    "category": "...",
    "confidence": 0.0,
    "decision": "known|unknown|uncertain"
  },
  "matches": [
    {
      "item_id": "...",
      "visual_score": 0.0,
      "text_score": null,
      "final_score": 0.0,
      "decision": "candidate|review|reject"
    }
  ]
}
```

Use actual numeric outputs.

Do not include private ownership evidence in public inference output.

---

# 18. O7 — TEXT SEARCH

Create or standardize:

```text
scripts/run_text_search.py
```

Input:

```text
"black laptop with stickers"
```

Use SigLIP2 semantic text-image retrieval.

Clearly label semantic retrieval separately from physical-instance identity retrieval.

---

# 19. O8 — IMAGE + TEXT SEARCH

Create or standardize:

```text
scripts/run_multimodal_search.py
```

Preferred flow:

```text
IMAGE
 ↓
M4-C
 ↓
visual candidate set

TEXT
 ↓
SigLIP2
 ↓
semantic evidence

candidate set
 ↓
reranker
 ↓
calibration
 ↓
Top-K
```

---

# 20. O9 — OWNERSHIP EVIDENCE PROTOTYPE

Create a lightweight non-production prototype.

Flow:

```text
retrieval candidate
      ↓
claimant submits private evidence
      ↓
protected comparison
      ↓
support / manual review / reject
```

Potential evidence:

```text
distinctive sticker placement
specific scratch
private marking
owner-supplied description
serial/model information supplied privately
```

Do not invent evidence.

Do not expose private evidence publicly.

Do not use facial recognition or infer owner identity from images.

---

# 21. O10 — FINAL EVALUATION SUITE

Create or standardize:

```text
scripts/run_final_evaluation.py
```

Evaluate:

## Perception

```text
precision
recall
F1
confusion matrix
unknown false acceptance
unknown rejection
```

## Retrieval

```text
Recall@1
Recall@5
Recall@10
MRR
mAP
```

## Hard negatives

```text
same-category Top-1 identity performance
false-match rate
```

## Multimodal

```text
image-only
text-only
image+text
```

## Calibration

```text
Brier
ECE
precision at operating threshold
coverage
```

---

# 22. O11 — FINAL ABLATION MATRIX

At minimum document:

```text
A = Frozen DINOv2
B = DINOv2 + SupCon
C = DINOv2 + SupCon + hard negatives
D = C + naive local branch                 [already rejected]
E = C + partial backbone fine-tuning       [already rejected]
F = C + SigLIP2 evidence
G = C + SigLIP2 + reranker
H = G + calibration/abstention
```

Do not rerun rejected experiments unless a new, explicit hypothesis justifies them.

---

# 23. IMPORTANT METRIC INTERPRETATION

Do not translate:

```text
Recall@1 = 0.94
```

into:

```text
94% chance of ownership
```

These are different concepts.

Recall@1 means the correct physical-instance result appeared at rank 1 for the evaluated queries.

Calibration addresses confidence.

Ownership evidence addresses claimant verification.

---

# 24. BENCHMARK SIZE WARNING

The current physical-instance universe is still relatively small.

Therefore:

```text
good benchmark score
≠
proven production robustness
```

Report dataset size with every major metric.

If a metric changes only slightly, report the exact change.

Do not call a tiny delta a major improvement.

---

# 25. REAL-WORLD ERROR ANALYSIS

Create a final error taxonomy:

```text
perception failure
category failure
crop failure
instance retrieval failure
hard-negative confusion
text mismatch
fusion failure
calibration failure
ownership verification failure
```

For representative cases, preserve:

```text
query
correct result
wrong result
scores
failure type
```

---

# 26. MODEL PACKAGING

Package the best validated model, not the newest model.

If M4-C remains the champion visual model, preserve it as the primary visual checkpoint.

If multimodal reranking is validated, package the reranker separately.

Suggested structure:

```text
models/
    m4c_best.pt
    reranker_best.pkl
    calibration.pkl
```

Use existing project conventions if different.

No fake placeholder checkpoint should be labeled `best`.

---

# 27. REPRODUCIBLE INFERENCE

A clean local command must eventually support:

```text
image
→ category
→ object crop
→ M4-C embedding
→ FAISS
→ Top-K
```

and, if available:

```text
image + text
→ candidate reranking
→ calibrated decision
```

The command must work against a small fixture dataset without network access where practical.

---

# 28. MODEL CARD

Create:

```text
reports/model_card.md
```

Include:

```text
model name
backbone
training data
instance count
image/view count
training objective
loss
hard-negative method
embedding dimension
known categories
known limitations
evaluation metrics
known failure modes
intended use
non-intended use
```

Explicitly document dataset-size limitations.

---

# 29. MODEL NAME

Use a stable project name.

Recommended:

```text
LP-RIEM-M4C
```

where:

```text
LP   = Lost Property
RIEM = Re-Identification Embedding Model
M4C  = current metric-learning stage
```

If the validated multimodal system becomes the stable final model, use a versioned extension such as:

```text
LP-RIEM-MM1
```

Do not rename models randomly across scripts.

---

# 30. LOGGING

Every experiment must record:

```text
experiment_id
timestamp
git_commit
dataset_manifest_hash
configuration_hash
seed
model checkpoint
dataset split
metrics
```

Terminal output alone is not sufficient documentation.

---

# 31. CONTEXT.MD — MANDATORY

After EVERY meaningful action, update:

```text
docs/context.md
```

Meaningful actions include:

- implementation
- dataset change
- training run
- evaluation
- bug fix
- architecture change
- threshold change
- experiment result
- rejected hypothesis
- scope decision

Use:

```text
### YYYY-MM-DD HH:MM — <Milestone / Experiment>

**Change:**

**Files changed:**

**Reason:**

**Evidence/results:**

**Decision:**

**Risks/issues:**

**Next action:**
```

Keep top-level sections synchronized:

```text
Current status
Current technical direction
Current open questions
Next action
```

Never fabricate values.

---

# 32. REPORTS TO KEEP UPDATED

Ensure applicable reports exist:

```text
reports/
  architecture/
    current_ml_architecture.md
    ml_design_decisions.md

  experiments/
    dinov2_frozen_baseline.md
    m4_metric_learning.md
    m4_hard_negative_results.md
    m4_local_feature_results.md
    m4d_finetuning.md
    m5_siglip2.md
    m2_category_gate.md
    m2c_open_set.md

  evaluation/
    perception_error_analysis.md
    hard_negative_analysis.md
    m4_retrieval_visual_audit.md
    m4c_retrieval_visual_audit.md
    m4b_retrieval_visual_audit.md
    multimodal_retrieval_analysis.md
    open_set_analysis.md
    error_analysis.md
    final_evaluation.md
```

Only create reports for work actually performed.

---

# 33. TEST REQUIREMENTS

Before finalizing:

```text
pytest
```

Run targeted tests for:

```text
schema
dataset
sampler
loss
embedding
FAISS
category gate
abstention
reranker
calibration
inference
```

Fix actual regressions.

Do not weaken assertions just to make tests pass.

---

# 34. GIT POLICY

Before finalizing:

```text
git status
git diff
```

Verify no repository pollution from:

```text
virtualenv
model caches
temporary downloads
raw massive datasets
Hugging Face cache
logs that are not intended for version control
```

Update `.gitignore` where required.

Commit code/report/config changes.

Use existing commit conventions if present.

---

# 35. FAILURE MATRIX

## Failure: SigLIP2 download

Try limited retries.

If cached weights exist, use them.

If not:

```text
document blocker
continue with M2-C/integration/local work
```

Do NOT silently substitute another checkpoint.

---

## Failure: SigLIP2 checkpoint/config error

Verify exact model identifier:

```text
google/siglip2-base-patch16-224
```

Check tokenizer/processor compatibility.

If the checkpoint is incompatible with the installed transformers version:

```text
attempt the smallest dependency correction
```

Do not rewrite unrelated project code.

---

## Failure: M2-C threshold destroys recall

Do not keep a threshold only because it eliminates false acceptance.

Perform a validation-only operating-point sweep.

Prefer a safe review region over unacceptable recall loss.

---

## Failure: M2-C still falsely accepts unknowns

Do not disable abstention.

Instead:

```text
tighten decision rule
increase uncertain region
expand unknown benchmark
route ambiguous cases to manual review
```

Document residual failures.

---

## Failure: Reranker hurts visual retrieval

If:

```text
multimodal > visual in complexity
but
multimodal < visual in held-out utility
```

keep M4-C as the primary retrieval stage.

Use text only for verification or optional secondary ranking.

Do not force multimodal fusion.

---

## Failure: Reranker cannot be trained

If there are insufficient reliable labeled pairs:

```text
use a deterministic evidence-combination baseline
```

or report semantic reranking as an untrained prototype.

Do not fabricate labels.

---

## Failure: Calibration unstable

If category-specific calibration has too few samples:

```text
fall back to global calibration
```

If global calibration is unstable:

```text
use conservative review-only mode
```

Do not publish uncalibrated scores as probabilities.

---

## Failure: End-to-end pipeline fails

Debug in this order:

```text
perception
→ crop
→ category
→ embedding
→ FAISS
→ reranker
→ calibration
```

Do not immediately retrain the model.

---

## Failure: Fine-tuning temptation

Do not return to DINOv2 fine-tuning unless substantially more identity data becomes available or a new evidence-based hypothesis requires it.

The current fine-tuning experiment did not improve held-out performance.

---

## Failure: Dataset scaling remains blocked

Do not synthesize fake instances.

Continue with the verified local dataset.

Document the limitation.

---

# 36. HARDWARE POLICY

Assume student-level hardware.

Use:

```text
frozen-backbone caching where applicable
mixed precision where supported
small batches
gradient accumulation if needed
early stopping
checkpoint resume
```

Monitor:

```text
RAM
VRAM
CPU
GPU
Disk
runtime
```

Do not launch a computation that risks exhausting local resources when a smaller controlled experiment can answer the same question.

---

# 37. STORAGE POLICY

The processed project corpus should remain approximately within:

```text
5–6 GB
```

Do not download the complete multi-hundred-GB/TB source datasets.

Monitor model-cache growth on the Windows machine.

Avoid duplicate model checkpoints.

---

# 38. DATA LEAKAGE POLICY

Absolutely prohibited:

```text
TEST → hard-negative mining
TEST → threshold selection
TEST → reranker training
TEST → calibration
TEST → hyperparameter tuning
```

Correct:

```text
TRAIN → train
VAL   → tune
TEST  → final report
```

---

# 39. MODEL DATA LINEAGE

Every final checkpoint must be traceable to:

```text
dataset_manifest_hash
split configuration
training config
seed
git commit
base model/checkpoint
```

Do not label a checkpoint as final without lineage metadata.

---

# 40. CATEGORY-SPECIFIC HARD CASES

## Books

Current known difficulty.

Investigate separately:

```text
proposal failure
crop failure
orientation
cover diversity
open/closed state
background clutter
```

Do not automatically respond with more data.

---

## Cameras

Historically weak in the perception stage.

Separate:

```text
proposal miss
category miss
retrieval miss
```

Do not use camera as both known and final unknown without clear taxonomy documentation.

---

## Phones

Future/expanded phone data should emphasize:

```text
case
camera arrangement
color
sticker
scratches
front/rear
screen state
```

The goal is physical-instance separation, not merely phone detection.

---

## Earphones / small objects

When implemented:

```text
small object
→ crop quality
→ resolution
→ detection confidence
→ abstention
```

Do not treat poor detector recall as a retrieval failure.

---

# 41. REAL-WORLD STRESS TESTS

Where the available dataset supports them, create evaluation groups for:

## View

```text
front
rear
side
angled
top
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
classroom
floor
bed
bag
clutter
```

## Occlusion

```text
partial
hand-held
behind-object
```

## Scale

```text
large
small
far-away
```

## Appearance

```text
color
case
sticker
logo
pattern
wear
scratch
```

Only claim robustness for conditions actually evaluated.

---

# 42. FINAL DECISION POLICY

Use an explicit decision state:

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

Do not collapse these into one scalar.

---

# 43. PRECISION-FIRST PRODUCT POLICY

The product should prefer:

```text
trustworthy candidate matches
+
manual review for uncertainty
```

over:

```text
maximum number of automatic claims
```

A wrong automatic match can be more harmful than asking staff to review a candidate.

---

# 44. OWNERSHIP POLICY

Never return:

```text
"This person owns this item"
```

solely because:

```text
visual similarity is high
```

Instead:

```text
candidate retrieval
→ claim
→ private evidence
→ verification
```

The ML retrieval engine and ownership workflow must remain separate.

---

# 45. FINAL EVIDENCE PACKAGE

Before stopping, generate:

```text
reports/final_overnight_summary.md
```

It must contain:

```text
1. Completed milestones
2. Incomplete milestones
3. Final validated model architecture
4. Best checkpoint path
5. Dataset size
6. Physical-instance count
7. Train/val/test counts
8. Final metrics
9. Best visual model
10. Best multimodal model if validated
11. Open-set metrics
12. Calibration metrics
13. Hard-negative metrics
14. Known failure modes
15. Rejected experiments
16. Remaining risks
17. Exact inference command
18. Exact training command
19. Exact next development step
```

---

# 46. FINAL MODEL SELECTION RULE

Choose the champion model using measured evidence.

Candidates may include:

```text
M3 frozen DINOv2
M4-A DINOv2 + SupCon
M4-C DINOv2 + SupCon + hard negatives
M5/M6 multimodal candidate
```

Choose based on:

```text
retrieval quality
hard-negative performance
open-set behavior
calibration
resource cost
complexity
```

Do not select a model solely because it has the highest single metric.

---

# 47. MINIMUM VIABLE FINAL ML SYSTEM

If the full multimodal stack cannot be completed overnight, the minimum defensible final research prototype is:

```text
Grounding DINO / perception
+
category gate
+
DINOv2 frozen
+
M4-C metric-learning projection
+
hard-negative-aware training
+
FAISS retrieval
+
unknown/uncertain handling
+
reproducible evaluation
```

This is preferable to an unstable feature-rich system.

---

# 48. IDEAL FINAL ML SYSTEM

If all gates pass:

```text
open-set perception
+
category verification
+
DINOv2 M4-C instance representation
+
hard-negative mining
+
FAISS
+
SigLIP2 semantic evidence
+
candidate reranking
+
calibration
+
abstention
+
ownership evidence
```

---

# 49. FINAL NORTH-STAR USER EXPERIENCE

A student uploads:

```text
photo of item
+
"black laptop with two stickers, lost near library"
```

System:

```text
1. Detects/locates likely object
2. Verifies category
3. Creates physical-instance embedding
4. Searches found-item gallery
5. Produces Top-K candidates
6. Checks text against candidates
7. Re-ranks candidates
8. Calibrates confidence
9. Abstains if evidence is weak
10. Requests private evidence for ownership
```

This is the intended end-to-end behavior.

---

# 50. FINAL OVERNIGHT EXECUTION LOOP

Repeat continuously while the environment permits:

```text
CHECK STATE
    ↓
SELECT HIGHEST-PRIORITY INCOMPLETE PHASE
    ↓
IMPLEMENT SMALLEST REQUIRED CHANGE
    ↓
RUN TESTS
    ↓
RUN EXPERIMENT
    ↓
MEASURE
    ↓
IF PASS:
    DOCUMENT
    UPDATE context.md
    COMMIT
    CONTINUE

IF FAIL:
    DIAGNOSE
    USE FALLBACK
    DOCUMENT
    CONTINUE WITH NEXT FEASIBLE TASK
```

Do not stop merely because one experiment is inconclusive.

An inconclusive experiment should produce:

```text
known limitation
+
next evidence-gathering action
```

---

# 51. FINAL RULES FOR THE MORNING HANDOFF

When the execution window ends, leave the repository in a state where a developer can immediately understand:

```text
What works?
What does not work?
What is the current champion model?
What data was actually used?
What metrics were actually measured?
What is still provisional?
What should be done next?
```

The morning developer should NOT need to reconstruct the overnight work from terminal history.

All essential information must be in:

```text
docs/context.md
reports/
experiment registry
model card
README or project docs where appropriate
```

---

# 52. FINAL PRINCIPLE

Do not optimize for the number of phases completed.

Optimize for the quality of evidence supporting the final system.

A smaller validated system is better than a larger unvalidated one.

A documented failure is better than a fabricated success.

A calibrated review decision is better than an unjustified automatic match.

The final target is:

> **A precision-first multimodal lost-property recovery engine that understands what an item is, distinguishes the physical item from visually similar alternatives, uses language as complementary evidence, can reject uncertainty, and separates candidate retrieval from ownership verification.**

END OF OVERNIGHT EXECUTION MASTER PROMPT.
