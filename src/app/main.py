"""LP-RIEM-MM1 inference service (port 8001).

Endpoints
- POST /api/search   multipart: file (image, optional), text (optional); at least one required.
                     allowed_ids (optional JSON list): restrict ranking to these gallery items
                     (the backend passes the eligible opposite-type open reports).
                     Text only → SigLIP2 text-to-image search (decision "review", no calibration).
                     status "UNSUPPORTED_ITEM" → the open-set gate stopped retrieval.
- POST /api/add      multipart: item_id, category, file, replace (bool; drop older content)
- GET  /api/items    item ids, per-item sha256 + category, model version (used by index sync)
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
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Bypass SSL verification for PyTorch weight downloads
ssl._create_default_https_context = ssl._create_unverified_context

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", str(project_root / "data")))
QUERY_DIR = DATA_DIR / "uploads" / "queries"
MAX_UPLOAD_BYTES = int(os.environ.get("ML_MAX_UPLOAD_BYTES", str(15 * 1024 * 1024)))

app = FastAPI(title="LP-RIEM-MM1 Inference Service")


@app.exception_handler(Exception)
async def _unhandled_error(request, exc):  # never leak stack traces or internals to clients
    import logging
    logging.getLogger("back2u.ml").exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": {"code": "INTERNAL_ERROR",
                        "message": "Something went wrong on our side. Please try again."}})
DATA_DIR.mkdir(parents=True, exist_ok=True)
QUERY_DIR.mkdir(parents=True, exist_ok=True)
# Only query uploads are served (``query_img``). The gallery (data/gallery/images — original
# found-item photos) is deliberately NOT exposed: that would bypass the backend's privacy blur.
app.mount("/data/uploads/queries", StaticFiles(directory=str(QUERY_DIR)), name="queries")

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
        raise _error(413, "UPLOAD_TOO_LARGE", f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
    if not data:
        raise _error(400, "EMPTY_UPLOAD", "Empty upload")
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


def _error(status: int, code: str, message: str):
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def _parse_allowed_ids(raw: str | None):
    if raw is None or raw == "":
        return None
    try:
        ids = json.loads(raw)
    except ValueError:
        raise _error(400, "INVALID_ALLOWED_IDS", "allowed_ids must be a JSON list of item ids")
    if not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        raise _error(400, "INVALID_ALLOWED_IDS", "allowed_ids must be a JSON list of item ids")
    return ids


@app.post("/api/search")
def api_search_lost_item(file: UploadFile = File(None), text: str = Form(None), top_k: int = Form(5),
                         allowed_ids: str = Form(None)):
    from scripts.run_inference import open_image_bytes

    text = (text or "").strip() or None
    allowed = _parse_allowed_ids(allowed_ids)
    top_k = max(1, min(int(top_k), 50))
    if file is None:
        if not text:
            raise _error(400, "EMPTY_QUERY", "Provide an image, a text description, or both")
        res = pipeline.search_text(text, top_k=top_k, allowed_ids=allowed)
        return {
            "model_version": pipeline.model_version,
            "status": "OK",
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
    except ValueError:
        raise _error(400, "INVALID_IMAGE", "The uploaded file is not a readable image")
    path = _save_query(data, sha)

    res = pipeline.infer_pil(pil, text_query=text, top_k=top_k, allowed_ids=allowed)
    duplicates = sorted({e.item_id for e in pipeline.store.find_by_sha(sha)})

    results = [
        {"item_instance_id": m["item_id"], "similarity_score": m["final_score"], "rank": i + 1,
         "visual_score": m["visual_score"], "text_score": m["text_score"], "decision": m["decision"]}
        for i, m in enumerate(res.get("matches", []))
    ]
    return {
        "model_version": pipeline.model_version,
        "status": res.get("status", "OK"),
        "mode": "image" if not text else "image_text",
        "timings": res.get("timings"),
        "query_img": f"/data/uploads/queries/{path.name}",
        "query_sha256": sha,
        "query_identical_to_items": duplicates,
        "perception": res.get("perception"),
        "crop": res.get("crop"),
        "results": results,
    }


@app.post("/api/add")
def api_add_to_index(item_id: str = Form(...), category: str = Form(None), file: UploadFile = File(...),
                     replace: bool = Form(False)):
    data = _read_upload(file)
    try:
        res = pipeline.add_image_bytes(data, item_id, category, replace=replace)
    except ValueError:
        raise _error(400, "INVALID_IMAGE", "The uploaded file is not a readable image")
    msg = {"added": f"Added item {item_id} to gallery.",
           "already_indexed": f"Item {item_id} already indexed with identical content."}[res["status"]]
    if res["duplicate_of"]:
        msg += f" Identical image already indexed for: {', '.join(res['duplicate_of'])}."
    return {"status": "success", "message": msg, **res}


@app.get("/api/items")
def api_items():
    return {"model_version": pipeline.model_version, "item_ids": pipeline.store.item_ids(),
            "items": pipeline.store.items_summary()}


@app.delete("/api/items/{item_id}")
def api_remove_item(item_id: str):
    removed = pipeline.store.remove(item_id)
    if not removed:
        raise _error(404, "ITEM_NOT_INDEXED", f"Item {item_id} not found in gallery store")
    return {"status": "success", "message": f"Item {item_id} removed from gallery.", "remaining_entries": len(pipeline.store)}


@app.get("/api/health")
def api_health():
    info = pipeline.store.info()
    return {
        "status": "degraded" if info["quarantined_to"] else "ready",
        "model_version": pipeline.model_version,
        "checkpoints": getattr(pipeline.models, "checkpoints", {}),
        "classifier_labels_raw": pipeline.known_categories,
        "detector_prompt": pipeline.gdino_prompt,
        "crop_policy": pipeline.crop_policy,
        "detector_mode": pipeline.detector_mode,
        "open_set_gate": pipeline.gate.to_dict(),
        "gallery": info,
    }
