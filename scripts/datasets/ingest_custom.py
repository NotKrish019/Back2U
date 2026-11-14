import os
import json
import uuid
from pathlib import Path
import glob

def main():
    manifest_path = Path("data/processed/unified_manifest.jsonl")
    records = []
    
    # Process headphones
    headphone_imgs = glob.glob("data/raw/headphones/**/*.jpg", recursive=True)
    for img in headphone_imgs:
        records.append({
            "instance_id": f"custom_headphone_{uuid.uuid4().hex[:8]}",
            "image_path": img.replace('\\', '/'),
            "project_category": "headphones"
        })
        
    # Process smartphones
    smartphone_imgs = glob.glob("data/raw/smartphones/**/*.jpg", recursive=True)
    for img in smartphone_imgs:
        records.append({
            "instance_id": f"custom_smartphone_{uuid.uuid4().hex[:8]}",
            "image_path": img.replace('\\', '/'),
            "project_category": "cellular_telephone"
        })
        
    # Process earphones
    earphone_imgs = glob.glob("data/raw/earphones/**/*.jpg", recursive=True)
    for img in earphone_imgs:
        records.append({
            "instance_id": f"custom_earphone_{uuid.uuid4().hex[:8]}",
            "image_path": img.replace('\\', '/'),
            "project_category": "earphone"
        })
        
    print(f"Found {len(headphone_imgs)} headphones, {len(smartphone_imgs)} smartphones, and {len(earphone_imgs)} earphones.")
    
    # Append to manifest
    with open(manifest_path, "a") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
            
    print("Appended to unified_manifest.jsonl")

if __name__ == "__main__":
    main()
