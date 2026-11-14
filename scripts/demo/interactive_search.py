import argparse
import sys
import json
import csv
import os
from datetime import datetime
from scripts.run_inference import FinalInferencePipeline

def run_interactive(pipeline, image_path, text_query, debug, json_mode):
    res = pipeline.infer(image_path, text_query, top_k=5, return_debug=debug)
    
    if "error" in res:
        if json_mode:
            print(json.dumps(res))
        else:
            print(f"Error: {res['error']}")
        return res
        
    if json_mode:
        if not debug and "debug" in res:
            del res["debug"]
            
        json_output = {
            "input": {
                "image_path": image_path,
                "text_query": text_query
            },
            "perception": res.get("perception", {}),
            "retrieval": [
                {
                    "item_id": m.get("item_id"),
                    "category": m.get("category"),
                    "visual_score": m.get("visual_score")
                } for m in res.get("matches", [])
            ],
            "semantic": [
                {
                    "item_id": m.get("item_id"),
                    "text_score": m.get("text_score")
                } for m in res.get("matches", []) if m.get("text_score") is not None
            ],
            "decision": {
                "top_candidate": res["matches"][0]["item_id"] if res.get("matches") else None,
                "final_score": res["matches"][0]["final_score"] if res.get("matches") else None,
                "final_decision": res["matches"][0]["decision"] if res.get("matches") else "reject"
            }
        }
        print(json.dumps(json_output, indent=2))
        return res

    print("=" * 50)
    print("LP-RIEM-MM1 TEST")
    print("=" * 50)
    print("\nINPUT")
    print(f"Image: {image_path}")
    print(f"Text: {text_query if text_query else '(none)'}")
    
    print("\nPERCEPTION")
    print(f"Category: {res['perception']['category']}")
    print(f"Confidence: {res['perception']['confidence']}")
    print(f"Decision: {res['perception']['decision']}")
    
    print("\nINSTANCE RETRIEVAL")
    print(f"{'Rank':<5} {'Item ID':<30} {'Category':<15} {'Visual Score':<15} {'Supporting Views'}")
    
    for rank, m in enumerate(res["matches"], 1):
        print(f"{rank:<5} {m['item_id']:<30} {m['category']:<15} {m['visual_score']:<15.4f} {m['supporting_views']}")
        
    print("\nSEMANTIC EVIDENCE")
    if text_query:
        for rank, m in enumerate(res["matches"], 1):
            tscore = m.get('text_score')
            if tscore is not None:
                print(f"Rank {rank} Text Score: {tscore:.4f}")
    else:
        print("image-only mode")
        
    print("\nFINAL DECISION")
    if res["matches"]:
        top = res["matches"][0]
        print(f"Top candidate: {top['item_id']}")
        print(f"Final calibrated score: {top['final_score']}")
        print(f"Decision: {top['decision']}")
    else:
        print("No candidates found or rejected by perception layer.")
        
    if debug:
        print("\nDEBUG INFO")
        print(json.dumps(res.get("debug", {}), indent=2))
        
    return res

def save_evaluation(res, image_path, text_query, is_item_correct, is_cat_correct, notes):
    csv_path = "reports/evaluation/manual_test_results.csv"
    file_exists = os.path.exists(csv_path)
    
    with open(csv_path, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow([
                "timestamp", "image_path", "text_query", "predicted_category",
                "category_confidence", "category_decision", "top_item_id", 
                "top_item_score", "final_decision", "human_category_correct", 
                "human_item_correct", "notes"
            ])
            
        top_item_id = res["matches"][0]["item_id"] if res.get("matches") else ""
        top_item_score = res["matches"][0]["final_score"] if res.get("matches") else ""
        final_decision = res["matches"][0]["decision"] if res.get("matches") else "reject"
        if res["perception"]["decision"] == "UNKNOWN":
            final_decision = "reject"
            
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            image_path, text_query or "",
            res["perception"]["category"] or "",
            res["perception"]["confidence"],
            res["perception"]["decision"],
            top_item_id, top_item_score, final_decision,
            is_cat_correct, is_item_correct, notes
        ])

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", type=str, help="Image path for non-interactive mode")
    parser.add_argument("--text", type=str, help="Text query for non-interactive mode")
    parser.add_argument("--debug", action="store_true", help="Enable debug output")
    parser.add_argument("--json", action="store_true", help="Output only JSON")
    args = parser.parse_args()

    pipeline = FinalInferencePipeline()
    
    if args.image:
        res = run_interactive(pipeline, args.image, args.text, args.debug, args.json)
        sys.exit(0)
        
    print("Ready.")
    
    while True:
        try:
            image_path = input("Image path (or 'quit'): ").strip()
            if image_path.lower() in ['quit', 'exit', 'q']:
                break
            if not os.path.exists(image_path):
                print("File not found.")
                continue
                
            text_query = input("Text description (optional): ").strip()
            if not text_query:
                text_query = None
                
            res = run_interactive(pipeline, image_path, text_query, args.debug, args.json)
            
            # Manual evaluation
            ans_item = input("\nWas the top physical-item result correct? [y/n/unknown]: ").strip().lower()
            if ans_item not in ['y', 'n', 'unknown']: ans_item = 'unknown'
            
            ans_cat = input("Was the category correct? [y/n]: ").strip().lower()
            if ans_cat not in ['y', 'n']: ans_cat = 'unknown'
            
            notes = input("Notes: ").strip()
            
            os.makedirs("reports/evaluation", exist_ok=True)
            save_evaluation(res, image_path, text_query, ans_item, ans_cat, notes)
            print("Evaluation saved.\n")
            
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
