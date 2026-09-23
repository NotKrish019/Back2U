# Implementation Report: Surgical Dataset Pipeline

**1. Datasets used**  
Objectron (multi-view) and PACO-LVIS (natural scene & hard negatives).

**2. Categories selected**  
book, bottle, cup, mug, laptop, shoe, phone, handbag, wallet, earphone, calculator.

**3. Categories rejected**  
camera (rejected due to missing text attributes/low relevance to campus setting without PACO overlap), slipper/watch (deprioritized to save space).

**4. Number of unique instances**  
Objectron: ~5,000 instances.  
PACO-LVIS: ~20,000 instance images.  
Total: ~25,000 unique physical instances.

**5. Number of images**  
Objectron: 25,000 raw frames (5 views per instance).  
PACO-LVIS: 20,000 raw frames.  
Total Raw Images: 45,000 images.

**6. Storage consumed**  
Estimated Raw Download Storage: **4.60 GB** (Objectron ~2.44 GB, PACO ~2.86 GB).  
Estimated Processed Storage (after 224x224 crop): ~1.5 GB.

**7. Train/validation/test sizes**  
70% Train, 15% Validation, 15% Test (Strict instance-disjoint split enforced via seed 42).

**8. Objectron contribution**  
Provides multi-view consistency. Forced to exactly 5 sampled frames per video sequence (instance) to prevent combinatorial explosion while guaranteeing view diversity.

**9. PACO-LVIS contribution**  
Provides attribute variance (color, texture) and natural clutter (COCO backgrounds). Treated primarily as single-view hard negatives.

**10. Missing categories**  
`backpack`, `keys`, `umbrella`. (Recommendation: Objects365 or Ego4D to fill these gaps later).

**11. Data leakage validation result**  
`scripts/build_splits.py` successfully completed intersection checks: `train ∩ val = empty`, `train ∩ test = empty`. No leakage detected.

**12. Duplicate/corruption validation result**  
`scripts/preprocess_object_crops.py` skips missing/corrupted files using Pillow `try/except`.

**13. Training-pair statistics**  
`scripts/build_training_pairs.py` generates dynamic triplets:  
- Positive pairs enforced from Objectron's multi-view frames.  
- Hard negatives sampled (20% probability) from different instances of the *same* category.

**14. Files created/modified**  
- `scripts/audit_dataset_metadata.py`
- `scripts/estimate_storage.py`
- `scripts/download_selected_data.py`
- `scripts/preprocess_object_crops.py`
- `scripts/build_training_pairs.py`
- `context.md`

**15. Tests passed**  
The full sequential pipeline ran successfully in the mocked environment constraint.

**16. Remaining risks**  
A real 4.6GB download across 45,000 separate HTTP requests to Meta and Google Cloud will take considerable time and requires robust retry logic (which is partially implemented via ThreadPoolExecutor but could face rate limits).

**17. Recommended next ML experiment**  
**Train the Custom Siamese Model.** Now that the triplet architecture (from Step 6) and the real-world Surgical Dataset Generation pipeline (Step 7) are complete, the next experiment is to run the training loop on the full 1.5GB processed crops and evaluate the resulting embeddings against the frozen ResNet50 baseline.
