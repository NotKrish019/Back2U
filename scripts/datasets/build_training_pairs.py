import json
import random
from collections import defaultdict

def build_training_pairs():
    manifest_path = "data/processed/unified_manifest.jsonl"
    out_path = "data/processed/training_triplets.jsonl"
    
    print("Building training pairs/triplets metadata...")
    
    records = []
    with open(manifest_path, 'r') as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
                
    instance_to_records = defaultdict(list)
    for rec in records:
        instance_to_records[rec["instance_id"]].append(rec)
        
    valid_instances = [iid for iid, recs in instance_to_records.items() if len(recs) >= 1]
    print(f"Found {len(valid_instances)} valid instances for Anchor/Positive pairs.")
    
    category_to_instances = defaultdict(list)
    for iid, recs in instance_to_records.items():
        category_to_instances[recs[0]["project_category"]].append(iid)
        
    triplets = []
    # Generate 10 triplets per valid instance for demonstration
    for anchor_id in valid_instances:
        recs = instance_to_records[anchor_id]
        category = recs[0]["project_category"]
        
        # Possible hard negatives: instances of the SAME category but DIFFERENT instance id
        hard_negative_pool = [iid for iid in category_to_instances[category] if iid != anchor_id]
        # Fallback to any negative if no hard negative exists
        any_negative_pool = [iid for iid in instance_to_records.keys() if iid != anchor_id]
        
        for _ in range(10):
            anchor = random.choice(recs)
            other_views = [r for r in recs if r["image_id"] != anchor["image_id"]]
            positive = random.choice(other_views) if other_views else anchor
            
            if hard_negative_pool and random.random() > 0.2:
                neg_id = random.choice(hard_negative_pool)
            else:
                neg_id = random.choice(any_negative_pool)
                
            negative = random.choice(instance_to_records[neg_id])
            
            triplet = {
                "anchor": anchor,
                "positive": positive,
                "negative": negative,
                "negative_type": "hard" if neg_id in hard_negative_pool else "random"
            }
            triplets.append(triplet)
            
    with open(out_path, 'w') as f:
        for t in triplets:
            f.write(json.dumps(t) + '\n')
            
    print(f"Generated {len(triplets)} static triplets to {out_path}.")
    
if __name__ == "__main__":
    build_training_pairs()
