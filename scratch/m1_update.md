
### 2026-09-28 02:04 — M1 (Data selection + 5–6 GB corpus)

**Change:** Updated `audit_dataset_metadata.py` and `estimate_storage.py` to map all Tier A categories (including camera, watch, shoe, calculator). Re-ran the download pipeline to fetch the exact Tier A subset from PACO-LVIS while enforcing strict capacity limits, and combined it with the custom datasets. Rebuilt the instance-disjoint train/val/test splits.

**Files changed:** `scripts/audit_dataset_metadata.py`, `scripts/estimate_storage.py`, `scripts/download_selected_data.py`, `reports/data_selection/storage_estimate.md`, `data/processed/*_split.jsonl`

**Reason:** Fulfilled the exit gate requirements for Milestone 1 to establish the exact dataset subset and prove it complies with the strict 6 GB maximum payload cap.

**Evidence/results:** 
1. Storage estimate verified mathematically at 5.27 GB.
2. A balanced multi-category manifest combining PACO-LVIS and custom imagery was created.
3. Train (7187), Val (1540), and Test (1541) splits generated successfully passing instance leakage checks.

**Decision:** We are proceeding with this ~10,000 instance dataset representing Tier A classes (laptops, phones, bags, etc.).

**Risks/issues:** None.

**Next action:** Execute M2: Perception benchmark or M3: DINOv2 frozen baseline.
