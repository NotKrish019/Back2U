import os
import json
import torch
from torchvision import transforms
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix
from src.models.m2_classifier import M2CategoryHead
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

class CategoryGate:
    def __init__(self, categories, classifier_threshold=0.6, margin_threshold=0.1):
        self.categories = categories
        self.classifier_threshold = classifier_threshold
        self.margin_threshold = margin_threshold
        
    def evaluate(self, detector_category, detector_conf, classifier_category, classifier_conf, margin):
        # Case 1: Detector missed (no proposal)
        if detector_category is None:
            if classifier_conf >= self.classifier_threshold and classifier_category in self.categories:
                return "CATEGORY_CANDIDATE_FROM_VISUAL_MODEL", classifier_category, "detector_missed_but_classifier_confident"
            else:
                return "UNKNOWN", None, "detector_missed_and_classifier_uncertain"
                
        # Case 2: Both agree
        if detector_category == classifier_category:
            if classifier_conf >= self.classifier_threshold:
                return "KNOWN", detector_category, "detector_classifier_agreement"
            else:
                return "UNCERTAIN", detector_category, "agreement_but_low_classifier_confidence"
                
        # Case 3: Disagreement
        if detector_category != classifier_category:
            if classifier_conf >= self.classifier_threshold and margin >= self.margin_threshold:
                # If classifier is very confident, we might flag uncertain or trust classifier. 
                # Let's say UNCERTAIN to force review, per "precision-first".
                return "UNCERTAIN", None, f"disagreement_detector={detector_category}_classifier={classifier_category}"
            else:
                # Classifier weak, maybe trust detector? Or just UNCERTAIN.
                return "UNCERTAIN", None, "disagreement_and_weak_classifier"
                
        return "UNKNOWN", None, "fallback"

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    with open("data/processed/m2_categories.json", "r") as f:
        idx_to_cat = json.load(f)
    
    categories = list(idx_to_cat.values())
    cat_to_idx = {c: int(i) for i, c in idx_to_cat.items()}
    
    # Load Visual Head
    model = M2CategoryHead(num_categories=len(categories)).to(device)
    model.load_state_dict(torch.load("models/checkpoints/m2_category_head_best.pth", map_location=device))
    model.eval()
    
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225))
    ])
    
    # Load Grounding DINO
    gdino_processor = AutoProcessor.from_pretrained("IDEA-Research/grounding-dino-tiny")
    gdino_model = AutoModelForZeroShotObjectDetection.from_pretrained("IDEA-Research/grounding-dino-tiny").to(device)
    gdino_text_prompt = ". ".join(categories) + "."
    
    gate = CategoryGate(categories)
    
    # We evaluate on the M2-A test set. Note: we need to handle "chair" for false acceptance test.
    # The m2-a test set logic from run_m2_perception.py:
    # We evaluate on a selection of instances from test_split and objectron chair.
    
    results = []
    
    # Let's collect evaluation items from test_split (targets)
    test_items = []
    with open("data/processed/test_split.jsonl") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            # select 1 per instance to match M2-A
            test_items.append({
                "path": r["image_path"],
                "gt_category": r["item_category"]
            })
            
    # And chairs (unknowns)
    # We had ~20 chairs in M2-A
    with open("data/interim/objectron_manifest.jsonl") as f:
        chairs_added = 0
        for line in f:
            r = json.loads(line)
            if r["item_category"] == "chair" and chairs_added < 20:
                test_items.append({
                    "path": r["image_path"],
                    "gt_category": "chair"
                })
                chairs_added += 1

    # Keep exactly one per instance ID for targets to mimic M2-A?
    # For simplicity, we just use a sub-sample or all of them.
    # Let's take 50 targets and 20 unknowns.
    
    y_true_gdino = []
    y_pred_gdino = []
    
    y_true_clf = []
    y_pred_clf = []
    
    y_true_gate = []
    y_pred_gate = []
    
    print(f"Evaluating {len(test_items)} items...")
    
    for item in test_items:
        img_path = item["path"]
        gt = item["gt_category"]
        
        try:
            pil_img = Image.open(img_path).convert("RGB")
        except:
            continue
            
        # Grounding DINO prediction
        inputs = gdino_processor(images=pil_img, text=gdino_text_prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = gdino_model(**inputs)
            
        target_sizes = torch.tensor([pil_img.size[::-1]])
        results_gdino = gdino_processor.post_process_grounded_object_detection(
            outputs,
            inputs.input_ids,
            threshold=0.3,
            text_threshold=0.3,
            target_sizes=target_sizes
        )[0]
        
        det_cat = None
        det_conf = 0.0
        
        if len(results_gdino["scores"]) > 0:
            best_idx = results_gdino["scores"].argmax().item()
            det_cat = results_gdino["labels"][best_idx]
            det_conf = results_gdino["scores"][best_idx].item()
            # If det_cat is a known class, map it.
            if det_cat not in categories:
                det_cat = None
                
        # Visual Head prediction (on whole image, simulating a crop of the object if we had one, 
        # or we just use the whole image as the object crop in this proxy test)
        img_t = transform(pil_img).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(img_t)
            probs = torch.softmax(logits, dim=-1)[0]
            
        sorted_probs, sorted_indices = torch.sort(probs, descending=True)
        top1_prob = sorted_probs[0].item()
        top2_prob = sorted_probs[1].item()
        margin = top1_prob - top2_prob
        clf_cat = idx_to_cat[str(sorted_indices[0].item())]
        
        # Gate decision
        decision, final_cat, reason = gate.evaluate(det_cat, det_conf, clf_cat, top1_prob, margin)
        
        # Log to results
        if gt in categories:
            # Target
            y_true_gdino.append(gt)
            y_pred_gdino.append(det_cat if det_cat else "none")
            
            y_true_clf.append(gt)
            y_pred_clf.append(clf_cat)
            
            y_true_gate.append(gt)
            y_pred_gate.append(final_cat if final_cat else "none")
        else:
            # Unknown
            y_true_gdino.append("unknown")
            y_pred_gdino.append(det_cat if det_cat else "unknown")
            
            y_true_clf.append("unknown")
            # Classifier will always pick a known class, which is a false positive
            y_pred_clf.append(clf_cat)
            
            y_true_gate.append("unknown")
            y_pred_gate.append(final_cat if final_cat else "unknown")
            
        results.append({
            "gt": gt,
            "det_cat": det_cat,
            "clf_cat": clf_cat,
            "decision": decision,
            "final_cat": final_cat,
            "reason": reason
        })

    # Output detailed report
    print("\n--- M2-B CATEGORY GATE RESULTS ---")
    
    def calc_metrics(y_true, y_pred, name):
        # Calculate precision, recall, f1 for knowns, and false accept rate for unknowns
        tps = 0; fps = 0; fns = 0
        unknown_fp = 0
        unknown_total = 0
        
        for t, p in zip(y_true, y_pred):
            if t != "unknown":
                if p == t:
                    tps += 1
                elif p == "none":
                    fns += 1
                else:
                    fps += 1
                    fns += 1 # Missed the real one
            else:
                unknown_total += 1
                if p != "unknown" and p != "none":
                    unknown_fp += 1
                    
        precision = tps / (tps + fps) if (tps + fps) > 0 else 0
        recall = tps / (tps + fns) if (tps + fns) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        far = unknown_fp / unknown_total if unknown_total > 0 else 0
        
        print(f"[{name}] Precision: {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f} | Unknown FAR: {far:.4f} ({unknown_fp}/{unknown_total})")

    calc_metrics(y_true_gdino, y_pred_gdino, "A: Grounding DINO")
    calc_metrics(y_true_clf, y_pred_clf, "B: Visual Classifier")
    calc_metrics(y_true_gate, y_pred_gate, "C: Combined Gate")
    
    # Save results
    os.makedirs("reports/experiments", exist_ok=True)
    with open("reports/experiments/m2_category_gate.md", "w") as f:
        f.write("# M2-B Visual Category Head + Category Gate\n\n")
        f.write("## Results\n\n")
        f.write("A detailed comparison between Grounding DINO, the Visual Head, and the Gate.\n")

if __name__ == "__main__":
    main()
