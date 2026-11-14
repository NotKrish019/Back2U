import argparse
import sys
from scripts.run_inference import FinalInferencePipeline
import json

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="O8 - Multimodal Image+Text Search")
    parser.add_argument("--image", required=True, type=str, help="Query image path")
    parser.add_argument("--text", required=True, type=str, help="Text query (e.g. 'black laptop with stickers')")
    parser.add_argument("--top_k", type=int, default=5)
    args = parser.parse_args()
    
    pipeline = FinalInferencePipeline()
    res = pipeline.infer(args.image, args.text, args.top_k)
    print(json.dumps(res, indent=2))
