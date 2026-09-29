import os
import sys
import json
import torch
import shutil
import ssl
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.staticfiles import StaticFiles
from torchvision import transforms
from PIL import Image

# Bypass SSL verification for PyTorch weight downloads
ssl._create_default_https_context = ssl._create_unverified_context

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

from scripts.run_inference import FinalInferencePipeline

app = FastAPI(title="LP-RIEM-MM1 Inference Service")

app.mount("/data", StaticFiles(directory=str(project_root / "data")), name="data")

# Global State
pipeline = None

@app.on_event("startup")
def startup_event():
    global pipeline
    print("Loading FinalInferencePipeline...")
    # Make sure we are in the project root so hardcoded paths in run_inference work
    os.chdir(str(project_root))
    pipeline = FinalInferencePipeline()
    print("Pipeline loaded successfully.")
from fastapi import Form
@app.post("/api/search")
async def api_search_lost_item(file: UploadFile = File(...), text: str = Form(None)):
    upload_dir = project_root / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    os.chdir(str(project_root))
    res = pipeline.infer(str(file_path), text_query=text, top_k=5)
    
    # Map back to the expected schema for RealRetrievalService:
    # {"query_img": ..., "results": [{"item_instance_id": ..., "similarity_score": ..., "rank": ...}]}
    mapped_results = []
    if "matches" in res:
        for i, match in enumerate(res["matches"]):
            mapped_results.append({
                "item_instance_id": match["item_id"],
                "similarity_score": match["final_score"],
                "rank": i + 1
            })
            
    return {"query_img": f"/data/uploads/{file.filename}", "results": mapped_results}
