# Manual Collection Requirements — revised after the public-dataset audit

**Date:** 2026-11-02. This replaces the Phase 2 target of 200 manually collected objects per category (1,350 total) as a **precondition for development**. Long-term targets remain engineering goals, not prerequisites.

## 1. What public data covers (see `PUBLIC_DATASET_SUITABILITY_REPORT.md`)

| Category | M2 (category) | M4-C (multi-view instances) |
|---|---|---|
| laptop | covered (Open Images, LeftInCAR) | covered (Objectron 1,473 + CO3D 983 sequences) |
| mobile_phone | covered (Open Images, LeftInCAR) | covered (CO3D 1,146) |
| book | covered (Open Images non-group-of, Objectron, CO3D) | covered (Objectron 2,023 + CO3D 2,294) |
| headphones | covered (Open Images, about 1,400 images by estimate) | **not covered** |
| wallet | only tiny in-car crops plus noisy catalog images | **not covered** |
| keys | only tiny in-car crops | **not covered** |
| earphones | **not covered** | **not covered** |

## 2. Revised manual requirements

| Need | Categories | Objects | Views per object | Photos | Purpose |
|---|---|---:|---:|---:|---|
| **A. Instance training seed** | wallet, keys, earphones, headphones | 40 each = **160** | 4 | 640 | First M4-C positives for categories with no public multi-view data. The same photos also give realistic M2 data for wallet, keys and earphones. |
| **B. Campus validation set** (held out, never trained on) | all 7 | **28** (4 per category) | 4 | 112 | Independent real-world check of category, detection and instance retrieval |
| **C. Hard negatives** (can be inside A/B) | phone vs calculator, charger, power bank; same-model laptops; same-title books; identical earbud cases; similar key rings; same-colour wallets | ~20 pairs | 3–4 | ~140 | Stress the failure modes observed in Phase 2 |
| **Total** | | **≈ 190–210 objects** | | **≈ 800–900 photos** | instead of 1,350 objects / 6,750 photos |

For laptop, mobile_phone and book, **only B and C are manual**. Public sequences supply training data.

Expand A (towards the original 200 per category) **only if** campus-validation metrics for those four categories stay clearly below the public-data-backed categories.

## 3. Campus validation set — 28 objects (first deliverable)

| Category | Objects | Required look-alikes |
|---|---:|---|
| laptop | 4 | 2 of the same model/colour (for example two space-grey MacBooks); include u001/u002 with ≥ 2 new views each |
| mobile_phone | 4 | 2 of the same model in different cases; photograph a calculator and a charger as negatives |
| wallet | 4 | 2 of the same colour and style |
| earphones | 4 | 2 identical charging cases, distinguished by a mark |
| headphones | 4 | 2 of the same model |
| keys | 4 | 2 similar key rings |
| book | 4 | 2 copies of the same title/edition |

**Protocol:**
- 4 photos per object, taken on a phone, unedited.
- At least 2 backgrounds (library desk, cafeteria table, bag, floor) and at least 2 angles.
- At least 1 cluttered scene containing another taxonomy object.
- Human-verified box for every photo.
- Fill in `instance.json` from `scripts/evaluation/templates/instance.template.json`.
- Owner consent; no faces, screens with personal data, ID cards or names.

**Limitations (state these with every result):**
- **Sample size:** 28 objects and ~112 queries. A 95% interval on Recall@1 is roughly ±9 percentage points overall and ±25 per category, so the set only detects large differences.
- **Single campus, few photographers:** possible collector and style bias.
- **Look-alike coverage:** too few look-alike pairs to estimate the hard-negative error rate precisely.
- **Not a production accuracy claim.** It validates direction and catches regressions.

## 4. Order of work
1. Campus validation set (B): 28 objects, about half a day of photography for 2 people.
2. Instance seed (A) for wallet, keys, earphones and headphones: 160 objects, which can be collected in batches of 40.
3. Hard negatives (C), folded into A and B where possible.
