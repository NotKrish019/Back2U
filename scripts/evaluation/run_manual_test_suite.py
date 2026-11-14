import os
import json
import argparse
import csv
from datetime import datetime
from scripts.run_inference import FinalInferencePipeline

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="data/manual_test_cases.json", help="Path to test cases configuration file")
    args = parser.parse_args()
    
    if not os.path.exists(args.config):
        print(f"Config file not found: {args.config}")
        print("Please create a JSON file with a list of test cases: [{'image_path': '...', 'text_query': '...', 'expected_item': '...', 'expected_category': '...'}, ...]")
        return
        
    with open(args.config, "r") as f:
        test_cases = json.load(f)
        
    pipeline = FinalInferencePipeline()
    
    csv_path = "reports/evaluation/manual_test_results.csv"
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    file_exists = os.path.exists(csv_path)
    
    cat_correct = 0
    item_top1_correct = 0
    item_top5_correct = 0
    unknown_rejections = 0
    uncertain_count = 0
    false_accepts = 0
    total_known = 0
    total_unknown = 0
    
    with open(csv_path, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "timestamp", "image_path", "text_query", "predicted_category",
                "category_confidence", "category_decision", "top_item_id", 
                "top_item_score", "final_decision", "human_category_correct", 
                "human_item_correct", "notes"
            ])
            
        for case in test_cases:
            image_path = case.get("image_path")
            text_query = case.get("text_query")
            exp_item = case.get("expected_item")
            exp_cat = case.get("expected_category")
            is_known = case.get("is_known", True)
            
            res = pipeline.infer(image_path, text_query, top_k=5)
            if "error" in res:
                print(f"Error on {image_path}: {res['error']}")
                continue
                
            pred_cat = res["perception"]["category"]
            cat_decision = res["perception"]["decision"]
            
            top_item_id = res["matches"][0]["item_id"] if res.get("matches") else ""
            top_item_score = res["matches"][0]["final_score"] if res.get("matches") else ""
            final_decision = res["matches"][0]["decision"] if res.get("matches") else "reject"
            if cat_decision == "UNKNOWN":
                final_decision = "reject"
                
            # Evaluate automatically based on expected labels
            cat_is_correct = 'y' if pred_cat == exp_cat else 'n'
            item_is_correct = 'y' if top_item_id == exp_item else 'n'
            
            # Aggregate stats
            if is_known:
                total_known += 1
                if pred_cat == exp_cat:
                    cat_correct += 1
                if top_item_id == exp_item:
                    item_top1_correct += 1
                # top 5
                found_in_top5 = any(m["item_id"] == exp_item for m in res.get("matches", []))
                if found_in_top5:
                    item_top5_correct += 1
                if final_decision == "review":
                    uncertain_count += 1
            else:
                total_unknown += 1
                if cat_decision == "UNKNOWN" or final_decision == "reject":
                    unknown_rejections += 1
                else:
                    if final_decision == "candidate":
                        false_accepts += 1
                    else:
                        uncertain_count += 1 # "review" for unknown is somewhat acceptable but still uncertain

            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                image_path, text_query or "",
                pred_cat or "",
                res["perception"]["confidence"],
                cat_decision,
                top_item_id, top_item_score, final_decision,
                cat_is_correct, item_is_correct, "Automated test suite run"
            ])
            
    # Generate Summary
    md_path = "reports/evaluation/manual_test_summary.md"
    
    cat_acc = cat_correct / total_known if total_known > 0 else 0
    t1_acc = item_top1_correct / total_known if total_known > 0 else 0
    t5_acc = item_top5_correct / total_known if total_known > 0 else 0
    unk_rej = unknown_rejections / total_unknown if total_unknown > 0 else 0
    unc_rate = uncertain_count / (total_known + total_unknown) if (total_known + total_unknown) > 0 else 0
    fa_rate = false_accepts / total_unknown if total_unknown > 0 else 0
    
    summary = f"""# Manual Test Suite Summary

## Configuration Details
- Total Tests: {len(test_cases)}
- Known Queries: {total_known}
- Unknown/OOD Queries: {total_unknown}

## Performance Breakdown
- **Category Accuracy (Knowns):** {cat_acc:.4f} ({cat_correct}/{total_known})
- **Top-1 Item Accuracy (Knowns):** {t1_acc:.4f} ({item_top1_correct}/{total_known})
- **Top-5 Item Accuracy (Knowns):** {t5_acc:.4f} ({item_top5_correct}/{total_known})
- **Unknown Rejection Rate:** {unk_rej:.4f} ({unknown_rejections}/{total_unknown})
- **Overall Uncertain Rate (Sent to Review):** {unc_rate:.4f} ({uncertain_count}/{total_known + total_unknown})
- **False Acceptance Rate (Unknowns as candidates):** {fa_rate:.4f} ({false_accepts}/{total_unknown})

*See `reports/evaluation/manual_test_results.csv` for detailed per-case logs.*
"""
    with open(md_path, "w") as f:
        f.write(summary)
        
    print(f"Suite completed. Summary written to {md_path}")

if __name__ == "__main__":
    main()
