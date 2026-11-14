"""LP-RIEM-MM1 inference service (port 8001).

Endpoints
- POST /api/search   multipart: file (image, optional), text (optional); at least one required.
                     Text only → SigLIP2 text-to-image search (decision "review", no calibration).
- POST /api/add      multipart: item_id, category, file
- GET  /api/items    indexed item ids + model version (used by backend reindex)
- GET  /api/health   model version, checkpoints, gallery store status
"""
import hashlib
import json
import os
import ssl
import sys
import threading
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

# Bypass SSL verification for PyTorch weight downloads
ssl._create_default_https_context = ssl._create_unverified_context

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", str(project_root / "data")))
QUERY_DIR = DATA_DIR / "uploads" / "queries"
MAX_UPLOAD_BYTES = int(os.environ.get("ML_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))

app = FastAPI(title="LP-RIEM-MM1 Inference Service")
DATA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")

# Global state. Tests may assign a pipeline before startup to skip loading real models.
pipeline = None
_query_log_lock = threading.Lock()


@app.on_event("startup")
def startup_event():
    global pipeline
    if pipeline is not None:
        return
    from scripts.run_inference import FinalInferencePipeline
    print("Loading FinalInferencePipeline...")
    os.chdir(str(project_root))
    pipeline = FinalInferencePipeline()
    print(f"Pipeline loaded: {pipeline.model_version}, gallery entries={len(pipeline.store)}")


def _read_upload(file: UploadFile) -> bytes:
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    return data


def _save_query(data: bytes, sha: str) -> Path:
    """Every query gets a unique, server-generated name; the client filename is ignored."""
    QUERY_DIR.mkdir(parents=True, exist_ok=True)
    path = QUERY_DIR / f"q_{uuid.uuid4().hex}_{sha[:12]}.jpg"
    with open(path, "xb") as f:  # "x": never overwrite
        f.write(data)
    with _query_log_lock:
        with open(QUERY_DIR / "queries.jsonl", "a") as log:
            log.write(json.dumps({"file": path.name, "sha256": sha}) + "\n")
    return path


@app.post("/api/search")
def api_search_lost_item(file: UploadFile = File(None), text: str = Form(None), top_k: int = Form(5)):
    from scripts.run_inference import open_image_bytes

    text = (text or "").strip() or None
    if file is None:
        if not text:
            raise HTTPException(status_code=400, detail="Provide an image, a text description, or both")
        res = pipeline.search_text(text, top_k=top_k)
        return {
            "model_version": pipeline.model_version,
            "mode": "text_only",
            "query_img": None,
            "query_sha256": None,
            "query_identical_to_items": [],
            "perception": None,
            "crop": None,
            "results": [
                {"item_instance_id": m["item_id"], "similarity_score": m["final_score"], "rank": i + 1,
                 "visual_score": None, "text_score": m["text_score"], "decision": m["decision"]}
                for i, m in enumerate(res.get("matches", []))
            ],
        }

    data = _read_upload(file)
    sha = hashlib.sha256(data).hexdigest()
    try:
        pil, _ = open_image_bytes(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    path = _save_query(data, sha)

    res = pipeline.infer_pil(pil, text_query=text, top_k=top_k)
    duplicates = sorted({e.item_id for e in pipeline.store.find_by_sha(sha)})

    results = [
        {"item_instance_id": m["item_id"], "similarity_score": m["final_score"], "rank": i + 1,
         "visual_score": m["visual_score"], "text_score": m["text_score"], "decision": m["decision"]}
        for i, m in enumerate(res.get("matches", []))
    ]
    return {
        "model_version": pipeline.model_version,
        "query_img": f"/data/uploads/queries/{path.name}",
        "query_sha256": sha,
        "query_identical_to_items": duplicates,
        "perception": res.get("perception"),
        "crop": res.get("crop"),
        "results": results,
    }


@app.post("/api/add")
def api_add_to_index(item_id: str = Form(...), category: str = Form(None), file: UploadFile = File(...)):
    data = _read_upload(file)
    try:
        res = pipeline.add_image_bytes(data, item_id, category)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    msg = {"added": f"Added item {item_id} to gallery.",
           "already_indexed": f"Item {item_id} already indexed with identical content."}[res["status"]]
    if res["duplicate_of"]:
        msg += f" Identical image already indexed for: {', '.join(res['duplicate_of'])}."
    return {"status": "success", "message": msg, **res}


@app.get("/api/items")
def api_items():
    return {"model_version": pipeline.model_version, "item_ids": pipeline.store.item_ids()}


@app.get("/api/health")
def api_health():
    info = pipeline.store.info()
    return {
        "status": "degraded" if info["quarantined_to"] else "ready",
        "model_version": pipeline.model_version,
        "checkpoints": getattr(pipeline.models, "checkpoints", {}),
        "classifier_labels_raw": pipeline.known_categories,
        "detector_prompt": pipeline.gdino_prompt,
        "gallery": info,
    }
