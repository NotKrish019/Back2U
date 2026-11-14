# CO3D Pilot — Independent Evaluation of the Current M4-C (Phase 2B)

**Date:** 2026-11-02.
- **Model:** `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`; checkpoint SHA-256 `7aef423c…81eb`, verified at run time. No weights changed and nothing trained.
- **Data:** 853 views of 141 CO3D v2 few-view **dev** sequences (`CO3D_PILOT_ACQUISITION_REPORT.md`), research-only under CC BY-NC 4.0. CO3D was never in M4-C training.
- **Evidence level:** PILOT. 44–50 sequences per category, a single public dataset, and identities asserted by the source (human QC pending). **This is not a production accuracy claim.**

## 1. Protocol
**Runs:**
- `scripts/evaluation/run_preprocessing_eval.py --config scripts/evaluation/configs/co3d_pilot.json` (outputs in `reports/evaluation/phase2_runs/co3d_pilot/`)
- `scripts/evaluation/co3d_pilot_analysis.py` (confidence intervals and calibrator diagnostic)
- `scripts/evaluation/co3d_background_shortcut.py` (diagnostic conditions E/F)

**Fairness guarantees** (Phase 2 runner, unit-tested):
- the same checkpoint for every condition
- one embedding per image per condition, used for both query and gallery
- a separate gallery per condition with identical membership
- the exact query image and any byte-identical copy are excluded from its own gallery
- instances ranked by max-pooled cosine, with pessimistic tie-breaking

**Queries and gallery:**
- Every one of the 853 views is a query; 0 were skipped (every sequence has ≥ 3 views).
- The gallery holds all 853 views of all 141 sequences **across all three categories**. "Category-wise Recall@1" means queries of that category, ranked against the full mixed gallery.

**Conditions:**

| Condition | Encoder input | Transform | Role |
|---|---|---|---|
| A | full frame | production (Resize 256 → CenterCrop 224) | required |
| B | Grounding DINO crop (production prompt, thresholds and `select_crop`, 10% padding) | production | required |
| C | ground-truth crop (tight mask box + the same 10% padding) | production | required |
| D | detector crop | aspect-preserving letterbox to 224 | required |
| A-lb | full frame | letterbox | diagnostic |
| E | full frame with the object mask (dilated 7 px) filled with the ImageNet mean; **object invisible**, 17.8% of the frame hidden on average | production | diagnostic (background shortcut) |
| F | object cut out by its mask, on a flat ImageNet-mean canvas, padded crop; **no background** | production | diagnostic (object only) |

The detector fell back to the full frame for 1 of 853 images in B and D.

## 2. Results — visual similarity only (primary)
Overall: 853 valid queries, 141 physical sequences (44 cellphone, 47 laptop, 50 book). The 95% interval on Recall@1 is a Wilson interval over queries; views of one sequence are correlated, so the true uncertainty is **wider**.

| Condition | R@1 | 95% CI | R@5 | R@10 | MRR | HN top-1 (unverified negatives) |
|---|---:|---|---:|---:|---:|---:|
| A full image | 0.796 | 0.768–0.822 | 0.897 | 0.938 | 0.843 | 0.800 |
| B detector crop | 0.720 | 0.689–0.749 | 0.872 | 0.924 | 0.793 | 0.728 |
| C ground-truth crop | 0.699 | 0.667–0.729 | 0.870 | 0.923 | 0.775 | 0.707 |
| D detector crop + letterbox | 0.762 | 0.732–0.789 | 0.904 | 0.946 | 0.824 | 0.764 |
| A-lb full + letterbox (diagnostic) | 0.812 | 0.785–0.837 | 0.928 | 0.958 | 0.866 | 0.816 |
| **E background only** (diagnostic) | **0.706** | — | 0.898 | 0.957 | 0.793 | — |
| **F object only** (diagnostic) | **0.638** | — | 0.818 | 0.885 | 0.722 | — |

### Per category: R@1 / R@5 / R@10 / MRR (queries; sequences)

| Condition | mobile_phone (260; 44) | laptop (266; 47) | book (327; 50) |
|---|---|---|---|
| A | 0.962 / 0.981 / 0.985 / 0.970 | 0.673 / 0.861 / 0.917 / 0.755 | 0.765 / 0.859 / 0.917 / 0.814 |
| B | 0.819 / 0.946 / 0.973 / 0.877 | 0.523 / 0.789 / 0.883 / 0.653 | 0.801 / 0.881 / 0.917 / 0.839 |
| C | 0.804 / 0.950 / 0.977 / 0.867 | 0.477 / 0.793 / 0.883 / 0.613 | 0.795 / 0.869 / 0.911 / 0.835 |
| D | 0.915 / 0.977 / 0.992 / 0.944 | 0.624 / 0.850 / 0.910 / 0.721 | 0.752 / 0.890 / 0.939 / 0.812 |
| A-lb | 0.973 / 0.992 / 1.000 / 0.983 | 0.729 / 0.902 / 0.932 / 0.806 | 0.752 / 0.899 / 0.945 / 0.821 |
| E background only | 0.904 / 0.988 / — / 0.942 | 0.613 / 0.876 / — / 0.727 | 0.624 / 0.844 / — / 0.727 |
| F object only | 0.712 / 0.919 / — / 0.802 | 0.425 / 0.688 / — / 0.546 | 0.752 / 0.844 / — / 0.802 |

### Paired comparisons (same 853 queries; correct@1 discordant counts; exact McNemar)

| Comparison | Only first correct | Only second correct | p |
|---|---:|---:|---:|
| A vs C | 127 | 44 | 1.6e-10 |
| A vs D | 82 | 53 | 0.016 |
| **D vs B** (letterbox vs centre-crop, same detector crop) | **94** | **58** | **0.0044** |
| B vs C (detector box vs tight ground-truth box) | 42 | 24 | 0.036 |
| C vs F (crop with padding context vs object only) | 91 | 39 | 6e-6 |
| E vs C (background only vs object crop) | 148 | 142 | 0.77 |
| A-lb vs A | 75 | 61 | 0.26 |

## 3. Interpretation
1. **The full-image advantage is mostly background matching.** Every view of a CO3D sequence is filmed in one place.
   - With the **object erased** (E), M4-C still reaches R@1 0.706, statistically indistinguishable from the ground-truth object crop (C, 0.699; p = 0.77). For phones, background alone gives 0.904.
   - **On this dataset, A > C does not mean full images are better for lost-and-found.** There, the "found" photo is taken somewhere else, so this background cue is absent or misleading.
2. **Background-independent object re-identification of the current M4-C is weak.** With no background at all (F), R@1 is **0.638** overall and **0.425 for laptops**. Laptops are the weakest category in every object-centric condition, consistent with the Phase 2 app-photo failure.
3. **Aspect-preserving letterbox helps object crops.** D beats B on the same detector crop (+4.2 points, p = 0.0044); on the phone category the gain is +9.6 points. This **supports the Phase 1 hypothesis** that Resize(256)+CenterCrop(224) discards object extremities. On full frames the letterbox effect is not significant (p = 0.26).
4. **Ground-truth boxes do not beat detector boxes.** On these single-object scenes the detector box is correct ≥ 98% of the time (§4). Its slightly looser box (more context) gives B a small edge over C (p = 0.036). This is not evidence that localisation is unimportant: CO3D has no clutter, unlike the Phase 2 app photos.
5. **Best measured preprocessing:**
   - *Highest number:* A-lb, full image + letterbox, R@1 0.812. It is **confounded by the shared background** and not a valid basis for lost-and-found.
   - *Best background-robust condition:* **D, detector crop + letterbox (R@1 0.762)**, significantly better than the production crop pipeline B (0.720).
   - **No production default is changed in this task.** Confirming the choice needs cross-background positives (campus set), which CO3D cannot provide.

## 4. Grounding DINO on the pilot (single-object scenes)

| Category | Frames | Selected box IoU ≥ 0.5 | Selected label correct | Box and label correct | Any proposal IoU ≥ 0.5 |
|---|---:|---:|---:|---:|---:|
| mobile_phone | 260 | 0.996 | 0.985 | 0.985 | 1.000 |
| laptop | 266 | 0.981 | **0.827** | 0.823 | 0.996 (1 fallback) |
| book | 327 | 0.985 | **0.884** | 0.872 | 0.997 |

**Wrong labels:**
- laptop → `mobile_phone` in 43 frames, `book` in 2
- book → `mobile_phone` in 36 frames, `laptop` in 2
- phone → `keys` in 3 frames, `headphones` in 1

The same "mobile phone absorbs rectangular objects" failure was seen in Phase 2. Localisation is reliable in uncluttered scenes; category labelling is not.

## 5. Calibrated scores (diagnostic only; the existing reranker is NOT trusted)
Without a text query, the existing logistic calibrator is a monotonic function of visual similarity. **Rankings, Recall and MRR are therefore identical to §2.** Only its probabilities and the 0.8 / 0.2 decision thresholds are assessed:

| Condition | Top-1 marked "candidate" (p > 0.8) | Precision of those | Top-1 marked "reject" (p < 0.2) | Mean p, correct top-1 | Mean p, wrong top-1 |
|---|---:|---:|---:|---:|---:|
| A | 10.7% | 0.868 | 0.7% | 0.689 | 0.617 |
| B | 9.7% | 0.843 | 0.9% | 0.677 | 0.593 |
| C | 8.3% | 0.789 | 0.8% | 0.680 | 0.587 |
| D | 14.0% | 0.849 | 0.1% | 0.704 | 0.638 |

**Reading:**
- The calibrator auto-accepts only 8–14% of queries, and is wrong on 13–21% of those.
- Correct and incorrect top-1 matches get almost the same mean probability (≈ 0.68 vs ≈ 0.61).
- On this data its probabilities are **poorly discriminative and not validated**. Recalibration needs a dedicated held-out set; nothing was retrained here.

## 6. Limitations
1. **Shared backgrounds within sequences** inflate full-image results (quantified by E). CO3D cannot measure the cross-background matching lost-and-found needs.
2. **Identity:** positives are asserted by the source; cross-sequence negatives are **UNVERIFIED**.
   - The top similar pair (`372_40878_81136` vs `378_44211_88110`, cosine 0.950) **may be the same laptop**.
   - Human QC is pending (`CO3D_PILOT_QC_CHECKLIST.md`).
   - Hard-negative top-1 values are reported but not trusted as ground truth.
3. **Scale:** 44–50 sequences per category and 3 categories. Views of a sequence are correlated, so the Wilson intervals understate uncertainty.
4. **Selection biases:**
   - Dev-split sequences filtered by CO3D's quality score.
   - 9 sequences rejected (phone close-ups and edge-on views).
   - 47 sequences needed the relaxed 15° view separation.
   - CO3D frames are low resolution (~350–480 px).
5. **Taxonomy coverage:** wallet, keys, earphones and headphones are untested; CO3D has no such categories.
6. **Mixed gallery:** the gallery mixes categories, so a few errors may be cross-category. Category-restricted ranking was not evaluated.

## 7. Recommended next task
1. **Human QC of the contact sheets.** Resolve the suspected repeated laptop, and check the `209_*` book group.
2. **Campus validation set** (28 objects; `MANUAL_COLLECTION_REQUIREMENTS.md`) photographed on **deliberately different backgrounds**. This is the only way to decide between full-image, crop and letterbox for lost-and-found.
3. **Evaluation-only follow-ups on the existing pilot:**
   - category-restricted ranking
   - D-style letterbox combined with the category-hinted box selection proposed in Phase 2
4. **Model work, only with explicit authorisation:** M4-C trained on object-centric crops with cross-background positives. The F condition suggests this is where the current model is weakest.
