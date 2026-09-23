# Dataset Inventory & Audit Report

## Objective
Audit the primary candidate datasets (Objectron, PACO-LVIS, and VoxDet-SoIR) to determine category overlap, available annotations, storage requirements, and access constraints. This audit informs the decision of which minimal subset to download for the initial baseline.

---

## 1. Objectron
* **Source:** https://github.com/google-research-datasets/Objectron
* **Role:** Multi-view instance learning (same physical instance across frames/angles).
* **Categories:** `bikes`, `books`, `bottles`, `cameras`, `cereal boxes`, `chairs`, `cups`, `laptops`, `shoes`.
* **Relevant Project Categories:** `book`, `bottle`, `camera`, `cup`, `laptop`, `shoe`.
* **Annotations:** 
  - 3D Bounding Boxes
  - Camera Poses & Sparse Point Clouds
  - Video clips (multi-view of the exact same object)
* **Storage Needs:** The full dataset is massive (15K video clips, 4M images, multi-terabyte).
* **License/Access:** C-UDA-1.0 (Computational Use of Data Agreement). Available publicly via Google Cloud Storage (`gs://objectron`).
* **Subset Strategy:** Do not download the raw `.MOV` videos. Use the `tf.record` or processed frame subsets (sharded by class). We can download a small sample (e.g., 50 instances) for `book` and `bottle`.

---

## 2. PACO-LVIS (Parts and Attributes of Common Objects)
* **Source:** https://github.com/facebookresearch/paco
* **Role:** Attribute extraction, query strings (text), fine-grained parts.
* **Categories:** 75 object classes.
* **Relevant Project Categories:** `handbag`, `book`, `bottle`, `cellular_telephone`, `cup`, `laptop_computer`, `shoe`, `wallet`, `calculator`, `earphone`.
* **Annotations:** 
  - Bounding boxes and Object/Part Segments
  - Object Attributes (color, material, pattern, etc.)
  - Part Attributes
  - Text queries (`query_string` and `structured_query`)
* **Storage Needs:** Annotations are lightweight JSON files. The underlying images are from the LVIS/COCO dataset. Full LVIS/COCO is ~25GB. 
* **License/Access:** Non-commercial research license (Meta).
* **Subset Strategy:** Download the PACO annotation JSONs first (which are small). Filter the JSON for our target categories, extract the required `image_id`s, and download only those specific images to save space.

---

## 3. VoxDet-SoIR (Small Object Image Retrieval)
* **Source:** https://github.com/pihash2k/VoxDet-SoIR
* **Role:** Core instance-retrieval benchmark (query-gallery setup with cluttered backgrounds).
* **Categories:** Generic everyday instances, specifically small objects in diverse contexts.
* **Annotations:** Query-gallery pairs, instance IDs, bounding boxes, and evaluation masks for instance-level retrieval.
* **Storage Needs:** Modest for the SoIR benchmark subset, though the full VoxDet dataset is large.
* **License/Access:** Academic use.
* **Subset Strategy:** Clone the evaluation benchmark and use its specific test split as the primary validation metric for instance generalization.

---

## Category Overlap Matrix

| Category | Objectron | PACO-LVIS | Recommended for Initial Subset |
| :--- | :---: | :---: | :---: |
| Book | ✅ | ✅ | **Yes** |
| Bottle | ✅ | ✅ | **Yes** |
| Cup/Mug | ✅ | ✅ | **Yes** |
| Laptop | ✅ | ✅ | **Yes** |
| Shoe | ✅ | ✅ | **Yes** |
| Camera | ✅ | ❌ | No (missing text queries) |
| Phone | ❌ | ✅ | No (missing multi-view) |
| Handbag/Wallet | ❌ | ✅ | No (missing multi-view) |

---

## Recommendation for Initial Data Subset

To build the first embedding baseline (Step 4) and text-retrieval baseline (Step 8) quickly and without massive storage overhead, I recommend the following exact subset:

1. **Target Categories:** `book`, `bottle`, `cup`, `laptop`, `shoe`.
2. **Objectron Subset:** Download the index files and fetch exactly **100 video sequences** (sampled to 1 frame per second) for the `bottle` and `laptop` classes.
3. **PACO-LVIS Subset:** Download the **PACO LVIS v1 train/val JSON annotations**. Filter for the target categories and fetch **only the corresponding ~1,000 COCO images** that contain those categories.
4. **VoxDet-SoIR Subset:** Download the **test query/gallery index** and sample images to establish the evaluation benchmark.

**Next Action:** Await user approval on this subset. Once approved, write the Python ingestion scripts (`src/data/dataset_adapters.py`) to parse these indexes.
