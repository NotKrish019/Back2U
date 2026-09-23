import os
import sys
import json
import zipfile
import urllib.request
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from src.data.schema import ItemInstanceRecord

COIL_URL = "http://www.cs.columbia.edu/CAVE/databases/SLAM_coil-20_coil-100/coil-100/coil-100.zip"

def main():
    raw_dir = Path("data/raw/coil-100")
    raw_dir.mkdir(parents=True, exist_ok=True)
    zip_path = raw_dir / "coil-100.zip"
    
    # 1. Download
    if not zip_path.exists():
        print(f"Downloading COIL-100 from {COIL_URL} (this may take a minute, ~130MB)...")
        urllib.request.urlretrieve(COIL_URL, str(zip_path))
        print("Download complete.")
    else:
        print("COIL-100 zip already exists.")
        
    # 2. Extract
    extracted_dir = raw_dir / "coil-100"
    if not extracted_dir.exists():
        print("Extracting zip file...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(raw_dir)
        print("Extraction complete.")
    else:
        print("Extracted folder already exists.")
        
    # 3. Build Manifest
    print("Building COIL-100 unified manifest...")
    records = []
    
    # COIL-100 images are formatted like 'obj1__0.png'
    for img_path in extracted_dir.glob("*.png"):
        filename = img_path.name
        if "__" not in filename:
            continue
            
        obj_id, angle_part = filename.split("__")
        angle = angle_part.split(".")[0]
        
        # In COIL-100, obj1, obj2... are the exact physical instances.
        item_instance_id = f"coil_{obj_id}"
        
        record = ItemInstanceRecord(
            item_instance_id=item_instance_id,
            item_category="object", # COIL-100 does not have semantic class labels, just objects
            image_path=str(img_path).replace("\\", "/"),
            source_dataset="COIL-100",
            split="unassigned", # Handled by build_splits.py
            text_description=f"COIL-100 object {obj_id} at angle {angle}",
            attributes={"angle": angle}
        )
        records.append(record)
        
    # 4. Save Manifest
    out_dir = Path("data/interim")
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "unified_manifest.jsonl"
    
    with open(manifest_path, 'w') as f:
        for r in records:
            f.write(json.dumps(r.to_dict()) + '\n')
            
    print(f"Saved {len(records)} instance records to {manifest_path}.")
    print("Next step: run `python scripts/build_splits.py` to recreate splits for COIL-100.")

if __name__ == "__main__":
    main()
