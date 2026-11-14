# Campus Validation Set — Acquisition Plan (validation only; never training or calibration)

**Status: PLANNED, not collected.** 4 of 112 view slots are pre-filled with existing genuine app photos (laptop slots 01–02). No other photographs exist, and none have been invented.

**Files:**
- **Manifest:** `data/processed/campus_validation_manifest.jsonl`, one record per planned view slot.
- **Exclusion registry:** `data/processed/training_exclusion_registry.json`. Every training or calibration builder must refuse these IDs.
- **Builder and protocol checker:** `scripts/evaluation/campus_validation_plan.py` (`--check` once photos exist).

## 1. Scope
- **Objects:** 28 physical objects = 4 per category × 7 (laptop, mobile_phone, wallet, earphones, headphones, keys, book).
- **Photos:** 4 genuine photographs per object, 112 in total.
- **Identity:** `physical_instance_id = campus_val:<category>_<slot>` (slot 01–04), identical on every view of the object.

## 2. View protocol (per object)

| View | Role | Background | Viewpoint | Clutter |
|---|---|---|---|---|
| view_01 | owner photo | A (e.g. desk at home or hostel) | top-down or front | no |
| view_02 | owner photo | A | oblique ~45° or back | no |
| view_03 | found photo | **B** (different place: library table, cafeteria, floor, bag) | side or low angle | no |
| view_04 | found photo | B or C | different from view_03 | **yes**: at least one other taxonomy object nearby (charger, phone, book, keys) |

**Why roles:** evaluation queries "owner" photos against "found" photos, so every positive pair crosses backgrounds. This directly tests the background-shortcut risk found in the CO3D pilot, which CO3D itself cannot test.

**Protocol requirements:**
- ≥ 2 distinct backgrounds, ≥ 2 viewpoints and ≥ 1 cluttered photo per object.
- Phone camera, normal resolution, no filters or edits, no duplicates or bursts.
- The object is fully visible in at least 3 of the 4 views.

## 3. Objects per category (slots 01 + 02 = look-alike pair)

| Category | Slots 01/02 | Slots 03/04 | Extra negatives (photographed, not instances) |
|---|---|---|---|
| laptop | **existing** u001 (space-grey MacBook) + u002 (black HP Victus), sharing a sticker; each needs view_03 + view_04 on a new background | two **same-model, same-colour** laptops (e.g. two space-grey MacBooks) | laptop charger brick (detected as "mobile phone" in Phase 2) |
| mobile_phone | same phone model in **different cases** | two different phones | calculator, power bank |
| wallet | two wallets of the same colour and style | two different wallets | card holder |
| earphones | two **identical** charging cases, told apart only by a small mark | two different models | lip balm / USB stick |
| headphones | two of the same model | two different | — |
| keys | two similar key rings | two different | key card |
| book | two copies of the **same title/edition** | two different books | notebook |

## 4. Annotation and provenance (per object)
**Layout:**
- Photos: `data/raw/campus_validation/<category>/<category>_<slot>/view_0{1..4}.jpg`
- Metadata: `instance.json` in the same folder (template: `scripts/evaluation/templates/instance.template.json`)

**Per-view fields:** `background` (free text, e.g. "library desk"), `viewpoint`, `clutter` (true/false), and a **human-verified** `bbox` with `bbox_status: "human_verified"`.

**Ethics:** owner consent; no faces, personal screens, ID cards or names on books.

**After collection:** run `campus_validation_plan.py --check`, then the Phase 2 manifest builder and both evaluations.

## 5. Effort
About 28 objects × 4 photos. Two people need about half a day, plus about 2 hours for box annotation.

## 6. Limitations
- **Sample size:** 28 objects and 112 queries give roughly ±9 points on overall Recall@1 and roughly ±25 points per category (95% interval). Only large effects are detectable.
- **Single campus, few photographers:** possible style bias.
- **Look-alike coverage:** one pair per category is too few to estimate the look-alike error rate precisely.
- **Laptop slots 01/02:** the existing photos were taken before this protocol, so their background and viewpoint roles must be confirmed.
