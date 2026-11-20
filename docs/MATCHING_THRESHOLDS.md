# Matching directions and the auto-match threshold

Code: `src/api/services/matching.py` (single source of truth). Config: `configs/matching_thresholds.json`. Calibration: `scripts/evaluation/calibrate_match_threshold.py` → `reports/calibration/match_threshold_calibration.json`.

## 1. Directions (enforced in the backend)

| Query | Compared against | Never |
|---|---|---|
| `POST /retrieval/search` with `query_type: "lost"` (default) | **open found** reports | lost reports, resolved/closed reports, deleted reports, the query's own report |
| a new **found** report (auto-match) | **open lost** reports | found reports, inactive reports, itself |
| a new **lost** report (auto-match) | **open found** reports | lost reports, inactive reports, itself |

**How it is enforced:**
1. The backend computes the eligible set from the database.
2. The ML service ranks only those items (`allowed_ids`). Restricting before ranking means ineligible look-alikes cannot push an eligible item out of the top-k.
3. The backend re-checks every returned row against the live database row before responding.

**Gallery contents:** lost and found reports both live in one gallery, because a found report must be compared with lost photos. Direction is therefore a query-time filter, not a separate index.

## 2. Auto-match rule

A `CandidateMatch` row (a suggestion that staff review) is created only when **all** of these hold:
- The query had an image. Text-only queries are never automatic.
- The open-set gate said `SUPPORTED`. `UNCERTAIN` and `UNSUPPORTED_ITEM` are never automatic.
- The ML decision is `candidate`, meaning the reranker probability is ≥ 0.65.
- The reranker probability is ≥ `auto_match_min_score` (currently **0.90**).

**A match is never ownership.** Ownership is decided separately: the claim proof is reviewed and staff approve the claim (`PATCH /admin/claims/{id}`). Accepting a candidate match records only that staff think the two reports describe the same item.

**Score used:**
- The reranker *probability*: logistic regression on `[siglip_cos, m4c_cos, text_cos, text_missing]`.
- Raw cosine is not a probability and is not thresholded directly.
- The text-only path uses a hand-set sigmoid, `(cos − 0.20) × 15`. It is uncalibrated, which is one more reason text-only never auto-matches.

## 3. Calibration (CO3D, 2026-11-20)

**Data:**
- **Objects:** 90 physical objects (laptop / cellphone / book; CO3D research-only, held out from M4-C training).
- **Queries:** 2 later frames per object, each run clean and with a phone-style perturbation (crop, brightness/colour, blur, JPEG q=35), giving 360 queries.
- **Split:** by object, 60% calibration and 40% test.

**Protocols:**
- **Closed set:** the true object is in the gallery.
- **Open set:** the true object is removed. Any auto-match is then a false match, and this is the common lost-and-found case.

**Precision formula:** `TP / (TP + FP_closed + FP_open)`. This assumes half of all searches have their item present.

**Results on the TEST split (156 queries, clean and perturbed):**

| threshold | precision | recall | F1 | false-match rate (open set) | wrong top-1 auto-match (closed) |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 0.50 | 0.51 | 0.51 | 0.37 | 0.14 |
| **0.65** (old `candidate` cutoff) | 0.59 | 0.40 | 0.48 | **0.20** | 0.08 |
| 0.80 | 0.70 | 0.28 | 0.40 | 0.07 | 0.04 |
| 0.85 | 0.82 | 0.20 | 0.32 | 0.03 | 0.02 |
| **0.90** (selected) | **0.91** | **0.13** | 0.22 | **0.006** | 0.006 |
| 0.93 | 1.00 | 0.06 | 0.11 | 0.00 | 0.00 |

**Choosing 0.90:**
- **Rule:** the smallest threshold whose *calibration* precision is ≥ 0.95. On calibration it gave precision 1.00 at recall 0.10.
- **Test result:** precision 0.91, from 20 TP, 1 wrong top-1 and 1 open-set false match. That is below the 0.95 target, and the sample is small, so the value is provisional.
- **Before this change:** every opposite-type result in the top 5 became a pending match, with no threshold at all.
- **Precision–recall trade-off:** recall is low by design. People can still see the ranked results of their own search, and staff can still review them; only the automatic suggestion is held to the precision bar.

**Why the separation is weak:**
- **Look-alikes score high:** the mean cosine to the true object is 0.83, versus 0.81 to the best same-category impostor (test split). Many CO3D objects are look-alikes, such as black laptops and similar phones.
- **Retrieval is imperfect:** Recall@1 is 0.68 on this 90-object gallery.
- **Do not compare with Objectron:** the 0.94 Recall@1 in older reports was measured on Objectron and is not comparable.

## 4. Modality differences

| Query | Score | Calibrated? | Auto-match |
|---|---|---|---|
| image only | reranker probability, `text_missing=1` | yes (this document) | yes, at ≥ 0.90 |
| image + text | reranker probability with `text_cos` | reranker fitted with text; the threshold was calibrated on image-only pairs | yes, at ≥ 0.90 (provisional) |
| text only | sigmoid of SigLIP2 text↔image cosine | **no** | **never** |

## 5. Changing it

- **Environment override:** `AUTO_MATCH_MIN_SCORE=0.93` overrides the file.
- **Re-calibration:** re-run `python scripts/evaluation/calibrate_match_threshold.py --write-config` after any model change.
- **Campus data:** once campus data exists (`docs/campus_validation/PROTOCOL.md`), re-select the threshold with 2-fold cross-validation on it. It reflects the deployment far better than CO3D.
