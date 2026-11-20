"""Regression tests for the end-to-end pipeline repair (M1, M2, M3, M4, M8, M9).

The backend talks to the real ML FastAPI app through a TestClient. Only the neural networks are
faked (tests/ml/fakes.py); GalleryStore, HTTP plumbing, matching rules, sync and privacy are real.
All data lives in the isolated test database (tests/api/conftest.py) and a tmp gallery —
never in app.db or data/gallery.
"""
import base64
import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import src.app.main as ml
from scripts.run_inference import FinalInferencePipeline
from src.api import models
from src.api.auth import get_admin_user, get_current_user, get_optional_user
from src.api.config import settings
from src.api.database import SessionLocal
from src.api.main import app
from src.api.routers import retrieval as retrieval_router
from src.api.services import matching
from src.api.services.index_sync import plan_sync, sync_reports_to_index
from src.api.services.privacy import BLUR_PREFIX
from src.api.services.retrieval_service import RealRetrievalService
from tests.ml.fakes import CosineReranker, FakeModels, make_image, to_jpeg_bytes

API = settings.API_V1_STR


# ----------------------------------------------------------------------------- fixtures
def _user(uid, admin=False):
    db = SessionLocal()
    u = db.query(models.User).filter(models.User.id == uid).first()
    if not u:
        u = models.User(id=uid, firebase_uid=f"fb_{uid}", email=f"{uid}@example.com",
                        is_admin="true" if admin else "false")
        db.add(u)
        db.commit()
        db.refresh(u)
    db.close()
    return u


class Actor:
    """Which user the API thinks is calling. Tests switch it with ``acting.as_(...)``."""

    def __init__(self):
        self.user = _user("pr_finder")

    def as_(self, uid, admin=False):
        self.user = _user(uid, admin)
        return self


def _data_url(seed=None, img=None):
    img = img if img is not None else make_image((400, 300), seed=seed)
    return "data:image/png;base64," + base64.b64encode(to_jpeg_bytes(img)).decode()


@pytest.fixture
def stack(tmp_path, monkeypatch):
    monkeypatch.setattr(ml, "QUERY_DIR", tmp_path / "queries")
    fake = FakeModels()
    fake.reranker = CosineReranker()
    pipe = FinalInferencePipeline(models=fake, store_dir=tmp_path / "gallery")
    monkeypatch.setattr(ml, "pipeline", pipe)
    monkeypatch.setenv("AUTO_MATCH_MIN_SCORE", "0.95")
    monkeypatch.setenv("REPORT_IMAGE_ROOTS", str(tmp_path / "public"))
    ml_client = TestClient(ml.app)
    service = RealRetrievalService(ml_url="http://testserver", http=ml_client)
    actor = Actor()
    prev_service = retrieval_router.get_retrieval_service()
    prev_overrides = dict(app.dependency_overrides)
    retrieval_router.set_retrieval_service(service)
    app.dependency_overrides[get_current_user] = lambda: actor.user
    app.dependency_overrides[get_optional_user] = lambda: actor.user
    app.dependency_overrides[get_admin_user] = lambda: _user("pr_staff", admin=True)
    # isolate from reports created by other test modules in the shared test DB
    db = SessionLocal()
    db.query(models.Report).filter(models.Report.status == "open").update({"status": "closed"})
    db.commit()
    db.close()
    try:
        yield {"api": TestClient(app), "ml": ml_client, "service": service, "fake": fake,
               "pipe": pipe, "actor": actor, "tmp": tmp_path}
    finally:
        retrieval_router.set_retrieval_service(prev_service)
        app.dependency_overrides.clear()
        app.dependency_overrides.update(prev_overrides)


def _create(s, report_type, image=None, category="laptop", user="pr_finder", description=None):
    s["actor"].as_(user)
    r = s["api"].post(f"{API}/reports", json={
        "report_type": report_type, "item_category": category, "description": description,
        "image_reference": image, "location": "Library"})
    assert r.status_code == 201, r.text
    return r.json()


def _search(s, image=None, text=None, query_type="lost", **kw):
    r = s["api"].post(f"{API}/retrieval/search", json={"image": image, "text": text, "top_k": 10,
                                                       "query_type": query_type, **kw})
    assert r.status_code == 200, r.text
    return r.json()


def _matches_for(report_id):
    db = SessionLocal()
    rows = db.query(models.CandidateMatch).filter(
        (models.CandidateMatch.lost_report_id == report_id) | (models.CandidateMatch.found_report_id == report_id)).all()
    out = [(m.lost_report_id, m.found_report_id, m.similarity_score) for m in rows]
    db.close()
    return out


def _set_status(report_id, status):
    db = SessionLocal()
    db.query(models.Report).filter(models.Report.report_id == report_id).update({"status": status})
    db.commit()
    db.close()


# ----------------------------------------------------------------------------- M2 directions
def test_matching_direction_rules_unit():
    assert matching.target_type_for("lost") == "found"
    assert matching.target_type_for("found") == "lost"
    with pytest.raises(matching.InvalidQueryType):
        matching.target_type_for("stolen")
    r = models.Report(report_id="r1", report_type="found", status="open", item_instance_id="i1")
    assert matching.is_eligible_target(r, "lost")
    assert not matching.is_eligible_target(r, "found")                      # same type
    assert not matching.is_eligible_target(r, "lost", exclude_report_id="r1")  # self
    r.status = "resolved"
    assert not matching.is_eligible_target(r, "lost")                       # inactive
    assert not matching.is_eligible_target(None, "lost")                    # deleted
    r.status, r.item_instance_id = "open", None
    assert not matching.is_eligible_target(r, "lost")                       # never indexed


def test_lost_search_returns_only_open_found_reports(stack):
    img = _data_url(101)
    found = _create(stack, "found", img)
    lost = _create(stack, "lost", img, user="pr_owner")
    resolved_found = _create(stack, "found", _data_url(102))
    _set_status(resolved_found["report_id"], "resolved")

    res = _search(stack, image=img, query_type="lost")
    ids = [x["report_id"] for x in res["results"]]
    assert found["report_id"] in ids
    assert lost["report_id"] not in ids                   # same type never returned
    assert resolved_found["report_id"] not in ids         # inactive never returned
    assert all(x["report_type"] == "found" and x["status"] == "open" for x in res["results"])


def test_found_query_returns_only_open_lost_and_never_itself(stack):
    img = _data_url(111)
    lost = _create(stack, "lost", img, user="pr_owner")
    found = _create(stack, "found", img)
    res = _search(stack, image=img, query_type="found", exclude_report_id=found["report_id"])
    ids = [x["report_id"] for x in res["results"]]
    assert ids and ids[0] == lost["report_id"]
    assert found["report_id"] not in ids
    assert all(x["report_type"] == "lost" for x in res["results"])


def test_ineligible_items_cannot_crowd_out_eligible_ones(stack):
    """Restriction happens before ranking: 12 near-identical lost reports cannot hide a found one."""
    target = make_image((400, 300), seed=121)
    for i in range(12):
        _create(stack, "lost", _data_url(img=target), user="pr_owner")
    found = _create(stack, "found", _data_url(122))
    res = _search(stack, image=_data_url(img=target), query_type="lost")
    assert [x["report_id"] for x in res["results"]] == [found["report_id"]]


def test_search_with_no_eligible_reports_says_so(stack):
    _create(stack, "lost", _data_url(131), user="pr_owner")
    res = _search(stack, image=_data_url(131), query_type="lost")
    assert res["status"] == "NO_ELIGIBLE_ITEMS" and res["results"] == [] and res["message"]


def test_deleted_report_disappears_from_search_and_gallery(stack):
    img = _data_url(141)
    found = _create(stack, "found", img)
    stack["actor"].as_("pr_finder")
    assert stack["api"].delete(f"{API}/reports/{found['report_id']}").status_code == 204
    assert found["item_instance_id"] not in stack["ml"].get("/api/items").json()["item_ids"]
    res = _search(stack, image=img)
    assert found["report_id"] not in [x["report_id"] for x in res["results"]]


# ----------------------------------------------------------------------------- M3 auto-match
def test_new_found_report_auto_matches_open_lost_reports_only_above_threshold(stack):
    same = make_image((400, 300), seed=151)
    lost_match = _create(stack, "lost", _data_url(img=same), user="pr_owner")
    different = make_image((400, 300), box=[0, 0, 200, 300], color=(0, 0, 0))
    lost_other = _create(stack, "lost", _data_url(img=different), user="pr_owner")  # different photo
    found_peer = _create(stack, "found", _data_url(img=same), user="pr_other")  # same type
    found = _create(stack, "found", _data_url(img=same))

    pairs = _matches_for(found["report_id"])
    assert (lost_match["report_id"], found["report_id"]) in [(a, b) for a, b, _ in pairs]
    assert all(b == found["report_id"] for _, b, _ in pairs)            # found side is the new report
    assert lost_other["report_id"] not in [a for a, _, _ in pairs]      # below threshold
    assert found_peer["report_id"] not in [a for a, _, _ in pairs]      # never same-type
    assert all(score >= 0.95 for _, _, score in pairs)


def test_new_lost_report_auto_matches_found_and_respects_threshold_env(stack, monkeypatch):
    same = make_image((400, 300), seed=161)
    found = _create(stack, "found", _data_url(img=same))
    monkeypatch.setenv("AUTO_MATCH_MIN_SCORE", "1.01")  # impossible → no automatic match
    lost = _create(stack, "lost", _data_url(img=same), user="pr_owner")
    assert _matches_for(lost["report_id"]) == []
    monkeypatch.setenv("AUTO_MATCH_MIN_SCORE", "0.95")
    lost2 = _create(stack, "lost", _data_url(img=same), user="pr_owner")
    assert [(a, b) for a, b, _ in _matches_for(lost2["report_id"])] == [(lost2["report_id"], found["report_id"])]


def test_text_only_reports_never_auto_match(stack):
    _create(stack, "found", _data_url(171), description="black laptop with stickers")
    lost = _create(stack, "lost", None, description="black laptop with stickers", user="pr_owner")
    assert _matches_for(lost["report_id"]) == []


def test_should_auto_match_policy_unit():
    p = matching.AutoMatchPolicy(0.9, "test")
    assert matching.should_auto_match(0.95, "candidate", "image", "SUPPORTED", p)
    assert not matching.should_auto_match(0.85, "candidate", "image", "SUPPORTED", p)
    assert not matching.should_auto_match(0.99, "review", "image", "SUPPORTED", p)
    assert not matching.should_auto_match(0.99, "candidate", "text_only", None, p)
    assert not matching.should_auto_match(0.99, "candidate", "image", "UNCERTAIN", p)
    assert not matching.should_auto_match(0.99, "candidate", "image", "UNSUPPORTED_ITEM", p)


# ----------------------------------------------------------------------------- M4 open-set
def test_unsupported_item_stops_retrieval_and_auto_match(stack):
    img = _data_url(181)
    lost = _create(stack, "lost", img, user="pr_owner")
    _create(stack, "found", img, user="pr_other")
    stack["fake"].gate_label = "backpack"
    res = _search(stack, image=img)
    assert res["status"] == "UNSUPPORTED_ITEM" and res["results"] == []
    assert res["perception"]["decision"] == "UNSUPPORTED_ITEM" and res["message"]
    found = _create(stack, "found", img)
    assert _matches_for(found["report_id"]) == []
    assert lost["report_id"] not in [a for a, _, _ in _matches_for(found["report_id"])]


def test_uncertain_item_is_searchable_but_never_auto_matched(stack):
    from src.inference.open_set import prompt_table
    labels = prompt_table()[1]
    # laptop and mobile_phone tie → ambiguous → UNCERTAIN
    stack["fake"].gate_cos = [0.15 if l in ("laptop", "mobile_phone") else 0.0 for l in labels]
    img = _data_url(191)
    lost = _create(stack, "lost", img, user="pr_owner")
    res = _search(stack, image=img, query_type="found")
    assert res["perception"]["decision"] == "UNCERTAIN"
    assert res["results"] and all(x["decision"] != "candidate" for x in res["results"])
    found = _create(stack, "found", img)
    assert _matches_for(found["report_id"]) == []
    assert lost["report_id"] in [x["report_id"] for x in res["results"]]


def test_invalid_image_is_a_structured_400(stack):
    bad = "data:image/png;base64," + base64.b64encode(b"definitely not an image").decode()
    _create(stack, "found", _data_url(195))
    r = stack["api"].post(f"{API}/retrieval/search", json={"image": bad, "top_k": 3})
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "INVALID_IMAGE"
    assert "Traceback" not in r.text
    r = stack["api"].post(f"{API}/retrieval/search", json={"image": "not-a-data-url", "top_k": 3})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "INVALID_IMAGE"


def test_ml_outage_is_a_structured_503(stack):
    _create(stack, "found", _data_url(196))
    retrieval_router.set_retrieval_service(RealRetrievalService(ml_url="http://127.0.0.1:9", timeout=1))
    r = stack["api"].post(f"{API}/retrieval/search", json={"text": "laptop", "top_k": 3})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "ML_UNAVAILABLE"
    assert "127.0.0.1" not in r.text  # no internal details leak


# ----------------------------------------------------------------------------- M1 sync
def _sync(stack, **kw):
    db = SessionLocal()
    try:
        return sync_reports_to_index(db, stack["service"], **kw)
    finally:
        db.close()


def test_sync_removes_stale_and_orphan_entries_and_is_idempotent(stack):
    keep = _create(stack, "found", _data_url(201))
    resolved = _create(stack, "lost", _data_url(202), user="pr_owner")
    _set_status(resolved["report_id"], "resolved")
    orphan = to_jpeg_bytes(make_image((400, 300), seed=203))
    stack["ml"].post("/api/add", data={"item_id": "orphan_x"}, files={"file": ("o.png", orphan, "image/png")})

    dry = _sync(stack, dry_run=True)
    would = {x["item_id"] for x in dry["would_remove"]}
    assert {"orphan_x", resolved["item_instance_id"]} <= would
    assert "orphan_x" in stack["ml"].get("/api/items").json()["item_ids"]  # dry run changed nothing

    first = _sync(stack)
    items = set(stack["ml"].get("/api/items").json()["item_ids"])
    assert "orphan_x" not in items and resolved["item_instance_id"] not in items
    assert keep["item_instance_id"] in items
    second = _sync(stack)
    assert second["indexed"] == [] and second["replaced"] == [] and second["removed"] == []
    assert keep["report_id"] in second["already_indexed"]
    assert first["failed"] == [] and second["failed"] == []


def test_sync_replaces_entry_when_photo_changed(stack):
    rep = _create(stack, "found", _data_url(211))
    new_img = _data_url(212)
    db = SessionLocal()
    db.query(models.Report).filter(models.Report.report_id == rep["report_id"]).update({"image_reference": new_img})
    db.commit()
    plan = plan_sync(db, stack["service"])
    db.close()
    assert rep["report_id"] in [x["report_id"] for x in plan["to_replace"]]
    out = _sync(stack)
    assert rep["report_id"] in [x["report_id"] for x in out["replaced"]]
    detail = {i["item_id"]: i for i in stack["ml"].get("/api/items").json()["items"]}
    import hashlib
    assert detail[rep["item_instance_id"]]["sha256"] == [
        hashlib.sha256(base64.b64decode(new_img.split(",", 1)[1])).hexdigest()]


def test_sync_reports_missing_images_and_keeps_their_embeddings(stack):
    rep = _create(stack, "found", _data_url(221))
    db = SessionLocal()
    db.query(models.Report).filter(models.Report.report_id == rep["report_id"]).update(
        {"image_reference": "/mocks/gone.jpg"})
    db.commit()
    db.close()
    out = _sync(stack)
    assert {"report_id": rep["report_id"], "reason": "image_file_not_found"} in out["skipped"]
    assert rep["item_instance_id"] in stack["ml"].get("/api/items").json()["item_ids"]


def test_editing_report_photo_reindexes_with_replace(stack):
    rep = _create(stack, "found", _data_url(231))
    stack["actor"].as_("pr_finder")
    r = stack["api"].put(f"{API}/reports/{rep['report_id']}", json={
        "report_type": "found", "item_category": "laptop", "image_reference": _data_url(232), "location": "Lab"})
    assert r.status_code == 200, r.text
    detail = {i["item_id"]: i for i in stack["ml"].get("/api/items").json()["items"]}
    assert len(detail[rep["item_instance_id"]]["sha256"]) == 1   # old content replaced, not appended


# ----------------------------------------------------------------------------- M9 privacy
def _decode(ref):
    assert ref.startswith(BLUR_PREFIX + "data:image/jpeg;base64,")
    return Image.open(io.BytesIO(base64.b64decode(ref.split(",", 1)[1]))).convert("L")


def _sharpness(img):
    a = np.asarray(img, dtype=np.float32)
    return float(np.abs(np.diff(a, axis=0)).mean() + np.abs(np.diff(a, axis=1)).mean())


def test_found_photo_is_really_blurred_for_the_public(stack):
    original = _data_url(241)
    found = _create(stack, "found", original)
    stack["actor"].user = None  # anonymous
    for payload in (stack["api"].get(f"{API}/reports/{found['report_id']}").json(),
                    next(r for r in stack["api"].get(f"{API}/reports").json() if r["report_id"] == found["report_id"])):
        assert payload["image_blurred"] is True
        assert original.split(",", 1)[1] not in payload["image_reference"]
        sharp_orig = _sharpness(Image.open(io.BytesIO(base64.b64decode(original.split(",", 1)[1]))).convert("L").resize((320, 240)))
        assert _sharpness(_decode(payload["image_reference"])) < 0.15 * sharp_orig

    res = _search(stack, image=original)
    hit = next(x for x in res["results"] if x["report_id"] == found["report_id"])
    assert hit["image_blurred"] is True and original.split(",", 1)[1] not in hit["image_reference"]


def test_found_photo_original_only_for_owner_staff_and_approved_claimant(stack):
    original = _data_url(251)
    found = _create(stack, "found", original, user="pr_finder")
    url = f"{API}/reports/{found['report_id']}"

    stack["actor"].as_("pr_finder")
    assert stack["api"].get(url).json()["image_reference"] == original          # owner
    stack["actor"].as_("pr_staff", admin=True)
    assert stack["api"].get(url).json()["image_reference"] == original          # staff
    stack["actor"].as_("pr_claimant")
    assert stack["api"].get(url).json()["image_blurred"] is True                # stranger
    claim = stack["api"].post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "sticker"}).json()
    assert stack["api"].get(url).json()["image_blurred"] is True                # pending claim: still blurred
    assert stack["api"].patch(f"{API}/admin/claims/{claim['claim_id']}", json={"status": "approved"}).status_code == 200
    stack["actor"].as_("pr_claimant")
    assert stack["api"].get(url).json()["image_reference"] == original          # approved claimant


def test_lost_photos_are_not_blurred(stack):
    img = _data_url(261)
    lost = _create(stack, "lost", img, user="pr_owner")
    stack["actor"].user = None
    out = stack["api"].get(f"{API}/reports/{lost['report_id']}").json()
    assert out["image_reference"] == img and out["image_blurred"] is False


def test_matches_endpoint_blurs_found_photo_for_lost_owner(stack):
    same = make_image((400, 300), seed=271)
    found = _create(stack, "found", _data_url(img=same))
    lost = _create(stack, "lost", _data_url(img=same), user="pr_owner")
    stack["actor"].as_("pr_owner")
    rows = stack["api"].get(f"{API}/reports/{lost['report_id']}/matches").json()
    row = next(r for r in rows if r["report"]["report_id"] == found["report_id"])
    assert row["report"]["image_reference"].startswith(BLUR_PREFIX + "data:image/jpeg")


# ----------------------------------------------------------------------------- M8 workflow
def test_end_to_end_found_lost_automatch_claim_approve(stack):
    same = make_image((400, 300), seed=281)
    found = _create(stack, "found", _data_url(img=same), user="pr_finder")
    lost = _create(stack, "lost", _data_url(img=same), user="pr_owner")
    pairs = _matches_for(lost["report_id"])
    assert [(a, b) for a, b, _ in pairs] == [(lost["report_id"], found["report_id"])]

    api = stack["api"]
    stack["actor"].as_("pr_finder")
    r = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "mine"})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "OWN_REPORT"
    stack["actor"].as_("pr_owner")
    r = api.post(f"{API}/claims", json={"report_id": lost["report_id"], "proof_text": "x"})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "NOT_A_FOUND_REPORT"
    r = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "  "})
    assert r.status_code == 400 and r.json()["detail"]["code"] == "PROOF_REQUIRED"
    claim = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "Blue sticker on lid"})
    assert claim.status_code == 201, claim.text
    claim = claim.json()
    dup = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "again"})
    assert dup.status_code == 409 and dup.json()["detail"]["code"] == "DUPLICATE_CLAIM"
    stack["actor"].as_("pr_rival")
    rival = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "it's mine"}).json()

    # staff accept the candidate match, then approve the owner's claim
    match_id = next(m["match_id"] for m in api.get(f"{API}/admin/candidates?status=pending").json()
                    if m["found_report_id"] == found["report_id"])
    assert api.patch(f"{API}/admin/candidates/{match_id}", json={"status": "accepted"}).status_code == 200
    assert api.patch(f"{API}/admin/candidates/{match_id}", json={"status": "rejected"}).status_code == 409
    r = api.patch(f"{API}/admin/claims/{claim['claim_id']}", json={"status": "approved"})
    assert r.status_code == 200 and r.json()["report_status"] == "resolved"

    statuses = {c["claim_id"]: c["status"] for c in api.get(f"{API}/admin/claims").json()}
    assert statuses[claim["claim_id"]] == "approved"
    assert statuses[rival["claim_id"]] == "denied"                       # competing claim closed
    assert api.patch(f"{API}/admin/claims/{claim['claim_id']}", json={"status": "denied"}).status_code == 409
    assert found["item_instance_id"] not in stack["ml"].get("/api/items").json()["item_ids"]
    stack["actor"].as_("pr_late")
    late = api.post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "me"})
    assert late.status_code == 409 and late.json()["detail"]["code"] == "REPORT_NOT_OPEN"
    res = _search(stack, image=_data_url(img=same))
    assert found["report_id"] not in [x["report_id"] for x in res["results"]]


def test_staff_can_deny_a_claim_and_item_stays_open(stack):
    found = _create(stack, "found", _data_url(291))
    stack["actor"].as_("pr_claimant2")
    claim = stack["api"].post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "?"}).json()
    r = stack["api"].patch(f"{API}/admin/claims/{claim['claim_id']}", json={"status": "denied"})
    assert r.status_code == 200 and r.json()["report_status"] == "open"
    assert stack["api"].patch(f"{API}/admin/claims/{claim['claim_id']}",
                              json={"status": "bogus"}).status_code == 409
    # a denied claimant may try again with better proof
    again = stack["api"].post(f"{API}/claims", json={"report_id": found["report_id"], "proof_text": "serial 1234"})
    assert again.status_code == 201


# ----------------------------------------------------------------------------- errors / config
def test_unhandled_errors_are_structured_without_traceback(stack, monkeypatch):
    from src.api.routers import reports as reports_router
    monkeypatch.setattr(reports_router, "_public_report", lambda *a, **k: 1 / 0)
    _create(stack, "lost", _data_url(301), user="pr_owner")
    client = TestClient(app, raise_server_exceptions=False)
    r = client.get(f"{API}/reports")
    assert r.status_code == 500
    assert r.json() == {"detail": {"code": "INTERNAL_ERROR",
                                   "message": "Something went wrong on our side. Please try again."}}
    assert "ZeroDivision" not in r.text and "Traceback" not in r.text


def test_auto_match_policy_reads_calibrated_config(monkeypatch):
    import json
    from pathlib import Path
    monkeypatch.delenv("AUTO_MATCH_MIN_SCORE", raising=False)
    cfg = json.loads((Path(__file__).resolve().parents[2] / "configs/matching_thresholds.json").read_text())
    p = matching.AutoMatchPolicy.load()
    assert p.min_score == cfg["auto_match_min_score"] and p.source == "file:matching_thresholds.json"
    monkeypatch.setenv("AUTO_MATCH_MIN_SCORE", "0.97")
    assert matching.AutoMatchPolicy.load().min_score == 0.97


def test_sync_is_stable_when_two_reports_share_an_item_instance(stack):
    """Lost+found reports linked to one physical item with different photos must not thrash."""
    lost = _create(stack, "lost", _data_url(311), user="pr_owner")
    found = _create(stack, "found", _data_url(312))
    db = SessionLocal()
    db.query(models.Report).filter(models.Report.report_id == found["report_id"]).update(
        {"item_instance_id": lost["item_instance_id"]})
    db.commit()
    db.close()
    first = _sync(stack)
    assert first["failed"] == []
    detail = {i["item_id"]: i for i in stack["ml"].get("/api/items").json()["items"]}
    assert len(detail[lost["item_instance_id"]]["sha256"]) == 2
    second = _sync(stack)
    assert second["indexed"] == [] and second["replaced"] == [] and second["removed"] == []
