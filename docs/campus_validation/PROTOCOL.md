# Campus validation set: protocol, schema, splits, consent and evaluation

**Status: NOT COLLECTED.** No campus photographs exist in this repository, and none have been generated or substituted. Every number in `reports/` comes from CO3D, Objectron or Wikimedia Commons photos and is labelled as such. This document and the tooling below turn the acquisition plan (`reports/evaluation/CAMPUS_VALIDATION_ACQUISITION_PLAN.md`) into an executable procedure.

## 1. What the set is for

The question is whether a real owner photo of *their* item, taken somewhere else, matches the photo a finder took on campus, and whether look-alike items are kept apart. CO3D cannot answer this: its query and gallery frames come from the same video, with the same background and lighting.

The set is **validation only**:
- It is never used for training.
- Thresholds may be tuned only with 2-fold cross-validation (§5).
- IDs are listed in `data/processed/training_exclusion_registry.json`.

## 2. Objects and views

- **Objects:** 28 = 4 per category × 7 (laptop, mobile_phone, wallet, earphones, headphones, keys, book).
- **Look-alike pairs:** slots 01 and 02 of every category are a look-alike pair. Examples: same model and colour, the same book edition, identical AirPods cases told apart by a small mark.
- **Extra negatives:** optional, under `negatives/`. These are unsupported objects such as a charger, calculator, card holder or notebook, used to test the open-set gate.

| View | Role | Background | Viewpoint | Clutter |
|---|---|---|---|---|
| view_01 | owner | A (home or hostel) | top-down or front | no |
| view_02 | owner | A | oblique 45° or back | no |
| view_03 | found | **B** (library, cafeteria, floor) | side or low angle | no |
| view_04 | found | B or C | different from view_03 | **yes**: another object nearby |

Capture rules:
- Use a phone camera with no filters.
- No bursts or near-duplicates.
- The object must be fully visible in at least 3 views.

## 3. Naming and layout (git-ignored)

```
data/raw/campus_validation/
  <category>/<category>_<slot>/          slot = 01..04
     view_01.jpg … view_04.jpg
     instance.json                       schema: configs/campus_validation/instance.schema.json
  negatives/<free_name>.jpg              optional unsupported objects
```

`physical_instance_id = campus_val:<category>_<slot>`. Start from `scripts/evaluation/templates/instance.template.json`.

## 4. Metadata schema (summary)

Full schema: `configs/campus_validation/instance.schema.json`.

**Required fields:**
- `category`, `physical_instance_id`, `identity_basis` (why all views show the same object)
- `collected_by` (a pseudonym), `collected_on`
- `consent{granted, form_version}`
- `views{<file>: {role, background, viewpoint, clutter}}`

**Optional fields:**
- `lookalike_of`: optional in the schema, but **the evaluator identifies look-alike twins only from this field**, never from slot numbers or folder order. Set it on both twins (each pointing to the other, same category). Without it, the pair is not evaluated and `campus_eval.py` reports the dataset as INCOMPLETE.
- lighting, device, and a human-verified `bbox`
- `privacy_review`

## 5. Splits

**Instance-level folds:**
- `fold_a` = slots 01 + 03; `fold_b` = slots 02 + 04.
- Look-alike twins (01 and 02) always land in different folds, so no fold sees both twins.

**Inside the evaluation:**
- Queries are the owner views (01, 02).
- The gallery holds the found views (03, 04), one gallery item per object.

To re-tune the auto-match threshold or the gate on campus data, tune on one fold, report on the other, then swap. Report both directions and their mean. Never tune and report on the same fold.

## 6. Consent and privacy

- **Consent:** every object owner signs `docs/campus_validation/CONSENT_FORM.md`, version v1, before any photo is taken. Objects without `consent.granted = true` are excluded automatically by `campus_eval.py`.
- **Pseudonyms only:** `collected_by` and `owner_pseudonym` must not be real names. The pseudonym-to-person key is kept on paper by the collector, outside the repository.
- **Before saving a photo:**
  - no faces;
  - phone and laptop screens off or blank;
  - no names on books or ID cards, and no addresses or student numbers;
  - EXIF GPS stripped (`exiftool -gps:all= view_0*.jpg`).
  Record the check in `privacy_review`.
- **Storage:** photos stay in the git-ignored `data/raw/campus_validation/` and are **never committed**. Reports contain only aggregate metrics and per-query IDs.
- **Withdrawal:** set `consent.withdrawn_on`, delete that folder, and re-run the evaluation. Results computed earlier that included the object must be marked superseded.
- **Not real reports:** these photos never go into `app.db` or the live gallery.

## 7. Manual collection procedure (about half a day for 2 people, plus about 2 hours of annotation)

1. Print the consent form; recruit the owners of 28 items, with look-alike pairs per §2.
2. For each object, fill in a copy of the template and set `consent.granted` only after signature.
3. Take view_01 and view_02 at the owner's place (A), and view_03 and view_04 on campus (B, then C) with clutter in view_04.
4. Run the privacy review and strip GPS.
5. `python scripts/evaluation/campus_validation_plan.py --check` (protocol coverage).
6. `python scripts/evaluation/campus_eval.py` → `reports/campus/campus_eval.json`.
7. Add the results to `experiments.md` under **Campus**, kept separate from CO3D and Objectron.

## 8. What `campus_eval.py` reports

It uses the production pipeline: full-image SigLIP2 retrieval, the reranker, the calibrated open-set gate and the auto-match threshold from `configs/matching_thresholds.json`.

- **Retrieval:** Recall@1, Recall@5 and MRR, overall, per category and per fold.
- **Auto-match:**
  - precision, recall and F1 in the closed set;
  - false-match rate in the open set (the query's own object removed from the gallery, which is the common lost-and-found case).
- **Look-alikes:** how often the twin ranked above the true object, and how often the twin would have been auto-matched.
- **Validation first:** before any model loads, it validates every `instance.json` against the schema, the folder layout, role↔view consistency, `lookalike_of` references, and exact and near-duplicate images. Exit codes: 0 ok, 2 not collected, 3 invalid, 4 incomplete. `--validate-only` runs just this step.
- **Uncertainty:** cluster-adjusted 95% Wilson intervals (clusters = physical objects).
- **Threshold sweep:** per fold, labelled development / held-out (`--dev-fold`). It is analysis only: it never writes configuration or selects a threshold.
- **Open-set gate:** decision counts on object views and on the negatives.

**Statistical power:** 28 objects × 2 queries gives roughly ±13 points on Recall@1 (95% CI). Only large effects are detectable, so report confidence intervals.
