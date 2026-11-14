import os
import json
import argparse
import random
from collections import defaultdict
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Build instance-disjoint splits to prevent data leakage")
    parser.add_argument("--input", type=str, default="data/processed/unified_manifest.jsonl")
    parser.add_argument("--outdir", type=str, default="data/processed")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--train-ratio", type=float, default=0.7)
    parser.add_argument("--val-ratio", type=float, default=0.15)
    args = parser.parse_args()

    random.seed(args.seed)
    
    input_path = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    
    if not input_path.exists():
        print(f"Error: Input manifest {input_path} does not exist.")
        return

    # Group by instance ID
    instances = defaultdict(list)
    with open(input_path, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            record = json.loads(line)
            instance_id = record.get('instance_id') or record.get('item_instance_id')
            instances[instance_id].append(record)
            
    unique_ids = list(instances.keys())
    random.shuffle(unique_ids)
    
    total = len(unique_ids)
    train_end = int(total * args.train_ratio)
    val_end = train_end + int(total * args.val_ratio)
    
    train_ids = set(unique_ids[:train_end])
    val_ids = set(unique_ids[train_end:val_end])
    test_ids = set(unique_ids[val_end:])
    
    # Leakage check
    assert len(train_ids.intersection(val_ids)) == 0, "Leakage detected between train and val"
    assert len(train_ids.intersection(test_ids)) == 0, "Leakage detected between train and test"
    assert len(val_ids.intersection(test_ids)) == 0, "Leakage detected between val and test"
    
    splits = {
        "train": (train_ids, outdir / "train_split.jsonl"),
        "val": (val_ids, outdir / "val_split.jsonl"),
        "test": (test_ids, outdir / "test_split.jsonl")
    }
    
    print(f"Total unique instances: {total}")
    for split_name, (split_ids, filepath) in splits.items():
        count = 0
        with open(filepath, 'w') as f:
            for instance_id in split_ids:
                for record in instances[instance_id]:
                    # Override the dataset split to match our actual ML split
                    record['split'] = split_name
                    f.write(json.dumps(record) + '\n')
                    count += 1
        print(f"Saved {split_name} split to {filepath} with {count} records (from {len(split_ids)} unique instances).")
        
    print("Instance-disjoint leakage check passed successfully.")

if __name__ == "__main__":
    main()
