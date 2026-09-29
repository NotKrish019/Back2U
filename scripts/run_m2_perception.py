import os
import json
import torch
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path
from collections import defaultdict
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

def compute_iou(box1, box2):
    # box is [xmin, ymin, xmax, ymax]
    x1_inter = max(box1[0], box2[0])
    y1_inter = max(box1[1], box2[1])
    x2_inter = min(box1[2], box2[2])
    y2_inter = min(box1[3], box2[3])
    
    inter_area = max(0, x2_inter - x1_inter) * max(0, y2_inter - y1_inter)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union_area = box1_area + box2_area - inter_area
    
    if union_area == 0:
        return 0
    return inter_area / union_area

def visualize_prediction(image, gt_box, pred_box, label, score, out_path, crop_path):
    fig, ax = plt.subplots(1)
    ax.imshow(image)
    
    # GT Box
    if gt_box is not None:
        gx, gy, gxmax, gymax = gt_box
        rect_gt = patches.Rectangle((gx, gy), gxmax-gx, gymax-gy, linewidth=2, edgecolor='g', facecolor='none', label='GT')
        ax.add_patch(rect_gt)
        
    # Pred Box
    if pred_box is not None:
        px, py, pxmax, pymax = pred_box
        rect_pred = patches.Rectangle((px, py), pxmax-px, pymax-py, linewidth=2, edgecolor='r', facecolor='none', label=f'Pred: {label} ({score:.2f})')
        ax.add_patch(rect_pred)
        
        # Save Crop
        crop = image.crop((px, py, pxmax, pymax))
        crop.save(crop_path)
        
    plt.legend()
    plt.axis('off')
    plt.savefig(out_path, bbox_inches='tight')
    plt.close()

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load original manifest to get original images and GT boxes
    print("Loading datasets...")
    original_records = {}
    with open("data/interim/objectron_manifest.jsonl", "r") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            # Use original image_path as key if needed, or item_instance_id + image_path
            # Since test_split points to cropped images, we'll match by item_instance_id
            # Wait, there are multiple frames per instance. Let's just use all frames in the manifest that belong to 'test'
            pass
            
    # To have a clean test set, we will take all records from test_split (which has the correct subset)
    # and look up their original image paths using the interim manifest.
    
    # Since interim manifest was used to generate crops, the crops have names like:
    # objectron_laptop_batch-7_33_test_frame_0000.jpg
    # We can parse the sequence id and frame number!
    # Better: just load test_split and grab the original image from the interim manifest based on seq id and frame num.
    
    test_instances = set()
    with open("data/processed/test_split.jsonl", "r") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            iid = r.get("item_instance_id") or r.get("instance_id")
            test_instances.add(iid)
            
    # Grab original images for these instances from interim manifest
    eval_records = []
    with open("data/interim/objectron_manifest.jsonl", "r") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            if r["item_instance_id"] in test_instances or r["item_category"] == "chair": # Add chairs as unknowns
                if os.path.exists(r["image_path"]):
                    eval_records.append(r)
                    
    print(f"Total evaluation records: {len(eval_records)}")
    
    print("Loading Grounding DINO...")
    processor = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-tiny")
    model = AutoModelForZeroShotObjectDetection.from_pretrained("IDEA-Research/grounding-dino-tiny").to(device)
    
    known_categories = ["laptop", "book", "bottle", "cup", "shoe", "camera"]
    text_prompt = ". ".join(known_categories) + "."
    
    os.makedirs("reports/evaluation/m2_visualizations", exist_ok=True)
    
    results = {
        "P1_no_proposal": 0,
        "P2_bad_bbox": 0,
        "P3_wrong_category": 0,
        "P4_ambiguous_proposals": 0, # Not strictly evaluating here
        "P7_unknown_false_accept": 0,
        "true_positives": 0,
        "false_negatives": 0,
        "false_positives": 0,
        "cat_metrics": {cat: {"TP": 0, "FP": 0, "FN": 0} for cat in known_categories}
    }
    
    box_threshold = 0.35
    text_threshold = 0.25
    iou_threshold = 0.5
    
    vis_count = 0
    
    for i, r in enumerate(eval_records):
        img_path = r["image_path"]
        gt_cat = r["item_category"]
        gt_box = r["bbox"] # [xmin, ymin, xmax, ymax]
        
        image = Image.open(img_path).convert("RGB")
        inputs = processor(images=image, text=text_prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model(**inputs)
            
        target_sizes = torch.tensor([image.size[::-1]])
        
        preds = processor.post_process_grounded_object_detection(
            outputs, 
            inputs.input_ids,
            threshold=box_threshold,
            text_threshold=text_threshold,
            target_sizes=target_sizes
        )[0]
        
        boxes = preds["boxes"].cpu().numpy()
        scores = preds["scores"].cpu().numpy()
        labels = preds["text_labels"] # List of strings
        
        gt_is_unknown = gt_cat not in known_categories
        
        best_iou = 0
        best_score = 0
        best_pred_idx = -1
        best_cat = None
        
        # P1: No proposal
        if len(boxes) == 0:
            results["P1_no_proposal"] += 1
            if gt_is_unknown:
                results["true_positives"] += 1 # Unknown correctly rejected
            else:
                results["false_negatives"] += 1
                results["cat_metrics"][gt_cat]["FN"] += 1
        else:
            for b_idx, (box, score, label) in enumerate(zip(boxes, scores, labels)):
                iou = compute_iou(gt_box, box)
                if iou > best_iou:
                    best_iou = iou
                    best_score = score
                    best_pred_idx = b_idx
                    best_cat = label
            
            pred_box = boxes[best_pred_idx] if best_pred_idx >= 0 else None
            pred_score = scores[best_pred_idx] if best_pred_idx >= 0 else 0
            
            # Save visualizations for a subset
            if vis_count < 20 or (best_iou < iou_threshold):
                seq = r.get("item_instance_id", f"unknown_{i}")
                out_path = f"reports/evaluation/m2_visualizations/vis_{seq}_{i}.jpg"
                crop_path = f"reports/evaluation/m2_visualizations/crop_{seq}_{i}.jpg"
                visualize_prediction(image, gt_box, pred_box, best_cat, pred_score, out_path, crop_path)
                vis_count += 1
            
            if gt_is_unknown:
                # P7: Unknown object mapped to known category
                if best_iou > iou_threshold:
                    results["P7_unknown_false_accept"] += 1
                    results["false_positives"] += 1
                else:
                    results["true_positives"] += 1 # Correctly didn't find the known classes on this object
            else:
                if best_iou < iou_threshold:
                    # P2: Incorrect bbox (low IOU)
                    results["P2_bad_bbox"] += 1
                    results["false_negatives"] += 1
                    results["cat_metrics"][gt_cat]["FN"] += 1
                else:
                    # Good IOU, check category
                    if best_cat != gt_cat:
                        # P3: Wrong category
                        results["P3_wrong_category"] += 1
                        results["false_negatives"] += 1
                        results["cat_metrics"][gt_cat]["FN"] += 1
                    else:
                        results["true_positives"] += 1
                        results["cat_metrics"][gt_cat]["TP"] += 1
                        
            if len(boxes) > 2 and best_iou > iou_threshold:
                # P4: ambiguous proposals
                results["P4_ambiguous_proposals"] += 1

    print("\n--- M2-A Grounding DINO Benchmark Results ---")
    tp = results["true_positives"]
    fp = results["false_positives"]
    fn = results["false_negatives"]
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    print(f"Total Evaluated: {len(eval_records)}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"Unknown Object False Accept (P7): {results['P7_unknown_false_accept']}")
    
    with open("reports/experiments/m2_perception_benchmark.md", "w") as f:
        f.write("# M2-A Grounding DINO Perception Benchmark\n\n")
        f.write(f"- **Total Evaluated:** {len(eval_records)}\n")
        f.write(f"- **Precision:** {precision:.4f}\n")
        f.write(f"- **Recall:** {recall:.4f}\n")
        f.write(f"- **F1 Score:** {f1:.4f}\n\n")
        
        f.write("## Failure Taxonomy\n")
        f.write(f"- **P1 (No Proposal):** {results['P1_no_proposal']}\n")
        f.write(f"- **P2 (Incorrect Bounding Box / Low IOU):** {results['P2_bad_bbox']}\n")
        f.write(f"- **P3 (Wrong Category):** {results['P3_wrong_category']}\n")
        f.write(f"- **P4 (Ambiguous / Multiple Proposals):** {results['P4_ambiguous_proposals']}\n")
        f.write(f"- **P7 (Unknown Object False Acceptance):** {results['P7_unknown_false_accept']}\n\n")
        
        f.write("## Per-Category Metrics\n")
        for cat, mets in results["cat_metrics"].items():
            ctp = mets["TP"]
            cfn = mets["FN"]
            crec = ctp / (ctp + cfn) if (ctp + cfn) > 0 else 0
            f.write(f"- **{cat}**: Recall {crec:.4f} (TP: {ctp}, FN: {cfn})\n")

if __name__ == "__main__":
    main()

