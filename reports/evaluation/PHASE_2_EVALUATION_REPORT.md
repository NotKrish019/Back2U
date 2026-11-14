# LP-RIEM-MM1 — Phase 2: Real-World Evaluation & Data Foundation

**Date:** 2026-11-02 · **Branch:** `pre-ui-lab-production-migration` (uncommitted) · **Training:** none performed.

**Evidence labels used in this report:**
- **MEASURED**: computed in this phase from files on disk.
- **EXPLORATORY**: measured, but on too little data to support decisions.
- **HISTORICAL**: from earlier reports, not reproducible.
- **UNAVAILABLE**: cannot be computed with the data present.
- **UNVERIFIED**: an assumption that has not been checked.

---

## 1. Executive summary
- **The real-world dataset the brief assumes is not on this machine.** `data/raw/real_world_instances/`, the validator, both collection-protocol documents and the two foundation/progress reports do not exist in the repo, any branch, stash or worktree, git history, or the user's Desktop/Downloads/Documents/Pictures. The previously reported pools (75 laptop, 1,260 phone, 324 earphone and 6,655 headphone images; 35 Objectron laptop instances) could not be found.
- **Actual genuine real-world images for the 7 categories: 23, all laptops** (MEASURED):
  - 4 Back2U app photos of 2 laptops
  - 19 historical Objectron detector crops of 10 laptops
  - **0 images** for mobile_phone, wallet, earphones, headphones, keys and book
- **Verified physical instances: 12, all laptop.** 0 are M4-C-eligible (≥ 3 genuine original views).
- **The primary 7-category preprocessing comparison is BLOCKED.** The four conditions (A full image, B detector crop, C ground-truth crop, D detector crop + letterbox) were implemented, tested, and run **only** as an exploratory laptop pilot. **No condition is measurably better.** D's apparent win comes from one query whose detector crop was the *wrong object* (a charger).
- **The binding failure in the pilot is the M4-C model, not preprocessing.** One of the two app laptops is never matched across its two views, even with oracle ground-truth crops.
- **Grounding DINO (exploratory, 4 real photos):**
  - correct proposal recall 4/4, but the correct selection only 3/4
  - one *multiple-object selection error*: a laptop charger labelled "mobile phone" at 0.793 outscored the laptop at 0.551
  - the synthetic hard-case pass reproduces the same failure family: keys → background object; calculator, bottle and notebook → "mobile_phone"
- **Infrastructure delivered and tested** (17 new tests, all executed and passing): manifest, auditor, 4-condition evaluator with per-query outputs and reproducibility (26 output files byte-identical across reruns), detector evaluator and collection template.
- **No production code, thresholds, checkpoints, model version or production gallery were changed.**

## 2. Repository state (recorded before any change)
- **Branch:** `pre-ui-lab-production-migration` at `5566697`.
- **Uncommitted at start:** exactly the Phase 1 working tree (12 modified and 9 untracked paths, listed in the Phase 1 report). Nothing was reset, checked out, cleaned or committed.
- **Phase 2 additions (all new files; no production file modified):**
  - `src/evaluation/phase2/{__init__,manifest,preprocessing,retrieval_eval,detector_eval,dataset_audit,models,runner}.py`
  - `scripts/evaluation/{run_preprocessing_eval,audit_real_world_data,build_phase2_manifest,evaluate_grounding_dino}.py`, `configs/*.json`, `templates/instance.template.json`, `README.md`
  - `tests/evaluation/{__init__,test_phase2_eval}.py`
  - `reports/evaluation/PHASE_2_*.md`, `reports/evaluation/phase2_audit/`, `reports/evaluation/phase2_runs/`
  - Git-ignored data: `data/raw/real_world_instances/`, `data/raw/historical_objectron_crops/` (copies only) and `data/processed/phase2_evaluation_manifest.jsonl`. **These git-ignored paths will not be committed.** Version them separately (DVC or object storage) if they must be shared.
- **Production gallery:** `data/gallery/` does not exist and was not created. The evaluation code never instantiates `FinalInferencePipeline`.

## 3. Active model / checkpoint verification (MEASURED)
Hashes were taken from the files and from a running ML service started on a scratch port with a scratch gallery directory:

| Artifact | SHA-256 | Matches Phase 1 |
|---|---|---|
| `models/checkpoints/m4_c/best_val_recall_at_1.pt` | `7aef423c63a258de9da6301cb545c993cb64c81bd7f75fcf3ef73381455881eb` | yes |
| `models/checkpoints/m2_category_head_best.pth` | `78c3ed08577a0ba1bdd5b84897b636ffb6945a356eb245a63ee38bd4c5214a51` | yes |
| `data/processed/m2_categories.json` (`{"0":"laptop","1":"Laptop"}`) | `32039966b2dbe0ac15583ea8847b6b3a7f23a15a951b4dd54c0fd653caf0555d` | yes |
| `models/reranker_calibration.pkl` | `6f9ffee1f74f3182445d80a3816b9e2d40b1e21b7686f1f10ddd12ee3b3296dd` | yes |

- **Running service:** `/api/health` reports `status: ready`, `model_version: lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`, and detector prompt `laptop. mobile phone. wallet. earphones. headphones. keys. book.`
- **Every evaluation output records** the model version, checkpoint SHA-256, detector prompt, manifest SHA-256 and full config.

## 4. Actual available real-world data (MEASURED)

| Quantity | laptop | mobile_phone | wallet | earphones | headphones | keys | book |
|---|---:|---:|---:|---:|---:|---:|---:|
| Original image files (instance dirs) | 25 (5 app + 20 crops) | 0 | 0 | 0 | 0 | 0 | 0 |
| Genuine images (deduplicated) | 23 | 0 | 0 | 0 | 0 | 0 | 0 |
| Physical instances (trustworthy identity) | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| Instances with ≥ 3 genuine views | 1 (crops only) | 0 | 0 | 0 | 0 | 0 | 0 |
| **M4-C-eligible images** | **0** | 0 | 0 | 0 | 0 | 0 | 0 |

- **Readability:** every file was readable.
- **Duplicates found and excluded:**
  - `item_e985fea2.jpg` = `item_f13a5f47.jpg` = `test_image.jpg` (byte-identical)
  - `objectron_laptop_batch-29_3` view 16 is a consecutive-frame near-duplicate of view 15
- **Not counted:**
  - mocks (synthetic)
  - `vis_*` renderings (boxes drawn on)
  - `test.jpg` (kitchen scene)
  - the 2 seeded DB reports (their images don't exist)
- **Missing validator:** `scripts/validate_real_world_instances.py` **does not exist**, so it was not run. `scripts/evaluation/audit_real_world_data.py` performs the validation instead (raw output: `reports/evaluation/phase2_audit/real_world_audit.json`).

## 5. Category dataset audit
See `PHASE_2_CATEGORY_DATA_AUDIT.md`.
- **laptop:** NEEDS MORE DATA.
- **All other six categories:** NOT AVAILABLE. Earphones and headphones become NEEDS LABEL VERIFICATION if the reported pools are located.

## 6. Physical-instance dataset audit
See `PHASE_2_INSTANCE_DATA_AUDIT.md`.
- **12 trustworthy laptop instances, 0 eligible.**
- **Objectron crops** carry **UNVERIFIED** M4-C training-overlap risk: they come from the historical test split, and the split files are missing.

## 7. Grounding DINO evaluation
Script: `scripts/evaluation/evaluate_grounding_dino.py`. Output: `reports/evaluation/phase2_runs/grounding_dino_pilot/grounding_dino_eval.json`.
Settings: production prompt and thresholds (box 0.3, text 0.3), production `select_crop`, IoU ≥ 0.5 criterion.

### 7.1 Real photos — EXPLORATORY
4 app laptop photos, 2 instances. Boxes are assistant-verified, not human-verified.

| Metric | Value |
|---|---|
| Object proposal recall (any label, IoU ≥ 0.5) | 4/4 = 1.00 |
| Correct-category proposal rate | 4/4 = 1.00 |
| **Selected box correct** (production choice) | **3/4 = 0.75** |
| Missed-object rate | 0/4 |
| Wrong-category selection (right object, wrong label) | 0/4 |
| **Multiple-object selection error** (right box existed, another chosen) | **1/4** |
| Proposals carrying a non-GT category | 6/12 = 0.50 |
| Mean IoU of selected box | 0.745 (0.99 on the 3 correct; 0.0 on the error) |

- **Failure:** in `laptop_app_u002/view_02`, the selected box is a "mobile phone" at **0.793**. Visual inspection shows it is the **HP laptop's charger brick** on the pillow. The correct laptop proposal (0.551, IoU 0.998) ranked second.
- **Repeated pattern:** the same charger in `u002/view_01` also produced a "mobile phone" proposal (0.636), and a sticker produced one in `u001/view_01` (0.398). The laptop won in those photos only because its own score was higher.
- **Scores are not probabilities.** The wrong object scored *higher* than every correct laptop box in the set.

### 7.2 Synthetic hard-case diagnostic — QUALITATIVE ONLY
8 AI-generated mock images, no ground-truth boxes; selected crops were inspected visually.

| Intended object | In taxonomy | Selected | Verdict (visual) |
|---|---|---|---|
| headphones | yes | headphones 0.622 | correct |
| mobile phone | yes | mobile_phone 0.457 | correct |
| wallet | yes | wallet 0.595 | correct |
| **keys** | yes | mobile_phone 0.637 | **wrong object**: a book/box edge in the background; `keys` proposals existed at 0.36, 0.33 and 0.30 |
| calculator | no | mobile_phone 0.647 | correct object, **false category** (would be indexed as a phone) |
| bottle | no | mobile_phone 0.341 | correct object, false category |
| notebook | no | "laptop mobile phone" → mobile_phone 0.387 | correct object, false category |
| backpack | no | no detection → full-image fallback | appropriate |

**Not evaluated, no images:** earphones and book.

**Conclusion (exploratory):** the main detector risk is **selection, not recall**. Highest-score-wins picks a distractor (chargers, background items) even when the correct proposal exists. Out-of-taxonomy rectangular objects collapse into "mobile_phone".

## 8. Preprocessing comparison
Script: `scripts/evaluation/run_preprocessing_eval.py`. Configs: `scripts/evaluation/configs/`. Outputs: `reports/evaluation/phase2_runs/<run>/`.

**Fairness guarantees (all enforced in code and tested):**
- the same checkpoint (SHA verified at run time)
- one embedding per image per condition, used for both query and gallery
- a separate gallery per condition
- identical gallery membership (the gallery-key hash is recorded)
- the exact query image *and* byte-identical copies are excluded from the gallery
- instance-level max-pooling, with pessimistic tie-breaking
- detector boxes, ground-truth boxes and crop sizes recorded in `preprocessing.jsonl`

### 8.1 Primary real-world 7-category comparison — **BLOCKED**
No genuine images exist for 6 of the 7 categories, and only 2 laptop instances have original photos with boxes.

### 8.2 Pilot A — Back2U app laptop photos (EXPLORATORY)
4 queries, 2 instances, 4 gallery images.

| Condition | R@1 | R@5 | R@10 | MRR | Hard-negative top-1 |
|---|---:|---:|---:|---:|---:|
| A full image | 0.50 | 1.00* | 1.00* | 0.75 | 0.50 |
| B detector crop | 0.50 | 1.00* | 1.00* | 0.75 | 0.50 |
| C ground-truth crop (oracle) | 0.50 | 1.00* | 1.00* | 0.75 | 0.50 |
| D detector crop + letterbox | 0.75 | 1.00* | 1.00* | 0.875 | 0.75 |
| A + letterbox (diagnostic) | 0.50 | 1.00* | 1.00* | 0.75 | 0.50 |

\* Trivial: with 2 instances, every query has the right answer within its top 2.

### 8.3 Pilot B — historical Objectron laptop crops (EXPLORATORY, possible training overlap)
17 queries, 8 query instances, 10 gallery instances, 19 images. The inputs are already crops (old detector box), so only the transform effect can be tested.

| Condition | R@1 | R@5 | R@10 | MRR | Hard-negative top-1 |
|---|---:|---:|---:|---:|---:|
| A stored crop, production transform (Resize 256 → CenterCrop 224) | 0.882 (15/17) | 1.00 | 1.00* | 0.941 | 0.882 |
| A + letterbox (aspect-preserving) | 0.824 (14/17) | 1.00 | 1.00* | 0.897 | 0.824 |
| B / C / D | **BLOCKED**: no original frames or ground-truth boxes | | | | |

**Paired check:**
- Letterbox fixed 1 query and broke 2; the other 14 are unchanged. Exact McNemar p = 1.0: **no evidence of a difference**.
- In Pilot A, D differs from B on 1 query; p = 1.0.

### 8.4 Best measured preprocessing
**None can be identified.**
- **D's gain is spurious.** The +1 query on the app photos is `u002/view_02`, whose D crop is the *charger*. It "wins" only because a wrong-object crop happened to score below the hard negative.
- **No default is chosen.** No production preprocessing default is recommended or changed.

## 9. Per-query failure analysis (EXPLORATORY)

| Query | Fails in | True-instance score vs hardest negative | Cause |
|---|---|---|---|
| `laptop_app_u002/view_01` (HP, top-down, cluttered desk) | A, B, C, D | A 0.497 vs 0.515 · C 0.447 vs 0.593 | **Model**: even with the oracle crop, the two HP views are less similar to each other than to the MacBook. M4-C (trained on ~70 Objectron instances) does not bridge top-down vs oblique views or sticker detail. |
| `laptop_app_u002/view_02` (HP, oblique, on bed) | A, B, C | B 0.289 vs 0.386 | Model limitation as above; in B and D, also the **wrong-object crop** (charger). |
| `laptop_app_u001/*` (MacBook) | none | margins +0.08 to +0.24 | — |
| `objectron_13_35/rec07` | A and letterbox | −0.19 / −0.35 | Confused with `13_12`, a visually similar laptop |
| `objectron_13_12/rec06` | A only | −0.069 | Letterbox fixed it |
| `objectron_13_35/rec08`, `objectron_17_6/rec18` | letterbox only | −0.058 / −0.016 | Letterbox broke them |

**Hypotheses from Phase 1, now partially checked (EXPLORATORY):**
1. *Detector picks the wrong object:* **confirmed** (1/4 real, 1/4 synthetic in-taxonomy).
2. *Different crops across photos:* **confirmed** for u002, where one view got the laptop and the other the charger.
3. *CenterCrop discards the ends of elongated objects:* **not supported** by this data. Letterbox did not help on 17 Objectron queries.
4. *Query/gallery consistency:* enforced by construction; no inconsistency possible in the evaluator.
5. *Calibrator invalid for crops:* **UNAVAILABLE**. The reranker was not evaluated (no SigLIP2 text in this data); still unverified.

## 10. Category data gaps
See `PHASE_2_CATEGORY_DATA_AUDIT.md` §2.
- **Zero-data categories:** 6 of 7.
- **Wallet and keys** have no identified reusable source at all.

## 11. Instance data gaps
See `PHASE_2_INSTANCE_DATA_AUDIT.md`.
- **Eligible instances:** 0 in every category.
- **Best available reusable source:** the public Objectron laptop and book videos, with multi-view frames and 2D boxes (HISTORICAL metadata: 1,473 laptop / 2,023 book videos).

## 12. Collection targets
See `PHASE_2_COLLECTION_PLAN.md`.
- **Full targets:** 1,350 instances, all still required (~6,750 photos at 5 views).
- **Stage-1 pilot:** 54 instances / ~216 photos, with mandatory hard-negative pairs per category and human-verified boxes.

## 13. Unresolved risks
1. **External data may exist elsewhere** (another machine or drive). If so, every count here must be re-run with `audit_real_world_data.py`. The audit is cheap and will not double-count augmentations.
2. **Ground-truth boxes are assistant-verified, not human-verified.** They were also derived from detector proposals, which biases C towards B.
3. **Objectron training overlap is unverifiable** (splits lost).
4. **The pilot is laptop-only with n = 4 and n = 17 queries.** None of these numbers generalise to other categories or to production.
5. **Detector selection policy** (highest score wins) is the dominant crop-error source seen so far. Production still uses it, unchanged, per the Phase 2 rules.
6. **Reranker/calibrator validity** for crop embeddings remains unknown (ECE 0.22 historically).
7. **Identity of the app laptops** rests on visual sticker matching; owner confirmation is pending.
8. **The torch/faiss duplicate-libomp workaround** (Phase 1) remains in place.

## 14. Recommended Phase 3 plan
1. **Collect Stage-1 pilot data** (54 instances × 4 views, 7 categories, human-verified boxes), or point us to the previously reported datasets. Then rerun the audit, manifest builder and both evaluations unchanged. This is the unblocking step; nothing below is decidable without it.
2. **Re-acquire Objectron laptop and book originals** with ground-truth boxes (public), so conditions B/C/D can be compared on more than 2 instances. Treat them as instance data only after confirming they were not in M4-C training; otherwise use them for validation only.
3. **Evaluate detector selection policies** (evaluation-only first): category-hinted selection using the report's category, largest-box vs highest-score, and multi-crop gallery indexing. Measure with the detector evaluator before touching production.
4. **Only then** choose a preprocessing default, on the instance-disjoint TEST split.
5. **Model work** (requires explicit authorization): M2 retraining once ≥ READY data exists for all 7 categories; M4-C retraining with eligible multi-view instances, given that the pilot shows the model, not localisation, limiting cross-view matching.

---

## Appendix — tests (executed 2026-11-02)
- `pytest tests/evaluation`: **17 passed**. Covered:
  - query exclusion, including byte-identical copies
  - instance-disjoint split enforcement
  - duplicate key and cross-instance duplicate rejection
  - missing files are fatal
  - symmetric query/gallery preprocessing
  - separate per-condition galleries with identical membership
  - max-pooling instance aggregation with pessimistic ties
  - hand-computed R@k/MRR/hard-negative values
  - same-category-only hard negatives
  - letterbox geometry
  - condition crop boxes
  - checkpoint-hash refusal
  - BLOCKED condition when boxes are missing
  - detector error taxonomy
  - audit dedup/augmentation/near-duplicate counting
  - Roboflow source grouping
  - explicit missing roots
  - byte-identical reproduction (fake models)
- **Real-model reproducibility:** rerunning `phase2_pilot_user_photos` gave **26/26 output files byte-identical** (embeddings, detections, predictions, metrics).
- **Full suite** `pytest tests`: **111 passed, 5 failed, 1 skipped**. The 5 failures are the same pre-existing ones documented in Phase 1 (auth override, Objectron adapter data, retired mock); Phase 1 tests are unaffected.
