# Dataset Strategy

## Objective

Use public data to train/evaluate the ML components without requiring a custom campus dataset.

There is no single public dataset that exactly matches the final use case (campus belongings + same physical instance + vague owner text + lost/found metadata). Therefore the project uses a **composed dataset strategy**.

## Dataset 1 — Objectron

### Role
Primary source for object-centric multi-view learning.

### Why it matters
Objectron contains short object-centric videos where the camera moves around the object, capturing different views. It reports 15K annotated video clips and more than 4M annotated images across nine categories: bikes, books, bottles, cameras, cereal boxes, chairs, cups, laptops, and shoes. The dataset includes object poses and 3D bounding boxes. citeturn590379search1

### Use in this project
Use selected categories that resemble lost-property objects:

- book
- bottle
- camera
- laptop
- shoe
- cup

Focus on frame sampling rather than downloading the entire multi-terabyte distribution.

### License/access note
Objectron is released under Computational Use of Data Agreement 1.0 (C-UDA-1.0). The team must read the license before redistribution or public release of derived assets. citeturn590379search1

Official repository:
https://github.com/google-research-datasets/Objectron

## Dataset 2 — PACO-LVIS

### Role
Attributes, parts, object categories, segmentation, and natural-language instance queries.

### Why it matters
PACO-LVIS has 75 object classes and annotations for object/part segments plus object and part attributes. The official schema includes attributes such as color, pattern/marking, material and transparency. The query annotations include a natural-language `query_string`, a structured query, positive annotation IDs, negative annotation IDs and negative image IDs. citeturn590379search0

The 75 classes include highly relevant belongings such as book, bottle, cellular telephone, laptop computer, wallet, watch, calculator, earphone, pen, pencil, shoe, and handbag. citeturn590379search0

### Use in this project
Use PACO to develop and evaluate:

- object/attribute understanding
- fine-grained text-to-image retrieval
- part-aware representations
- query parsing

### Official repository
https://github.com/facebookresearch/paco

## Dataset 3 — VoxDet-SoIR

### Role
Core instance-retrieval benchmark.

### Why it matters
VoxDet-SoIR explicitly targets small-object instance retrieval. It uses a query-gallery setup and includes instance-level annotations, masks, and evaluation with Recall@K and mAP. It is designed to test retrieval across viewpoints, lighting and contexts. citeturn678299search1

### Use in this project
Use it to train/evaluate the instance-retrieval formulation and to establish a research-quality benchmark.

Official repository:
https://github.com/pihash2k/VoxDet-SoIR

Important: inspect the repository's data dependencies and licensing before downloading/reusing any underlying datasets.

## Dataset 4 — YCB-Video (optional)

### Role
Additional multi-view / 6D object pose benchmark.

### Why it matters
YCB-Video contains 133,827 frames from 92 videos covering 21 physical objects, with accurate 6D poses. It is useful for additional instance-level robustness experiments. citeturn590379search2

### License
The toolbox states that YCB-Video is released under the MIT License. Verify any underlying object/image terms before redistribution. citeturn590379search2

Official repository:
https://github.com/yuxng/YCB_Video_toolbox

## Dataset 5 — Objects365 (optional)

### Role
Broad object detection pretraining / category coverage.

### Why it matters
Objects365 contains about 1.74M training images and 80K validation images over 365 classes. It is intended for large-scale object detection and includes common everyday objects. citeturn678299search5turn678299search6

### Important storage/license warning
Do not download the full dataset for this student project. The Ultralytics documentation describes a roughly 712 GB distribution for one setup. The official Objects365 page states the dataset is for academic purposes, that the annotations/website are CC BY 4.0, and that image copyright belongs to third parties with their own terms; the site says users should not redistribute the images. citeturn678299search7turn678299search0

Use only if needed and only as a filtered source for detector coverage.

Official site:
https://www.objects365.org/

## Dataset priority

### Must investigate first

1. Objectron
2. PACO-LVIS
3. VoxDet-SoIR

### Add only if required

4. YCB-Video
5. Objects365

## Data selection rules

1. Start with a small subset.
2. Filter to relevant categories.
3. Inspect class balance.
4. Preserve instance IDs where provided.
5. Build instance-disjoint train/val/test splits where possible.
6. Keep source metadata and license information.
7. Never publish or commit raw datasets to Git.
8. Do not mix train/test instances across datasets in a way that invalidates evaluation.

## Proposed first category set

Use the overlap among datasets as much as practical. Initial candidates:

- book
- bottle
- cup/mug
- laptop
- camera
- shoe
- backpack/handbag where supported
- phone/cellular telephone where supported
- wallet where supported
- calculator where supported
- earphone where supported

The final category list must be generated from actual dataset metadata during Step 1 and recorded in `context.md`.

## Text data strategy

Do not invent a claim that PACO or another dataset is a literal campus lost-report dataset.

Instead:

- use PACO's query/attribute text where available
- use existing image-text retrieval data only when license/access allows
- generate programmatic template descriptions only as an auxiliary augmentation, clearly labelled synthetic
- treat vague human-like descriptions as a research condition and report the limitation honestly

## Data integrity checks

Every dataset ingestion script must produce:

- sample count
- category counts
- instance count where available
- missing file count
- annotation integrity status
- duplicate/near-duplicate warning if feasible
- license/access note

Save the report under `reports/data_audit/`.
