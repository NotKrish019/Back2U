import base64
import io
from typing import Optional, Union

from src.api.config import settings
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem

MOCK_MODEL_VERSION = "mock-v1.0"
UNKNOWN_MODEL_VERSION = "unknown"


def decode_data_url(ref: Optional[str]) -> Optional[bytes]:
    """Decode a ``data:image/...;base64,...`` reference. Returns None if not a valid data URL."""
    if not ref or not ref.startswith("data:image") or "," not in ref:
        return None
    try:
        return base64.b64decode(ref.split(",", 1)[1], validate=False)
    except Exception:
        return None


def to_browser_image(ref: Optional[str]) -> Optional[str]:
    """Convert HEIC/HEIF data URLs (iPhone photos) to JPEG so browsers can display them.

    Anything else, including undecodable input, is returned unchanged.
    """
    if not ref or not ref.startswith(("data:image/heic", "data:image/heif")):
        return ref
    data = decode_data_url(ref)
    if not data:
        return ref
    try:
        from pillow_heif import register_heif_opener
        from PIL import Image, ImageOps
        register_heif_opener()
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        img.thumbnail((2048, 2048))
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=88)
        return "data:image/jpeg;base64," + base64.b64encode(out.getvalue()).decode()
    except Exception:
        return ref


class QueryRejected(ValueError):
    """The ML service rejected the query itself (bad image, empty query): a client error."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


class RetrievalService:
    model_version: str = UNKNOWN_MODEL_VERSION

    def search(self, query: RetrievalQuery, allowed_ids: Optional[list] = None) -> RetrievalResult:
        """``allowed_ids``: restrict ranking to these item ids (None = unrestricted)."""
        raise NotImplementedError()

    def index_report(self, report, image: Union[str, bytes], replace: bool = False) -> dict:
        """Index a report image. Returns the ML service response dict; raises on failure."""
        raise NotImplementedError()

    def remove_report(self, item_instance_id: str) -> dict:
        """Remove a report from the retrieval gallery. Returns response dict."""
        raise NotImplementedError()

    def list_indexed(self) -> tuple[str, set]:
        """Returns (model_version, set of indexed item_instance_ids)."""
        raise NotImplementedError()

    def list_indexed_detail(self) -> tuple[str, dict]:
        """Returns (model_version, {item_id: {"sha256": [..], "category": ..}})."""
        version, ids = self.list_indexed()
        return version, {i: {"sha256": [], "category": None} for i in ids}

    def health(self) -> dict:
        raise NotImplementedError()


class MockRetrievalService(RetrievalService):
    model_version = MOCK_MODEL_VERSION

    def search(self, query: RetrievalQuery, allowed_ids: Optional[list] = None) -> RetrievalResult:
        # ML is bypassed; fabricate matches from DB so prototype UI works
        from src.api.database import SessionLocal
        from src.api.models import Report

        db = SessionLocal()
        try:
            q = db.query(Report).filter(Report.item_instance_id.isnot(None))
            if allowed_ids is not None:
                q = q.filter(Report.item_instance_id.in_(list(allowed_ids)))
            reports = q.limit(2).all()
            results = [
                RetrievalResultItem(item_instance_id=r.item_instance_id,
                                    similarity_score=round(0.99 - (i * 0.1), 4), rank=i + 1)
                for i, r in enumerate(reports)
            ]
            return RetrievalResult(model_version=MOCK_MODEL_VERSION, results=results)
        finally:
            db.close()

    def index_report(self, report, image, replace: bool = False) -> dict:
        return {"status": "added", "duplicate_of": [], "model_version": MOCK_MODEL_VERSION}

    def remove_report(self, item_instance_id: str) -> dict:
        return {"status": "success", "item_id": item_instance_id, "model_version": MOCK_MODEL_VERSION}

    def list_indexed(self):
        return MOCK_MODEL_VERSION, set()

    def health(self) -> dict:
        return {"status": "ready", "model_version": MOCK_MODEL_VERSION, "service": "mock"}


class RealRetrievalService(RetrievalService):
    """HTTP client for the inference service (src/app/main.py).

    ``http`` defaults to the ``requests`` module; tests inject a FastAPI TestClient.
    """

    def __init__(self, ml_url: Optional[str] = None, http=None, timeout: float = 60):
        self.ml_url = (ml_url or settings.ML_SERVICE_URL).rstrip("/")
        if http is None:
            import requests
            http = requests
        self.http = http
        self.timeout = timeout
        self.model_version = UNKNOWN_MODEL_VERSION

    def _remember_version(self, payload: dict):
        if payload.get("model_version"):
            self.model_version = payload["model_version"]

    def index_report(self, report, image: Union[str, bytes], replace: bool = False) -> dict:
        data_bytes = image if isinstance(image, (bytes, bytearray)) else decode_data_url(image)
        if not data_bytes:
            raise ValueError("Report has no decodable image")
        files = {"file": ("upload.jpg", io.BytesIO(bytes(data_bytes)), "image/jpeg")}
        data = {"item_id": report.item_instance_id}
        if replace:
            data["replace"] = "true"
        if report.item_category:
            data["category"] = report.item_category
        resp = self.http.post(f"{self.ml_url}/api/add", files=files, data=data, timeout=self.timeout)
        resp.raise_for_status()
        payload = resp.json()
        self._remember_version(payload)
        return payload

    def remove_report(self, item_instance_id: str) -> dict:
        if not item_instance_id:
            return {"status": "skipped"}
        try:
            resp = self.http.delete(f"{self.ml_url}/api/items/{item_instance_id}", timeout=self.timeout)
            if resp.status_code == 404:
                return {"status": "not_found", "item_id": item_instance_id}
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            return {"status": "error", "item_id": item_instance_id, "detail": str(e)}

    def list_indexed(self):
        resp = self.http.get(f"{self.ml_url}/api/items", timeout=self.timeout)
        resp.raise_for_status()
        payload = resp.json()
        self._remember_version(payload)
        return payload["model_version"], set(payload["item_ids"])

    def list_indexed_detail(self):
        resp = self.http.get(f"{self.ml_url}/api/items", timeout=self.timeout)
        resp.raise_for_status()
        payload = resp.json()
        self._remember_version(payload)
        items = payload.get("items")
        if items is None:  # older ML service: ids only
            return payload["model_version"], {i: {"sha256": [], "category": None} for i in payload["item_ids"]}
        return payload["model_version"], {
            it["item_id"]: {"sha256": list(it.get("sha256") or []), "category": it.get("category")}
            for it in items}

    def health(self) -> dict:
        resp = self.http.get(f"{self.ml_url}/api/health", timeout=10)
        resp.raise_for_status()
        payload = resp.json()
        self._remember_version(payload)
        return payload

    def search(self, query: RetrievalQuery, allowed_ids: Optional[list] = None) -> RetrievalResult:
        import json
        files = {}
        img_bytes = decode_data_url(query.image)
        if query.image and not img_bytes:
            raise QueryRejected("INVALID_IMAGE", "The query image must be a base64 data:image URL.")
        if img_bytes:
            files["file"] = ("query.jpg", io.BytesIO(img_bytes), "image/jpeg")
        data = {"top_k": str(query.top_k)}
        if query.text:
            data["text"] = query.text
        if allowed_ids is not None:
            data["allowed_ids"] = json.dumps(sorted(allowed_ids))
        if not files and not query.text:
            raise ValueError("RealRetrievalService requires an image or text query.")

        try:
            resp = self.http.post(f"{self.ml_url}/api/search", files=files, data=data, timeout=self.timeout)
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with ML Service: {str(e)}")
        if resp.status_code in (400, 413):
            try:
                detail = resp.json().get("detail")
            except Exception:
                detail = None
            if isinstance(detail, dict):
                raise QueryRejected(detail.get("code", "INVALID_QUERY"), detail.get("message", "Invalid query"))
            raise QueryRejected("INVALID_QUERY", str(detail or "Invalid query"))
        try:
            resp.raise_for_status()
            ml_data = resp.json()
        except Exception as e:
            raise RuntimeError(f"Failed to communicate with ML Service: {str(e)}")

        self._remember_version(ml_data)
        results = [
            RetrievalResultItem(item_instance_id=res["item_instance_id"],
                                similarity_score=round(res["similarity_score"], 4), rank=res["rank"],
                                decision=res.get("decision"), visual_score=res.get("visual_score"),
                                text_score=res.get("text_score"))
            for res in ml_data.get("results", [])
        ]
        return RetrievalResult(model_version=ml_data.get("model_version", UNKNOWN_MODEL_VERSION),
                               results=results, status=ml_data.get("status", "OK"),
                               mode=ml_data.get("mode"), perception=ml_data.get("perception"))
