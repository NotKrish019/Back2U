import pytest
from src.data.schema import ItemInstanceRecord
from src.data.adapters.paco_adapter import PacoAdapter
from src.data.adapters.objectron_adapter import ObjectronAdapter

def test_schema_instantiation():
    record = ItemInstanceRecord(
        item_instance_id="test_1",
        item_category="bottle",
        image_path="path/to/img.jpg",
        source_dataset="test",
        split="train"
    )
    assert record.item_instance_id == "test_1"
    assert record.item_category == "bottle"

def test_paco_adapter():
    adapter = PacoAdapter(target_categories=["bottle"], max_instances=5)
    records = list(adapter.generate_manifest())
    
    # 5 train instances should be yielded because max_instances=5 stops it early
    assert len(records) == 5
    assert all(isinstance(r, ItemInstanceRecord) for r in records)
    assert all(r.source_dataset == "PACO-LVIS" for r in records)
    assert records[0].item_category == "bottle"
    assert "mock_paco" in records[0].image_path

def test_objectron_adapter(tmp_path):
    # The adapter reads the local manifest written by scripts/datasets/ingest_objectron_tfrecords.py
    import json
    manifest = tmp_path / "objectron_manifest.jsonl"
    rows = [
        {"item_instance_id": "objectron_bottle_batch-1_0", "item_category": "bottle",
         "image_path": "bottle/batch-1/0.jpg", "source_dataset": "Objectron", "split": "train"},
        {"item_instance_id": "objectron_bottle_batch-1_1", "item_category": "bottle",
         "image_path": "bottle/batch-1/1.jpg", "source_dataset": "Objectron", "split": "test"},
        {"item_instance_id": "objectron_laptop_batch-2_0", "item_category": "laptop",
         "image_path": "laptop/batch-2/0.jpg", "source_dataset": "Objectron", "split": "train"},
    ]
    manifest.write_text("\n".join(json.dumps(r) for r in rows) + "\n\n")

    adapter = ObjectronAdapter(target_categories=["bottle"])
    adapter.manifest_path = str(manifest)
    records = list(adapter.generate_manifest())

    # Only the requested category is returned; blank lines are skipped.
    assert [r.item_instance_id for r in records] == ["objectron_bottle_batch-1_0", "objectron_bottle_batch-1_1"]
    assert all(isinstance(r, ItemInstanceRecord) for r in records)


def test_objectron_adapter_missing_manifest(tmp_path):
    adapter = ObjectronAdapter(target_categories=["bottle"])
    adapter.manifest_path = str(tmp_path / "does_not_exist.jsonl")
    assert list(adapter.generate_manifest()) == []
