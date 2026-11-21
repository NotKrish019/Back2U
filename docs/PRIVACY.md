# Found-item photo privacy

Code: `src/api/services/privacy.py`. Tests: `tests/api/test_pipeline_repair.py` (privacy section).

## Policy (unchanged product rule, now enforced server-side)

Photos of **found** items can show details that a genuine owner should *describe*, not copy, such as stickers, engravings and lock screens. So:

| Viewer | Found-report photo |
|---|---|
| anonymous / any other signed-in user | **blurred derivative** |
| user with a **pending** or **denied** claim | blurred derivative |
| the finder who filed the report | original |
| staff (`is_admin = "true"`) | original |
| user whose claim on that report was **approved** | original |

Lost-report photos are published by their owner to help finders and are returned unchanged.

## How the blur works

- **The derivative:** the server decodes the stored image, downscales it to at most 320 px, and applies a Gaussian blur of radius 6% of the longer side (at least 8 px). It then re-encodes the result as JPEG and returns it as a `data:` URL.
- **No path to the original:** the blur is baked into the pixels. The response contains no reference to the original, so removing the CSS blur, opening the data URL, or reading the JSON reveals nothing more.
- **Decode failures:** if an image cannot be decoded, no image is returned. The server never falls back to the original.
- **Frontend compatibility:** the `BLURRED_` prefix is kept so the existing frontend still shows its "blurred" styling. `image_blurred: true` is the machine-readable flag.
- **Caching:** derivatives are cached in memory (LRU, 512 entries) keyed by a hash of the reference.

**Endpoints covered:**
- `GET /reports`
- `GET /reports/{id}` (item detail page)
- `POST /retrieval/search`
- `GET /reports/{id}/matches` (found photos shown to a lost-report owner)
- Admin endpoints return originals because staff are authorised.

## Known limitations

- **Seeded demo reports (corrected 2026-11-21):** two seeded reports reference `/mocks/lost_macbook.jpg` and `/mocks/found_macbook.jpg`, but those files do not exist (direct URL returns 404), so nothing is exposed; the reports simply have broken images. The files that do exist in `frontend/public/mocks/` are rendered homepage illustrations with no real item photos, and they are public by design. Real reports store images as data URLs inside the database. See `docs/campus_validation/EXECUTION_PLAN.md` §G2.
- **ML service static files:** the ML service used to mount all of `data/` under `/data`, which served the gallery's original found photos by direct URL. It now serves only `data/uploads/queries/` (the `query_img` of a search); `tests/ml/test_ml_service_api.py` checks that gallery files return 404. Query uploads are still personal photos, so the ML service must stay bound to `127.0.0.1`, as it is in `start_local.sh`.
- **No re-identification guarantee:** a blurred photo still shows the colour and rough shape. This is intended; it lets owners recognise the category, while proof of ownership comes from the claim text.
