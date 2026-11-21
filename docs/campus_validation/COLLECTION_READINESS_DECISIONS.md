# Campus collection readiness: audit and decisions

**Audit date:** 2026-11-21. **Repository:** `main` @ `59736fc` plus uncommitted work (§0).

**Status:** **Not ready to collect.** Six project-lead decisions (§3) must be made first. The tooling is ready, apart from the gaps in §6. No campus photo has been collected; `data/raw/campus_validation/` does not exist.

Companion documents:
- `docs/campus_validation/PROTOCOL.md` (collection protocol)
- `docs/campus_validation/EXECUTION_PLAN.md` (plan, metrics, release gates)
- `docs/campus_validation/CONSENT_FORM.md`

This document records what was verified, what still needs a decision, and how to run collection and the baseline once the decisions are made.

---

## 0. Repository state verified for this audit

| Item | State |
|---|---|
| Branch / HEAD / remote | `main`, `59736fc`, equal to `origin/main` |
| Uncommitted work from earlier tasks (preserved, not committed) | `EXECUTION_PLAN.md` (untracked); `docs/PRIVACY.md`, `docs/campus_validation/PROTOCOL.md`, `reports/PIPELINE_REPAIR_REPORT.md`, `scripts/evaluation/campus_eval.py`, `scripts/evaluation/campus_validation_plan.py`, `tests/ml/test_campus_eval.py` (modified); `src/evaluation/campus/`, `tests/evaluation/campus_fixtures.py`, `tests/evaluation/test_campus_dataset.py`, `tests/evaluation/test_campus_stats_sweep.py` (untracked) |
| Not to be touched | `app.db` (locally modified, real user data), 10 untracked UI screenshots in the repo root |

---

## 1. Safeguards K-1 to K-5: verified against the code

| # | Where | Verified behaviour | Tests |
|---|---|---|---|
| K-1 validation | `src/evaluation/campus/schema.py`, `src/evaluation/campus/dataset.py::load_dataset`, `scripts/evaluation/campus_eval.py::main` | Schema checked against `configs/campus_validation/instance.schema.json`; folder/ID/category consistency; unique object and image IDs; listed files exist and stay inside the root; no unlisted images; view role matches view number; readable images; consent; protocol completeness. Runs **before** any model loads. Exit codes: 2 not collected, 3 invalid, 4 incomplete, 0 OK (incomplete only with `--allow-incomplete`). `campus_validation_plan.py --check` exits 2 when nothing is collected and 1 when it finds problems. | `tests/evaluation/test_campus_dataset.py` (K-1 section), `tests/ml/test_campus_eval.py::test_cli_refuses_invalid_data_before_loading_models` |
| K-2 look-alikes | `dataset.py::_pairs` | Pairs come only from `lookalike_of`; details in §2 | K-2 section of `test_campus_dataset.py`; `test_campus_eval.py::test_evaluate_uses_metadata_twins_and_reports_intervals` |
| K-3 intervals | `src/evaluation/campus/stats.py` | 95% Wilson interval, cluster-adjusted by physical object; raw counts kept; no zero-width interval at 0% or 100%; `small_sample` flag when n_eff < 30; MRR deliberately has no interval | `tests/evaluation/test_campus_stats_sweep.py` |
| K-4 sweep | `src/evaluation/campus/sweep.py` | Production rule `matching.should_auto_match`; same fixed rows for every threshold; per fold, labelled development / held-out (`--dev-fold`); `selected_threshold` is always null; writes no configuration | `test_campus_stats_sweep.py`, `test_campus_eval.py::test_cli_end_to_end_with_fake_pipeline_writes_no_configuration` (config hashes unchanged) |
| K-5 duplicates | `dataset.py::_duplicates` | Same file referenced twice (symlink or hard link); identical bytes anywhere (views, negatives, slates) → INVALID, naming every object and path; near-duplicates (in-repo dHash, distance ≤ 4) across objects or across owner/found roles → INVALID, waivable only with `--allow-near-duplicates` after human review; same-role near-duplicates → warning; exact duplicates are never waivable | K-5 section of `test_campus_dataset.py` |

### Discrepancies found in this audit

| # | Finding | Resolution |
|---|---|---|
| R-1 | **HEIC photos were rejected.** The schema allows `.heic` and the protocol says to keep phone originals, but validation reported every HEIC view as `unreadable_image`. The validator decoded images without the `pillow_heif` plugin that production uses. | **Fixed** (intent unambiguous): the plugin is registered in `src/evaluation/campus/dataset.py` and in `campus_validation_plan.py --check`. Tests added: `test_heic_views_are_readable_in_validation`, `test_protocol_checker_reads_heic_views`. |
| R-2 | `PROTOCOL.md` §4 implies both twins must declare each other. The code accepts one-sided declarations (§2). | Documented here; **no change**. This is Decision 4. |
| R-3 | My previous K-1 to K-5 completion summary said look-alike results "need `lookalike_of` on both twins". That was inaccurate: one declaration is enough (§2). | Corrected here. |
| R-4 | The bounding-box rule is inconsistent across documents (Decision 1): the acquisition plan *requires* human-verified boxes, `PROTOCOL.md` §4 lists them as *optional*, `campus_validation_plan.py --check` *requires* them on every view, and `campus_eval.py` *ignores* them. | Decision 1; **no change** |
| R-5 | The schema's `lookalike_of` description still says "(slots 01<->02)". It is an annotation only and does not affect validation. | Fix in Phase B, together with Decision 4 |
| R-6 | The schema's view-name pattern accepts only **lowercase** extensions (`view_01.heic`, not `view_01.HEIC`). iPhone exports are uppercase. | No change. The checklist (§4) requires renaming to lowercase. |
| R-7 | The evaluation report records the model version, thresholds and validation summary, but **not** a dataset fingerprint (per-image sha256 list), the git commit, or config file hashes. Image hashes are computed during validation but are not written to the report. | **Missing capability**, so the runbook (§5) records these manually. Proposed backlog K-13. |
| R-8 | `campus_validation_plan.py::build()` still maps the two app-upload laptop instances onto `campus_val:laptop_01/02` in the git-ignored planned manifest. `campus_eval.py` does **not** read that manifest. | Decision 2/3, then Phase B |

---

## 2. Look-alike metadata: exact current behaviour

Established from `dataset.py::_pairs`, its tests, and a one-off check on synthetic data during this audit.

| Question | Current behaviour |
|---|---|
| 1. One-sided declaration (A says B; B says nothing) accepted? | **Yes**: dataset status stays OK. |
| 2. Reciprocal reconstructed? | **Yes.** The pair is stored undirected, and **both** A and B get `twin` set. Verified on synthetic data: the non-declaring object received its twin. |
| 3. Included in evaluation? | **Yes.** The queries of both objects count as look-alike queries. |
| 4. Warning? | **Yes**: `lookalike_one_sided`, reported on the non-declaring object. |
| 5. Declared from both sides counted once? | **Yes**: one pair, no warning. |
| 6a. Unknown object referenced | **Error** `lookalike_unknown` → INVALID |
| 6b. Self-reference | **Error** `lookalike_self` → INVALID |
| 6c. Different category | **Error** `lookalike_cross_category` → INVALID (PROTOCOL §2: pairs are per category) |
| 6d. Object in more than one pair (e.g. A→B, C→B) | **Error** `lookalike_contradiction` on that object; **all** pairs involving it are dropped → INVALID |
| 6e. Partner excluded (no or withdrawn consent) | **Incomplete** `lookalike_partner_excluded`; pair not evaluated |
| 6f. A category with no pair | **Incomplete** `lookalike_pairs_short` |
| 7. Documentation accurate? | **Partly.** `EXECUTION_PLAN.md` §K describes the code correctly. `PROTOCOL.md` §4 ("Set it on both twins … Without it, the pair is not evaluated") reads as if both declarations are required, which the code does not enforce (R-2). |

**Test coverage gap (not filled, by design):**
- `test_one_sided_declaration_is_accepted_with_warning` asserts the pair and the warning.
- No committed test asserts that the *non-declaring* object receives its twin. That was verified only by the one-off check.
- I did not add a test because the policy itself is Decision 4; a test would lock in one answer.

---

## 3. Decisions for the project lead

Nothing below has been decided. Each decision names the files to change *after* approval.

### Decision 1: Bounding boxes

**Current state:** see R-4. Production retrieval embeds the **full image** (`ML_CROP_POLICY=full_image`; the detector is not run). `campus_eval.py` never reads `bbox`.

| Option | Collection effort | Data management | Files to change after approval |
|---|---|---|---|
| A. Keep as a requirement | ~2 h of annotation for 112 photos (acquisition-plan estimate), plus a reviewer pass | boxes become part of the dataset version; a box error can block QC | `PROTOCOL.md` §4 (state "required", consistent with the checker); `campus_eval.py` validation if the evaluator should also enforce boxes; tests |
| B. Remove | none | none | `campus_validation_plan.py::check` (drop the `boxes` condition); acquisition plan §4; `PROTOCOL.md` §4; tests for the checker |
| C. Optional research metadata | only where someone annotates | boxes used only by future crop-policy experiments; must not gate QC | as for B, plus documenting `bbox_status` meanings; the schema already allows absent boxes |

### Decision 2: Laptop look-alike pair

- **Facts:** the acquisition plan put `laptop_app_u001` (MacBook) and `laptop_app_u002` (HP Victus) in slots 01/02, and itself states they are **not** look-alikes.
- **Effect of the K-2 change:** the evaluator now ignores slot numbers. That removes the *metric* error, but it does **not** make these two laptops a look-alike pair; only an explicit `lookalike_of` would.
- **Requested:** approve collecting a genuinely similar but physically distinct laptop pair (for example, the same model and colour). Record it with `lookalike_of` on both objects, per whatever Decision 4 settles.
- **After approval:** remove the `EXISTING` mapping from `campus_validation_plan.py::build()` (R-8) and update acquisition plan §3.

### Decision 3: Existing app-upload photos

- The two laptop instances under `data/raw/real_world_instances/laptop/` come from Back2U app uploads. Their metadata records `owner_confirmed: false`; there is no campus-evaluation consent.
- **They stay excluded.** They are not in `data/raw/campus_validation/`, and the evaluator reads only that folder. They may be used only if the owner signs `CONSENT_FORM.md` for this specific use, and the project lead approves it in writing.
- **Process control the tool cannot enforce:** `campus_eval.py` trusts `consent.granted` in `instance.json` and cannot check a signature. Copying app uploads into the campus folder must therefore require that written approval.
- No image was opened, copied or exposed during this audit, and no production record was changed.

### Decision 4: One-sided `lookalike_of` declarations

The current behaviour is in §2 (accepted, rebuilt as a pair, evaluated, with a warning).

| Option | Implications | Changes after approval |
|---|---|---|
| A. Require both objects to declare each other | catches typos and asymmetric metadata; a missing back-reference blocks evaluation as INVALID or INCOMPLETE (choose which) | `dataset.py::_pairs` (one-sided becomes an error or gap); update `test_one_sided_declaration_is_accepted_with_warning`; `PROTOCOL.md` §4; schema description (R-5) |
| B. Keep current behaviour (accept, rebuild, warn) | more forgiving; relies on the QC reviewer acting on warnings | `PROTOCOL.md` §4 wording (R-2); add a test that the non-declaring object gets its twin; schema description (R-5) |

### Decision 5: Look-alike twins and evaluation folds

**Verified behaviour:**
- `fold_of(slot)` assigns `fold_a` = slots 01+03 and `fold_b` = 02+04 (`dataset.py`, PROTOCOL §5).
- Twins in the same fold produce the warning `lookalike_same_fold`.

**Effect on reliability:**
- The gallery always contains **all** objects; folds only split the *queries* for per-fold summaries and the threshold sweep.
- Look-alike confusion is therefore measured correctly whatever the folds.
- The risk is limited to the sweep. If both twins land in the development fold, the held-out fold contains no queries from that pair, so look-alike difficulty is unevenly split between tuning and held-out results.
- With twins in slots 01/02 (the protocol recommendation) they always fall in different folds.

| Option | Implication |
|---|---|
| A. Keep slot-based folds; report the warning and the limitation | no change; the collector must place twins in slots 01/02 (or 03/04) for a clean split |
| B. Assign folds from pairs (e.g. the lower ID of each pair to `fold_a`, its twin to `fold_b`; unpaired objects by slot) | twins are always split, whatever their slots; requires a `fold_of` change, tests, and an update to PROTOCOL §5 |

### Decision 6: Targets and release scope

**Targets to approve.** None exist yet; see EXECUTION_PLAN §I. **No value is proposed here, and the current 0.90 threshold is not declared production-ready.**

| Metric | Trade-off to decide |
|---|---|
| Category: correct-category rate | versus the uncertain rate |
| Supported-item hard-stop rate | lower means more unsupported items get searched |
| Unsupported rejection / leakage on negatives | versus the hard-stop rate |
| Recall@1 vs Recall@5 (which one gates release) | the system supports human review, so R@5 may matter more |
| Suggestion precision: the *lower confidence bound* to require | sets the number of suggestions needed (EXECUTION_PLAN §C3: 35 / 73 / 189 all-correct suggestions for a 0.90 / 0.95 / 0.98 lower bound) |
| Suggestion coverage | versus precision |
| Look-alike: twin auto-suggested rate | likely "zero observed" plus an interval |
| Search latency budget | CPU-only versus a GPU |

**Separate scope decisions (not collection requirements):**
- **A second, larger collection round:** 28 objects cannot establish suggestion precision (EXECUTION_PLAN §C3). Is a second round required before release, and at what size (which follows from the precision target)?
- **Match notifications for the first release:** none exist (§6), so either build them or explicitly drop them from this release.

---

## 4. Field checklist

**M** = mandatory (protocol, schema or tooling enforces it). **R** = recommended practice.

**Before any photo**
- [ ] **M**: decisions 1–5 recorded in `reports/campus/DECISIONS.md` (new; does not exist yet).
- [ ] **M**: signed consent form v1 for the owner; key sheet (pseudonym ↔ person) kept offline. In `instance.json`: `consent.granted`, `form_version`, `owner_pseudonym`.
- [ ] **M**: object ID `campus_val:<category>_<slot>`; folder `data/raw/campus_validation/<category>/<category>_<slot>/`. No names or personal data in folder names, file names or IDs.
- [ ] **M**: `category` is one of laptop, mobile_phone, wallet, earphones, headphones, keys, book, matching the folder.
- [ ] **M**: look-alike twins are two **different** physical objects of the same category; declare `lookalike_of` as Decision 4 requires (currently at least one side; both sides recommended).
- [ ] **R**: put twins in slots 01/02 so they land in different folds (Decision 5).
- [ ] **R**: print a slate card per object showing only its ID.

**Per object (capture)**
- [ ] **M**: four files `view_01` to `view_04`, with **lowercase** extensions from jpg, jpeg, png or heic (R-6).
  - view_01 and view_02: role `owner` (home, background A).
  - view_03 and view_04: role `found` (campus, backgrounds B and C; clutter in view_04).
  - The validator rejects a role that contradicts the view number.
- [ ] **M**: per view in `instance.json`: `role`, `background`, `viewpoint` (enum), `clutter` (boolean); optional `background_id`, `lighting` (enum), `device`.
- [ ] **M**: per object: `identity_basis`, `collected_by` (pseudonym), `collected_on` (YYYY-MM-DD), `description` (no personal data).
- [ ] **M**: no faces, unlocked screens, names, ID numbers or addresses in any photo; strip GPS (`exiftool -gps:all=`).
- [ ] **M (until Decision 1):** the checker requires a human-verified `bbox` on every view.
- [ ] **R**: a slate photo before each object, stored as `data/raw/campus_validation/_slates/<category>_<slot>.<ext>`. It must **never** go in the object folder or appear in a view; the validator checks slates only for exact duplicates.
- [ ] **R**: view_03/04 taken by a second person on a second phone (EXECUTION_PLAN §B1); record `device`.
- [ ] **R**: vary viewpoint, distance (~30 cm vs ~1 m), lighting and phone model across the set. Keep phone originals; no edits, filters, screenshots or chat-app re-sharing.

**Missing, unusable or withdrawn**
- [ ] **M**: an unusable photo is deleted and reshot in the same slot. Never keep two versions; the duplicate checks would flag them.
- [ ] **M**: a slot that cannot be reshot is left empty and removed from `views`. The validator then reports `missing_view` (INCOMPLETE).
- [ ] **M**: withdrawn consent means deleting the folder and its slate, then re-running validation. Earlier reports are marked superseded.

**After capture (quality gate)**
- [ ] **M**: `campus_eval.py --validate-only` → status `OK` (or `INCOMPLETE` with written approval to proceed).
- [ ] **M**: `campus_validation_plan.py --check` → exit 0, or each listed problem has an approved exception.
- [ ] **M**: zero exact duplicates. Every near-duplicate finding is reviewed by a person *before* `--allow-near-duplicates` is used, and the review is recorded.
- [ ] **M**: a second person confirms each slate matches its folder and that the object looks the same across all 4 views (catches swapped twins).
- [ ] **M**: every `lookalike_one_sided` warning is resolved or accepted per Decision 4.

---

## 5. Baseline runbook (do not run until Phase D passes)

All flags were checked against `--help` on 2026-11-21. Run from the repository root with the project virtualenv active.

| Step | Command / action | Pass condition |
|---|---|---|
| 1. Consent and completeness | coordinator confirms signed forms for every object folder; decisions recorded | every object has `consent.granted: true` backed by a signed form |
| 2. Protocol check | `python scripts/evaluation/campus_validation_plan.py --check` | exit 0 (1 = problems, 2 = nothing collected) |
| 3. Dataset validation (no models) | `python scripts/evaluation/campus_eval.py --validate-only` (default root `data/raw/campus_validation`) | exit 0, `"status": "OK"`. Exit 3 = INVALID (fix errors), 4 = INCOMPLETE (complete, or get written approval for `--allow-incomplete`), 2 = nothing found |
| 4. Resolve findings | fix schema, missing-file, duplicate and look-alike issues; use `--allow-near-duplicates` only after a recorded human review | step 3 passes again |
| 5. Folds | confirm the fold split (Decision 5) and pick the development fold **before** looking at results; record it | written in `reports/campus/DECISIONS.md` |
| 6. Record provenance (manual, R-7) | `git rev-parse HEAD`; `shasum -a 256 configs/matching_thresholds.json configs/open_set_gate.json`; `find data/raw/campus_validation -type f \( -name 'view_*' -o -name 'instance.json' \) -exec shasum -a 256 {} + \| sort -k2 > reports/campus/dataset_manifest.sha256` | files saved next to the report |
| 7. Baseline, production thresholds, **no tuning** | `python scripts/evaluation/campus_eval.py --dev-fold fold_a --out reports/campus/campus_eval_baseline.json` (no `--threshold`, so the deployed value from `configs/matching_thresholds.json` is used; replace `fold_a` with the fold chosen in step 5) | exit 0; report written |
| 8. Read the report | `overall`, `by_category`, `by_fold`: R@1/R@5 with `ci`. `auto_match`: precision, coverage, open-set false-match rate, `needs_human_browsing`. `gate`: rates per category and on negatives. `latency_s`. `lookalike` (reported separately). Every `small_sample` flag. `validation.warnings`. | numbers copied into the EXECUTION_PLAN §D2 template, with raw counts and intervals |
| 9. Limitations | state: n objects, n_eff, CO3D/Commons figures are not campus figures, any `--allow-*` flags used, near-duplicate waivers | written into the report |
| 10. Preserve | keep the dataset files (git-ignored), the step-6 provenance files, the JSON report and the decisions note together; never edit the report afterwards | reproducible from the recorded commit, configs and dataset hashes |

**Rules:**
- **Step 7 never changes a threshold.** The sweep in the report is analysis only (`selected_threshold: null`).
- **No tuning and reporting on the same data.** A threshold chosen from the development fold may only be reported on the held-out fold, and the change follows EXECUTION_PLAN §E.

**Not available as commands (label as missing, do not improvise):**
- No dataset-fingerprint, commit or config-hash output in the report (R-7; proposed K-13).
- No Markdown report generator (K-12).
- No per-capture-condition breakdown (K-6).

---

## 6. Remaining technical blockers

| Item | Status | Evidence |
|---|---|---|
| K-6 per-capture-condition breakdown (lighting, device, clutter, background) | **Outstanding** | `campus_eval.py` does not group by view metadata |
| K-7 latency | **Verified complete** | `evaluate()` reports `latency_s` (median, p90) |
| K-8 coverage / still needs browsing | **Outstanding (partial)** | `coverage` and `needs_human_browsing` are reported; the split "true item in top 5 vs not" among non-suggested queries is not |
| K-9 gate rates per category; negatives per type | **Outstanding (partial)** | `rates_by_category` and the supported-rejection rate exist; negatives are not split by `negatives.json` type |
| K-10 use the production suggestion rule | **Verified complete** | `campus_eval._suggested` → `sweep.suggested` → `matching.should_auto_match` |
| K-12 Markdown report | **Outstanding** | no generator exists |
| K-11 cross-object duplicates in `campus_validation_plan.py --check` | **Outstanding** | `check()` ignores `cross_instance_duplicates`. Covered in practice by `campus_eval.py --validate-only` (K-5). |
| R-7 dataset/commit/config fingerprint in report (proposed K-13) | **Outstanding** | not written; manual step 6 in §5 |
| Unsupported-item browser behaviour | **Needs verification** | code path exists (`frontend/src/app/search/page.tsx`, `status === 'UNSUPPORTED_ITEM'`). The search form first creates a lost report (`api.createReport`, authenticated), so a test needs **a signed-in Firebase test account and a test database** (`DATABASE_URL` pointing to a copy, never `app.db`). Not run. |
| Notifications | **Outstanding / requires project-lead decision** (Decision 6) | no backend notification code; `frontend/src/app/notifications/page.tsx` is a placeholder |
| Firebase Cloud Messaging | **Needs verification** | `frontend/src/lib/firebase/config.ts` contains the standard `messagingSenderId` key, which every web app config has and which does not show messaging is enabled. No messaging SDK import, no messaging service worker in `frontend/public`, no `firebase.json`. Whether messaging is enabled in the Firebase *project* cannot be determined from the repository. |
| Multi-worker search index | **Outstanding** | `src/retrieval/gallery_store.py`: per-process in-memory gallery with a per-process lock; safe only as one ML-service process (EXECUTION_PLAN §G5) |
| ML process memory | **Partly verified** | `footprint` on the running ML service (macOS arm64, after many inferences, idle): **884 MB** current, **1,256 MB** peak. One machine and one measurement; Linux/production figures need verification. |
| JPEG rotation tags (EXIF orientation) | **Outstanding** | `scripts/run_inference.py::open_image_bytes` decodes and converts without `exif_transpose`; affects production and `campus_eval.py` alike (EXECUTION_PLAN §J-6, ML + app team) |

---

## 7. Sequence

| Phase | Owner | Prerequisites | Deliverable | Exit criteria |
|---|---|---|---|---|
| **A. Decisions** | Project lead | this document | `reports/campus/DECISIONS.md` covering Decisions 1–6 | every decision recorded, including "out of scope" answers |
| **B. Protocol finalisation** | Application team (code/docs), Krish / ML (review) | A | only the approved changes from §3 (checker, `dataset.py`, schema description, PROTOCOL, acquisition plan, `build()` mapping) with tests | test suite passes; PROTOCOL, schema, checker and evaluator agree (R-2, R-4, R-5, R-8 closed) |
| **C. Collection** | Campus collection coordinator | B; consent forms; look-alike objects recruited | photos and `instance.json` files under `data/raw/campus_validation/` (git-ignored). **Real photos taken by people only.** No generated, synthetic or substituted images, and no app uploads without Decision 3 approval. | §4 capture checklist complete for every object |
| **D. Quality gate** | Coordinator + a second reviewer; application team runs the tools | C | QC record (`reports/campus/DATASET_QC.md`): validation output, checker output, near-duplicate review, slate audit | `--validate-only` OK (or approved INCOMPLETE); checker exit 0 or approved exceptions; zero exact duplicates |
| **E. Baseline** | Krish / ML | D | `reports/campus/campus_eval_baseline.json` + provenance files + the EXECUTION_PLAN §D2 table | run with production thresholds and no tuning; intervals and limitations reported |
| **F. Evidence-based decisions** | Project lead, advised by Krish / ML and the application team | E | decisions on threshold changes (EXECUTION_PLAN §E), a second collection round, ML work (§F) and product work (§G) | each decision cites baseline evidence; any threshold change has a held-out result and a rollback |
