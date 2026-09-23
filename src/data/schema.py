from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any

@dataclass
class ItemInstanceRecord:
    """
    Canonical dataset schema for an Item Instance.
    This represents a single physical object (ItemInstance) in a specific split.
    """
    item_instance_id: str
    item_category: str
    image_path: str
    source_dataset: str
    split: str
    text_description: Optional[str] = None
    attributes: Optional[Dict[str, str]] = None
    bbox: Optional[List[float]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
