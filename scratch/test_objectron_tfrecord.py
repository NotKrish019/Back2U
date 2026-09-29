import sys
import os
sys.path.insert(0, os.path.abspath('scratch/Objectron'))

import tensorflow as tf
import cv2
import numpy as np
from objectron.dataset.parser import ObjectronParser

parser = ObjectronParser()

def extract_bbox_from_2d_points(points_2d, width, height):
    # points_2d is (N, 9, 2), where N is number of instances
    # We take the first instance
    pts = points_2d[0]
    
    # Values are typically normalized [0, 1], but sometimes they can slightly exceed bounds
    xs = pts[:, 0]
    ys = pts[:, 1]
    
    xmin = np.clip(np.min(xs), 0, 1)
    ymin = np.clip(np.min(ys), 0, 1)
    xmax = np.clip(np.max(xs), 0, 1)
    ymax = np.clip(np.max(ys), 0, 1)
    
    return [
        float(xmin * width), 
        float(ymin * height), 
        float(xmax * width), 
        float(ymax * height)
    ]

# gs://objectron/v1/records_shuffled/laptop/laptop_test*
files = tf.io.gfile.glob("gs://objectron/v1/records_shuffled/laptop/laptop_test-*")
print(f"Found {len(files)} files.")

dataset = tf.data.TFRecordDataset(files[0]).take(5)

for i, record in enumerate(dataset):
    example = tf.train.Example.FromString(record.numpy())
    
    # Check features to see if sequence_id exists
    feature_names = list(example.features.feature.keys())
    print(f"Features: {feature_names}")
    
    if 'image/filename' in feature_names:
        filename = example.features.feature['image/filename'].bytes_list.value[0].decode('utf-8')
        print(f"Image Filename: {filename}")
        
    if 'image/id' in feature_names:
        img_id = example.features.feature['image/id'].bytes_list.value[0].decode('utf-8')
        print(f"Image ID: {img_id}")


    # Let's extract image and label
    image, label = parser.parse_example(example)
    print(f"Frame {i}: Image shape {image.shape}, label keys {label.keys()}")
    
    if '2d_instance' in label and len(label['2d_instance']) > 0:
        h, w = image.shape[:2]
        bbox = extract_bbox_from_2d_points(label['2d_instance'], w, h)
        print(f"BBox: {bbox}")
    else:
        print("No 2D instance found.")
