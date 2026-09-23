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

def test_objectron_adapter(monkeypatch):
    # Mock requests.get to return fake index lines
    class MockResponse:
        def __init__(self, text, status_code):
            self.text = text
            self.status_code = status_code

    def mock_get(*args, **kwargs):
        return MockResponse("bottle/batch-1/0\nbottle/batch-1/1", 200)

    monkeypatch.setattr("requests.get", mock_get)

    adapter = ObjectronAdapter(target_categories=["bottle"], max_sequences_per_class=2)
    records = list(adapter.generate_manifest())

    # 2 per split (train, test) = 4
    assert len(records) == 4
    assert records[0].item_instance_id == "objectron_bottle_batch-1_0"
    assert records[0].image_path == "bottle/batch-1/0"
