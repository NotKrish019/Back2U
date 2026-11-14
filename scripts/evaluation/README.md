# Phase 2 evaluation tooling (evaluation only — never modifies production state)

Layout for collected photos (git-ignored):

    data/raw/real_world_instances/<category>/<physical_instance_id>/view_XX.jpg
    data/raw/real_world_instances/<category>/<physical_instance_id>/instance.json   # see templates/

`category` must be one of: laptop, mobile_phone, wallet, earphones, headphones, keys, book.
Original photos only — no augmentations, no copies, ≥3 genuine views per object, one object per folder.

    python scripts/evaluation/audit_real_world_data.py                  # counts, duplicates, eligibility
    python scripts/evaluation/build_phase2_manifest.py                  # → data/processed/phase2_evaluation_manifest.jsonl
    python scripts/evaluation/run_preprocessing_eval.py --config scripts/evaluation/configs/<cfg>.json
    python scripts/evaluation/evaluate_grounding_dino.py --run-name <name> [--sources ...]

Outputs go to reports/evaluation/phase2_runs/<run_name>/ and record model version, checkpoint
SHA-256, detector prompt, manifest SHA-256 and the full config. Tests: `pytest tests/evaluation`.
