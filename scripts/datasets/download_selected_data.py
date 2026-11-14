import os
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from src.data.schema import ItemInstanceRecord

def download_image(url, dest_path):
    try:
        if not os.path.exists(dest_path):
            urllib.request.urlopen(url, timeout=10) # Just checking if it works first
            urllib.request.urlretrieve(url, dest_path)
        return True
    except Exception as e:
        return False

def process_manifest(interim_manifest_path, out_manifest_path):
    print(f"Reading interim manifest from {interim_manifest_path}")
    
    with open(interim_manifest_path, 'r') as f:
        records = [json.loads(line) for line in f if line.strip()]
        
    print(f"Found {len(records)} records.")
    
    out_records = []
    paco_to_dl = []
    
    for rec in records:
        if rec['source_dataset'] == 'PACO':
            # PACO Adapter should put the coco_url in 'image_path'
            url = rec['image_path']
            filename = url.split('/')[-1]
            dest = f"data/raw/paco_images/{filename}"
            paco_to_dl.append((url, dest, rec))
        else:
            # Objectron already downloaded locally
            out_records.append(rec)
            
    print(f"Need to download {len(paco_to_dl)} PACO images.")
    
    def dl_paco(task):
        url, dest, rec = task
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if download_image(url, dest):
            rec['image_path'] = dest
            return rec
        return None
        
    with ThreadPoolExecutor(max_workers=32) as executor:
        for i, res in enumerate(executor.map(dl_paco, paco_to_dl)):
            if res:
                out_records.append(res)
            if (i+1) % 50 == 0:
                print(f"Downloaded {i+1}/{len(paco_to_dl)} PACO images...")
                
    print(f"Writing final raw manifest to {out_manifest_path} with {len(out_records)} records.")
    with open(out_manifest_path, 'w') as f:
        for rec in out_records:
            f.write(json.dumps(rec) + '\n')

if __name__ == "__main__":
    process_manifest("data/interim/unified_manifest.jsonl", "data/raw/unified_manifest.jsonl")
