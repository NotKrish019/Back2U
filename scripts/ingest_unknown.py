import os
import json
import argparse
from pathlib import Path
from collections import defaultdict
import tensorflow as tf
from PIL import Image

import sys
sys.path.insert(0, os.path.abspath('scratch/Objectron'))
from objectron.dataset.parser import ObjectronParser

def _bytes_feature(value):
    return value.bytes_list.value[0].decode('utf-8')

def main():
    output_dir = "data/raw/objectron_images"
    manifest = "data/interim/objectron_manifest.jsonl"
    
    os.makedirs(output_dir, exist_ok=True)
    
    categories = ["chair"]
    splits = ["test"]
    
    parser_obj = ObjectronParser()
    records = []
    
    for category in categories:
        for split in splits:
            print(f"Processing Objectron {category} {split}...")
            files = tf.io.gfile.glob(f"gs://objectron/v1/records_shuffled/{category}/{category}_{split}-*")
            if not files:
                print(f"No files found for {category} {split}.")
                continue
            
            files = files[:100]
            sequences = defaultdict(list)
            dataset = tf.data.TFRecordDataset(files)
            complete_instances = 0
            
            for record in dataset:
                example = tf.train.Example.FromString(record.numpy())
                features = example.features.feature
                
                if 'image/filename' not in features: continue
                
                seq_id = _bytes_feature(features['image/filename'])
                
                if len(sequences[seq_id]) >= 2: continue
                if seq_id not in sequences and complete_instances >= 10: continue
                
                image_encoded = features['image/encoded'].bytes_list.value[0]
                image_tensor, label = parser_obj.parse_example(example)
                
                if '2d_instance' not in label or len(label['2d_instance']) == 0: continue
                
                h, w = image_tensor.shape[:2]
                pts = label['2d_instance'][0]
                xs = pts[:, 0]
                ys = pts[:, 1]
                xmin = max(0.0, float(min(xs)))
                ymin = max(0.0, float(min(ys)))
                xmax = min(1.0, float(max(xs)))
                ymax = min(1.0, float(max(ys)))
                
                bbox = [xmin * w, ymin * h, xmax * w, ymax * h]
                sequences[seq_id].append({"image_encoded": image_encoded, "bbox": bbox})
                
                if len(sequences[seq_id]) == 2:
                    complete_instances += 1
                    print(f"[{category}] Completed sequence {seq_id} ({complete_instances}/10)")
                
                if complete_instances >= 10: break
            
            for seq_id, frames in sequences.items():
                if len(frames) < 2: continue
                seq_safe = seq_id.replace('/', '_')
                seq_dir = os.path.join(output_dir, category, seq_safe)
                os.makedirs(seq_dir, exist_ok=True)
                
                for i, frame in enumerate(frames):
                    img_path = os.path.join(seq_dir, f"frame_{i:04d}.jpg")
                    with open(img_path, "wb") as f:
                        f.write(frame["image_encoded"])
                    
                    record = {
                        "item_instance_id": f"objectron_{seq_safe}",
                        "item_category": category,
                        "image_path": img_path.replace("\\", "/"),
                        "source_dataset": "Objectron",
                        "split": split,
                        "bbox": frame["bbox"]
                    }
                    records.append(record)

    with open(manifest, "a") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    print(f"Appended {len(records)} records to {manifest}")

if __name__ == "__main__":
    main()
