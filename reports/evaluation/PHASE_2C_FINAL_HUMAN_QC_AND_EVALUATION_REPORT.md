# Phase 2C (Final): CO3D Human QC Application and Final Retrieval Evaluation

**Date:** 2026-11-02 · **Branch:** `pre-ui-lab-production-migration` (uncommitted)
- **Checkpoint:** M4-C SHA-256 `7aef423c…81eb`, verified unchanged. Model version `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`.
- **Data:** CO3D pilot, 141 sequences, 853 views. The original manifest is byte-identical (SHA-256 `a1a637e5…`).
- **Supersedes:** the *provisional* metrics in `PHASE_2C_QC_AND_DIAGNOSTICS_REPORT.md` §4, which were computed with QC PENDING.
- **Not done:** no training, calibration, or threshold, crop-default, detector or reranker change; no production inference or gallery change; no M4-C v2 training. CO3D remains CC BY-NC 4.0 and research-only.

## 1. Human QC: **APPLIED**

| Item | Value |
|---|---|
| Authoritative input | `reports/evaluation/co3d_pilot/human_qc_results_final.json` (SHA-1 `cc37a059…`) |
| Installed as | `reports/evaluation/co3d_pilot/human_qc_results.json` (byte-identical copy) |
| Reviewer · date · status · final approval | Anika Jain · 2026-11-02 · SUBMITTED · true |
| Decisions | 47 of 47 explicit (35 sequences, 6 pairs, 6 groups); 0 blocking problems |
| Pre-application audits | Structural, sign-off and identity consistency: all PASS |

**Revision history of the decision file.** The first submitted version had `laptop:372` reviewed with no same-unit set. Combined transitively with two pair-level `same_physical_unit` decisions, that implied an unreviewed identity (`372_40878_81136` ≡ `372_41062_82211`) which contradicted the group review. The human reviewer then confirmed that the two sequences are the same physical laptop, and the `laptop:372` same-unit set was added. The pre-revision file is kept as `human_qc_results_final.pre_372_set_backup.json`.

### Applied identity decisions

| Decision | Result |
|---|---|
| Sequences | **35 APPROVE**, 0 REJECT, 0 UNCERTAIN. 32 are `TRUSTWORTHY`; 3 are `MERGED_BY_HUMAN_QC`. The other 106 pilot sequences stay `SOURCE_SEQUENCE` / `PENDING_HUMAN_QC` (not in the review sample). |
| Merged identity (1) | `co3d-merged:372_40878_81136+372_41062_82211+378_44211_88110`, covering 18 views (5 + 5 + 8) |
| Pair `372_40878_81136` ↔ `378_44211_88110` | same_physical_unit → merged |
| Pair `372_41062_82211` ↔ `378_44211_88110` | same_physical_unit → merged |
| Group `laptop:372` same-unit set | `372_40878_81136` + `372_41062_82211` → merged (human-confirmed) |
| Pairs 40878 ↔ 41242 / 41337 / 375_42571, and 44207 ↔ 44211 | different_physical_units → verified negatives |
| Groups | All 6 reviewed. Every within-group pair not merged is a verified negative. |
| Physical instances | 141 sequences → **139 instances** |
| Verified negative relationships | **84**: book:209 55, laptop:372 9, laptop:378 10, laptop:373 3, laptop:374 3, laptop:391 3, cross-group 1 |
| Uncertain relationships | **0** (provisional: 87) |
| Contradictions | None. No verified negative lies inside the merged identity. |
| Training reservation | All 853 derived records have `reserved_from_training: true`; all 141 pilot sequences are in `training_exclusion_registry.json`. |

The derived manifest changes only the QC fields (`physical_instance_id`, `identity_status`, `qc_status`, `verification_status`, `uncertain_identity_with`, `reserved_from_training`, `source_physical_instance_id`). Every other field matches the original manifest for all 853 records.

## 2. Final retrieval metrics
Same 853 queries, same stored embeddings (no re-embedding) and same checkpoint; QC-applied identities. With 0 uncertain relationships, hard-negative (HN) accuracy now uses every same-category negative. **The category-restricted gallery is an ORACLE diagnostic, not production behaviour.**

### Overall, mixed → category-restricted (oracle)

| Condition | R@1 | R@5 | R@10 | MRR | HN top-1 (853 eligible) |
|---|---|---|---|---|---:|
| A full image | 0.801 → 0.804 | 0.902 → 0.905 | 0.941 → 0.944 | 0.848 → 0.852 | 0.804 |
| B detector crop | 0.730 → 0.739 | 0.880 → 0.882 | 0.930 → 0.933 | 0.801 → 0.807 | 0.739 |
| C ground-truth crop | 0.708 → 0.716 | 0.879 → 0.884 | 0.927 → 0.932 | 0.783 → 0.790 | 0.716 |
| D detector crop + letterbox | 0.770 → 0.773 | 0.910 → 0.913 | 0.950 → 0.953 | 0.831 → 0.834 | 0.773 |
| A + letterbox (diagnostic) | 0.816 → 0.819 | 0.930 → 0.932 | 0.960 → 0.964 | 0.869 → 0.872 | 0.819 |

### Per-category R@1, mixed → restricted

| Condition | mobile_phone | laptop | book |
|---|---|---|---|
| A | 0.962 → 0.962 | 0.688 → 0.699 | 0.765 → 0.765 |
| B | 0.819 → 0.827 | 0.556 → 0.575 | 0.801 → 0.801 |
| C | 0.804 → 0.812 | 0.508 → 0.526 | 0.795 → 0.795 |
| D | 0.915 → 0.915 | 0.650 → 0.658 | 0.752 → 0.752 |
| A-lb | 0.973 → 0.973 | 0.741 → 0.748 | 0.752 → 0.755 |

### Per-category HN top-1 accuracy (final)

| Condition | mobile_phone | laptop | book |
|---|---:|---:|---:|
| A | 0.962 | 0.699 | 0.765 |
| B | 0.827 | 0.575 | 0.801 |
| C | 0.812 | 0.526 | 0.795 |
| D | 0.915 | 0.658 | 0.752 |
| A-lb | 0.973 | 0.748 | 0.755 |

### Top-1 error taxonomy (mixed gallery)

| Condition | Cross-category | Within-category | Uncertain identity | Total errors |
|---|---:|---:|---:|---:|
| A | 7 | 163 | 0 | 170 |
| B | 12 | 218 | 0 | 230 |
| C | 17 | 232 | 0 | 249 |
| D | 6 | 190 | 0 | 196 |
| A-lb | 5 | 152 | 0 | 157 |

In the oracle-restricted gallery, cross-category errors are 0 by construction; within-category errors are 167 / 223 / 242 / 194 / 154 for A / B / C / D / A-lb.

**Errors by source (mixed; queries from …):** book `209_*` 46 / 34 / 35 / 43 / 46; merged laptop identity 7 / 7 / 7 / 6 / 5; other 372/378 laptops 15 / 24 / 28 / 22 / 15 (for A / B / C / D / A-lb).

## 3. Comparison with the provisional Phase 2C results

| Condition (mixed) | R@1 prov → final | MRR prov → final | HN prov → final | Queries fixed / broken | Merged-identity R@1 (of 18) |
|---|---|---|---|---|---|
| A | 0.796 → 0.801 (+0.5) | 0.843 → 0.848 | 0.830 → 0.804 | 4 / 0 | 7 → 11 |
| B | 0.720 → 0.730 (+1.1) | 0.793 → 0.801 | 0.760 → 0.739 | 9 / 0 | 2 → 11 |
| C | 0.699 → 0.708 (+0.9) | 0.775 → 0.783 | 0.741 → 0.716 | 8 / 0 | 3 → 11 |
| D | 0.762 → 0.770 (+0.8) | 0.824 → 0.831 | 0.804 → 0.773 | 7 / 0 | 5 → 12 |
| A-lb | 0.812 → 0.816 (+0.4) | 0.866 → 0.869 | 0.858 → 0.819 | 3 / 0 | 10 → 13 |

"Fixed" means a query that went from rank > 1 to rank 1; "broken" is the reverse. R@1 points are percentage points.

**What changed, and why:**
1. **Every R@1 gain comes from the merged laptop identity.** The fixed queries per condition (4 / 9 / 8 / 7 / 3) exactly equal the provisional errors whose top-1 was another member of the now-merged cluster. No query got worse. Other ranks moved slightly (22–46 queries per condition) only because three competing instances became one; that doesn't affect R@1.
2. **Laptop R@1 rises by 1.1–3.4 points**; book and mobile_phone R@1 are unchanged.
3. **HN accuracy falls by 2.1–3.9 points. This is not a regression.** Provisionally, 87 relationships (all book `209_*` pairs and the high-risk laptop groups) were *excluded* from HN as uncertain. The reviewer has verified them as different units, so they now count as real hard negatives. Book HN drops most (0.820 → 0.765 for A), because many book queries' hardest negative is a sibling book filmed on the same stool in the same kitchen.
4. **The provisional "uncertain identity" errors (58–66) are now within-category errors.** Apart from the 3–9 per condition that the merge resolved, they're real confusions between different objects that share a background: the mirror image of the background shortcut.
5. **The condition ranking is unchanged:** A-lb > A > D > B > C on R@1, and full-image beats ground-truth crops. The oracle category restriction still adds only +0.2 to +0.8 points, so cross-category confusion stays negligible and within-category instance discrimination remains the bottleneck.

## 4. Integrity checks

| Check | Result |
|---|---|
| Original pilot manifest | Byte-identical; SHA-256 `a1a637e5…29a2` (as in Phase 2C). The apply script also asserts this. |
| M4-C checkpoint `models/checkpoints/m4_c/best_val_recall_at_1.pt` | SHA-256 `7aef423c63a2…881eb`, unchanged (mtime 2026-10-05). The evaluation also asserts the run's checkpoint prefix. |
| Training / calibration | None run. No file under `src/` or `models/` changed during this step. |
| Production inference, crop, detector, threshold, reranker | Unchanged; `git diff --stat` is identical to the start of the session (only the 12 files that were already modified). |
| CO3D imagery and embeddings in git | 0 tracked files. `data/processed/`, `**/*.npy`, `contact_sheets/` and `qc_review/` are git-ignored. |
| Reserved sequences | 141 of 141 pilot sequences are in the exclusion registry; every derived record is `reserved_from_training: true`. |
| Tests | `pytest tests`: **124 passed, 5 failed, 1 skipped**. These are the same 5 pre-existing failures (auth override ×3, retired mock search, Objectron adapter data). `tests/evaluation`: 30 passed. Hashes of the protected files were identical before and after the test run. |

## 5. Files

**Backups created:**
- `reports/evaluation/co3d_pilot/human_qc_results.pending_backup.json`: the PENDING template
- `data/processed/co3d_phase2_qc_reviewed_manifest.pre_final_qc_backup.jsonl`: the provisional derived manifest
- `data/processed/co3d_phase2_identity_relations.pre_final_qc_backup.json`: the provisional relations
- `reports/evaluation/phase2_runs/co3d_pilot/category_restricted.provisional_backup/`: the provisional evaluation outputs, used for §3
- `reports/evaluation/co3d_pilot/human_qc_results_final.pre_372_set_backup.json` (from the earlier revision)

**Generated or overwritten:**
- `data/processed/co3d_phase2_qc_reviewed_manifest.jsonl` (SHA-256 `235e83e8…`)
- `data/processed/co3d_phase2_identity_relations.json` (SHA-256 `0c1ee57f…`)
- `reports/evaluation/phase2_runs/co3d_pilot/category_restricted/summary.json` (SHA-256 `41c75e4b…`) and 10 per-query `*.jsonl` files
- `reports/evaluation/co3d_pilot/human_qc_results.json`, now identical to the final file

## 6. Limitations
1. **QC covers 35 of 141 sequences.** The other 106 keep source-asserted identities, and every cross-sequence relationship outside the 84 verified negatives and the merge is UNVERIFIED.
2. **Only one human reviewer**, and the reviewer is also the project owner. There are no notes on the two pair-level `same_physical_unit` decisions.
3. **Open reviewer observations, accepted as submitted:** `209_22181_45211` is approved even though only its back and spine are visible; the `391_*` sequences (3–4 views) carry no `poor_viewpoint_diversity` flag.
4. **Per-query key collision.** Within the merged identity, `372_40878_81136` and `378_44211_88110` both have a `frame000029`, so two per-query rows share the key `co3d-merged:…/frame000029`. Metrics aren't affected: the gallery excludes queries by SHA-256, and all 853 SHA-256 values are unique. Any join on the per-query `query` field should use row order or the source sequence ID instead.
5. **The QC tooling records `different_physical_units` and `same_model_different_unit` identically**, so the distinction isn't kept in the outputs.
6. **Small pilot:** 853 queries and 3 categories, under the CO3D licence (non-commercial). The category-restricted results are an oracle upper bound.

## 7. Next recommended milestone
**Campus validation set collection** (`CAMPUS_VALIDATION_ACQUISITION_PLAN.md`): photograph the 28-object set, including the look-alike pairs. The final CO3D numbers confirm the bottleneck is within-category instance discrimination under shared backgrounds, and CO3D can't settle the preprocessing choice (full image vs crop vs letterbox) or hinted vs unhinted detection for real lost-and-found conditions. Optionally, before or alongside that, extend human QC beyond the 35-sequence sample: in particular, check the remaining 372/378 laptops for further same-unit cases. M4-C v2 training stays out of scope until the campus validation protocol is unblocked.
