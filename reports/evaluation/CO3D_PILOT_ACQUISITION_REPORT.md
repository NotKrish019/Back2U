# CO3D Pilot Acquisition Report (Phase 2B)

**Date:** 2026-11-02 · **Branch:** `pre-ui-lab-production-migration` (uncommitted) · **Training:** none.
**License: CC BY-NC 4.0, research only.** Commercial use of these data, or of models trained or selected with them, requires separate legal review.

## 1. Repository state and verification (before any change)
- **Git state:** branch `pre-ui-lab-production-migration` @ `5566697`. The working tree matched Phase 2A exactly (12 modified, all other changes untracked). Nothing was reset, cleaned or committed.
- **M4-C checkpoint:** SHA-256 `7aef423c63a258de9da6301cb545c993cb64c81bd7f75fcf3ef73381455881eb`, unchanged.
- **Production model version:** `lp-riem-mm1-phase1-crop-v1+m4c.7aef423c`, unchanged. The production gallery `data/gallery/` does not exist and was not created.
- **Missing referenced files:** `scripts/validate_real_world_instances.py` still **does not exist** (reported since Phase 2). `scripts/datasets/extract_sequence_views.py` did not exist and was **created in this task**.

## 2. Official sequence lists and split decision
**Source files:** `set_lists/set_lists_fewview_{train,dev,test}.json`, `sequence_annotations.jgz`, `frame_annotations.jgz`, and `LICENSE`. They come from the metadata archives `https://dl.fbaipublicfiles.com/co3dv2_231130/{cellphone,laptop,book}_000.zip`.

### Split structure (VERIFIED, sequence-disjoint)

| Category | train | dev | test |
|---|---:|---:|---:|
| cellphone | 1,045 | 50 | 50 |
| laptop | 862 | 70 | 50 |
| book | 2,160 | 83 | 50 |

One sequence per category appears in no list.

### Why the official few-view test split could not be used
For the official **test** sequences, CO3D withholds data:

| Property | Official test sequences | Official dev sequences |
|---|---|---|
| `viewpoint_quality_score` | NaN for all 150 | available |
| Frames released | only **3–11** per sequence (verified in the archive: 6 files for a sampled laptop test sequence) | 152–203 per sequence |
| Masks | 17% are placeholders (`mass = 1,000,000`) | real |

Five to eight diverse views, and the required quality filter, are impossible on the test split.

**Chosen pool: the official few-view *dev* sequences** (`set_lists_fewview_dev.json`, subset `test`). They are disjoint from the official train split, have complete frames, masks and quality scores, and are the next held-out split in CO3D's own protocol.

**Independence from M4-C training:** the current checkpoint was trained on Objectron only (model card). CO3D was never ingested anywhere in this repository before Phase 2A. No CO3D sequence can be in its training data.

### Deterministic selection
1. **Filter:** `viewpoint_quality_score ≥ 0.5`. Missing scores are excluded, not guessed.
2. **Order:** ascending SHA-256 of `sequence_name`.
3. **Take** the first 50 per category.

| Category | Dev pool | After quality filter | Selected | Shortfall | Excluded by quality |
|---|---:|---:|---:|---:|---|
| cellphone | 50 | 50 | 50 | 0 | — |
| laptop | 70 | 68 | 50 | 0 | `540_79025_153103` (0.423), `622_101988_204543` (0.236) |
| book | 83 | 83 | 50 | 0 | — |

### Permanent holdout
`data/processed/co3d_phase2_holdout_sequences.json` reserves, **never to be used for training**:
- the 150 selected sequences
- the other dev sequences: 0 cellphone, 20 laptop, 33 book
- all 150 official test sequences

The selection rule is recorded in the file.

## 3. Acquisition (HTTP Range only; no archive downloaded)
**Tools:**
- `scripts/datasets/co3d_pilot_acquire.py` (driver)
- `scripts/datasets/extract_sequence_views.py` (view selection)
- `scripts/evaluation/public_datasets/remote_zip.py` (Range reader; gained a one-request member read)

**Per sequence:**
1. Read the camera metadata.
2. Pre-select ≤ 24 viewpoint-diverse candidates without any download.
3. Fetch only those images and masks.
4. Apply the quality gates.
5. Keep ≤ 8 views by farthest-point sampling at ≥ 25° separation, relaxed to 15° only if fewer than 5 views result (relaxation is recorded).

Full per-frame decisions and reasons are in `data/raw/co3d_research_only/<cat>/<seq>/selection.json`.

**Network transfer:**

| Item | Size |
|---|---:|
| Metadata members | **164.0 MB** (`acquisition_summary.json` lists 365.9 MB, which is the *decompressed* size of those members) |
| Zip central-directory reads (to locate sequences in 34 data chunks) | **439.6 MB** |
| Candidate images + masks | **400.6 MB** |
| **Total** | **≈ 1.0 GB** |

**Retained on disk (git-ignored):**

| Item | Size |
|---|---:|
| `data/raw/co3d_research_only/` | **463 MB** total |
| ↳ selected frames + masks | 113 MB (cellphone 23, laptop 35, book 55) |
| ↳ metadata (frame annotations and set lists, needed for provenance) | 349 MB |
| Manifest (1.3 MB) + holdout (16 KB) | — |
| Contact sheets | 0.8 MB |

Well inside the 6 GB budget. No archives, videos, unused frames or temporary copies were kept.

**Camera geometry:** PyTorch3D convention, fixed for the whole dataset.
- 100% of accepted sequences had ≥ 90% of cameras facing the object (0 warnings).
- **Median viewpoint span:** cellphone 73° (min 19°), laptop 79° (min 29°), book 93° (min 42°).
- CO3D phone and laptop videos often cover a narrow arc, so 20 cellphone, 19 laptop and 8 book sequences needed the 15° relaxation.

*An aborted first run auto-selected the camera convention per sequence and flipped it on a single noisy frame, halving the measured span. The run was stopped, its partial output deleted, the convention fixed, a regression test added, and acquisition rerun from scratch.*

## 4. Results

| Category | Selected | Accepted | Rejected | Frames | Views per sequence: 3 / 4 / 5 / 6 / 7 / 8 |
|---|---:|---:|---:|---:|---|
| cellphone (→ `mobile_phone`) | 50 | **44** | 6 | **260** | 1 / 4 / 13 / 11 / 10 / 5 |
| laptop | 50 | **47** | 3 | **266** | 2 / 6 / 15 / 11 / 9 / 4 |
| book | 50 | **50** | 0 | **327** | 0 / 2 / 8 / 10 / 21 / 9 |
| **Total** | 150 | **141** | 9 | **853** | |

**Rejected sequences** (fewer than 3 usable views after the gates):

| Category | Sequence | Reason |
|---|---|---|
| cellphone | `558_80461_157719`, `558_80449_157686`, `614_98725_198544` | 1 usable view |
| cellphone | `558_80460_157712`, `622_102390_205671` | 2 usable views |
| cellphone | `76_7542_15807` | 0 usable views |
| laptop | `612_97824_196798`, `624_102975_206937` | 2 usable views |
| laptop | `372_40947_81629` | 0 usable views |

Dominant causes (inspected): **phone close-ups** where the object overflows the frame (annotated mask > 95% of the image, or the box touching ≥ 3 borders), and **edge-on phones** whose crops are under 64 px wide. Rejected sequences remain in the reserved holdout.

**Frame rejections among downloaded candidates:**

| Category | Bottom-25% sharpness* | Truncated | Crop < 64 px | Exposure |
|---|---:|---:|---:|---:|
| cellphone | 268 | 74 | 36 | 4 |
| laptop | 290 | 32 | 24 | 2 |
| book | 297 | 1 | 1 | 5 |

\* By design, this gate drops the bottom quarter of each sequence's candidates.

**Accepted sequence IDs:**
- **cellphone (44):** 571_83258_164583, 274_29360_56021, 598_91804_182393, 444_63837_126052, 598_91560_181629, 606_94733_190049, 523_75216_146409, 610_96575_193389, 495_71122_138231, 373_41373_82701, 606_94871_190743, 373_41658_83156, 112_13284_23744, 377_43624_86962, 379_44389_88397, 444_63778_125914, 378_43874_87515, 577_85060_168336, 540_79280_153659, 624_103161_207211, 506_73107_142421, 598_91894_182583, 76_7550_15819, 375_42407_84968, 378_44039_87758, 76_7541_15405, 523_75480_147358, 598_91896_182568, 379_44361_88370, 342_35791_64636, 514_73764_143591, 581_86268_171251, 555_80016_155909, 610_96845_194060, 492_70519_136646, 598_91909_182603, 378_43907_87449, 470_66304_130160, 610_96886_194142, 191_20575_35658, 373_41642_83130, 523_75438_147270, 598_91916_182612, 374_42188_84354
- **laptop (47):** 569_82743_163318, 392_47559_94573, 354_37685_70782, 558_80636_158444, 385_45393_90753, 387_46446_92723, 378_43976_87640, 595_90444_180226, 378_44211_88110, 375_42571_85394, 256_27647_53803, 529_76665_148145, 374_42105_84199, 391_47271_94003, 598_92054_183616, 378_44207_88121, 373_41558_82973, 378_43855_87425, 604_94275_189483, 372_40878_81136, 614_98511_198261, 598_91782_182360, 212_22443_46420, 372_41242_82155, 380_44854_89698, 372_41062_82211, 373_41656_83408, 391_47273_94005, 353_37503_70589, 339_35071_63061, 373_41416_82673, 540_79011_153084, 394_48738_96392, 374_41860_83920, 222_23409_48576, 212_22391_44980, 378_44220_88123, 457_64452_127008, 558_80367_157341, 182_19688_35488, 372_41337_82330, 523_75187_146271, 374_41891_83927, 386_46199_92188, 537_78150_151192, 391_47265_93997, 372_41085_81815
- **book (50):** 197_21193_41047, 262_28105_55340, 271_28906_56261, 247_26475_51826, 228_23996_49759, 534_77418_149814, 604_94080_188373, 247_26450_50929, 150_16690_32076, 540_79227_153438, 209_22089_45167, 209_22150_45214, 20_752_1509, 30_1112_3047, 540_79103_153236, 160_17582_33086, 14_187_757, 188_20322_37186, 209_22156_45173, 20_688_1353, 30_1241_3644, 102_11955_20634, 455_64227_126525, 209_22166_45183, 209_22170_45187, 540_79151_153292, 209_22181_45211, 271_28947_56809, 253_27217_54517, 475_67193_131887, 219_23094_47459, 579_85971_170389, 209_22175_45193, 247_26493_52247, 188_20350_38446, 620_101111_202752, 247_26474_51827, 247_26469_51778, 188_20313_36545, 346_36036_66110, 209_22168_45185, 30_1202_3579, 209_22174_45191, 150_16670_31845, 150_16691_32077, 209_22184_45215, 209_22183_45213, 150_16684_31898, 289_30608_58317, 353_37516_70606

## 5. Manifest
`data/processed/co3d_phase2_pilot_manifest.jsonl`: **853 records, 141 physical instances**.
- **Required fields:** every record has all of them (`image_path`, `category`, `physical_instance_id = co3d:<sequence>`, `identity_status = SOURCE_SEQUENCE`, `view_id`, `source = CO3D`, `license = CC-BY-NC-4.0`, `attribution`, `source_url` (archive URL + member path), `source_sequence_id`, `source_frame_id`, `timestamp`, `ground_truth_bbox` (tight mask box, threshold 0.5), `mask_path`, `selection_scores`, `download_date`, `sha256`, `split = test`, `verification_status = PENDING_HUMAN_QC`). There are no missing values.
- **Category mapping:** CO3D `cellphone` → canonical `mobile_phone`. The original is kept as `source_category`.
- **Validation:** checked by the Phase 2 loader. No duplicate image bytes, no instance in more than one split, no identical bytes under two instances.

## 6. Identity assumptions
- **Positives:** all views of one CO3D sequence are treated as **one physical object**, which is CO3D's design. Status stays `SOURCE_SEQUENCE` until human QC.
- **Negatives: UNVERIFIED.** Different sequences are not guaranteed to be different physical units.
  - The first field of the sequence name is shared by 84 of 141 sequences (25 groups). Its meaning is undocumented and may be a contributor or batch.
  - **Book has 11 sequences with prefix `209_2xxxx`** (corrected in Phase 2C; first stated as 12), consistent with one contributor filming many books in one session.
  - Cross-sequence "hard negatives" must not be treated as verified ground truth. See `CO3D_PILOT_QC_CHECKLIST.md`.

## 7. Licensing and isolation
- **Official license:** `data/raw/co3d_research_only/LICENSE` (CC BY-NC 4.0, byte-identical in all three category archives).
- **Notice:** `ATTRIBUTION_AND_RESEARCH_ONLY_NOTICE.md` gives the attribution and research-only rules.
- **Data locations:** `data/raw/` and `data/processed/` are git-ignored (verified with `git check-ignore`).
- **Contact sheets:** they contain CO3D imagery, so `reports/evaluation/co3d_pilot/contact_sheets/` was **added to `.gitignore`** in this task. The reports themselves stay committable.
- **Kept separate:**
  - not in any production gallery or index
  - not merged with commercially intended data
  - not distributed
  - no commercial deployment rights claimed

## 8. Tests
`tests/evaluation/test_co3d_view_selection.py`: **7 passed**. Covered:
- camera geometry and the dataset-wide convention, with a regression test for the aborted-run bug
- viewpoint separation ≥ 25°
- per-frame rejection reasons (exposure, empty mask)
- rejection of sequences with fewer than 3 views
- recording of the 15° relaxation
- mask-box and Laplacian helpers
- only candidate frames are downloaded
