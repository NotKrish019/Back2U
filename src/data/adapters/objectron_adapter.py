import requests
from typing import Iterator, List
from src.data.schema import ItemInstanceRecord
from src.data.adapters.base import BaseDatasetAdapter

class ObjectronAdapter(BaseDatasetAdapter):
    """
    Adapter for the Objectron dataset.
    Fetches the index files from Google Cloud Storage and generates records for
    a small subset of sequences.
    """
    
    BASE_URL = "https://storage.googleapis.com/objectron/v1/index"
    
    def __init__(self, target_categories: List[str], max_sequences_per_class: int = 50):
        self.target_categories = target_categories
        self.max_sequences_per_class = max_sequences_per_class
        self.splits = ["train", "test"]

    def generate_manifest(self) -> Iterator[ItemInstanceRecord]:
        for category in self.target_categories:
            for split in self.splits:
                # The objectron index files are named like: bottle_annotations_train
                # Note: some classes in objectron might have different pluralization in URLs,
                # e.g., 'bottle' vs 'bottles'. The standard index uses singular like 'bottle', 'laptop'.
                url = f"{self.BASE_URL}/{category}_annotations_{split}"
                
                try:
                    response = requests.get(url)
                    if response.status_code != 200:
                        print(f"Warning: Could not fetch Objectron index for {category} {split}. Status: {response.status_code}")
                        continue
                        
                    lines = response.text.strip().split('\n')
                    # Take only the first max_sequences_per_class
                    subset_lines = lines[:self.max_sequences_per_class]
                    
                    for line in subset_lines:
                        if not line:
                            continue
                        # line format: class/batch-i/j (e.g. bottle/batch-2/15)
                        sequence_path = line.strip()
                        # Use the sequence path as a stable instance ID, replacing slashes
                        instance_id = f"objectron_{sequence_path.replace('/', '_')}"
                        
                        # We don't download the actual video/images yet, we just record the path.
                        # The actual image_path would be local after downloading, but for the manifest
                        # we can store the sequence reference.
                        yield ItemInstanceRecord(
                            item_instance_id=instance_id,
                            item_category=category,
                            image_path=sequence_path, # Will be replaced with local path by download script later
                            source_dataset="Objectron",
                            split=split,
                            text_description=None, # Objectron doesn't have natural language descriptions
                            attributes=None,
                            bbox=None # Bbox is in the pbdata file, not the index
                        )
                except Exception as e:
                    print(f"Error fetching Objectron index for {category} {split}: {e}")
