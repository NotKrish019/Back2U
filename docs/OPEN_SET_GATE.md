# Open-set gate: is this a supported item?

Code: `src/inference/open_set.py` (pure decision function) and `scripts/run_inference.py::run_perception`. Config: `configs/open_set_gate.json`. Calibration: `scripts/evaluation/calibrate_open_set.py` → `reports/calibration/open_set_gate_calibration.json`.

## 1. What changed and why

| Before | After |
|---|---|
| SigLIP2 zero-shot over 7 categories + one "other object" prompt, `softmax(cos × 10)`. True-class confidence was ~0.2 for everything, so the 0.6 thresholds never fired. | `softmax(cos / T)` with **fitted T = 0.0094**, over 7 supported labels (2 prompts each) + 15 explicit *unsupported* labels (backpack, bottle, umbrella, mug, shoe, glasses, clothing, watch, bag, ID card, pen, charger, calculator, tablet, empty scene). |
| Grounding DINO ran on every query and **overrode** the classifier when the classifier was unsure, so a 0.5 "mobile phone" box turned a book or a rendered backpack into `mobile_phone`. | **Classification only.** The detector does not take part in the decision. In `full_image` mode it does not run at all (§4). |
| `UNKNOWN` was computed and then ignored ("UI-lab bypass"); retrieval always ran. | **`UNSUPPORTED_ITEM` stops retrieval.** The ML service returns `status: UNSUPPORTED_ITEM`, no candidates and no auto-match. The backend returns a structured message, and the search page explains it. |

Decisions:
- **`SUPPORTED`**: top supported probability ≥ `min_prob` (0.30) and margin to the second supported label ≥ `min_margin` (0.05).
- **`UNSUPPORTED_ITEM`**: the most likely label is an unsupported one *and* the total unsupported probability is ≥ `unsupported_min_prob` (0.80). This is a hard stop.
- **`UNCERTAIN`**: everything else. Search still runs, but no result can become `candidate`, so nothing is auto-matched.

Text-only queries bypass the gate, since there is no image. They are handled by the text path and never auto-match (`docs/MATCHING_THRESHOLDS.md`).

## 2. Calibration data (real photographs only)

| Source | Images | Labels | Licence / storage |
|---|---:|---|---|
| Wikimedia Commons | 281 after manual curation (475 downloaded, 194 excluded) | 7 supported, 6 in-vocabulary unsupported, **4 held-out unsupported** (stapler, scissors, teddy bear, basketball: no prompt exists for them) | CC0 / PD / CC BY / CC BY-SA; 55 committed as test assets |
| CO3D | 141 frames (1 per object sequence) | laptop, cellphone, book | research-only, local, never committed |

- **Curation:** every photo was inspected on contact sheets. Wrong objects, drawings, artefacts, store displays and prominent faces were excluded; the reasons are recorded per class.
- **Split:** sha256 for Commons, sequence for CO3D; 60% calibration (229), 40% test (193).
- **Selection rule:**
  - Maximise correct `SUPPORTED` on calibration data.
  - Constraints: unsupported → `SUPPORTED` ≤ 5%, wrong-category `SUPPORTED` ≤ 3%, and supported → `UNSUPPORTED_ITEM` ≤ 1%. A hard stop that blocks someone's search costs more than an `UNCERTAIN` result that is still searched.
  - The margin floor is 0.05, so a near-tie is never confident.

## 3. Results

**Temperature:** NLL 2.32 at the old T=0.1 versus **0.26 at the fitted T=0.0094**.

**Candidate OOD scores, AUROC supported vs. unsupported (test split):**

| score | all unsupported | held-out classes only |
|---|---:|---:|
| max softmax prob (full softmax with unsupported prompts) | 0.996 | 0.989 |
| energy (T·logsumexp over supported) | 0.998 | 0.996 |
| max cosine to supported prompts | 0.998 | 0.997 |
| supported probability mass | 0.995 | 0.988 |

All four separate these photos almost perfectly. The deployed rule uses the full softmax with explicit unsupported prompts, because it also gives the category and the closest unsupported object for the message. Energy or max-cosine is a drop-in alternative if campus data shows the explicit prompt list is too narrow.

**Operating point, TEST split (193 photos):**

| | Commons (130) | CO3D (63) | all |
|---|---:|---:|---:|
| supported → SUPPORTED, correct category | 0.86 | 0.90 | **0.89** |
| supported → SUPPORTED, **wrong** category | 0.08 | 0.03 | 0.06 |
| supported → UNCERTAIN | 0.03 | 0.03 | 0.03 |
| supported → UNSUPPORTED_ITEM (hard stop) | 0.02 | 0.03 | **0.02** |
| in-vocabulary unsupported → SUPPORTED | 0.014 (1/71) | n/a | 0.014 |
| held-out unsupported → SUPPORTED | 0.036 (1/28) | n/a | 0.036 |
| held-out unsupported → UNSUPPORTED_ITEM | 0.86 | n/a | 0.86 |
| precision of SUPPORTED | 0.89 | 0.97 | 0.93 |

**Wrong-category errors** are mostly Commons "book" photos of antique leather bindings classified as wallets (4/9). Real campus books will look different, so this needs campus data to judge.

**Robustness (supported Commons photos from the test split, n = 59):**

| probe | SUPPORTED | UNCERTAIN | UNSUPPORTED_ITEM |
|---|---:|---:|---:|
| Gaussian blur r = 6 | 0.80 | 0.14 | 0.07 |
| centre crop 40% | 0.83 | 0.14 | 0.03 |
| two different supported items side by side | 0.95 | 0.05 | 0.00 |
| blank / noise images (6) | 0 | 0 | 6/6 |

**Multi-object photos:** they are accepted as `SUPPORTED`, with one of the two categories. Retrieval runs on the full image, so the gallery decides which object matches. This is not a guarantee that the intended object was searched.

**Invalid inputs:** non-images, empty files, HEIC that cannot be decoded and over-size files all return a structured 400 or 413 before the gate runs (`tests/api/test_pipeline_repair.py`, `tests/ml/test_ml_service_api.py`).

## 4. Detector

- **When it runs:** Grounding DINO is used only when the crop policy needs a box (`detector_crop` or `confidence_aware`). In the production `full_image` mode it is skipped, for queries and gallery adds alike. Set `ML_DETECTOR_MODE=always` to restore the old behaviour for experiments.
- **No influence on the decision:** its label is reported as `detector_category` for information only.
- **Latency:** see `reports/benchmarks/latency_before_after.json`. Median warm query time drops from 2.52 s to 0.13 s.

## 5. Limits

- **No campus photos:** the calibration used web photos plus CO3D. Campus photos (clutter, partial views, lighting) can shift every number above (`docs/campus_validation/PROTOCOL.md`).
- **Unseen objects:** an unsupported object that resembles a supported one (a power bank versus a phone, a card holder versus a wallet) can still pass. This is exactly the campus "extra negatives" list.
- **Small test split:** the 95% interval on a 1/28 rate is roughly 0–18%.
