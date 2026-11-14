import os
import json
from PIL import Image

def preprocess_images():
    manifest_path = "data/raw/unified_manifest.jsonl"
    out_dir = "data/processed/crops"
    os.makedirs(out_dir, exist_ok=True)
    
    print("Preprocessing and cropping images...")
    processed_records = []
    
    if not os.path.exists(manifest_path):
        print("No manifest found.")
        return
        
    with open(manifest_path, 'r') as f:
        for line in f:
            if not line.strip(): continue
            rec = json.loads(line)
            src_path = rec.get("image_path")
            
            # In production, we'd use bounding box coordinates to crop first
            if src_path and os.path.exists(src_path):

                try:
                    img = Image.open(src_path).convert("RGB")
                    
                    if rec.get("bbox") is not None:
                        # bbox format: [xmin, ymin, xmax, ymax]
                        bbox = rec["bbox"]
                        img = img.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
                    
                    img = img.resize((224, 224))
                    
                    # For PACO it's 'instance_id'_'image_id'. Objectron doesn't have image_id, use split instead
                    img_id_suffix = rec.get('image_id', rec['split'])
                    crop_filename = f"{rec['item_instance_id']}_{img_id_suffix}_{os.path.basename(src_path)}"
                    crop_path = os.path.join(out_dir, crop_filename)
                    img.save(crop_path)
                    
                    rec["image_path"] = crop_path
                    processed_records.append(rec)
                except Exception as e:
                    print(f"Error processing {src_path}: {e}")
                    
    processed_manifest = "data/processed/unified_manifest.jsonl"
    with open(processed_manifest, 'w') as f:
        for rec in processed_records:
            f.write(json.dumps(rec) + '\n')
            
    print(f"Processed {len(processed_records)} crops. Saved manifest to {processed_manifest}")

if __name__ == "__main__":
    preprocess_images()
