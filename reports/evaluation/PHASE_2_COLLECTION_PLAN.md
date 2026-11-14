# Phase 2 — Real-World Collection Plan

**Date:** 2026-11-02. Targets are engineering targets for building the datasets, **not** promises of model accuracy.
"Existing" means **M4-C-eligible**: a trustworthy identity, ≥ 3 genuine original views, and originals on disk (see `PHASE_2_INSTANCE_DATA_AUDIT.md`).

## 1. Gap per category

| Category | Target instances | Existing eligible | Trustworthy but < 3 views / crops only | **Remaining** | Photos at 5 views each |
|---|---:|---:|---:|---:|---:|
| laptop | 150 | 0 | 12 (2 app + 10 Objectron crops) | **150** (148 if u001/u002 each get ≥ 1 more view) | 750 |
| mobile_phone | 200 | 0 | 0 | **200** | 1,000 |
| wallet | 200 | 0 | 0 | **200** | 1,000 |
| earphones | 200 | 0 | 0 | **200** | 1,000 |
| headphones | 200 | 0 | 0 | **200** | 1,000 |
| keys | 200 | 0 | 0 | **200** | 1,000 |
| book | 200 | 0 | 0 | **200** | 1,000 |
| **Total** | **1,350** | **0** | 12 | **1,350** | **6,750** |

**Views per instance:**
- Recommended: **5** genuine views (minimum 3).
- At least 2 views must be on **different backgrounds**, and at least 1 at a substantially different angle (top-down vs oblique).
- No augmentations.

## 2. Category specifics

| Category | Hard negatives to include deliberately | Variation to capture | Reusable data | Must collect from scratch |
|---|---|---|---|---|
| laptop | Same make/model, different units (several space-grey MacBooks, several black HP/Dell); identical stickers on different laptops (seen: u001 and u002 share a sticker); laptop **chargers/power bricks** (detector labelled one "mobile phone" at 0.79) | Lid closed and open; top-down and oblique; cluttered desks with cables; bed/sofa fabric; library tables; daylight vs fluorescent | 2 app laptops (add views); Objectron public laptop videos (1,473; historical metadata), which bring 2D boxes | Campus laptops with stickers and cases |
| mobile_phone | Same model in different cases, and same case on different phones; **calculators**, **power banks/chargers**, remotes (all observed or likely "mobile phone" false labels); face-down phones | Screen on/off; face up/down; in hand; on bag/fabric; reflections | Reported 1,260 single-view pool (category-level only, once located); PACO-LVIS phones (category-level) | All instance data |
| wallet | Card holders, passport covers, phone-wallet cases, same-brand wallets in the same colour | Open/closed; front/back; on tables and floors; low light | PACO-LVIS wallet (4 images; negligible) | Everything |
| earphones | Different units of the same model (AirPods-style cases are near-identical; a distinctive mark is required for identity); wired vs wireless kept in **one** category; USB sticks, lip balm, small cases | Case open/closed; buds in/out of the case; tiny objects on large backgrounds (small-object risk from Phase 1) | Reported Roboflow pool (category-level only, once located and deduplicated) | All instance data |
| headphones | Same model, different owners; headsets vs over-ear; earphones (cross-category confusion seen in detector labels such as "earphones headphones") | Folded/unfolded; on desk and hanging on bags | Reported Roboflow pool (category-level only) | All instance data |
| keys | Different key sets on similar rings; single keys; key cards; car fobs; **adjacent clutter** (in the mock image the detector picked a background item instead of the keys) | Key bunches spread and heaped; on dark and light surfaces; partially in a pocket | None | Everything |
| book | **Different copies of the same title/edition**, which are the critical instance test (only wear, stickers or notes differ); notebooks/diaries (detector labelled a notebook "mobile phone"/"laptop") | Cover, spine, open; stacked with other books; library shelves | Objectron public book videos (2,023; historical metadata); PACO-LVIS book (category-level) | Campus copies with marks |

## 3. Stage 1 — pilot collection (start here)

**Goal:** a real 7-category evaluation set that **unblocks** the Phase 2 preprocessing comparison and the detector evaluation.

| Category | Instances | Views per instance | Photos | Required hard-negative pairs |
|---|---:|---:|---:|---|
| laptop | 8 (incl. 2 more views of u001 and u002) | 4 | ~32 | ≥ 2 pairs of same-model laptops |
| mobile_phone | 8 | 4 | 32 | ≥ 2 same-model pairs, 1 calculator, 1 charger |
| wallet | 8 | 4 | 32 | ≥ 2 same-colour pairs |
| earphones | 8 | 4 | 32 | ≥ 2 identical-case pairs (mark-distinguished) |
| headphones | 6 | 4 | 24 | ≥ 1 same-model pair |
| keys | 8 | 4 | 32 | ≥ 2 similar-ring pairs |
| book | 8 | 4 | 32 | ≥ 2 same-title copies |
| **Total** | **54** | | **~216** | |

**Protocol (per instance):**
1. One object per folder: `data/raw/real_world_instances/<category>/<id>/`.
2. Take 4 photos with a phone camera in normal resolution, with no filters and no edits.
3. Use at least 2 backgrounds and at least 2 angles. Include at least 1 cluttered scene containing another taxonomy object.
4. Fill in `instance.json` (template: `scripts/evaluation/templates/instance.template.json`). Draw ground-truth boxes for **every** view and have them human-verified.
5. Run `scripts/evaluation/audit_real_world_data.py`, then `build_phase2_manifest.py`, then `run_preprocessing_eval.py` and `evaluate_grounding_dino.py`.
6. Consent: photograph only objects whose owners agree; avoid faces and personal data (screens, ID cards, names on books).

With ~54 instances and ~216 photos, metrics remain **exploratory**. A production-grade test set needs the full targets above and an instance-disjoint TEST split that is never used for tuning.
