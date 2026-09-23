import os
import json
import urllib.request
from pathlib import Path
from collections import defaultdict

OBJECTRON_CATEGORIES = ['book', 'bottle', 'cup', 'laptop', 'shoe', 'camera']
PACO_CATEGORIES = ['book', 'bottle', 'cup', 'mug', 'laptop_computer', 'shoe', 'cellular_telephone', 'handbag', 'wallet', 'earphone', 'calculator']

def count_objectron_instances(repo_index_dir):
    counts = {}
    for cat in OBJECTRON_CATEGORIES:
        instances = set()
        for split in ['train', 'test']:
            file_path = os.path.join(repo_index_dir, f"{cat}_annotations_{split}")
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    for line in f:
                        if line.strip():
                            instances.add(line.strip())
        counts[cat] = len(instances)
    return counts

import zipfile

def download_and_count_paco():
    paco_zip_url = "https://dl.fbaipublicfiles.com/paco/annotations/paco_lvis_v1.zip"
    cache_zip = "data/raw/paco_lvis_v1.zip"
    extract_dir = "data/raw/paco"
    json_path = "data/raw/paco/paco_lvis_v1_val.json"
    
    if not os.path.exists(json_path):
        os.makedirs(extract_dir, exist_ok=True)
        if not os.path.exists(cache_zip):
            print("Downloading PACO ZIP...")
            urllib.request.urlretrieve(paco_zip_url, cache_zip)
        print("Extracting PACO ZIP...")
        with zipfile.ZipFile(cache_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    
    print("Loading PACO JSON...")
    with open(json_path, 'r') as f:
        data = json.load(f)
        
    cat_id_to_name = {c['id']: c['name'] for c in data['categories']}
    
    counts = defaultdict(set)
    for ann in data['annotations']:
        cat_name = cat_id_to_name.get(ann['category_id'])
        if cat_name in PACO_CATEGORIES:
            counts[cat_name].add(ann['image_id'])
            
    return {k: len(v) for k, v in counts.items()}

def generate_report(obj_counts, paco_counts):
    report_path = "reports/data_selection/category_inventory.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        f.write("# Category Inventory (Metadata Audit)\n\n")
        
        f.write("## Objectron\n")
        f.write("| Category | Available Instances (Videos) |\n")
        f.write("|----------|-----------------------------|\n")
        for k, v in obj_counts.items():
            f.write(f"| {k} | {v} |\n")
            
        f.write("\n## PACO-LVIS (Val subset used for estimation)\n")
        f.write("| Category | Distinct Images with Object |\n")
        f.write("|----------|-----------------------------|\n")
        for k, v in paco_counts.items():
            f.write(f"| {k} | {v} |\n")
            
    print(f"Report written to {report_path}")

if __name__ == "__main__":
    obj_counts = count_objectron_instances("data/raw/objectron_repo/index")
    paco_counts = download_and_count_paco()
    generate_report(obj_counts, paco_counts)
