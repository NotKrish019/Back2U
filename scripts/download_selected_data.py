import os
import urllib.request
import json
import random
from concurrent.futures import ThreadPoolExecutor

def download_image(url, dest_path):
    try:
        if not os.path.exists(dest_path):
            urllib.request.urlretrieve(url, dest_path)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def download_paco_subset(max_images=10000):
    print("Downloading PACO subset from COCO...")
    json_path = "data/raw/paco/paco_lvis_v1_train.json"
    out_dir = "data/raw/paco_images"
    os.makedirs(out_dir, exist_ok=True)
    
    if not os.path.exists(json_path):
        print("PACO JSON not found. Please run audit_dataset_metadata.py first.")
        return [], {}
        
    with open(json_path, 'r') as f:
        data = json.load(f)
        
    # Categories to target
    target_cats = ['earphone', 'laptop_computer', 'cellular_telephone', 'handbag', 'wallet', 'bottle', 'cup', 'book']
    
    cat_name_to_id = {c['name']: c['id'] for c in data['categories']}
    valid_cat_ids = {cat_name_to_id[c]: c for c in target_cats if c in cat_name_to_id}
    
    # Map image_id to category
    img_id_to_cat = {}
    for ann in data['annotations']:
        if ann['category_id'] in valid_cat_ids:
            img_id_to_cat[ann['image_id']] = valid_cat_ids[ann['category_id']]
            
    # Group images by category
    images_by_cat = {cat_id: [] for cat_id in valid_cat_ids.values()}
    for img in data['images']:
        if img['id'] in img_id_to_cat:
            cat_id = img_id_to_cat[img['id']]
            images_by_cat[cat_id].append(img)
            
    sampled_images = []
    # Sample up to 1500 per category to balance the dataset
    for cat_id, imgs in images_by_cat.items():
        sampled_imgs = random.sample(imgs, min(1500, len(imgs)))
        sampled_images.extend(sampled_imgs)
        
    downloaded_records = []
    
    def dl(img_data):
        url = img_data['coco_url']
        filename = img_data['file_name']
        dest = os.path.join(out_dir, filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        success = download_image(url, dest)
        if success:
            cat = img_id_to_cat[img_data['id']]
            downloaded_records.append({
                "dataset": "paco",
                "source_category": cat,
                "project_category": cat,
                "instance_id": f"paco_{img_data['id']}",
                "image_id": str(img_data['id']),
                "source_path": dest.replace("\\", "/"),
                "split": "train"
            })
            
    with ThreadPoolExecutor(max_workers=32) as executor:
        executor.map(dl, sampled_images)
        
    print(f"Successfully downloaded {len(downloaded_records)} PACO images to {out_dir}")
    return downloaded_records

def generate_manifest(paco_records):
    manifest_path = "data/raw/unified_manifest.jsonl"
    print(f"Generating unified manifest at {manifest_path}...")
    
    with open(manifest_path, 'w') as f:
        # Write PACO
        for rec in paco_records:
            f.write(json.dumps(rec) + '\n')

if __name__ == "__main__":
    paco_records = download_paco_subset(max_images=10000)
    generate_manifest(paco_records)
