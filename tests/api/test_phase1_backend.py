"""Phase 1 backend tests: category normalisation, model version, duplicate flags, restart persistence.

The backend talks to the *real* ML FastAPI app (src/app/main.py) through a TestClient; only the
neural models are faked (tests/ml/fakes.py). The GalleryStore and all HTTP plumbing are real.
"""
import base64
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import src.app.main as ml
from scripts.run_inference import FinalInferencePipeline
from src.api import models
from src.api.auth import get_admin_user, get_current_user
from src.api.config import settings
from src.api.database import SessionLocal
from src.api.main import app
from src.api.routers import retrieval as retrieval_router
from src.api.services.index_sync import resolve_report_image, sync_reports_to_index
from src.api.services.retrieval_service import RealRetrievalService
from tests.ml.fakes import FakeModels, make_image, to_jpeg_bytes

ROOT = Path(__file__).resolve().parents[2]
API = settings.API_V1_STR
FAKE_VERSION = FakeModels.model_version


def _user(admin=False):
    db = SessionLocal()
    uid = "phase1_admin" if admin else "phase1_user"
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u:
        u = models.User(id=uid, firebase_uid=f"fb_{uid}", email=f"{uid}@example.com",
                        is_admin="true" if admin else "false")
        db.add(u)
        db.commit()
        db.refresh(u)
    db.close()
    return u


def _pipeline(store_dir, version=FAKE_VERSION):
    fake = FakeModels(detections=[{"label": "laptop", "score": 0.5, "box": [100, 75, 300, 225]}])
    fake.model_version = version
    return FinalInferencePipeline(models=fake, store_dir=store_dir)


def _data_url(seed):
    png = to_jpeg_bytes(make_image((400, 300), seed=seed))
    return "data:image/png;base64," + base64.b64encode(png).decode()


@pytest.fixture
def stack(tmp_path, monkeypatch):
    """Backend app wired to a real ML app instance with a persistent store in tmp_path."""
    monkeypatch.setattr(ml, "QUERY_DIR", tmp_path / "queries")
    monkeypatch.setattr(ml, "pipeline", _pipeline(tmp_path / "gallery"))
    ml_client = TestClient(ml.app)
    service = RealRetrievalService(ml_url="http://testserver", http=ml_client)

    previous_service = retrieval_router.get_retrieval_service()
    previous_overrides = dict(app.dependency_overrides)
    retrieval_router.set_retrieval_service(service)
    app.dependency_overrides[get_current_user] = lambda: _user()
    app.dependency_overrides[get_admin_user] = lambda: _user(admin=True)
    try:
        yield {"api": TestClient(app), "ml": ml_client, "service": service, "tmp": tmp_path}
    finally:
        retrieval_router.set_retrieval_service(previous_service)
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def _create(api, category, image=None, report_type="lost", attributes=None):
    body = {"report_type": report_type, "item_category": category, "description": "phase1 test",
            "image_reference": image, "location": "Library"}
    if attributes:
        body["attributes"] = attributes
    r = api.post(f"{API}/reports", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------- category normalisation
@pytest.mark.parametrize("raw,canonical,item_name", [
    ("Laptop", "laptop", None),
    ("laptop", "laptop", None),
    ("Black HP Victus Laptop", "laptop", "Black HP Victus Laptop"),
    ("Mobile Phone", "mobile_phone", None),
    ("AirPods", "earphones", "AirPods"),
    ("Backpack", None, "Backpack"),
])
def test_report_category_is_normalised_on_create(stack, raw, canonical, item_name):
    out = _create(stack["api"], raw)
    assert out["item_category"] == canonical
    assert (out["attributes"] or {}).get("item_name") == item_name


def test_report_category_is_normalised_on_update(stack):
    api = stack["api"]
    rep = _create(api, "Laptop", attributes={"color": "black"})
    r = api.put(f"{API}/reports/{rep['report_id']}", json={
        "report_type": "lost", "item_category": "Sony WH-1000XM4 Headphones", "location": "Lab"})
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["item_category"] == "headphones"
    assert out["attributes"] == {"color": "black", "item_name": "Sony WH-1000XM4 Headphones"}


def test_normalisation_script_on_historical_rows(tmp_path):
    db_file = tmp_path / "hist.db"
    from sqlalchemy import create_engine
    from src.api.database import Base
    Base.metadata.create_all(create_engine(f"sqlite:///{db_file}"))
    con = sqlite3.connect(db_file)
    rows = [("r1", "Laptop"), ("r2", "laptop"), ("r3", "Backpack"), ("r4", None), ("r5", "Mobile Phone")]
    con.executemany("insert into reports(report_id, report_type, item_category, status) values (?, 'lost', ?, 'open')", rows)
    con.commit()
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_file}"}
    script = [sys.executable, "scripts/normalize_report_categories.py"]

    dry = json.loads(subprocess.run(script, cwd=ROOT, env=env, capture_output=True, text=True, check=True).stdout)
    assert {c["report_id"] for c in dry["changed"]} == {"r1", "r5"}
    assert con.execute("select item_category from reports where report_id='r1'").fetchone()[0] == "Laptop"

    applied = json.loads(subprocess.run(script + ["--apply"], cwd=ROOT, env=env, capture_output=True, text=True, check=True).stdout)
    assert Path(applied["backup"]).exists()
    got = dict(con.execute("select report_id, item_category from reports").fetchall())
    assert got == {"r1": "laptop", "r2": "laptop", "r3": "Backpack", "r4": None, "r5": "mobile_phone"}
    assert applied["unmapped_left_unchanged"] == [{"report_id": "r3", "item_category": "Backpack"}]
    assert con.execute("select count(*) from reports").fetchone()[0] == 5  # nothing deleted
    con.close()


# ---------------------------------------------------------------- model version
def test_backend_reports_ml_model_version(stack):
    api = stack["api"]
    s = api.post(f"{API}/retrieval/search", json={"image": _data_url(1), "top_k": 3})
    assert s.status_code == 200, s.text
    assert s.json()["model_version"] == FAKE_VERSION
    h = api.get(f"{API}/retrieval/health").json()
    assert h["model_version"] == FAKE_VERSION and h["status"] == "ready"
    assert "mir-siamese" not in s.text and "mir-v0.4.0" not in json.dumps(h)


def test_health_reports_unavailable_when_ml_down(stack):
    retrieval_router.set_retrieval_service(RealRetrievalService(ml_url="http://127.0.0.1:9", timeout=1))
    h = stack["api"].get(f"{API}/retrieval/health").json()
    assert h["status"] == "unavailable"


# ---------------------------------------------------------------- indexing + duplicates
def test_created_report_is_indexed_and_recorded(stack):
    rep = _create(stack["api"], "laptop", image=_data_url(10))
    assert rep["item_instance_id"] in stack["ml"].get("/api/items").json()["item_ids"]
    db = SessionLocal()
    rows = db.query(models.ReportEmbedding).filter(models.ReportEmbedding.report_id == rep["report_id"]).all()
    db.close()
    assert [r.model_version for r in rows] == [FAKE_VERSION]


def test_duplicate_image_upload_is_flagged(stack):
    api = stack["api"]
    img = _data_url(11)
    first = _create(api, "wallet", image=img, report_type="found")
    second = _create(api, "wallet", image=img, report_type="found")
    stored = api.get(f"{API}/reports/{second['report_id']}").json()
    assert stored["attributes"]["duplicate_image_of_items"] == [first["item_instance_id"]]
    assert "duplicate_image_of_items" not in (api.get(f"{API}/reports/{first['report_id']}").json()["attributes"] or {})


# ---------------------------------------------------------------- restart persistence
def test_reports_survive_ml_and_backend_restart(stack, monkeypatch):
    api, tmp = stack["api"], stack["tmp"]
    reps = [_create(api, "laptop", image=_data_url(20 + i), report_type="found") for i in range(3)]
    ids = {r["item_instance_id"] for r in reps}

    # 1) ML service restarts with its persistent store → nothing lost, nothing re-embedded
    monkeypatch.setattr(ml, "pipeline", _pipeline(tmp / "gallery"))
    assert ids <= set(stack["ml"].get("/api/items").json()["item_ids"])

    # 2) backend restarts: new service object + startup sync → all already indexed
    db = SessionLocal()
    summary = sync_reports_to_index(db, RealRetrievalService(ml_url="http://testserver", http=stack["ml"]))
    db.close()
    assert {r["report_id"] for r in reps} <= set(summary["already_indexed"])
    assert not any(i["report_id"] in {r["report_id"] for r in reps} for i in summary["indexed"])

    # 3) search after restarts still finds the exact item
    s = api.post(f"{API}/retrieval/search", json={"image": _data_url(21), "top_k": 1}).json()
    assert s["results"][0]["item_instance_id"] == reps[1]["item_instance_id"]


def test_lost_or_incompatible_gallery_is_rebuilt_from_db(stack, monkeypatch):
    api, tmp = stack["api"], stack["tmp"]
    reps = [_create(api, "keys", image=_data_url(40 + i)) for i in range(2)]

    # ML restarts with a different model version → old store quarantined, starts empty
    monkeypatch.setattr(ml, "pipeline", _pipeline(tmp / "gallery", version="fake-v2"))
    health = stack["ml"].get("/api/health").json()
    assert health["gallery"]["entries"] == 0 and health["gallery"]["quarantined_to"]
    assert Path(health["gallery"]["quarantined_to"], "manifest.json").exists()

    r = api.post(f"{API}/admin/reindex")
    assert r.status_code == 200, r.text
    summary = r.json()
    assert summary["model_version"] == "fake-v2"
    assert {r_["report_id"] for r_ in reps} <= {i["report_id"] for i in summary["indexed"]}
    items = set(stack["ml"].get("/api/items").json()["item_ids"])
    assert {r_["item_instance_id"] for r_ in reps} <= items
    # reports themselves untouched
    for r_ in reps:
        assert api.get(f"{API}/reports/{r_['report_id']}").status_code == 200


def test_unindexable_reports_are_reported_not_dropped(stack):
    api = stack["api"]
    missing = _create(api, "book", image="/mocks/does_not_exist.jpg")
    no_image = _create(api, "book")
    db = SessionLocal()
    summary = sync_reports_to_index(db, stack["service"], image_roots=[stack["tmp"]])
    db.close()
    reasons = {s["report_id"]: s["reason"] for s in summary["skipped"]}
    assert reasons[missing["report_id"]] == "image_file_not_found"
    assert reasons[no_image["report_id"]] == "no_image_reference"
    listed = {r["report_id"] for r in api.get(f"{API}/reports").json()}
    assert {missing["report_id"], no_image["report_id"]} <= listed


def test_local_image_resolution_blocks_path_traversal(tmp_path):
    root = tmp_path / "public"
    (root / "mocks").mkdir(parents=True)
    (root / "mocks" / "a.jpg").write_bytes(b"img")
    (tmp_path / "secret.txt").write_text("nope")
    assert resolve_report_image("/mocks/a.jpg", [root])[0] == b"img"
    assert resolve_report_image("/../secret.txt", [root]) == (None, "image_file_not_found")
    assert resolve_report_image("https://x/y.jpg", [root]) == (None, "remote_url_not_fetched")
    assert resolve_report_image("data:image/png;base64,!!!", [root])[1] in {"invalid_data_url", "data_url"}


# ---------------------------------------------------------------- demo-path fixes (2026-11-04)
def test_text_only_search_through_backend(stack):
    rep = _create(stack["api"], "laptop", image=_data_url(30), report_type="found")
    r = stack["api"].post(f"{API}/retrieval/search", json={"text": "black laptop", "top_k": 5})
    assert r.status_code == 200, r.text
    ids = [x["item_instance_id"] for x in r.json()["results"]]
    assert rep["item_instance_id"] in ids


def test_search_skips_gallery_items_without_a_report(stack):
    rep = _create(stack["api"], "laptop", image=_data_url(31), report_type="found")
    orphan = base64.b64decode(_data_url(32).split(",", 1)[1])
    stack["ml"].post("/api/add", data={"item_id": "orphan_item", "category": "laptop"},
                     files={"file": ("o.jpg", orphan, "image/jpeg")})
    r = stack["api"].post(f"{API}/retrieval/search", json={"image": _data_url(32), "top_k": 5})
    assert r.status_code == 200, r.text
    results = r.json()["results"]
    assert "orphan_item" not in [x["item_instance_id"] for x in results]
    assert rep["item_instance_id"] in [x["item_instance_id"] for x in results]
    assert [x["rank"] for x in results] == list(range(1, len(results) + 1))


def test_heic_report_image_is_stored_as_jpeg_and_indexed(stack):
    pillow_heif = pytest.importorskip("pillow_heif")
    import io
    buf = io.BytesIO()
    pillow_heif.from_pillow(make_image((400, 300), seed=33)).save(buf, quality=90)
    heic = "data:image/heic;base64," + base64.b64encode(buf.getvalue()).decode()
    rep = _create(stack["api"], "mobile phone", image=heic)
    assert rep["image_reference"].startswith("data:image/jpeg;base64,")
    assert rep["item_instance_id"] in stack["ml"].get("/api/items").json()["item_ids"]
