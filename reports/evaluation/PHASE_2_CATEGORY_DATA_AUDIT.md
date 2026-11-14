# Phase 2 — Category-Level Data Audit (M2)

**Date:** 2026-11-02 · **Scope:** data available on this machine for training a 7-category classifier.
**M2 training status: NOT STARTED** (prohibited in Phase 2).

## 1. Method
- **Searched:**
  - the repository, including git-ignored `data/` paths
  - all branches, stashes and worktrees, and the full git history (file names)
  - `~/Desktop`, `~/Downloads`, `~/Documents` and `~/Pictures`, by directory name and by folders holding ≥ 20 images
  - Downloads was checked by file name only; no personal files were opened
- **Audit tooling:** `scripts/evaluation/audit_real_world_data.py`. It checks readability (PIL verify), exact duplicates (SHA-256) and near-duplicates (dHash ≤ 4 bits), and collapses augmentations: Roboflow `<stem>_jpg.rf.<hash>` files map back to `<stem>`, and `aug/flip/rot/…` name markers are flagged.
- **Raw output:** `reports/evaluation/phase2_audit/real_world_audit.json`.
- **Missing inputs:** the expected pool directories named in the ingest scripts were audited explicitly and reported as missing:
  - `data/raw/headphones`, `data/raw/earphones`, `data/raw/smartphones`
  - `data/raw/objectron_images`, `data/raw/paco_images`, `data/raw/coil-100`, `data/raw/images`
- **Missing references:** the files the Phase 2 brief points to do not exist anywhere searched:
  - `docs/REAL_WORLD_DATA_COLLECTION_MASTER_GUIDE.md`
  - `docs/real_world_collection_protocol.md`
  - `reports/evaluation/PRIORITY_DATA_FOUNDATION_FINAL.md`
  - `reports/evaluation/REAL_WORLD_COLLECTION_PROGRESS.md`
  - `scripts/validate_real_world_instances.py`
  - `data/raw/real_world_instances/` (absent before this phase; created by Phase 2 staging)

## 2. Previously reported vs actually present

| Category | Previously reported (unverified) | **Genuine real images on disk** | Unique sources | Augmentations | Readiness |
|---|---|---:|---:|---:|---|
| laptop | 75 genuine images | **23** (4 user photos of 2 laptops + 19 historical Objectron detector crops of 10 laptops)¹ | 23 | 0 | **NEEDS MORE DATA** |
| mobile_phone | 1,260 single-view | **0** | 0 | 0 | **NOT AVAILABLE** |
| wallet | 0 | **0** | 0 | 0 | **NOT AVAILABLE** |
| earphones | 324 images / ~108 sources | **0** | 0 | 0 | **NOT AVAILABLE** ² |
| headphones | 6,655 augmented / ~1,330 sources | **0** | 0 | 0 | **NOT AVAILABLE** ² |
| keys | 0 | **0** | 0 | 0 | **NOT AVAILABLE** |
| book | 0 verified | **0** | 0 | 0 | **NOT AVAILABLE** |

¹ **Laptop counts.**
- 5 user files contain a byte-identical copy, leaving 4 genuine photos.
- 20 Objectron crops contain one consecutive-frame near-duplicate, leaving 19.
- The Objectron crops are crops at an old detector box. Their original frames and ground-truth boxes are not on disk.
- 20 further `vis_*` renderings (matplotlib figures with boxes drawn on) are **unusable** and are not counted.

² **Earphones and headphones.** If the previously reported Roboflow/scraped pools are located, they become **NEEDS LABEL VERIFICATION**. The audit tool will then separate originals from augmentations and keep every augmentation in its source's split. Until then, none of the reported numbers can be verified.

**Excluded, and never counted:**
- Synthetic/mock images in `data/uploads/mocks/`: one each of phone, wallet, keys, headphones, plus backpack, bottle, calculator and notebook.
- UI artwork.
- `test.jpg`: a kitchen scene, outside the taxonomy.

## 3. Suitability for category-level training
- **No category meets the minimum for a 7-way classifier.** Six of the seven categories have zero images.
- **Laptop data is unrepresentative:**
  - 19 of its 23 images are tight crops produced by an older detector.
  - Only 4 images are campus-style phone photos, and those show just 2 laptops.
- **The existing M2 checkpoint** (`laptop`/`Laptop`, SHA-256 `78c3ed08…`) is unusable as a 7-category classifier. Nothing on disk can retrain it to seven classes.

## 4. Reusable external sources (not on disk; metadata only, historical)
From `reports/data_selection/category_inventory.md` (historical metadata audit, not re-verified here):

| Source | Relevant categories | Notes |
|---|---|---|
| Objectron (public) | laptop (1,473 videos), book (2,023 videos) | Multi-view video with 3D/2D boxes. Previous ingest was throttled by GCS. |
| PACO-LVIS val | cellular_telephone 115, laptop_computer 94, book 84, earphone 28, wallet 4 (images containing the object) | Single-view, category-level only. Boxes available. |

These could cover category-level training for laptop, book and mobile_phone and part of earphones. **Wallet, keys and headphones have no identified reusable source** besides the unlocated Roboflow headphones pool.

## 5. Required before M2 training (Phase 3+)
1. Locate or re-acquire the reported phone, earphones and headphones pools.
2. Run the audit on them, then verify labels on a sample: at least 100 images per category, reviewed by a human.
3. Collect wallet and keys photos from scratch.
4. Build source-grouped splits: all augmentations of one source in the same split.
5. Hold out the real-world instance photos (Phase 2 manifest) from M2 training.
