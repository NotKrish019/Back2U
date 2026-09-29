# M2-C Open-Set Rejection and Calibration

## Objective
Distinguish KNOWN, UNKNOWN, and UNCERTAIN objects using validation-tuned calibration scores, moving beyond simple detector/classifier agreement which was prone to hallucination overlaps.

## Calibration (Validation Set)
We computed experimental open-set scores on the validation set, focusing on:
- Classifier Margin (Top1 - Top2 probability)
- Softmax Entropy
- Grounding DINO + Classifier Agreement

**Selected Policy:**
`IF Agreement AND Margin > 0.95 AND Entropy < 0.3 THEN KNOWN`
*(Strong unknown evidence maps to UNKNOWN, otherwise UNCERTAIN for manual review)*

## Test Set Performance
- **Known Target Items:** 50
- **Unknown Non-Target Items:** 80 (Across 5 categories)

| Metric | Score |
|--------|-------|
| Known Precision | 1.0000 |
| Known Recall | 0.6800 |
| Unknown False Accept Rate (FAR) | 0.0000 (0/80) |
| Uncertain Knowns (Sent to Review) | 9 |
| Uncertain Unknowns (Sent to Review) | 0 |

### Unknown False Acceptance Breakdown
- **bike:** FAR 0.0000 (0/20)
- **cereal_box:** FAR 0.0000 (0/20)
- **camera:** FAR 0.0000 (0/20)
- **book:** FAR 0.0000 (0/20)
