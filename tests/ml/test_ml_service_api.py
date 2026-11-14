"""ML inference service (src/app/main.py) API tests with fake models and a real GalleryStore."""
import hashlib
import io
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

import src.app.main as ml
from scripts.run_inference import FinalInferencePipeline
from tests.ml.fakes import FakeModels, make_image, to_jpeg_bytes

BOX = [100, 75, 300, 225]


def _pipeline(store_dir):
    return FinalInferencePipeline(
        models=FakeModels(detections=[{"label": "laptop", "score": 0.5, "box": BOX}]),
        store_dir=store_dir)


@pytest.fixture
def svc(tmp_path, monkeypatch):
    monkeypatch.setattr(ml, "QUERY_DIR", tmp_path / "queries")
    monkeypatch.setattr(ml, "pipeline", _pipeline(tmp_path / "gallery"))
    with TestClient(ml.app) as client:
        yield client, tmp_path


def _img(seed):
    return to_jpeg_bytes(make_image((400, 300), seed=seed))


def _upload(data, name="query_image.jpg"):
    return {"file": (name, io.BytesIO(data), "image/png")}


def test_concurrent_query_uploads_get_unique_files(svc):
    client, tmp = svc
    payloads = [_img(i) for i in range(20)]

    def send(data):
        r = client.post("/api/search", files=_upload(data))  # same client filename every time
        assert r.status_code == 200, r.text
        return data, r.json()

    with ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(send, payloads))

    files = sorted((tmp / "queries").glob("q_*.jpg"))
    assert len(files) == 20
    assert len({r["query_img"] for _, r in results}) == 20
    for data, r in results:
        saved = tmp / "queries" / r["query_img"].rsplit("/", 1)[1]
        assert saved.read_bytes() == data  # nobody overwrote anybody's upload
        assert r["query_sha256"] == hashlib.sha256(data).hexdigest()
    log_lines = (tmp / "queries" / "queries.jsonl").read_text().strip().splitlines()
    assert len(log_lines) == 20


def test_client_filename_cannot_escape_upload_dir(svc):
    client, tmp = svc
    r = client.post("/api/search", files=_upload(_img(1), name="../../../evil.jpg"))
    assert r.status_code == 200
    assert not (tmp / "evil.jpg").exists()
    assert r.json()["query_img"].startswith("/data/uploads/queries/q_")


def test_duplicate_upload_detection(svc):
    client, _ = svc
    x = _img(7)
    a1 = client.post("/api/add", data={"item_id": "item_a", "category": "Laptop"}, files=_upload(x)).json()
    a2 = client.post("/api/add", data={"item_id": "item_a", "category": "Laptop"}, files=_upload(x)).json()
    b = client.post("/api/add", data={"item_id": "item_b", "category": "laptop"}, files=_upload(x)).json()

    assert a1["status"] == "added" and a1["duplicate_of"] == [] and a1["category"] == "laptop"
    assert a2["status"] == "already_indexed"
    assert b["status"] == "added" and b["duplicate_of"] == ["item_a"]
    assert "Identical image already indexed for: item_a" in b["message"]
    assert client.get("/api/health").json()["gallery"]["entries"] == 2

    s = client.post("/api/search", files=_upload(x)).json()
    assert s["query_identical_to_items"] == ["item_a", "item_b"]


def test_model_version_is_reported_everywhere(svc):
    client, _ = svc
    v = FakeModels.model_version
    assert client.get("/api/health").json()["model_version"] == v
    assert client.get("/api/items").json()["model_version"] == v
    assert client.post("/api/search", files=_upload(_img(3))).json()["model_version"] == v
    add = client.post("/api/add", data={"item_id": "i"}, files=_upload(_img(3))).json()
    assert add["model_version"] == v


def test_invalid_uploads_are_rejected(svc):
    client, _ = svc
    assert client.post("/api/search", files=_upload(b"not an image")).status_code == 400
    assert client.post("/api/search", files=_upload(b"")).status_code == 400
    assert client.post("/api/add", data={"item_id": "i"}, files=_upload(b"junk")).status_code == 400


def test_gallery_survives_ml_service_restart(svc, monkeypatch):
    client, tmp = svc
    imgs = {f"item_{i}": _img(100 + i) for i in range(3)}
    for item_id, data in imgs.items():
        assert client.post("/api/add", data={"item_id": item_id}, files=_upload(data)).status_code == 200

    # simulated restart: brand-new pipeline object over the same store directory
    monkeypatch.setattr(ml, "pipeline", _pipeline(tmp / "gallery"))
    with TestClient(ml.app) as client2:
        assert client2.get("/api/items").json()["item_ids"] == sorted(imgs)
        top = client2.post("/api/search", files=_upload(imgs["item_1"])).json()["results"][0]
        assert top["item_instance_id"] == "item_1"
        assert top["similarity_score"] == pytest.approx(1.0, abs=1e-4)


def test_text_only_search_returns_review_matches(svc):
    client, _ = svc
    for i, item in enumerate(["item_a", "item_b"]):
        client.post("/api/add", data={"item_id": item, "category": "laptop"}, files=_upload(_img(20 + i)))
    r = client.post("/api/search", data={"text": "black laptop with stickers", "top_k": "5"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mode"] == "text_only" and body["query_img"] is None
    assert {m["item_instance_id"] for m in body["results"]} == {"item_a", "item_b"}
    assert all(m["decision"] == "review" and m["visual_score"] is None for m in body["results"])
    assert [m["rank"] for m in body["results"]] == [1, 2]


def test_search_without_image_or_text_is_rejected(svc):
    client, _ = svc
    assert client.post("/api/search", data={"top_k": "3"}).status_code == 400
    assert client.post("/api/search", data={"text": "   "}).status_code == 400


def test_heic_upload_is_indexed(svc):
    pillow_heif = pytest.importorskip("pillow_heif")
    client, _ = svc
    buf = io.BytesIO()
    pillow_heif.from_pillow(make_image((400, 300), seed=3)).save(buf, quality=90)
    r = client.post("/api/add", data={"item_id": "item_heic", "category": "phone"},
                    files={"file": ("IMG_0001.HEIC", io.BytesIO(buf.getvalue()), "image/heic")})
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "added"
