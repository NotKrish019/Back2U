# Campus validation: execution plan

**Purpose:** take Back2U from *tested functionality* to a *validated campus baseline*, then to an evidence-based go/no-go decision.

**Central rule:** collect real campus photos and establish an honest campus baseline before claiming real-world accuracy or changing any threshold.

**Role of the system until then:** ranked candidate retrieval for human review. It is **not** autonomous item matching. Automatic suggestions are prompts for staff review, never confirmed identity or ownership.

This plan builds on, and does not replace:
- `docs/campus_validation/PROTOCOL.md` (the collection protocol)
- `docs/campus_validation/CONSENT_FORM.md`
- `configs/campus_validation/instance.schema.json`
- `reports/evaluation/CAMPUS_VALIDATION_ACQUISITION_PLAN.md` (the original slot plan)

Where this plan adds operational detail, it says so. Where it finds a defect in the existing material, the defect is listed in §J with a proposed resolution and a decision owner.

---

## 0. Repository state at the time of writing

| Check | Finding |
|---|---|
| Branch / commit | `main` @ `59736fc`, identical to `origin/main` |
| Working tree | **Not clean.** `app.db` is modified locally: index-sync bookkeeping from the 2026-11-21 sync, not committed by decision, because it holds real user data. 10 untracked UI screenshots sit in the repo root (`ChangeHeroSection.png`, `fixIt.jpeg`, `image2–4.png`, `img5part*.png`, `img6–7.png`). Neither affects this plan. |
| Implementation and evaluation files | All present on `main`: `scripts/evaluation/campus_eval.py`, `scripts/evaluation/campus_validation_plan.py`, `configs/matching_thresholds.json`, `configs/open_set_gate.json`, `reports/calibration/*.json`, `reports/benchmarks/latency_before_after.json`, `reports/PIPELINE_REPAIR_REPORT.md`, `experiments.md`, `tests/ml/test_campus_eval.py` |
| Test suite (re-run 2026-11-21 on `59736fc`) | **185 passed, 1 skipped.** The skip is `tests/ml/test_inference_crop_regression.py:125`, which needs `RUN_REAL_MODELS=1`. The 8 real-model tests in `tests/ml/test_real_models_regression.py` pass. |
| Campus photos | **None collected.** `data/raw/campus_validation/` does not exist; `campus_validation_plan.py --check` prints `BLOCKED`. |
| Pre-existing planning artefacts (git-ignored, local only) | `data/processed/campus_validation_manifest.jsonl` (112 planned view slots) and `data/processed/training_exclusion_registry.json` |

---

## A. Current readiness assessment

### A1. Verified implementation and test coverage

Covered by automated tests on `main` (`tests/api/test_pipeline_repair.py` unless noted):

| Behaviour | Evidence |
|---|---|
| A lost search returns only open found reports; a found report matches only open lost reports; never same-type, inactive, deleted or self | `test_lost_search_*`, `test_found_query_*`, `test_ineligible_items_cannot_crowd_out_*` |
| Auto-suggestion only for a `SUPPORTED` image query, ML decision `candidate`, and reranker probability ≥ threshold (0.90); text-only never | `test_new_*_auto_match*`, `test_should_auto_match_policy_unit`, `test_text_only_reports_never_auto_match` |
| Unsupported photo → `UNSUPPORTED_ITEM`, no retrieval, no suggestion | `test_unsupported_item_stops_retrieval_and_auto_match`; real photos in `test_open_set_gate_on_real_photos` |
| Found photos blurred server-side except for the finder, staff or an approved claimant; gallery originals not served by URL | `test_found_photo_*`, `test_matches_endpoint_blurs_*`, `tests/ml/test_ml_service_api.py::test_gallery_images_are_not_served_by_url` |
| Claims: approve/deny state machine; approval resolves the item and removes it from the index | `test_end_to_end_found_lost_automatch_claim_approve`, `test_staff_can_deny_*` |
| Index stays in sync with the DB (sha-aware, removes stale entries, idempotent) | `test_sync_*` |
| Campus eval code path (synthetic images, fake models; **not results**) | `tests/ml/test_campus_eval.py` |

**A passing test suite proves the code behaves as specified. It does not prove real-world model accuracy.**

### A2. Results from public and external datasets (not campus accuracy)

All figures were produced on 2026-11-20/21. "Supplied" means the figure came from the task brief and was then checked against the repository output named in the source column.

| Measurement | Dataset | Result | Source | Status |
|---|---|---|---|---|
| Category: laptop, phone, wallet, earphones, headphones, keys | 30 committed Commons photos | 30/30 correct | probe on `59736fc`; assets in `tests/assets/real_model_regression/` | supplied, re-run, matches |
| Category: book | 5 Commons photos | 2 correct, 1 uncertain, 2 → wallet (antique bindings) | same | supplied, matches |
| Unsupported rejected | 12 Commons photos, 6 types | 12/12 | same | supplied, matches |
| Unseen types rejected | 8 Commons photos, 4 types | 8/8 | same | supplied, matches |
| Gate on the larger set | 193-image test split | 0.89 correct-accept, 0.02 hard-rejected; leakage 1/71 (known types), 1/28 (unseen types) | `reports/calibration/open_set_gate_calibration.json` | verified |
| Exact-item R@1 / R@5 | CO3D, 90 objects, clean / perturbed queries | overall 0.68 / 0.84 and 0.63 / 0.81; phones 0.85; books 0.63–0.65; laptops 0.42–0.54 | probe on `59736fc` | supplied, re-run, matches |
| Auto-suggestions, **closed set** (true item always in gallery) | CO3D, 180 searches (all 90 objects) | 22 suggestions, 22 correct | probe on `59736fc` | supplied, re-run, matches |
| Auto-suggestions, **held-out split, closed + open set** | CO3D test split, 156 searches | 22 suggestions: 20 correct, 1 wrong top-1, 1 false match on an item not in the gallery (precision 0.91) | `reports/calibration/match_threshold_calibration.json` | verified |
| Latency | CPU, batch 1, ~1 MP | ~0.13 s median per search | `reports/benchmarks/latency_before_after.json` and probe | verified |

**How to read the 22/22:** this figure is **insufficient on its own to establish production-grade precision**.
- **It is optimistic:**
  - It is closed-set only, so it never tests a search whose item hasn't been found yet.
  - It includes objects that were used to *select* the 0.90 threshold.
  - Query and gallery frames come from the same video.
- **Statistically:** the 95% Wilson interval for 22/22 is [0.85, 1.00].
- **The held-out run with open-set queries** gave 20/22 = 0.91, Wilson [0.72, 0.98].

### A3. Still requires campus validation

- **Every accuracy figure in A2:** category recognition, rejection rates, R@1/R@5 and suggestion precision on campus photos taken by different people, on different days, phones, backgrounds and lighting.
- **Look-alike behaviour on real campus look-alikes.** CO3D look-alikes are incidental, not deliberate pairs.
- **Both threshold groups** (§E). They were calibrated on CO3D + Commons.
- **Effect of phone photo orientation.** `scripts/run_inference.py::open_image_bytes` does not apply EXIF orientation to JPEGs, and the frontend uploads the raw file. Phone photos with an EXIF rotation tag are therefore embedded rotated, in production and in `campus_eval.py` alike. Impact: **Needs verification** (§J-6).

### A4. Product and deployment gaps

| Gap | Current state (inspected) |
|---|---|
| Match notifications | **No backend notification system.** `frontend/src/app/notifications/page.tsx` is a static "No notifications yet." placeholder. The only signal is the pull-based `match_count` badge on My reports (`src/api/routers/users.py:27–29`). No email/push libraries are present beyond Firebase Auth config. |
| Demo images | See §G2. The `/mocks/*.jpg` files are harmless illustrations; the two seeded reports reference files that do not exist (404). |
| Unsupported-item browser behaviour | Implemented in `frontend/src/app/search/page.tsx` (`result?.status === 'UNSUPPORTED_ITEM'`); **not browser-verified**. Report Found flow shows no gate feedback (`ReportFlow.tsx` only calls `createReport`). |
| Legacy pending matches | 19 rows created before the threshold existed (§G4) |
| Multi-worker deployment | The gallery is process-local in the ML service (§G5) |

---

## B. Campus data collection plan (field-ready)

The existing protocol is sound and is kept:
- **Objects:** 28 = 4 per category × 7 categories; slots 01–04.
- **Views:** view_01/view_02 are *owner* photos at home or hostel (background A); view_03/view_04 are *found* photos on campus (backgrounds B/C, with clutter in view_04).
- **Look-alikes:** slots 01/02 form a look-alike pair.

The checklists below add the operational detail the protocol lacks.

### B1. Roles in the field

- **Coordinator:** consent, IDs, metadata and the pre-flight QC.
- **Owner-photographer:** takes view_01/02 with *their own* phone.
- **Finder-photographer:** takes view_03/04, ideally a **different person with a different phone**. This simulates a real finder and is an addition to the protocol (recommended, not mandatory). Record who did what in `views.*.device`.

### B2. Before collection (once)

- [ ] Project lead decides the open protocol questions in §J (bbox requirement, existing app photos, look-alike source of truth).
- [ ] Print consent forms (`CONSENT_FORM.md`, v1) and a paper key sheet: pseudonym ↔ person. The key sheet is kept offline and is **never** photographed or committed.
- [ ] Print **slate cards**: one card per object showing only `campus_val:<category>_<slot>`.
- [ ] Recruit the look-alike pairs first; they are the hardest to find. Per category, follow the pair descriptions in the acquisition plan §3.
- [ ] Create the folders `data/raw/campus_validation/<category>/<category>_<slot>/` (git-ignored) and copy `scripts/evaluation/templates/instance.template.json` into each.

### B3. Per object, in order

1. **Consent.** The owner signs the form. Record `consent.granted=true`, `form_version`, `owner_pseudonym` and `allows_publication_of_photos` in `instance.json`. Without a signature, take no photos.
2. **Slate shot.** Photograph the slate card next to the object, then store it in `data/raw/campus_validation/_slates/<category>_<slot>.jpg`.
   - Never put it inside the object folder: the auditor counts every image there as a view.
   - Never let the slate appear in view_01–04: a visible label would become a shortcut cue.
   - The slate is how mislabeled or swapped twins are caught later.
3. **view_01** (owner, home, background A, top-down or front, no clutter).
4. **view_02** (owner, home, background A, oblique 45° or back, no clutter). Change the distance as well as the angle.
5. **view_03** (finder, campus, background B: library, cafeteria or floor; side or low angle, no clutter).
6. **view_04** (finder, campus, background B or C, a different angle from view_03, **with clutter**: at least one other object nearby).
7. **Per-view metadata, filled in immediately:** `role`, `background`, `background_id`, `viewpoint`, `clutter`, `lighting`, `device`.
8. **Object metadata:**
   - `identity_basis`, e.g. "same owner, photographed in one session, never left owner's hands".
   - `lookalike_of`, for slots 01/02.
   - `description`: brand, colour and marks, with **no** names or ID numbers.
   - `collected_by` (pseudonym) and `collected_on`.

Rules during capture:
- **Files:** normal phone camera, no filters, no edits, no bursts. Keep the phone's original JPEG or HEIC; do **not** screenshot or re-share it through a chat app (that recompresses and strips metadata).
- **Object visibility:** fully visible in at least 3 of 4 views.
- **Delete the photo and reshoot** if it shows a face, an unlocked screen, a name, an ID number or an address.
- **Capture differences worth spreading** across the set (record them; there is no need to cover every combination): daylight versus indoor light, near (~30 cm) versus far (~1 m), at least two phone models across the collection, and partial occlusion in some view_04 photos.

### B4. IDs and naming (stable, no personal data)

| Thing | ID / name | Where |
|---|---|---|
| Physical object | `campus_val:<category>_<slot>` (slot 01–04) | `instance.json.physical_instance_id` |
| Image | `<category>_<slot>/view_0N.<ext>`; global image ID `campus_val:<category>_<slot>:view_0N` | folder layout |
| Negative object | `negatives/neg_<NN>.jpg` plus an entry in `negatives/negatives.json` with a free-text type, e.g. "power bank" | protocol §3 |
| Person | pseudonym only (`owner_07`, `collector_A`) | `instance.json`; key sheet offline |

### B5. Unusable, missing or withdrawn images

| Situation | Action |
|---|---|
| Blurry beyond recognition, object cut off, privacy violation | Delete it and reshoot the **same view slot** with the same conditions. Don't keep both. |
| A view cannot be reshot (the object is no longer available) | Leave the slot empty and record `"missing_reason"` in `instance.json`. `campus_eval.py` needs at least 1 owner and 1 found view per object; the protocol check needs all 4. |
| Consent withdrawn | Delete the folder and its slate. Set nothing in git (nothing was committed). Re-run QC and evaluation; mark earlier reports *superseded* in `experiments.md`. |
| Object is not supported, or turns out to be the wrong category | Move it to `negatives/` if useful, otherwise delete it. Never relabel silently. |

### B6. Pre-evaluation verification (gate between collection and evaluation)

- [ ] `python scripts/evaluation/campus_validation_plan.py --check`: no problems, or each listed problem has an approved exception. **Caveat:** it currently exits 0 even when `BLOCKED`, and it does not report cross-object duplicates (backlog §K). Check its JSON output, not the exit code.
- [ ] Every `instance.json` validates against `configs/campus_validation/instance.schema.json`. `jsonschema` 4.26 is installed; the validation command is backlog §K-1.
- [ ] **Slate audit:** a second person matches each slate to its folder and compares the object visually across all 4 views, which catches swapped twins.
- [ ] **Duplicate audit:** no exact, near-duplicate or augmented image within or across objects (`src/evaluation/phase2/dataset_audit.py` already computes `exact_duplicate_groups`, `near_duplicate_groups`, `augmentation_files` and `cross_instance_duplicates`).
- [ ] **Privacy review** complete per object (`privacy_review.*` fields), and GPS stripped (`exiftool -gps:all=`).
- [ ] **Counts:** 28 objects (or the agreed number), 7 look-alike pairs, and the negatives listed.
- [ ] **Sign-off:** the coordinator records the QC result in `reports/campus/DATASET_QC.md` (new). Evaluation does not start without it.

---

## C. Dataset integrity and evaluation design

### C1. Definitions

| Term | In this dataset |
|---|---|
| Gallery image | view_03 and view_04 (finder photos). One gallery *item* per object; both views are stored under that item, which is a multi-view gallery. |
| Query image | view_01 and view_02 (owner photos), run independently: 2 queries per object |
| Same-item match | query and gallery item share `physical_instance_id` |
| Look-alike pair | two different objects, slots 01/02 of a category, declared via `lookalike_of` |
| Supported categories | the 7 canonical categories (`src/categories.py`) |
| Unsupported | `negatives/` images: gate evaluation only, never in the gallery |

### C2. Leakage controls

- **Gallery and query never share a photograph.** Roles are fixed by view number.
- **No near-duplicates or transformed copies.** The B6 duplicate audit runs across *all* views and objects, and any hit blocks evaluation until it is resolved.
- **Different capture conditions** are built into the protocol: background A versus B/C, different person and phone where §B1 is followed. Report how many objects actually achieved a different device.
- **Exclusion:** campus IDs are listed in `data/processed/training_exclusion_registry.json`, so no training or calibration builder may use them.

### C3. Statistical honesty for 28 objects

The data is small:
- 56 queries, but two queries per object are correlated, so the **effective sample size is closer to 28 than 56**.
- **Report 95% intervals:** use a Wilson interval on the per-object outcome (an object counts as correct if both of its queries are correct, and the *per-query* rate is reported alongside) or an object-level bootstrap.
- **Example of the uncertainty:** at R@1 ≈ 0.65, n = 28 gives roughly [0.46, 0.79]. Only large effects are detectable.

**Projected suggestion count:** if campus coverage resembles CO3D (~12% of searches receive a suggestion), the 56 queries would produce **single-digit** suggestions. This projection uses CO3D figures and needs verification on campus.

**Consequence:** the 28-object set can *check* the CO3D-selected threshold for gross failure. It **cannot** establish suggestion precision. All-correct suggestions needed for the Wilson lower bound to reach:

| precision bound (95% Wilson lower) | suggestions needed, all correct |
|---|---:|
| ≥ 0.90 | 35 |
| ≥ 0.95 | 73 |
| ≥ 0.98 | 189 |

### C4. Threshold development versus held-out evaluation

- **Recommended for the first 28 objects:** baseline evaluation only, with **no threshold tuning**. Report the deployed thresholds as they are.
- **If tuning is attempted anyway:**
  - Use the protocol's 2-fold split (`fold_a` = slots 01+03, `fold_b` = 02+04; twins land in different folds).
  - Tune on one fold, report on the other, swap, and report both directions.
  - Disclose that each fold holds only 14 objects.
- **To make tuning defensible, collect more data:** a second collection round, sized from the table in §C3 for whichever precision bound the project approves (§I).

---

## D. Evaluation metrics and reporting

### D1. Definitions

**Category recognition (gate).** Rates are per image. Report all views of supported objects plus negatives.

| Metric | Definition |
|---|---|
| Correct-category rate | supported images with decision `SUPPORTED` and the correct category, ÷ supported images |
| Wrong-category rate | `SUPPORTED` with the wrong category, ÷ supported images |
| Uncertain rate | `UNCERTAIN` ÷ supported images (search still runs; no suggestion) |
| Supported-item rejection rate | `UNSUPPORTED_ITEM` ÷ supported images (**hard stop: the user gets no search**) |
| Unsupported rejection rate | `UNSUPPORTED_ITEM` ÷ negative images |
| Unsupported leakage rate | `SUPPORTED` ÷ negative images |

**Exact-item retrieval.**
- **Basic measures:** R@1, R@5 and MRR over owner-view queries against the full gallery; a gate stop counts as a miss and is also counted separately.
- **Breakdowns:**
  - per category
  - per capture condition: query lighting, device same or different, query distance, clutter in the matched gallery view
  - per fold
- **Look-alikes:** for each twin query, whether the twin ranked above the true object, and whether the twin would have been auto-suggested.
- **Latency:** median and p90 per search, plus the machine (as `benchmark_latency.py` records it).

**Automatic suggestions** (suggestion = top-1 meets `should_auto_match` at the deployed threshold):

| Metric | Definition |
|---|---|
| Suggestions generated | count, closed set (own item in gallery) and open set (own item removed) separately |
| Verified correct / incorrect | correct = same `physical_instance_id`; **any open-set suggestion is incorrect** |
| Precision | correct ÷ all suggestions, with a 95% Wilson interval |
| Coverage | queries with a suggestion ÷ queries |
| Still needing human browsing | queries without a suggestion, and of those, how many had the true item in the top 5 (browsable) versus not |

> **Retrieval accuracy is not suggestion safety.** A good Recall@5 means the right item is usually *on the list a person reviews*. It says nothing about whether an *automatic* suggestion is safe. Report the two in separate tables and never combine them into one headline.

### D2. Results table template (`reports/campus/CAMPUS_BASELINE.md`)

```markdown
Commit: ____  Model version: ____  Gate config: configs/open_set_gate.json @ ____  Threshold: ____
Dataset: __ objects, __ owner queries, __ gallery photos, __ negatives; QC sign-off: ____ (date, role)
Different-device objects: __/__   Missing views: __

### Category recognition
| | n | correct SUPPORTED | wrong category | UNCERTAIN | UNSUPPORTED (hard stop) |
|---|---|---|---|---|---|
| all supported views | | | | | |
| per category … | | | | | |
| | n | rejected | UNCERTAIN | leaked as SUPPORTED |
| negatives | | | | |

### Exact-item retrieval (owner photo → finder photos)
| slice | queries | objects | R@1 [95% CI] | R@5 [95% CI] | MRR | gate stops |
|---|---|---|---|---|---|---|
| overall / per category / per condition / fold_a / fold_b | | | | | | |
Look-alikes: twin ranked above true __/__, twin would be auto-suggested __/__
Latency: median __ s, p90 __ s (machine ____)

### Automatic suggestions (threshold ____)
| protocol | queries | suggestions | correct | incorrect | precision [95% Wilson] | coverage |
|---|---|---|---|---|---|---|
| closed set | | | | | | |
| open set (own item removed) | | | — | | — | |
Queries without suggestion: __ (true item in top-5: __, not in top-5: __)

Comparison rows (labelled, NOT campus): CO3D test split / Commons test split from experiments.md
```

---

## E. Threshold decision process

**Both thresholds stay at their current values until this process has run.**

| | Auto-suggestion threshold | Gate cutoffs |
|---|---|---|
| Current value | `auto_match_min_score = 0.90` (`configs/matching_thresholds.json`, env override `AUTO_MATCH_MIN_SCORE`) | `temperature 0.0094`, `min_prob 0.30`, `min_margin 0.05`, `unsupported_min_prob 0.80` (`configs/open_set_gate.json`) |
| Campus metrics that inform it | suggestion precision (closed + open set) with CI; coverage; look-alike twin suggestions | supported-item rejection (hard stop), wrong-category rate, leakage on negatives, UNCERTAIN rate |
| Costlier error | a false suggestion: staff are pointed at the wrong person's item, and the owner of the true item is not helped | a false hard stop: the user gets **no search at all**. Leakage only means an unsupported item is searched and can never be auto-suggested unless the gate says `SUPPORTED`. |
| Default direction under uncertainty | raise the threshold, accepting lower coverage | prefer `UNCERTAIN` over `UNSUPPORTED_ITEM` |

**Process:**
1. **Evidence:** a campus evaluation report (§D2) from a QC-signed dataset, plus a threshold sweep from `scripts/evaluation/calibrate_match_threshold.py` or the campus sweep (backlog §K-4).
2. **Proposal:** the ML owner writes a change record in `reports/calibration/THRESHOLD_CHANGES.md` (new) with:
   - old value, new value, date and commit
   - data used, and whether selection and reporting used **the same examples** (if so, it must be stated prominently and the result treated as optimistic)
   - expected effect on precision, coverage and hard stops
   - rollback: the old config file content, or one env var for the auto-suggestion threshold
3. **Minimum evidence before a change:** a held-out result (other fold or a new collection round) that supports the new value. A change justified only by the data it was tuned on is not accepted.
4. **Approval:** the project lead approves in writing. The ML owner then edits the config, and the application team confirms that the tests still pass (`tests/api/test_pipeline_repair.py::test_auto_match_policy_reads_calibrated_config` reads the file).
5. **Wording:** a suggestion stays a *suggestion for staff review*. No threshold value turns it into confirmed identity or ownership; that requires an approved claim.

---

## F. ML improvement track: look-alike separation (owner: Krish / ML)

**Failure mode:** the true item and its best look-alike score almost the same (CO3D: mean cosine 0.83 versus 0.81). Wrong top-1 is dominated by same-category look-alikes, and laptops are worst (R@1 0.42–0.54).

**Current retrieval path** (`scripts/run_inference.py`):
- SigLIP2 full-image embedding as the primary index.
- Then `LogisticRegression` on `[siglip_cos, m4c_cos, text_cos, text_missing]`.
- The gallery already supports several entries per item and aggregates them, counting `supporting_views`. The best view wins.

**Gate for every experiment:**
- Evaluate on the campus look-alike pairs plus the CO3D test split.
- **Never** train or calibrate on campus IDs (exclusion registry).
- An approach is **kept only if:**
  - campus look-alike confusion improves;
  - overall R@1 on CO3D and campus does not drop beyond its CI;
  - open-set false suggestions do not rise at the deployed threshold;
  - latency stays within the agreed budget (the budget needs project approval).

| Direction | Addresses | Investigation | Evaluation | Risks |
|---|---|---|---|---|
| F1 Hard-negative training | the embedding cannot separate same-model items | fine-tune the M4-C projection (or a light SigLIP adapter) with mined same-category impostors; CO3D/Objectron only | campus twins, CO3D test R@1 | overfitting to CO3D capture style; history shows M4-C below SigLIP2 (Objectron E005), so it may not beat the baseline |
| F2 Multiple gallery photos per item | one finder photo misses the distinguishing side | product: let finders add 2–3 photos; eval: gallery = view_03 + view_04 (already the protocol) versus view_03 only | R@1 with 1 versus 2 gallery views | more finder effort; the max-over-views aggregation can also raise impostor scores |
| F3 More weight on description text | visual twins differ in stickers, cases or engravings that owners describe | campus collection adds a 1-sentence owner description per object; evaluate image + text queries and a re-fitted reranker | look-alike pairs with and without text | text calibration is currently weak (the text-only path is uncalibrated); people describe items inconsistently |
| F4 Fusion weight | SigLIP2 and M4-C err differently (CO3D probe: fusion 0.7/0.3 raised R@5 0.86 → 0.92 but not R@1) | sweep the fusion weight in the ranking stage, not only in the reranker | CO3D + campus R@1 / R@5 | weights tuned on CO3D may not transfer |
| F5 EXIF orientation (prerequisite, not a model change) | rotated phone photos embed sideways | apply `ImageOps.exif_transpose` in `open_image_bytes` (app + ML) | campus R@1 before and after; **needs verification** that campus photos carry rotation tags | changes stored embeddings, so the gallery must be rebuilt with `scripts/reindex_reports.py --rebuild` |

---

## G. Application-team product gaps

### G1. Match notifications

- **Where suggestions are created:** `src/api/routers/reports.py::index_and_auto_match`. This is the only place a `CandidateMatch` is inserted, and it runs when a report is created.
- **Existing infrastructure:** none server-side.
  - `frontend/src/app/notifications/page.tsx` is a placeholder.
  - The "N matches" badge comes from `match_count` (`src/api/routers/users.py`).
  - Firebase is used for auth only. **Needs verification** whether the Firebase project has Cloud Messaging enabled.
- **Recipient:**
  - the **lost-report owner**, for a suggestion where their report is the lost side;
  - staff, through the existing admin candidates list;
  - do **not** notify the finder about the owner's report (privacy).
- **Proposed minimal design (needs project-lead approval):**
  - A `notifications` table: `user_id`, `match_id`, `kind`, `created_at`, `read_at`, and a unique key on `(user_id, match_id, kind)`. The unique key gives duplicate prevention.
  - Rows are written in the same transaction as the `CandidateMatch`.
  - The notifications page lists them, and the badge counts unread rows.
  - Email or push is a later step.
- **Failure handling:**
  - A notification failure must never fail report creation (same pattern as indexing: log and continue).
  - The insert is idempotent through the unique key.
  - When a match is rejected or the item is resolved, mark the notification obsolete rather than deleting it.
- **Wording requirement:** "A found item *may* match your report. Staff will review it; you may be asked for proof." Never "We found your item".
- **Acceptance:**
  - API tests: one notification per new suggestion; none for text-only, `UNCERTAIN` or `UNSUPPORTED_ITEM`; no duplicate on retry.
  - A browser check of the page.

### G2. Demo images and direct URLs

- **Inspected:** `frontend/public/mocks/` holds 8 files: `magnifying_glass.jpg` and `workflow_step1–7.jpg`.
  - They are rendered marketing illustrations (a beige water bottle, a phone UI and a laptop UI) with no real found-item imagery.
  - They are used by `frontend/src/components/home/HomeSections.tsx` and `frontend/src/components/HowItWorksSection.tsx`.
  - Direct URL returns 200, which is expected and harmless.
- **The two seeded reports** `LR-5535B1D9` and `FR-8AF9487F` reference `/mocks/lost_macbook.jpg` and `/mocks/found_macbook.jpg`. **These files do not exist** (direct URL 404, and git history has no record of them).
  - No private image is exposed.
  - The defect is two reports with broken images.
  - They are not indexable (no `item_instance_id`), so index sync lists them as not eligible.
- **Correction:** `docs/PRIVACY.md` previously described these as "reachable by direct URL". It was corrected alongside this plan.
- **Smallest safe fix (needs owner approval, because it touches records):** leave the files alone. Either close the two seeded demo reports or point them at an existing illustration. Do not delete any asset.
- **Related copy inaccuracy** (application team, low priority): the homepage walkthrough shows a **water bottle**, which the gate now rejects as unsupported. Its text also says Grounding DINO crops the item and a trained head gates the category, but production uses full-image SigLIP2 and a zero-shot gate.

### G3. Unsupported-item browser experience

- **Route and state:**
  - `/search` (`frontend/src/app/search/page.tsx`): view `results`, `result.status === 'UNSUPPORTED_ITEM'` renders "We can't match this kind of item yet" plus the backend `message`.
  - The heading above it still reads "Nothing yet. We'll keep looking." This mixed message needs a browser check.
  - Report Lost (`ReportFlow.tsx`) creates the report, then redirects to `/search` with the photo in sessionStorage, so the same message path applies.
  - Report Found shows no gate feedback. The report is created and indexed, and no suggestion is made.
- **Test record:** browser and version, viewport (390×844 and 1440×900), steps, expected result, actual result, screenshot.

| Case | Steps | Expected |
|---|---|---|
| Unsupported photo, lost search | `/search`, fill the form, upload `tests/assets/real_model_regression/images/backpack_14.jpg`, submit | "can't match this kind of item yet" message; **no result cards**; lost report saved; network: one `/retrieval/search` response with `status: UNSUPPORTED_ITEM`, `results: []` |
| Same via Report Lost | `/report/lost` with the same photo | same as above after the redirect |
| Supported photo | `wallet_01.jpg` | normal results view |
| Invalid file | rename a `.txt` to `.jpg` | readable error message, not raw JSON |
| Report Found, unsupported photo | `/report/found` | **Needs verification:** decide whether finders should see a notice; report as a finding, don't fix in this phase |

- **Fix only concrete defects, scoped to the copy or state in `search/page.tsx`.**

### G4. Legacy pending matches (read-only review)

**Read-only facts from 2026-11-21** (`SELECT` only, on a local DB copy):
- 19 rows with `status='pending'`, created between 2026-10-05 and 2026-11-20, all under the old no-threshold rule.
- `similarity_score` ranges from 0.10 to 0.94; 7 rows are ≥ 0.90. Scores come from different model versions and score definitions, so they are **not comparable to the current threshold**.
- 4 rows reference a lost report that no longer exists.
- In the other 15, both sides exist, are open and have matching categories.

**Review process:**
1. Export to a review sheet (staff only, never committed): `match_id`, both report IDs, categories, descriptions, locations, created dates, score, whether each side still exists or is open, and both photos as seen by staff.
2. Record a recommendation per row: keep pending / propose reject / propose accept. Missing-report rows are proposed for reject or obsolete.
3. **Do not change, re-score, approve, deny or delete any row** without explicit owner approval.
4. Once approved, apply through the existing admin endpoint `PATCH /admin/candidates/{id}`, which enforces `pending → accepted | rejected`, so there is an audit trail. Do not edit the DB directly.
5. Optional, with approval: re-run the current pipeline on each pair, read-only, for context. The re-score is advisory and is not written back.

### G5. Multi-worker deployment

- **Current state** (`src/retrieval/gallery_store.py`):
  - The gallery (FAISS `IndexFlatIP` plus numpy arrays plus `manifest.json`) is loaded into memory by **each ML-service process**.
  - Writes take a per-process `threading.RLock`, save a new generation and atomically replace the manifest.
  - With `uvicorn --workers N` or several replicas, each process holds its own copy. A report added via one worker is invisible to the others. Concurrent saves can overwrite each other's manifest, losing entries.
  - The backend startup sync would also run once per backend worker.
  - Today `start_local.sh` runs one process per service, which is correct.
- **Requirements for a shared design:**
  1. One writer, or serialised writes across processes (a lock on the store directory, or a single indexing worker).
  2. Readers notice a new generation, either by reloading on manifest change or through a shared vector store.
  3. Sync and indexing stay idempotent: the already sha-keyed design.
  4. The backend startup sync runs once per deployment, not per worker.
  5. Model loading cost: ~17 s per process (`latency_before_after.json`); memory per process needs verification.
- **Option shortlist to evaluate (no decision here; any new dependency needs approval):**
  - a single-process ML service, scaling backend workers only. This is the simplest and is valid at campus scale; 0.13 s per search on CPU.
  - a file lock plus reload-on-generation-change.
  - an external vector store.
- **Also note:** SQLite under multiple backend writers needs verification, since there is a migration path to PostgreSQL in `alembic/`.

---

## H. Ownership and sequencing

| Role | Responsible for |
|---|---|
| **Campus collection coordinator** | consent, recruiting objects and look-alikes, field capture, metadata, privacy review, dataset QC sign-off |
| **Krish / ML** | campus evaluation runs, metric reports, threshold analysis and proposals, §F experiments |
| **Application team** | UI verification (G3), notifications (G1), privacy and demo-image checks (G2), legacy review export (G4), index and deployment work (G5), eval-script backlog (§K) |
| **Project lead** | §J protocol decisions; approval of threshold changes, legacy-record actions and release targets; go/no-go |

| # | Phase / task | Owner | Prerequisites | Action | Deliverable / evidence | Acceptance | Blocks next? |
|---|---|---|---|---|---|---|---|
| 1.1 | Repository verification | App team | — | confirm `main` = `59736fc` (or later), run the suite | test log | 185 pass / 1 opt-in skip (or explained differences) | yes |
| 1.2 | Protocol decisions | Project lead | this plan | decide §J items 1–4 | decision note in `reports/campus/DECISIONS.md` | every §J item has a decision | **yes** |
| 1.3 | Eval-script must-haves | App team + ML | 1.2 | implement backlog §K items marked *must* | PR with tests | `tests/ml/test_campus_eval.py` extended and passing | **yes** |
| 2.1 | Recruit and consent | Coordinator | 1.2 | 28 objects incl. 7 look-alike pairs; signed forms | key sheet (offline), `consent` fields | 28 consented objects, or an approved smaller set | yes |
| 2.2 | Capture | Coordinator | 2.1 | §B3 per object | folders + slates + metadata | 4 views per object, or a recorded `missing_reason` | yes |
| 3.1 | Dataset QC | Coordinator + second reviewer | 2.2, 1.3 | §B6 checklist | `reports/campus/DATASET_QC.md` | all checks pass or exceptions approved | **yes** |
| 4.1 | Baseline evaluation | ML | 3.1 | run `campus_eval.py` at deployed thresholds; no tuning | `reports/campus/campus_eval.json` + `CAMPUS_BASELINE.md` (§D2) | report complete with CIs; CO3D/Commons rows labelled as not campus | yes |
| 5.1 | Threshold review | ML → Project lead | 4.1 | §E process | `THRESHOLD_CHANGES.md` entry or "no change" record | approved decision with rollback | yes, for release |
| 6.1 | Look-alike experiments | ML | 4.1 | §F directions, one at a time | experiment notes in `experiments.md` | keep/reject per §F criteria | no (parallel to 7) |
| 7.1 | Unsupported UI check | App team | 1.1 | §G3 table | test record + screenshots | expected = actual, or scoped fix merged | yes, for release |
| 7.2 | Notifications | App team | design approval | §G1 | PR + tests | §G1 acceptance | yes, for release (if in scope) |
| 7.3 | Demo-image records | App team → Project lead | — | §G2 | approved action note | no 404 images in the demo data; no private files public | no |
| 7.4 | Legacy matches | App team → Project lead | — | §G4 export + recommendations | review sheet (not committed) + approval record | every row has an approved disposition | no |
| 7.5 | Deployment architecture | App team | — | §G5 decision | architecture note | chosen option documented; tested if multi-process | yes, for release |
| 8.1 | Go / no-go | Project lead | 4.1, 5.1, 7.x | review §I gates | signed decision | all gates pass or exceptions recorded | — |

---

## I. Release gates

Where no target has been set, the gate reads **"target requires project approval"** and names the trade-off to decide.

| Gate | Evidence required | Target |
|---|---|---|
| Collection completeness | QC report: object, look-alike pair and view counts; missing-view list | 28 objects / 7 pairs per protocol; any shortfall approved by the project lead |
| Quality and consent | QC sign-off; 100% recorded consent; privacy review complete; duplicate audit clean | 100% consent and privacy review (non-negotiable); 0 unresolved duplicates |
| Category recognition and rejection | §D1 gate metrics with CIs | **target requires project approval.** Trade-off: a lower hard-stop rate means more leakage of unsupported items into search |
| Retrieval | R@1 / R@5 with CIs, per category, look-alikes | **target requires project approval.** Trade-off: the system is for human review, so R@5 (true item browsable) may matter more than R@1; decide which one the gate uses |
| Suggestion precision and coverage | closed- and open-set suggestion counts, precision with Wilson CI, coverage | **target requires project approval.** Decide the precision lower bound; §C3 gives the number of suggestions needed. **The current 22/180 (CO3D, closed set) is insufficient by itself to establish production-grade precision.** Until the target is met, suggestions are shown to staff only, labelled "needs review". |
| Privacy and direct URLs | privacy tests pass; manual check that found originals are not reachable without authorisation; §G2 resolved | no unauthorised path to an original found photo |
| Unsupported-item browser behaviour | §G3 record | all cases match the expected result on both viewports |
| Notifications | §G1 tests and a browser check | one notification per suggestion, none for ineligible cases, "needs review" wording (or explicitly out of scope for this release) |
| Index correctness and architecture | `scripts/reindex_reports.py --check` in sync on the release DB; §G5 decision | in sync; deployment runs only the process model that was tested |

---

## J. Defects found in the existing campus materials (decisions needed)

| # | Issue | Evidence | Proposed resolution | Decides |
|---|---|---|---|---|
| J-1 | **Laptop look-alike pairing is inconsistent.** The acquisition plan pre-assigns laptop slots 01/02 to existing app photos `laptop_app_u001` (MacBook) and `laptop_app_u002` (HP Victus), and says they are *not* look-alikes. But `campus_eval.py` derives twins purely from slots 01/02. | `campus_validation_plan.py` `EXISTING`/`LOOKALIKE_PAIRS`; `campus_eval.evaluate` twin logic | Collect a fresh same-model laptop pair for 01/02 (consistent with the protocol), **or** make `lookalike_of` the source of truth (backlog K-2). *Update: the evaluator now uses `lookalike_of` (K-2 done), so the slot conflict no longer corrupts metrics. Which laptops to collect is still open.* | Project lead |
| J-2 | **Existing app photos lack consent.** The two laptop instances come from app uploads (`data/uploads/item_*`), with `owner_confirmed: false`. `campus_eval.py` excludes objects without `consent.granted`. | `data/raw/real_world_instances/laptop/*/instance.json` | Include them only with the owner's signed consent; otherwise collect replacements. They do not follow the A/B background roles anyway. | Project lead + coordinator |
| J-3 | **The bounding-box requirement blocks QC but is unused.** `--check` requires a human-verified bbox on every view; production retrieval and `campus_eval.py` use the full image. | `campus_validation_plan.py::check` | Make bboxes optional (needed only for crop-policy experiments), or budget the ~2 h annotation. | Project lead |
| J-4 | **Second collection round for precision.** 28 objects cannot establish suggestion precision (§C3). | §C3 table | Decide whether release requires a larger round, sized from the approved precision bound. | Project lead |
| J-5 | **Owner description text is not collected.** It is needed for §F3 and for image + text evaluation. | protocol §4 | Add an optional `owner_description` field (one sentence, no personal data). | Project lead |
| J-6 | **EXIF orientation is not applied** to JPEG uploads (app + ML) or in `campus_eval.py`. | `scripts/run_inference.py::open_image_bytes` | Measure first: count rotation-tagged campus photos and run the eval with and without transpose. Fix as an app/ML change with a reindex if it helps. | ML + app team |

---

## K. `scripts/evaluation/campus_eval.py`: verification and backlog

### What it does today (inspected on `59736fc`)

**Input.** `--root` defaults to `data/raw/campus_validation`, with layout `<category>/<category>_<slot>/view_0{1..4}.{jpg,jpeg,png,heic,webp}` plus `instance.json`.
- Required JSON fields: `category`, `physical_instance_id`, `consent`, `views`.
- `consent.granted` must be true, otherwise the object is excluded with a warning.
- Each object needs at least 1 owner view and at least 1 found view.
- Optional `negatives/*.jp*g`.

**Process.**
- Builds a fresh temporary gallery; it never touches `data/gallery` or `app.db`.
- Adds view_03/04 under the object ID with the ground-truth category, then queries view_01/02 through the production `FinalInferencePipeline`.
- Each query runs twice: closed set (`top_k` = all objects) and open set (`allowed_ids` = all except its own object).
- The threshold comes from `configs/matching_thresholds.json` (or `--threshold`).

**Output.** `reports/campus/campus_eval.json` plus a stdout summary. It contains:
- `overall`, `by_fold`, `by_category`: n, R@1, R@5, MRR, and auto-match precision, recall, F1, open-set FMR, tp/fp counts
- `lookalike`: twin ranked above self; twin auto-matched
- `gate`: decision counts for object views and negatives; wrong-category count
- `per_query` rows
- With no data it prints `NOT_COLLECTED` and exits with code 2.

### Gaps against this plan

| # | Gap | Priority |
|---|---|---|
| K-1 | No JSON-Schema validation of `instance.json` against `configs/campus_validation/instance.schema.json` (only 4 fields are checked) | must; **implemented** |
| K-2 | Twins are derived from slots 01/02 rather than `lookalike_of` (see J-1) | must; **implemented** |
| K-3 | No confidence intervals: Wilson per query and per object, or object-level bootstrap | must; **implemented** (cluster-adjusted Wilson) |
| K-4 | No threshold sweep, so §E needs per-fold precision, coverage and FMR across thresholds | must, before any threshold review; **implemented** |
| K-5 | No duplicate or leakage check between owner and found views; reuse `dataset_audit.audit_instance_root` cross-instance and near-duplicate output and fail on hits | must; **implemented** (reuses the `dataset_audit` sha256/dHash helpers) |
| K-6 | No breakdown by capture condition (lighting, device same or different, clutter, background) even though `instance.json` records them | should |
| K-7 | No latency measurement (median / p90) | should |
| K-8 | Coverage and "still needs browsing (true item in top-5 or not)" are not reported explicitly; they are derivable from `per_query` | should |
| K-9 | Gate metrics are not split per category; negatives are not split per type; "supported-item rejection rate" is not reported as a rate | should |
| K-10 | Suggestion rule checks score ≥ threshold and `SUPPORTED`, but not ML `decision == "candidate"`. This is equivalent while the threshold is ≥ 0.65 (`CANDIDATE_PROB`); call `matching.should_auto_match` directly to avoid drift | should |
| K-11 | `campus_validation_plan.py --check` exits 0 when `BLOCKED` and ignores `cross_instance_duplicates` / near-duplicate groups | should |
| K-12 | Markdown report generation following the §D2 template | nice |

**Update (2026-11-21):** K-1 to K-5 are implemented, in `src/evaluation/campus/{schema,dataset,stats,sweep}.py` and `scripts/evaluation/campus_eval.py`, with synthetic-data tests in `tests/evaluation/test_campus_dataset.py`, `tests/evaluation/test_campus_stats_sweep.py` and `tests/ml/test_campus_eval.py`.

- **What the evaluator now does:**
  - validates before loading any model;
  - exits 2 (not collected), 3 (invalid), 4 (incomplete; override with `--allow-incomplete`) or 0;
  - reads look-alike twins only from `lookalike_of`;
  - reports cluster-adjusted 95% Wilson intervals;
  - runs a labelled, analysis-only threshold sweep (`--dev-fold`);
  - fails on exact and near duplicates. Near duplicates can be waived with `--allow-near-duplicates` after human review; exact duplicates cannot.
- **Part of K-11 also done:** `campus_validation_plan.py --check` now exits 2 when no data exists and 1 when it finds problems.
- **Still open:** K-6 to K-10, K-12, and the rest of K-11 (it still ignores cross-object duplicates; `campus_eval.py --validate-only` covers that).

---

## L. Most important next actions

1. **Project lead:** decide J-1 to J-5. Collection should not start before J-1 to J-3 are decided.
2. **App + ML:** implement backlog items K-1 to K-5.
3. **Coordinator:** recruit look-alike pairs and collect consent, then capture following §B.
4. **ML:** run the baseline at the deployed thresholds, without tuning, and publish `CAMPUS_BASELINE.md` with CIs.
5. **In parallel (app team):** the §G3 browser check, the §G4 read-only export, and the §G5 architecture note.
