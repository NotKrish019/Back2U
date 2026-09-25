import os
import json
import torch
import torchvision
from torchvision.transforms import functional as F
from PIL import Image
from tqdm import tqdm

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Loading object detection model on {device}...')
    
    # Load a lightweight Faster R-CNN model pre-trained on COCO
    model = torchvision.models.detection.fasterrcnn_mobilenet_v3_large_320_fpn(pretrained=True)
    model.eval().to(device)
    
    # COCO classes to filter out: 1 (person), plus food/dining classes
    # 52: banana, 53: apple, 54: sandwich, 55: orange, 56: broccoli, 57: carrot
    # 58: hot dog, 59: pizza, 60: donut, 61: cake, 67: dining table
    # (COCO 91-class index has slight shifts, but we'll include a broad range of food/dining)
    unwanted_classes = {1, 44, 45, 46, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 67}
    
    manifest_path = 'data/processed/unified_manifest.jsonl'
    filtered_manifest_path = 'data/processed/unified_manifest_filtered.jsonl'
    
    filtered_records = []
    removed_count = 0
    
    with open(manifest_path, 'r') as f:
        records = [json.loads(line) for line in f if line.strip()]
        
    print(f'Filtering {len(records)} records...')
    
    for rec in tqdm(records):
        image_path = rec['image_path']
        try:
            img = Image.open(image_path).convert('RGB')
            img_tensor = F.to_tensor(img).unsqueeze(0).to(device)
            
            with torch.no_grad():
                predictions = model(img_tensor)[0]
                
            has_clutter = False
            for label, score in zip(predictions['labels'], predictions['scores']):
                if score > 0.6 and label.item() in unwanted_classes:
                    has_clutter = True
                    break
                    
            if has_clutter:
                removed_count += 1
            else:
                filtered_records.append(rec)
                
        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            # Keep it if we can't process it (or maybe discard, but let's keep to be safe)
            filtered_records.append(rec)
            
    print(f'Removed {removed_count} cluttered images.')
    print(f'Remaining valid images: {len(filtered_records)}')
    
    with open(filtered_manifest_path, 'w') as f:
        for r in filtered_records:
            f.write(json.dumps(r) + '\n')
            
    # Replace the old manifest with the filtered one
    os.replace(filtered_manifest_path, manifest_path)
    print('Manifest updated successfully.')

if __name__ == '__main__':
    main()
