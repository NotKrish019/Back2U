# CO3D Pilot — Human QC Checklist

**Status: PENDING HUMAN REVIEW.** Superseded workflow (Phase 2C): open `reports/evaluation/co3d_pilot/qc_review/index.html` locally; decisions go to `reports/evaluation/co3d_pilot/human_qc_results.json`. No sequence identity is `TRUSTWORTHY` yet. Every manifest record has `identity_status = SOURCE_SEQUENCE` and `verification_status = PENDING_HUMAN_QC`.

**Contact sheets:** `reports/evaluation/co3d_pilot/contact_sheets/` (index: `index.json`).
- Each **sample sheet** shows the sequence ID, category, and for every selected view the frame number, the full frame with the mask-derived box drawn in red, and the mask-derived crop with its size and sharpness score.
- Each **pair sheet** shows the first 4 views of sequence A followed by the first 4 views of sequence B.

## 1. 5% sample (7 of 141 accepted sequences; deterministic `sha256("qc:"+id)` order, spread across categories)
Mark each column ✅ OK / ❌ problem (and describe it).

| # | Sheet | Wrong category | Different object within sequence | Incorrect segmentation / box | Crop too small | Poor viewpoint diversity | Severe blur | Reviewer / date |
|---|---|---|---|---|---|---|---|---|
| 1 | `book__30_1202_3579.jpg` | | | | | | | |
| 2 | `book__209_22089_45167.jpg` | | | | | | | |
| 3 | `book__209_22183_45213.jpg` | | | | | | | |
| 4 | `laptop__212_22391_44980.jpg` | | | | | | | |
| 5 | `laptop__372_41337_82330.jpg` | | | | | | | |
| 6 | `mobile_phone__514_73764_143591.jpg` | | | | | | | |
| 7 | `mobile_phone__379_44389_88397.jpg` | | | | | | | |

**Assistant pre-screen (not a substitute for human QC):**
- I inspected sheet 6 only. It shows one consistent feature phone in 7 views spanning front, side and back, with tight boxes. Frame 159 is the least sharp. No issue seen.
- Sheets 1–5 and 7 were **not** inspected by the assistant.

## 2. Suspected repeated physical units across sequences
These are the most similar cross-sequence pairs, ranked by maximum view-to-view cosine of the ground-truth-crop embeddings. High similarity can mean the **same physical unit**, the **same model**, or the **same background**.

| Pair sheet | Cosine | Assistant pre-screen | Human verdict (same unit / same model / different) |
|---|---:|---|---|
| `pair__372_40878_81136__378_44211_88110.jpg` | 0.950 | Same dark-grey HP Compaq model with a similar palm-rest sticker, on **different** backgrounds (wooden table vs jute mat). **Possibly the same laptop.** | |
| `pair__378_44207_88121__378_44211_88110.jpg` | 0.941 | **Different units** (silver/black vs dark grey) on the **same** jute mat. Similarity is likely background-driven. | |
| `pair__372_40878_81136__372_41242_82155.jpg` | 0.940 | not inspected | |
| `pair__372_41062_82211__378_44211_88110.jpg` | 0.928 | not inspected | |
| `pair__372_40878_81136__375_42571_85394.jpg` | 0.927 | not inspected | |
| `pair__372_40878_81136__372_41337_82330.jpg` | 0.926 | not inspected | |

**Sequence-name prefixes:** the first field of the CO3D sequence name is shared by **84 of 141** accepted sequences (25 groups). No two sequences share the first two fields. The field's meaning is undocumented; it may be a contributor or batch.
- **Largest groups to spot-check:** book `209_*` (11 sequences; corrected from 12 in Phase 2C); laptop `372_*`, `373_*`, `374_*`, `378_*`, `391_*` (391 added in Phase 2C); cellphone `598_*`, `378_*`, `373_*`, `610_*`.
- A shared prefix alone is **not** evidence of a repeated unit, but it marks the highest-risk groups.

## 3. Rules until QC is complete
1. Positives (views within one sequence): `SOURCE_SEQUENCE`. Use them for evaluation and report them as **source-asserted** identity.
2. Cross-sequence negatives: **UNVERIFIED**. Hard-negative accuracy in the evaluation report is labelled accordingly.
3. If a pair is confirmed as the **same unit**, merge the two sequences into one instance for evaluation. Never train on either (both are reserved holdout sequences anyway).
4. If any sampled sequence shows a different object or a wrong category, extend QC to every sequence with the same prefix before using the pilot further.
5. Once all 7 sample sheets and all 6 pairs are reviewed without blocking issues, set `identity_status = TRUSTWORTHY` for the sampled sequences only. Leave the remainder as `SOURCE_SEQUENCE (QC-sampled)`.

## 4. Sign-off
- [ ] All 7 sample sheets reviewed
- [ ] All 6 pair sheets reviewed
- [ ] Prefix-group spot-check done (book `209_*` at minimum)
- Reviewer: ________ Date: ________ Outcome: ________
