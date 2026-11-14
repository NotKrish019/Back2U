# Phase 2C — CO3D Quality Control and Retrieval Diagnostics

**Date:** 2026-11-02 · **Branch:** `pre-ui-lab-production-migration` (uncommitted).
- **Checkpoint:** M4-C SHA-256 `7aef423c…81eb`, unchanged. Production model version `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`.
- **Data:** CO3D pilot, 141 sequences / 853 views. The original manifest is **unchanged** (SHA-256 `a1a637e5…`, verified before and after).
- **Not done:** no training, no threshold, crop-default or reranker change, no production gallery. CO3D stays CC BY-NC 4.0, research only.

## 1. Human QC status — **PENDING**
**The assistant cannot act as the human reviewer.** The workflow below is ready; no decision has been recorded, and nothing is marked TRUSTWORTHY.

**Review page:** `reports/evaluation/co3d_pilot/qc_review/index.html`.
- **Local only:** it shows CO3D imagery and is git-ignored. Do not publish or upload it.
- **Per sequence:** checkboxes for the five flags (wrong category, different object within the sequence, incorrect bounding box, poor viewpoint diversity, severe blur) and an explicit **APPROVE / REJECT / UNCERTAIN** decision.
- **Per pair:** **same physical unit / same model, different unit / different physical units / uncertain identity**.
- **Per group:** a "reviewed" tick plus free-text same-unit sets.
- **Sign-off:** reviewer name and a final "I approve" box.
- **Saving:** progress is kept in the browser; **Export** downloads `human_qc_results.json`, which goes to `reports/evaluation/co3d_pilot/human_qc_results.json` (currently a PENDING template with every decision null).

**Required items (47 decisions):**

| Requirement | Items |
|---|---|
| 5% sample sheets | 7 sequences |
| Suspicious cross-sequence pairs | 6 pairs |
| Book `209_*` group | **11** sequences + group overview. Phase 2B said 12; corrected here and in the earlier reports. |
| High-risk laptop groups | `372_*` (5), `373_*` (3), `374_*` (3), `378_*` (5), and **`391_*` (3, added: near-consecutive IDs)**, each with a group overview |
| Distinct sequences in total | **35** (overlaps removed), plus 6 group overview sheets |

**Applying decisions:** `scripts/evaluation/co3d_apply_qc.py`.
- Results apply **only if** the status is SUBMITTED, a reviewer is named, final approval is ticked, **and every one of the 47 items has an explicit decision**. A single missing decision blocks everything (unit-tested).
- Output: a **separate** derived manifest, `data/processed/co3d_phase2_qc_reviewed_manifest.jsonl`, and `data/processed/co3d_phase2_identity_relations.json`.
- Merges happen only in the derived manifest. Every sequence, merged or not, stays reserved from training.

## 2. Sequence identity decisions (current derived state)

| | Count |
|---|---:|
| QC applied | **no** (50 blocking items: status PENDING, no reviewer, 47 undecided items) |
| Sequences approved / TRUSTWORTHY | **0** |
| Sequences rejected | 0 |
| Sequences explicitly uncertain | 0 (all 141 remain `SOURCE_SEQUENCE`) |
| Merged identities | **0** |
| Relationships marked UNCERTAIN, excluded from hard-negative accuracy | **87** (6 pairs + every within-group pair of the 6 high-risk groups) |
| Human-verified negatives | 0 |
| All other cross-sequence relationships | UNVERIFIED, source-asserted |

**Assistant pre-screen.** Non-binding; recorded here only to help the reviewer, and **not** in `human_qc_results.json`:
- **Book `209_*`:** 11 sheets show **11 different titles** (e.g. *Crimson Kiss*, Neil Gaiman, *Wounds*, *Buffy – The Lost Slayer*, *The Vampire Princess*, *Magic and Madness*, *The Gathering Dark*, Laymon, Straub), so almost certainly different books. `209_22181_45211` shows only its back and spine, so its title can't be confirmed. All were filmed on the **same wooden stool in one kitchen**.
- **Laptops:** `372_40878_81136` (wooden table), `372_41062_82211` (marble floor) and `378_44211_88110` (jute mat) all show a dark-grey HP Compaq of the same model. They **may be one laptop filmed three times on different backgrounds**, across two prefixes. The other laptops in groups 372 and 378 are visibly different models or colours (MacBook, black HP, Dell, silver/black, black with a hexagon sticker).

## 3. Suspicious cross-sequence pairs

| Pair | Max view cosine | Pre-screen | Human verdict |
|---|---:|---|---|
| 372_40878_81136 ↔ 378_44211_88110 | 0.950 | possibly the same HP Compaq, different backgrounds | PENDING |
| 378_44207_88121 ↔ 378_44211_88110 | 0.941 | different units, **same jute mat** (background-driven) | PENDING |
| 372_40878_81136 ↔ 372_41242_82155 | 0.940 | black HP vs grey Compaq; looks different | PENDING |
| 372_41062_82211 ↔ 378_44211_88110 | 0.928 | possibly the same HP Compaq | PENDING |
| 372_40878_81136 ↔ 375_42571_85394 | 0.927 | not inspected | PENDING |
| 372_40878_81136 ↔ 372_41337_82330 | 0.926 | grey Compaq vs silver/black Dell; looks different | PENDING |

## 4. Category-restricted retrieval
Same 853 queries, same embeddings (no re-embedding) and same checkpoint; QC-derived identities. The 87 uncertain relationships are excluded from hard-negative accuracy only.
- Script: `scripts/evaluation/co3d_category_restricted_eval.py`.
- Evaluator: `src/evaluation/phase2/retrieval_eval_qc.py`, unit-tested to reproduce the Phase 2 evaluator exactly when unrestricted.
- **The category-restricted gallery is an ORACLE diagnostic, not production behaviour.**

### Overall, mixed → category-restricted (oracle)

| Condition | R@1 | R@5 | R@10 | MRR | HN top-1 (853 queries with an eligible negative) |
|---|---|---|---|---|---:|
| A full image | 0.796 → 0.800 | 0.897 → 0.900 | 0.938 → 0.940 | 0.843 → 0.847 | 0.830 |
| B detector crop | 0.720 → 0.728 | 0.872 → 0.873 | 0.924 → 0.927 | 0.793 → 0.798 | 0.760 |
| C ground-truth crop | 0.699 → 0.707 | 0.870 → 0.875 | 0.923 → 0.927 | 0.775 → 0.782 | 0.741 |
| D detector crop + letterbox | 0.762 → 0.764 | 0.904 → 0.907 | 0.946 → 0.950 | 0.824 → 0.827 | 0.804 |
| A + letterbox (diagnostic) | 0.812 → 0.816 | 0.928 → 0.931 | 0.958 → 0.960 | 0.866 → 0.869 | 0.858 |

### Per-category R@1, mixed → restricted

| Condition | mobile_phone | laptop | book |
|---|---|---|---|
| A | 0.962 → 0.962 | 0.673 → 0.684 | 0.765 → 0.765 |
| B | 0.819 → 0.827 | 0.523 → 0.541 | 0.801 → 0.801 |
| C | 0.804 → 0.812 | 0.477 → 0.496 | 0.795 → 0.795 |
| D | 0.915 → 0.915 | 0.624 → 0.632 | 0.752 → 0.752 |

### Top-1 error taxonomy (mixed gallery)

| Condition | Cross-category | Within-category | Uncertain identity |
|---|---:|---:|---:|
| A | 7 | 107 | 60 |
| B | 12 | 169 | 58 |
| C | 17 | 179 | 61 |
| D | 6 | 131 | 66 |
| A-lb | 5 | 93 | 62 |

**Where the uncertain-identity errors come from:**
- **Book `209_*`:** 43 (A), 33 (C), 42 (D).
- **Laptops 372/378:** 16 (A), 22 (C), 23 (D).
- **Of those, inside the suspected HP Compaq cluster:** 4 (A), 8 (C), 7 (D).

**Interpretation:**
1. **Cross-category confusion is negligible:** ≤ 2% of queries, and the oracle restriction gains only +0.2 to +0.9 points of R@1. Knowing the category barely helps retrieval.
2. **Within-category instance confusion dominates.** Laptops are worst: 64–100 within-category errors depending on condition.
3. **Uncertain identity accounts for 58–66 errors**, concentrated in book `209_*`. If QC confirms those books are different (likely), these are *real* errors caused by **different objects sharing a background**, the mirror image of the background shortcut. If QC confirms the HP Compaq cluster is one laptop, up to 4–8 "errors" per condition become correct matches. Final numbers must wait for QC.

## 5. Category-hinted detector experiment
Script: `scripts/evaluation/category_hinted_detector_eval.py`.
- **Ground truth:** CO3D mask boxes (853 frames) and the 4 Phase-2 app photos (assistant-verified boxes, exploratory). The M2 classifier is not used.
- **Settings:** production detector thresholds (0.3 / 0.3) and production `select_crop`.

| Variant | Proposal recall (IoU ≥ 0.5) | Selected label correct | Selected box IoU ≥ 0.5 | Mean selected IoU | Wrong-object selection | No-proposal rate |
|---|---:|---:|---:|---:|---:|---:|
| A. 7-category prompt (production) | 0.998 | 0.897 | 0.987 | 0.932 | 0.011 | 0.001 |
| **B. Single-category prompt (ORACLE)** | **1.000** | 1.000* | **0.993** | **0.941** | **0.007** | **0.000** |
| C. A filtered to category (ORACLE) | 0.934 | 0.940 | 0.930 | 0.936 | 0.005 | **0.060** |

\* Trivially 1.0, because the label equals the hint. Box correctness is the meaningful number.

**Per category:**
- **Laptop:** A labels it correctly 82.7% of the time, B 100% with box IoU ≥ 0.5 in 99.6% of frames, and C fails to find any proposal 13.2% of the time.
- **Book:** A labels 88.4% correctly, B finds a correct box in 99.1%, and C has a 4.6% no-proposal rate.
- **Phone:** all variants are ≥ 98.5%.

**App photos (n = 4, cluttered, exploratory):**
- A selects the correct box in 3 of 4 photos; the failure is the charger brick chosen as "mobile phone".
- **Both B and C find the laptop in 4 of 4.**

**Reading:**
- **A single-category prompt is the better hint mechanism.** Filtering the 7-category output (C) throws away objects that the 7-category prompt had already mislabelled, so C misses many laptops.
- **Oracle versus deployable:** here the category comes from ground truth. In Back2U the hint would be the **user-declared category of the report**, so B is deployable *given that input*. This experiment does not measure user mistakes in declaring the category.
- **No production change was made.**

## 6. Remaining preprocessing limitations (Task 4)
**Baseline (Phase 2B), R@1:** full image 0.796 · detector crop 0.720 · ground-truth crop 0.699 · detector crop + letterbox 0.762 · background only 0.706 · object only 0.638.

**New diagnostics, possible without new data:**

| Diagnostic | R@1 | Paired test | Finding |
|---|---:|---|---|
| Letterbox gain by crop elongation (D vs B) | +2.9 pts (1.0–1.25) · +2.6 (1.25–1.6) · +4.9 (1.6–2.2) · **+13.9 (≥ 2.2, n = 79)** | — | **Dose-response**: the gain grows with elongation, directly supporting the centre-crop-truncation hypothesis |
| C-lb: ground-truth crop + letterbox | **0.757** (C 0.699) | 95 vs 45, p = 2.9e-5 | Letterbox helps even with perfect localisation |
| D vs C-lb | 0.762 vs 0.757 | 36 vs 32, p = 0.72 | With letterbox, detector and ground-truth boxes are equivalent on CO3D |
| F-lb: object only + letterbox | 0.664 (F 0.638) | 82 vs 60, p = 0.078 | Borderline. Phone +12.6 pts, laptop −0.4, book −3.0 |

**What CO3D cannot answer:**
- **Cross-background matching.** Every sequence has one background, which is exactly the lost-and-found condition.
- **Clutter and occlusion.** The scenes contain a single object.
- **The four remaining categories.** Wallet, keys, earphones and headphones are not in CO3D.
- **User-photo resolution.** CO3D frames are ~350–480 px.

**Possible but not run:** synthetic background swaps (pasting mask cut-outs onto other sequences' backgrounds). Compositing artefacts would make the results hard to interpret, so the campus set is preferred. **No winning production preprocessing strategy is declared.**

## 7. Campus validation acquisition plan
Prepared, **not collected**. Details are in `reports/evaluation/CAMPUS_VALIDATION_ACQUISITION_PLAN.md`.
- **Scope:** 28 objects (4 per category × 7) with 4 genuine photos each, `physical_instance_id = campus_val:<category>_<slot>`.
- **View roles:** views 01–02 are "owner" photos on background A; views 03–04 are "found" photos on background B or C, with view 04 cluttered. Every positive therefore crosses backgrounds.
- **Look-alikes:** slots 01 + 02 (or 03 + 04 for laptops) are a look-alike pair.
- **Manifest:** `data/processed/campus_validation_manifest.jsonl`, 112 view slots. **4 are pre-filled with existing genuine photos** (app laptops u001 and u002, 2 views each; their protocol roles are still to be confirmed). **108 are `PLANNED_NOT_COLLECTED`.** Split `validation_holdout`, `reserved_from_training` and `reserved_from_calibration`.
- **Exclusion registry:** `data/processed/training_exclusion_registry.json` lists the 28 campus instances, the 2 app instances and all 353 reserved CO3D sequences.
- **Protocol checker:** `campus_validation_plan.py --check` currently reports **BLOCKED** (no photos).

## 8. Implications for M4-C v2 (design input only; no training authorised)
1. **Train on object-centric inputs with cross-background positives.** Background alone scores 0.706, and the object alone only 0.638, falling to 0.425 for laptops.
2. **Mine hard negatives that share a background.** Book `209_*` shows that different objects on one surface are confused.
3. **Use aspect-preserving letterbox inputs.** The supporting evidence is significant on crops, and the effect grows with elongation.
4. **Category-hinted detection is the right crop source**, with the user-declared category as the hint.
5. **Prioritise laptops.** They are the weakest category in every object-centric condition.
6. **Never train on the reserved sequences:** all 353 reserved CO3D sequences plus the campus instances, enforced via the exclusion registry.
7. **Licensing:** CO3D-derived selection or training needs legal review before any commercial use.

## 9. Licensing restrictions
- **CO3D v2 is CC BY-NC 4.0.** Research only, no redistribution, never in the production gallery.
- **Kept out of git:**
  - contact sheets
  - the QC review page
  - CO3D-derived `embeddings.npy` (added to `.gitignore` this phase)
  - `data/raw` and `data/processed`
- **Committable:** the QC results file holds decisions only, no imagery.
- **Commercial use** of the data, or of any model trained or selected with it, requires separate legal review.

## 10. Tests and integrity
- **New tests:** `tests/evaluation/test_phase2c.py`, **6 passed**. Covered:
  - exact agreement with the Phase 2 evaluator
  - category restriction removes cross-category errors
  - uncertain pairs are excluded from hard negatives and labelled
  - PENDING QC changes nothing
  - one missing decision blocks application
  - merge, reject and verified-negative rules
- **Full suite:** 124 passed, 5 failed, 1 skipped. The 5 failures are the same pre-existing ones.
- **Integrity:** original CO3D manifest byte-identical; checkpoint unchanged; production gallery absent; 0 CO3D files tracked by git.

## 11. Recommended next step
1. **Human reviewer:** open `qc_review/index.html` locally and record all 47 decisions. Priorities:
   - the HP Compaq cluster (`372_40878`, `372_41062`, `378_44211`)
   - `209_22181_45211`
   Then export and run `co3d_apply_qc.py` followed by `co3d_category_restricted_eval.py` to get final numbers.
2. **In parallel, photograph the 28-object campus set** following the acquisition plan. It is the only way to choose between full-image, crop and letterbox preprocessing, and between hinted and unhinted detection, for real lost-and-found conditions.
