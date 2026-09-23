import os
import sys
import json
import torch
import shutil
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from torchvision import transforms
from PIL import Image

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

from src.models.siamese_network import SiameseNetwork
from src.retrieval.faiss_index import RetrievalIndex

app = FastAPI(title="Lost Property Re-ID")

app.mount("/data", StaticFiles(directory=str(project_root / "data")), name="data")

templates = Jinja2Templates(directory=str(project_root / "src" / "app" / "templates"))

# Global State
model = None
index = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

@app.on_event("startup")
def startup_event():
    global model, index
    print("Loading Siamese Network...")
    model = SiameseNetwork().to(device)
    checkpoint_path = project_root / "models" / "checkpoints" / "mir_siamese_best.pth"
    if checkpoint_path.exists():
        model.load_state_dict(torch.load(checkpoint_path, map_location=device))
        print("Model loaded successfully.")
    else:
        print("Warning: No checkpoint found. Using random weights.")
    model.eval()

    print("Building FAISS index from known test split (Gallery)...")
    index = RetrievalIndex(embedding_dimension=128)
    test_split_path = project_root / "data" / "processed" / "test_split.jsonl"
    
    if test_split_path.exists():
        with open(test_split_path, 'r') as f:
            for i, line in enumerate(f):
                if not line.strip(): continue
                rec = json.loads(line)
                try:
                    img = Image.open(rec["image_path"]).convert("RGB")
                    img_tensor = transform(img).unsqueeze(0).to(device)
                    with torch.no_grad():
                        emb = model(img_tensor).cpu().numpy().flatten()
                    
                    index.add_item(
                        item_instance_id=rec.get("instance_id") or rec.get("item_instance_id"),
                        embedding=emb,
                        metadata={
                            "category": rec.get("project_category") or rec.get("item_category"),
                            "image_path": "/" + rec["image_path"].replace("\\", "/")
                        }
                    )
                except Exception as e:
                    print(f"Skipping {rec['image_path']}: {e}")
        print(f"Index built with {index.index.ntotal} items.")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request, "index.html")

@app.post("/search")
async def search_lost_item(request: Request, file: UploadFile = File(...)):
    # Save the uploaded file temporarily
    upload_dir = project_root / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Process Image
    img = Image.open(file_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        query_emb = model(img_tensor).cpu().numpy().flatten()
        
    # Retrieve
    raw_results = index.search(query_emb, top_k=5)
    
    # Render results
    return templates.TemplateResponse(request, "results.html", {
        "query_img": f"/data/uploads/{file.filename}",
        "results": raw_results
    })

@app.post("/api/search")
async def api_search_lost_item(file: UploadFile = File(...)):
    # JSON API endpoint for React frontend
    upload_dir = project_root / "data" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    img = Image.open(file_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        query_emb = model(img_tensor).cpu().numpy().flatten()
        
    raw_results = index.search(query_emb, top_k=5)
    return {"query_img": f"/data/uploads/{file.filename}", "results": raw_results}
