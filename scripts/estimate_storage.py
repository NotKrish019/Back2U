import json
import os

def estimate_storage():
    # Estimates based on raw downloaded image file sizes (prior to cropping)
    AVG_OBJECTRON_IMAGE_KB = 100
    AVG_PACO_IMAGE_KB = 150
    
    # We define a budget to stay comfortably under 6GB (approx 6,000,000 KB)
    # Let's allocate 2.5GB (2,500,000 KB) for Objectron = ~25,000 images
    # Let's allocate 3.0GB (3,000,000 KB) for PACO = ~20,000 images
    
    # Selection Strategy for Objectron:
    # 5 frames per instance.
    # Total instances = 25,000 / 5 = 5,000 instances.
    # We will sample these 5,000 instances across the 6 available categories.
    objectron_cats = {'book': 1000, 'bottle': 1000, 'cup': 1000, 'laptop': 1000, 'shoe': 1000}
    obj_views_per_instance = 5
    
    obj_total_images = sum(objectron_cats.values()) * obj_views_per_instance
    obj_storage_kb = obj_total_images * AVG_OBJECTRON_IMAGE_KB
    
    # Selection Strategy for PACO:
    # We want max 20,000 images. 
    # PACO has ~10 core categories. We will aim for ~1000 to 2000 instances per category from the Train+Val splits.
    # PACO provides 1 view per instance.
    paco_cats = {'book': 1500, 'bottle': 1500, 'cup': 1500, 'mug': 500, 'laptop_computer': 2000, 
                 'shoe': 2000, 'cellular_telephone': 2000, 'handbag': 2000, 'wallet': 1000, 'earphone': 1000, 'calculator': 500}
    
    paco_total_images = sum(paco_cats.values())
    paco_storage_kb = paco_total_images * AVG_PACO_IMAGE_KB
    
    total_gb = (obj_storage_kb + paco_storage_kb) / (1024 * 1024)
    
    report_path = "reports/data_selection/storage_estimate.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        f.write("# Dataset Storage Estimate & Selection Strategy\n\n")
        f.write("## 1. Objectron (Target: ~2.5 GB)\n")
        f.write(f"- Selected Instances: {sum(objectron_cats.values())}\n")
        f.write(f"- Views per instance: {obj_views_per_instance}\n")
        f.write(f"- Total Raw Images: {obj_total_images}\n")
        f.write(f"- Estimated Raw Storage: {obj_storage_kb / (1024*1024):.2f} GB\n\n")
        
        f.write("## 2. PACO-LVIS (Target: ~3.0 GB)\n")
        f.write(f"- Selected Instances (Images): {paco_total_images}\n")
        f.write(f"- Total Raw Images: {paco_total_images}\n")
        f.write(f"- Estimated Raw Storage: {paco_storage_kb / (1024*1024):.2f} GB\n\n")
        
        f.write("## 3. Total\n")
        f.write(f"- **Total Estimated Raw Download Storage: {total_gb:.2f} GB**\n")
        f.write("- **Note:** After cropping and resizing to 224x224, the final dataset size will be significantly smaller (approx ~1.5 GB), but this estimate ensures the download phase does not violate the 6GB constraint.\n")
        
    print(f"Storage estimate written to {report_path}")
    print(f"Estimated size: {total_gb:.2f} GB")

if __name__ == "__main__":
    estimate_storage()
