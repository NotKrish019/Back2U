# Real-photo regression assets

55 genuine photographs from Wikimedia Commons, used by `tests/ml/test_real_models_regression.py`.

| kind | classes | per class |
|---|---|---:|
| supported | laptop, mobile_phone, wallet, earphones, headphones, keys, book | 5 |
| unsupported (has a gate prompt) | backpack, water_bottle, umbrella, mug, sneaker, sunglasses | 2 |
| held-out unsupported (no prompt) | stapler, scissors, teddy_bear, basketball | 2 |

**Provenance:**
- `manifest.json` records, per file: ground-truth class, sha256, Commons page, author, licence and the pinned download URL.
- Attribution is in `LICENSES.md`.
- Every image was manually checked: correct object, no faces, no personal data.
- Files come from the calibration *test* split where possible.
- Rebuild or verify with `python scripts/datasets/regression_assets.py build|verify [--refetch]`.

**Limits:** these are single photos with no repeated identity, so the re-ID test built on them uses synthetic second views. That test is a regression guard, not evidence of real-world re-identification.
