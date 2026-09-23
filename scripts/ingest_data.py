import os
import json
import argparse
import sys
from pathlib import Path

# Add the project root to sys.path so we can import src
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.data.adapters.objectron_adapter import ObjectronAdapter
from src.data.adapters.paco_adapter import PacoAdapter

def main():
    parser = argparse.ArgumentParser(description="Ingest datasets and generate unified manifest")
    parser.add_argument("--output", type=str, default="data/interim/unified_manifest.jsonl", help="Path to save the manifest")
    parser.add_argument("--dry-run", action="store_true", help="Print records without saving")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    target_categories = ["book", "bottle", "cup", "laptop", "shoe"]
    
    # Initialize adapters
    adapters = [
        ObjectronAdapter(target_categories=target_categories, max_sequences_per_class=100),
        PacoAdapter(target_categories=target_categories)
    ]

    records = []
    
    print("Starting data ingestion and normalization...")
    for adapter in adapters:
        print(f"Running {adapter.__class__.__name__}...")
        for record in adapter.generate_manifest():
            records.append(record)

    print(f"Generated {len(records)} canonical ItemInstanceRecords.")

    if args.dry_run:
        print("Dry run enabled. Not saving to disk. First 5 records:")
        for r in records[:5]:
            print(json.dumps(r.to_dict(), indent=2))
    else:
        with open(output_path, "w") as f:
            for r in records:
                f.write(json.dumps(r.to_dict()) + "\n")
        print(f"Manifest saved to {output_path}")

if __name__ == "__main__":
    main()
