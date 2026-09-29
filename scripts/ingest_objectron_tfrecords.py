import os
import json
import argparse
from pathlib import Path
from collections import defaultdict
import tensorflow as tf
from PIL import Image
import io

def _bytes_feature(value):
    return value.bytes_list.value[0].decode('utf-8')

def extract_bbox_from_2d_points(points_2d, width, height):
    # points_2d is [N, 9, 2], we take the first instance
    # But wait, in the tf.train.Example, 'point_2d' is a float_list of length N*9*2 or similar
    # In objectron.dataset.parser, it reads 'point_2d' and reshapes it.
    # Let's just use the ObjectronParser from objectron package if available, or parse it directly.
    pass

import sys
sys.path.insert(0, os.path.abspath('scratch/Objectron'))
from objectron.dataset.parser import ObjectronParser

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output_dir", type=str, default="data/raw/objectron_images")
    parser.add_argument("--manifest", type=str, default="data/interim/objectron_manifest.jsonl")
    parser.add_argument("--max_instances_per_class", type=int, default=80)
    parser.add_argument("--frames_per_instance", type=int, default=5)
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    Path(args.manifest).parent.mkdir(parents=True, exist_ok=True)
    
    categories = ["bike", "cereal_box", "camera", "book"]
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
            
            # Use enough shards to get 80 instances without waiting hours
            files = files[:100]
            
            # Since records are shuffled, we need to gather frames per sequence
            # We'll use a dictionary: sequence_id -> [list of frame dicts]
            sequences = defaultdict(list)
            
            dataset = tf.data.TFRecordDataset(files)
            
            # We only need a few instances. So we stop when we have enough complete instances
            complete_instances = 0
            
            for record in dataset:
                example = tf.train.Example.FromString(record.numpy())
                features = example.features.feature
                
                if 'image/filename' not in features:
                    continue
                
                seq_id = _bytes_feature(features['image/filename'])
                
                if len(sequences[seq_id]) >= args.frames_per_instance:
                    continue # Already have enough for this sequence
                
                if seq_id not in sequences and complete_instances >= args.max_instances_per_class:
                    continue # Already have enough sequences, skip new ones
                
                image_encoded = features['image/encoded'].bytes_list.value[0]
                
                # Use parser to get labels
                image_tensor, label = parser_obj.parse_example(example)
                
                if '2d_instance' not in label or len(label['2d_instance']) == 0:
                    continue
                
                h, w = image_tensor.shape[:2]
                
                # Extract BBox
                pts = label['2d_instance'][0]
                xs = pts[:, 0]
                ys = pts[:, 1]
                xmin = max(0.0, float(min(xs)))
                ymin = max(0.0, float(min(ys)))
                xmax = min(1.0, float(max(xs)))
                ymax = min(1.0, float(max(ys)))
                
                bbox = [xmin * w, ymin * h, xmax * w, ymax * h]
                
                frame_data = {
                    "image_encoded": image_encoded,
                    "bbox": bbox
                }
                
                is_new = len(sequences[seq_id]) == 0
                sequences[seq_id].append(frame_data)
                
                if len(sequences[seq_id]) == args.frames_per_instance:
                    complete_instances += 1
                    print(f"[{category}] Completed sequence {seq_id} ({complete_instances}/{args.max_instances_per_class})")
                
                if complete_instances >= args.max_instances_per_class:
                    break
            
            # Save valid sequences
            for seq_id, frames in sequences.items():
                if len(frames) < 2:
                    continue # Skip singletons
                
                seq_safe = seq_id.replace('/', '_')
                seq_dir = os.path.join(args.output_dir, category, seq_safe)
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

    # Write manifest
    with open(args.manifest, "a") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    print(f"Wrote {len(records)} records to {args.manifest}")

if __name__ == "__main__":
    main()
