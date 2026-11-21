"""§K-1 schema validation, §K-2 look-alike metadata, §K-5 duplicate detection (synthetic data only)."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from src.evaluation.campus import schema as S
from src.evaluation.campus.dataset import load_dataset
from tests.evaluation.campus_fixtures import (SECRET_DESCRIPTION, SECRET_PSEUDONYM, edit_meta, full_dataset,
                                              noise_png, write_object)

ROOT = Path(__file__).resolve().parents[2]


def codes(rep, kind="errors"):
    return [i.code for i in getattr(rep, kind)]


def obj(root, cat, slot):
    return root / cat / f"{cat}_{slot}"


# ============================================================================ K-1 schema
def test_valid_full_dataset_passes(tmp_path):
    rep = load_dataset(full_dataset(tmp_path))
    assert rep.status == "OK", rep.summary()
    assert len(rep.objects) == 28 and len(rep.pairs) == 7 and len(rep.negatives) == 2
    assert rep.errors == [] and rep.incomplete == []


def test_committed_template_matches_schema():
    tpl = json.loads((ROOT / "scripts/evaluation/templates/instance.template.json").read_text())
    assert S.validate(tpl, S.load_schema()) == []


def test_schema_interpreter_refuses_unknown_keywords():
    with pytest.raises(S.UnsupportedSchemaKeyword):
        S.check_supported({"type": "object", "oneOf": []})
    S.load_schema()  # the committed schema only uses supported keywords


@pytest.mark.parametrize("mutate,field", [
    (lambda m: m.pop("identity_basis"), "identity_basis"),                       # missing required field
    (lambda m: m["views"]["view_04.png"].update(clutter="yes"), "views.view_04.png.clutter"),  # bad type
    (lambda m: m["views"]["view_01.png"].update(viewpoint="sideways"), "views.view_01.png.viewpoint"),  # enum
    (lambda m: m["consent"].pop("form_version"), "consent.form_version"),
    (lambda m: m.update(collected_on="01/12/2026"), "collected_on"),
    (lambda m: m["views"]["view_01.png"].pop("role"), "views.view_01.png.role"),
])
def test_schema_violations_are_reported_with_field(tmp_path, mutate, field):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "wallet", "03"), mutate)
    rep = load_dataset(root)
    assert rep.status == "INVALID"
    hits = [i for i in rep.errors if i.code == "schema" and i.object == "campus_val:wallet_03"]
    assert any(i.field == field for i in hits), [i.to_dict() for i in hits]


def test_duplicate_object_ids_fail(tmp_path):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "keys", "02"), lambda m: m.update(physical_instance_id="campus_val:keys_01"))
    rep = load_dataset(root)
    assert rep.status == "INVALID" and "duplicate_object_id" in codes(rep)


def test_id_and_category_must_match_folder(tmp_path):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "book", "03"), lambda m: m.update(physical_instance_id="campus_val:book_04"))
    edit_meta(obj(root, "book", "02"), lambda m: m.update(category="wallet", physical_instance_id="campus_val:wallet_02"))
    rep = load_dataset(root)
    assert {"duplicate_object_id", "id_folder_mismatch"} & set(codes(rep))
    assert "category_folder_mismatch" in codes(rep) or "id_folder_mismatch" in codes(rep)


def test_missing_listed_file_fails(tmp_path):
    root = full_dataset(tmp_path)
    (obj(root, "laptop", "03") / "view_02.png").unlink()
    rep = load_dataset(root)
    assert rep.status == "INVALID"
    assert any(i.code == "missing_file" and i.image == "campus_val:laptop_03:view_02" for i in rep.errors)


def test_unlisted_image_and_duplicate_image_id_fail(tmp_path):
    root = full_dataset(tmp_path)
    (obj(root, "laptop", "04") / "view_05.png").write_bytes(noise_png(777))
    edit_meta(obj(root, "laptop", "01"), lambda m: m["views"].update({"view_01.jpg": dict(m["views"]["view_01.png"])}))
    (obj(root, "laptop", "01") / "view_01.jpg").write_bytes(noise_png(778))
    rep = load_dataset(root)
    assert "unlisted_image" in codes(rep) and "duplicate_image_id" in codes(rep)


def test_role_contradicting_view_number_fails(tmp_path):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "headphones", "03"), lambda m: m["views"]["view_03.png"].update(role="owner"))
    rep = load_dataset(root)
    assert "role_contradicts_view" in codes(rep)


def test_unknown_folders_and_stray_images_fail(tmp_path):
    root = full_dataset(tmp_path)
    (root / "backpack").mkdir()
    (root / "stray.png").write_bytes(noise_png(5))
    (root / "wallet" / "wallet_9").mkdir()
    rep = load_dataset(root)
    assert {"unknown_directory", "stray_image", "bad_object_folder"} <= set(codes(rep))


def test_symlink_escaping_the_dataset_is_not_permitted(tmp_path):
    root = full_dataset(tmp_path / "ds")
    outside = tmp_path / "outside.png"
    outside.write_bytes(noise_png(4242))
    target = obj(root, "earphones", "03") / "view_01.png"
    target.unlink()
    os.symlink(outside, target)
    rep = load_dataset(root)
    assert "file_not_permitted" in codes(rep)


def test_unreadable_image_fails(tmp_path):
    root = full_dataset(tmp_path)
    (obj(root, "book", "01") / "view_03.png").write_bytes(b"not an image")
    rep = load_dataset(root)
    assert any(i.code == "unreadable_image" and i.image == "campus_val:book_01:view_03" for i in rep.errors)


def test_incomplete_dataset_is_not_reported_ok(tmp_path):
    root = full_dataset(tmp_path)
    d = obj(root, "mobile_phone", "04")
    (d / "view_04.png").unlink()
    edit_meta(d, lambda m: m["views"].pop("view_04.png"))
    shutil.rmtree(obj(root, "keys", "03"))
    rep = load_dataset(root)
    assert rep.status == "INCOMPLETE"
    assert {"missing_view", "category_short"} <= set(codes(rep, "incomplete"))


def test_no_consent_excludes_object_and_marks_incomplete(tmp_path):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "wallet", "04"), lambda m: m["consent"].update(granted=False))
    rep = load_dataset(root)
    assert rep.status == "INCOMPLETE" and "campus_val:wallet_04" in rep.excluded
    assert "campus_val:wallet_04" not in [o["id"] for o in rep.objects]


def test_messages_never_contain_private_metadata(tmp_path):
    root = full_dataset(tmp_path)
    edit_meta(obj(root, "wallet", "03"), lambda m: m.pop("identity_basis"))
    (obj(root, "wallet", "04") / "view_01.png").write_bytes((obj(root, "wallet", "03") / "view_01.png").read_bytes())
    blob = json.dumps(load_dataset(root).summary())
    assert SECRET_DESCRIPTION not in blob and SECRET_PSEUDONYM not in blob


def test_missing_and_empty_dataset_are_not_collected(tmp_path):
    assert load_dataset(tmp_path / "nope").status == "NOT_COLLECTED"
    (tmp_path / "empty").mkdir()
    rep = load_dataset(tmp_path / "empty")
    assert rep.status == "NOT_COLLECTED" and "dataset_empty" in codes(rep, "incomplete")


@pytest.mark.parametrize("setup,expected", [("missing", 2), ("empty", 2), ("invalid", 3), ("incomplete", 4), ("ok", 0)])
def test_cli_exit_codes_without_loading_models(tmp_path, setup, expected):
    root = tmp_path / "ds"
    if setup == "empty":
        root.mkdir()
    elif setup != "missing":
        full_dataset(root)
        if setup == "invalid":
            edit_meta(obj(root, "keys", "01"), lambda m: m.pop("collected_by"))
        if setup == "incomplete":
            shutil.rmtree(obj(root, "keys", "04"))
    r = subprocess.run([sys.executable, "scripts/evaluation/campus_eval.py", "--root", str(root), "--validate-only"],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == expected, r.stdout + r.stderr
    status = json.loads(r.stdout)["status"]
    assert status == {2: "NOT_COLLECTED", 3: "INVALID", 4: "INCOMPLETE", 0: "OK"}[expected]


def test_cli_allow_incomplete_is_explicit(tmp_path):
    root = full_dataset(tmp_path / "ds")
    shutil.rmtree(obj(root, "keys", "04"))
    r = subprocess.run([sys.executable, "scripts/evaluation/campus_eval.py", "--root", str(root), "--validate-only",
                        "--allow-incomplete"], cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0 and json.loads(r.stdout)["status"] == "INCOMPLETE_ALLOWED"


@pytest.mark.parametrize("setup,expected", [("missing", 2), ("empty", 2)])
def test_protocol_checker_no_longer_exits_zero_when_blocked(tmp_path, monkeypatch, setup, expected):
    from scripts.evaluation import campus_validation_plan as P
    raw = tmp_path / "raw"
    if setup == "empty":
        raw.mkdir()
    monkeypatch.setattr(P, "RAW", raw)
    assert P.check() == expected


# ============================================================================ K-2 look-alikes
def _pairs_dataset(root, decl):
    """decl: {slot: target_slot or None} for the wallet category; other categories get a 01-02 pair."""
    full_dataset(root)
    for slot in ("01", "02", "03", "04"):
        t = decl.get(slot)
        edit_meta(obj(root, "wallet", slot),
                  lambda m, t=t: m.update(lookalike_of=f"campus_val:wallet_{t}" if t else None))
    return load_dataset(root)


def test_reciprocal_declaration_is_one_pair(tmp_path):
    rep = _pairs_dataset(tmp_path, {"01": "02", "02": "01"})
    wallet = [p for p in rep.pairs if "wallet" in p[0]]
    assert wallet == [("campus_val:wallet_01", "campus_val:wallet_02")]
    assert "lookalike_one_sided" not in codes(rep, "warnings")


def test_one_sided_declaration_is_accepted_with_warning(tmp_path):
    rep = _pairs_dataset(tmp_path, {"03": "01"})
    assert ("campus_val:wallet_01", "campus_val:wallet_03") in rep.pairs
    assert "lookalike_one_sided" in codes(rep, "warnings")


def test_pairs_come_from_metadata_not_slot_numbers(tmp_path):
    rep = _pairs_dataset(tmp_path, {"03": "04", "04": "03"})
    by = {o["id"]: o for o in rep.objects}
    assert by["campus_val:wallet_03"]["twin"] == "campus_val:wallet_04"
    assert by["campus_val:wallet_01"]["twin"] is None and by["campus_val:wallet_02"]["twin"] is None


def test_pairing_does_not_depend_on_creation_order_or_ids(tmp_path):
    a = _pairs_dataset(tmp_path / "a", {"02": "04", "04": "02"})
    # build a second copy, creating the wallet folders in reverse order
    b_root = tmp_path / "b"
    full_dataset(b_root)
    for slot in ("04", "03", "02", "01"):
        shutil.rmtree(obj(b_root, "wallet", slot))
    for k, slot in enumerate(("04", "03", "02", "01")):
        tw = {"02": "campus_val:wallet_04", "04": "campus_val:wallet_02"}.get(slot)
        write_object(b_root, "wallet", slot, 500 + k, lookalike_of=tw)
    b = load_dataset(b_root)
    assert [p for p in a.pairs if "wallet" in p[0]] == [p for p in b.pairs if "wallet" in p[0]] == \
        [("campus_val:wallet_02", "campus_val:wallet_04")]


def test_self_unknown_crosscategory_and_contradictory_pairs_fail(tmp_path):
    rep = _pairs_dataset(tmp_path / "self", {"01": "01"})
    assert "lookalike_self" in codes(rep) and rep.status == "INVALID"
    root = full_dataset(tmp_path / "unknown")
    edit_meta(obj(root, "keys", "03"), lambda m: m.update(lookalike_of="campus_val:keys_09"))
    assert "lookalike_unknown" in codes(load_dataset(root))
    root = full_dataset(tmp_path / "cross")
    edit_meta(obj(root, "keys", "03"), lambda m: m.update(lookalike_of="campus_val:book_03"))
    assert "lookalike_cross_category" in codes(load_dataset(root))
    rep = _pairs_dataset(tmp_path / "contra", {"01": "02", "03": "02"})
    assert "lookalike_contradiction" in codes(rep)
    assert not [p for p in rep.pairs if "wallet" in p[0]]


def test_missing_pairs_make_dataset_incomplete(tmp_path):
    rep = _pairs_dataset(tmp_path, {})
    assert rep.status == "INCOMPLETE"
    assert any(i.code == "lookalike_pairs_short" and i.field == "category:wallet" for i in rep.incomplete)


# ============================================================================ K-5 duplicates
def test_distinct_photos_same_and_different_objects_pass(tmp_path):
    rep = load_dataset(full_dataset(tmp_path))
    assert not [c for c in codes(rep) if "duplicate" in c]


def test_identical_content_copied_within_object_fails(tmp_path):
    root = full_dataset(tmp_path)
    d = obj(root, "laptop", "01")
    (d / "view_03.png").write_bytes((d / "view_01.png").read_bytes())  # owner photo reused as found photo
    rep = load_dataset(root)
    assert rep.status == "INVALID" and "duplicate_within_object" in codes(rep)


def test_duplicate_content_across_objects_fails_and_names_both(tmp_path):
    root = full_dataset(tmp_path)
    (obj(root, "laptop", "02") / "view_04.png").write_bytes((obj(root, "laptop", "01") / "view_04.png").read_bytes())
    rep = load_dataset(root)
    err = next(i for i in rep.errors if i.code == "duplicate_across_objects")
    assert "campus_val:laptop_01" in err.message and "campus_val:laptop_02" in err.message
    assert "laptop/laptop_01/view_04.png" in err.message and "laptop/laptop_02/view_04.png" in err.message


def test_same_file_referenced_twice_via_link_fails(tmp_path):
    root = full_dataset(tmp_path)
    d = obj(root, "keys", "02")
    (d / "view_02.png").unlink()
    os.symlink(d / "view_01.png", d / "view_02.png")
    rep = load_dataset(root)
    assert "same_file_referenced_twice" in codes(rep)


def test_negative_or_slate_identical_to_a_view_fails(tmp_path):
    root = full_dataset(tmp_path)
    view = (obj(root, "book", "02") / "view_01.png").read_bytes()
    (root / "negatives" / "neg_00.png").write_bytes(view)
    (root / "_slates").mkdir()
    (root / "_slates" / "book_03.png").write_bytes((obj(root, "book", "03") / "view_02.png").read_bytes())
    rep = load_dataset(root)
    msgs = " ".join(i.message for i in rep.errors if i.code == "duplicate_across_objects")
    assert "campus_val:negative:neg_00" in msgs and "slate:book_03" in msgs


def _near_copy(src: Path, dst: Path):
    from PIL import Image
    im = Image.open(src).convert("RGB")
    px = im.load()
    px[0, 0] = tuple((c + 1) % 256 for c in px[0, 0])  # different bytes, same dHash
    im.save(dst)


def test_near_duplicates_across_objects_and_roles_fail_unless_reviewed(tmp_path):
    root = full_dataset(tmp_path)
    _near_copy(obj(root, "wallet", "01") / "view_03.png", obj(root, "wallet", "02") / "view_03.png")
    _near_copy(obj(root, "keys", "01") / "view_01.png", obj(root, "keys", "01") / "view_04.png")
    rep = load_dataset(root)
    assert {"near_duplicate_across_objects", "near_duplicate_owner_vs_found"} <= set(codes(rep))
    reviewed = load_dataset(root, allow_near_duplicates=True)
    assert reviewed.status == "OK"
    assert {"near_duplicate_across_objects", "near_duplicate_owner_vs_found"} <= set(codes(reviewed, "warnings"))


def test_exact_duplicates_cannot_be_waived(tmp_path):
    root = full_dataset(tmp_path)
    (obj(root, "laptop", "02") / "view_04.png").write_bytes((obj(root, "laptop", "01") / "view_04.png").read_bytes())
    assert load_dataset(root, allow_near_duplicates=True).status == "INVALID"


def test_near_duplicate_same_role_same_object_is_only_a_warning(tmp_path):
    root = full_dataset(tmp_path)
    d = obj(root, "book", "04")
    _near_copy(d / "view_01.png", d / "view_02.png")
    rep = load_dataset(root)
    assert rep.status == "OK" and "near_duplicate_same_role" in codes(rep, "warnings")


# ============================================================================ HEIC (schema allows .heic)
def _heic_bytes(seed):
    pillow_heif = pytest.importorskip("pillow_heif")
    import io
    import numpy as np
    from PIL import Image
    buf = io.BytesIO()
    arr = np.random.default_rng(seed).integers(0, 255, (48, 64, 3), dtype=np.uint8)
    pillow_heif.from_pillow(Image.fromarray(arr)).save(buf, quality=90)
    return buf.getvalue()


def _use_heic(root, cat, slot, view, seed):
    d = obj(root, cat, slot)
    (d / f"{view}.png").unlink()
    (d / f"{view}.heic").write_bytes(_heic_bytes(seed))
    edit_meta(d, lambda m: m["views"].update({f"{view}.heic": m["views"].pop(f"{view}.png")}))


def test_heic_views_are_readable_in_validation(tmp_path):
    root = full_dataset(tmp_path / "ds")
    _use_heic(root, "mobile_phone", "02", "view_03", 70_031)
    r = subprocess.run([sys.executable, "scripts/evaluation/campus_eval.py", "--root", str(root), "--validate-only"],
                       cwd=ROOT, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout
    assert json.loads(r.stdout)["status"] == "OK"


def test_protocol_checker_reads_heic_views(tmp_path, monkeypatch):
    from scripts.evaluation import campus_validation_plan as P
    root = full_dataset(tmp_path / "ds")
    _use_heic(root, "mobile_phone", "02", "view_03", 70_032)
    monkeypatch.setattr(P, "RAW", root)
    from src.evaluation.phase2.dataset_audit import audit_instance
    P.check()  # registers the HEIC opener
    inst = audit_instance(obj(root, "mobile_phone", "02"))
    assert inst["unreadable_files"] == [] and inst["valid_genuine_views"] == 4
