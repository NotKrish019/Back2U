# Implementation Plan

## Project

**Multimodal Lost Property Re-Identification & Ownership Verification**

## Core rule

This is an **ML-first project**. The trained/evaluated retrieval model is the main technical deliverable. The frontend and backend are deployment layers.

---

# 0. Project bootstrap

## Objective

Create a clean, reproducible project workspace and load the project instructions into Antigravity.

## Tasks

- Initialize Git repository.
- Create the directory structure defined in `SRD.md`.
- Create virtual/conda environment.
- Install minimal initial dependencies.
- Add `.gitignore` for raw data, processed data, checkpoints, caches, secrets and local artifacts.
- Read all project docs.
- Verify Python/PyTorch environment.

## Definition of done

- project runs a hello-world Python command
- imports for core ML stack succeed
- repository is initialized
- docs are present
- no dataset is downloaded yet

## Mandatory context update

Update `context.md` with environment versions, files created, and any setup issue.

---

# 1. Dataset audit before download

## Objective

Determine exactly which public dataset subsets can support the project.

## Tasks

- Inspect Objectron metadata/indexes.
- Inspect PACO-LVIS categories and query annotations.
- Inspect VoxDet-SoIR dependencies and gallery/query structure.
- Optionally inspect YCB-Video and Objects365 metadata.
- Produce category-overlap table.
- Record access/license requirements.
- Estimate disk size for a small experimental subset.

## Output

`reports/data_audit/dataset_inventory.json`

`reports/data_audit/dataset_inventory.md`

## Gate

**Do not download full datasets.**

Choose the smallest subset that can answer the first ML question.

## Mandatory context update

Record exact dataset versions/subsets and the decision about what will be downloaded.

---

# 2. Data ingestion and normalization

## Objective

Create a common internal representation across selected datasets.

## Tasks

- Implement dataset adapters under `src/data/`.
- Preserve source instance IDs where available.
- Normalize image paths.
- Normalize categories.
- Normalize bounding boxes/masks.
- Normalize attributes.
- Normalize text/query fields where present.
- Add validation scripts.
- Produce counts and integrity report.

## Definition of done

A single loader interface can return samples in a common schema.

Suggested sample schema:

```python
{
  "image_path": str,
  "instance_id": str | None,
  "category": str,
  "bbox": list | None,
  "mask_path": str | None,
  "attributes": dict,
  "text": str | None,
  "source_dataset": str,
}
```

## Mandatory context update

Record schema, counts, failed samples, and any normalization decisions.

---

# 3. Build valid train/validation/test splits

## Objective

Prevent instance leakage.

## Tasks

- Identify persistent physical-instance IDs where available.
- Generate instance-disjoint splits.
- For datasets without identity across images, follow the official benchmark split.
- Add a script that verifies no forbidden instance overlap.
- Generate hard-negative sets.

## Definition of done

The project can reproduce the same split from a config + seed.

## Mandatory context update

Record split counts and leakage checks.

---

# 4. Baseline: image embedding retrieval

## Objective

Establish the simplest credible baseline.

## Tasks

- Select a practical pretrained vision backbone.
- Extract embeddings.
- Normalize embeddings.
- Build nearest-neighbour index using FAISS or equivalent.
- Implement image-to-image retrieval.
- Compute Recall@1/5/10 and mAP where appropriate.
- Store qualitative top-k results.

## Definition of done

Given a query image, the system returns ranked gallery images and measurable metrics.

## Mandatory context update

Record model, backbone, dataset, split, metrics and failure examples.

---

# 5. Object localization baseline

## Objective

Reduce background bias by detecting/segmenting the object before embedding.

## Tasks

- Integrate a pretrained object detector/segmenter.
- Extract object crop/mask.
- Compare full-image vs object-crop retrieval.
- Measure whether localization improves retrieval.

## Definition of done

A reproducible comparison exists:

`full image retrieval` vs `object-crop retrieval`.

## Mandatory context update

Record detector choice and metric differences.

---

# 6. Train a task-specific Siamese / metric-learning model

## Objective

Move from frozen embeddings to a model adapted to instance retrieval.

## Initial architecture

```text
Image A -> shared backbone -> projection head -> embedding A
                                                \
                                                 distance
                                                /
Image B -> shared backbone -> projection head -> embedding B
```

## Tasks

- Implement pair/triplet sampler.
- Start with frozen backbone + trainable projection head.
- Implement contrastive loss or triplet loss.
- Train on instance-disjoint data.
- Compare against baseline.
- Unfreeze additional layers only if justified.

## Definition of done

The trained model can retrieve instances and has reproducible evaluation results.

## Mandatory context update

Record loss, architecture, hyperparameters, checkpoint, metrics and compute time.

---

# 7. Fine-grained local feature branch

## Objective

Improve discrimination between visually similar items.

## Tasks

- Implement a global feature branch.
- Add local/patch-level descriptors.
- Fuse global and local features.
- Create hard-negative evaluation set.
- Compare against global-only model.

## Definition of done

Ablation demonstrates whether local features help on hard negatives.

## Mandatory context update

Record architecture change and quantitative improvement or failure.

---

# 8. Text-only retrieval for vague lost descriptions

## Objective

Handle users who have no photograph.

## Tasks

- Select a text encoder compatible with the chosen vision representation.
- Normalize textual descriptions.
- Establish text → image retrieval baseline.
- Evaluate short/vague queries separately.
- Where appropriate, use PACO query/attribute annotations.

## Example

Input:

> `black bottle with a red sticker`

Output:

Top candidate found-item images ranked by multimodal compatibility.

## Definition of done

The system can execute and evaluate text-to-image retrieval independently of the frontend.

## Mandatory context update

Record text encoder and query construction strategy.

---

# 9. Multimodal image + text retrieval

## Objective

Combine the two evidence types.

## Candidate approaches

### A. Late fusion

```text
image score + text-image score
```

### B. Learned fusion/ranker

```text
image embedding
text embedding
attributes
      ↓
MLP / ranking model
      ↓
final score
```

Start with late fusion as baseline, then test learned fusion.

## Definition of done

Compare:

- image only
- text only
- image + text

using the same evaluation protocol.

## Mandatory context update

Record fusion architecture, metrics and whether fusion actually helps.

---

# 10. Context-aware candidate ranking (optional)

## Objective

Use location/time as supporting information.

## Tasks

Represent context separately:

- spatial compatibility score
- temporal compatibility score

Combine context with learned visual/text evidence.

## Rule

Context must not be allowed to override strong visual mismatch without empirical justification.

## Definition of done

An ablation shows the effect of context.

## Mandatory context update

Record the exact scoring method and result.

---

# 11. Ownership verification (optional but recommended)

## Objective

Reduce false claims after candidate retrieval.

## Approach

Keep some distinctive item attributes private.

Example:

- visible: black backpack
- hidden: red keychain near right zipper

Ask claimant a small number of questions and compare against stored evidence.

## Important

This is not legal proof of ownership. It is an additional product workflow signal.

## Definition of done

A safe verification flow works without exposing hidden attributes before the user answers.

## Mandatory context update

Record verification logic and limitations.

---

# 12. Robustness and failure analysis

## Objective

Evaluate real-world image conditions.

## Test conditions

- viewpoint shift
- lighting shift
- background clutter
- blur
- low resolution
- partial occlusion
- crop/scale change

## Tasks

- build controlled corruptions where necessary
- measure metric degradation
- inspect false positives
- document failure cases

## Definition of done

A robustness report exists and includes qualitative examples.

## Mandatory context update

Record which conditions hurt performance and what was tried.

---

# 13. Experimentation and ablation suite

## Objective

Turn the project into a research-quality experimental study.

## Required comparisons

1. pretrained image embedding baseline
2. trained Siamese/metric model
3. global + local features
4. text-only retrieval
5. image + text fusion
6. optional context ranking

## Output

`experiments.md`

`reports/metrics/`

`reports/figures/`

## Mandatory context update

Every experiment must update `experiments.md` and `context.md`.

---

# 14. Retrieval service / backend

## Objective

Expose the stable ML pipeline through an API.

## Tasks

- package inference code
- implement FastAPI endpoints from `SRD.md`
- add validation
- add structured logs
- add model versioning
- add inference tests

## Definition of done

API can execute a saved model checkpoint and return top-k candidates.

## Mandatory context update

Record API routes, model version and integration status.

---

# 15. Application database and indexing

## Objective

Store found-item representations and metadata.

## Tasks

- item table
- report table
- metadata table
- vector index
- model/checkpoint version field
- deletion/retention flow

## Definition of done

New found items can be indexed and retrieved without retraining the model.

## Mandatory context update

Record schema and migration decisions.

---

# 16. Frontend

## Objective

Provide a simple user-facing workflow.

## Pages

- Report Lost
- Report Found
- Search Results
- My Reports
- Candidate Verification
- Admin/Moderation (optional)

## Definition of done

A user can complete a full search flow from browser to model inference and back.

## Mandatory context update

Record completed features and API integration changes.

---

# 17. Optional RAG module

## Do this only after the core retrieval system works.

## Appropriate use cases

RAG can answer questions grounded in static documents such as:

- “Where is the lost-and-found office?”
- “What documents are required to claim an item?”
- “What are the campus item-retention rules?”
- “How long are found items kept?”

## Inappropriate use

Do not use RAG for:

- image similarity
- instance retrieval
- embedding generation
- final identity matching

## Definition of done

RAG is isolated as a separate service/module and does not change the core ML evaluation.

## Mandatory context update

Record corpus, chunking, embedding model, retrieval method, evaluation and scope.

---

# 18. Final evaluation

## Required deliverables

- final dataset audit
- final train/val/test split description
- best model checkpoint
- baseline comparison
- ablation study
- robustness analysis
- inference benchmark
- sample retrieval galleries
- failure analysis

## Definition of done

The project can answer, with evidence:

1. Does the model retrieve the same physical object?
2. How much better is it than the baseline?
3. Does text help when no reference image exists?
4. Does multimodal fusion help?
5. Where does the system fail?

## Mandatory context update

Record final metrics, known limitations and final architecture.

---

# 19. Final documentation and presentation

## Documentation

- `README.md`
- `PRD.md`
- `SRD.md`
- `IMPLEMENTATION_PLAN.md`
- `DATASET_STRATEGY.md`
- `RESEARCH_PLAN.md`
- `context.md`
- `experiments.md`
- model card / limitations section

## Presentation storyline

1. Real-world problem
2. Why category/keyword matching is insufficient
3. Problem formulation as instance retrieval
4. Dataset strategy
5. Baseline
6. Proposed architecture
7. Training method
8. Retrieval results
9. Multimodal contribution
10. Robustness/failure analysis
11. Live application
12. Limitations and future work

---

# Project operating checklist

Before moving from Step N to Step N+1:

- [ ] acceptance criteria met
- [ ] tests/checks passed
- [ ] results saved
- [ ] experiment recorded if applicable
- [ ] `context.md` updated
- [ ] deviations documented
- [ ] next task is clearly defined

**Never skip the `context.md` update.**
