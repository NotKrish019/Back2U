"""Load and validate a campus validation dataset before anything is evaluated.

Implements docs/campus_validation/EXECUTION_PLAN.md:
- §K-1 schema and consistency validation (configs/campus_validation/instance.schema.json);
- §K-2 look-alike pairs from explicit ``lookalike_of`` metadata (never from slot numbers or order);
- §K-5 duplicate and leakage detection (exact sha256; near-duplicates with the repository's existing
  dHash helper, src/evaluation/phase2/dataset_audit.py).

Layout (docs/campus_validation/PROTOCOL.md §3):

    <root>/<category>/<category>_<slot>/view_0{1..4}.<ext> + instance.json
    <root>/negatives/<name>.<ext>          optional unsupported objects (gate evaluation only)
    <root>/negatives/negatives.json        optional {"<file name>": {"type": "<free text>"}}
    <root>/_slates/<category>_<slot>.<ext> optional slate photos: never evaluated, only checked for
                                           exact duplicates against real views

IDs: object ``campus_val:<category>_<slot>``; image ``<object id>:view_0N``; negative
``campus_val:negative:<file stem>``. Messages contain only IDs, relative paths and field names —
never descriptions, pseudonyms or other free-text metadata.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from src.categories import CANONICAL_CATEGORIES
from src.evaluation.campus.schema import load_schema, validate

try:  # the schema allows .heic (iPhone originals); Pillow needs this plugin to decode them,
    # exactly as the production pipeline does (scripts/run_inference.py).
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:  # pragma: no cover - then .heic views are reported as unreadable_image
    HEIC_SUPPORTED = False
from src.evaluation.phase2.dataset_audit import NEAR_DUP_BITS, hamming, inspect_file

OWNER_VIEWS = ("view_01", "view_02")
FOUND_VIEWS = ("view_03", "view_04")
ALL_VIEWS = OWNER_VIEWS + FOUND_VIEWS
EXPECTED_ROLE = {"view_01": "owner", "view_02": "owner", "view_03": "found", "view_04": "found"}
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".heic")  # the schema's view-name pattern
SPECIAL_DIRS = {"negatives", "_slates"}
OBJECT_DIR = re.compile(r"^(?P<cat>[a-z_]+)_(?P<slot>0[1-4])$")

# Protocol completeness (PROTOCOL.md §2): 4 objects per category, 4 views per object,
# one look-alike pair per category.
PROTOCOL_OBJECTS_PER_CATEGORY = 4
PROTOCOL_PAIRS_PER_CATEGORY = 1

# exit codes of scripts/evaluation/campus_eval.py
STATUS_EXIT = {"OK": 0, "NOT_COLLECTED": 2, "INVALID": 3, "INCOMPLETE": 4}


def fold_of(slot: str) -> str:
    """Protocol §5 instance-level folds (fold_a = slots 01+03, fold_b = 02+04)."""
    return "fold_a" if slot in ("01", "03") else "fold_b"


@dataclass
class Issue:
    code: str
    message: str
    object: Optional[str] = None
    image: Optional[str] = None
    field: Optional[str] = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class DatasetReport:
    root: Path
    status: str = "OK"
    errors: list = field(default_factory=list)
    incomplete: list = field(default_factory=list)
    warnings: list = field(default_factory=list)
    objects: list = field(default_factory=list)       # evaluable objects (dicts)
    excluded: list = field(default_factory=list)      # object ids excluded (e.g. no consent)
    negatives: list = field(default_factory=list)     # [{"id", "path", "type"}]
    pairs: list = field(default_factory=list)         # [(id_a, id_b)] sorted, unique
    images: list = field(default_factory=list)        # inspected image records

    def error(self, *a, **k):
        self.errors.append(Issue(*a, **k))

    def gap(self, *a, **k):
        self.incomplete.append(Issue(*a, **k))

    def warn(self, *a, **k):
        self.warnings.append(Issue(*a, **k))

    def finalise(self) -> "DatasetReport":
        if not self.objects and not self.errors:
            self.status = "NOT_COLLECTED"
        elif self.errors:
            self.status = "INVALID"
        elif self.incomplete:
            self.status = "INCOMPLETE"
        else:
            self.status = "OK"
        return self

    def summary(self) -> dict:
        return {
            "status": self.status, "root": str(self.root),
            "objects_evaluable": len(self.objects), "objects_excluded": self.excluded,
            "negatives": len(self.negatives), "lookalike_pairs": [list(p) for p in self.pairs],
            "errors": [i.to_dict() for i in self.errors],
            "incomplete": [i.to_dict() for i in self.incomplete],
            "warnings": [i.to_dict() for i in self.warnings],
            "bbox_policy": "not enforced by campus_eval (bounding-box requirement is an open project-lead "
                           "decision, EXECUTION_PLAN §J-3); bbox_status counts reported for information",
            "bbox_status_counts": _bbox_counts(self.objects),
        }


def _bbox_counts(objects: list) -> dict:
    counts: dict = {}
    for o in objects:
        for v in o["view_meta"].values():
            s = v.get("bbox_status", "absent")
            counts[s] = counts.get(s, 0) + 1
    return counts


def _rel(root: Path, p: Path) -> str:
    try:
        return str(p.relative_to(root))
    except ValueError:
        return p.name


def _permitted(root_resolved: Path, p: Path) -> bool:
    """File must be a regular file whose real path stays inside the dataset root."""
    try:
        return p.is_file() and p.resolve().is_relative_to(root_resolved)
    except OSError:
        return False


def load_dataset(root: Path, allow_near_duplicates: bool = False) -> DatasetReport:
    root = Path(root)
    rep = DatasetReport(root=root)
    if not root.exists() or not root.is_dir():
        rep.gap("dataset_missing", f"dataset root {root} does not exist")
        rep.status = "NOT_COLLECTED"
        return rep
    root_res = root.resolve()
    schema = load_schema()

    candidates = []  # (meta, object_dir, cat_dir_name, slot)
    for entry in sorted(root.iterdir()):
        if entry.name.startswith(".") and entry.is_file():
            continue  # .DS_Store etc.
        if entry.is_file():
            if entry.suffix.lower() in IMAGE_EXTS + (".webp",):
                rep.error("stray_image", "image file outside any object folder", image=_rel(root, entry))
            continue
        if entry.name in SPECIAL_DIRS:
            continue
        if entry.name not in CANONICAL_CATEGORIES:
            rep.error("unknown_directory", f"top-level folder '{entry.name}' is not a supported category, "
                                           "'negatives' or '_slates'")
            continue
        for od in sorted(p for p in entry.iterdir() if p.is_dir()):
            m = OBJECT_DIR.match(od.name)
            if not m or m.group("cat") != entry.name:
                rep.error("bad_object_folder", f"folder '{_rel(root, od)}' must be named "
                                               f"'{entry.name}_0N' (N = 1..4)")
                continue
            meta_path = od / "instance.json"
            if not meta_path.is_file():
                rep.error("missing_instance_json", "instance.json missing", object=_rel(root, od))
                continue
            try:
                meta = json.loads(meta_path.read_text())
            except ValueError as e:
                rep.error("invalid_json", f"instance.json is not valid JSON (line {getattr(e, 'lineno', '?')})",
                          object=_rel(root, od))
                continue
            candidates.append((meta, od, entry.name, m.group("slot")))

    if not candidates and not rep.errors:
        if not any((root / d).is_dir() and any((root / d).iterdir()) for d in SPECIAL_DIRS):
            rep.gap("dataset_empty", f"no object folders with instance.json under {root}")
            rep.status = "NOT_COLLECTED"
            return rep

    seen_ids: dict = {}
    objects = []
    for meta, od, cat, slot in candidates:
        oid_folder = f"campus_val:{cat}_{slot}"
        errs = validate(meta, schema)
        for fld, msg in errs:
            rep.error("schema", msg, object=oid_folder, field=fld)
        if errs:
            continue
        oid = meta["physical_instance_id"]
        if oid in seen_ids:
            rep.error("duplicate_object_id", f"object id also used by folder {seen_ids[oid]}",
                      object=oid, field="physical_instance_id")
            continue
        seen_ids[oid] = _rel(root, od)
        if oid != oid_folder:
            rep.error("id_folder_mismatch", f"physical_instance_id does not match its folder ({oid_folder})",
                      object=oid, field="physical_instance_id")
            continue
        if meta["category"] != cat:
            rep.error("category_folder_mismatch", f"category '{meta['category']}' but stored under '{cat}/'",
                      object=oid, field="category")
            continue
        if not meta["consent"]["granted"] or meta["consent"].get("withdrawn_on"):
            rep.excluded.append(oid)
            rep.gap("consent_not_granted", "object excluded: consent not granted or withdrawn", object=oid)
            continue

        # ---- images listed in metadata vs files on disk
        views, view_meta = {}, {}
        listed_stems = {}
        for fname, vmeta in meta["views"].items():
            stem = Path(fname).stem
            img_id = f"{oid}:{stem}"
            if stem in listed_stems:
                rep.error("duplicate_image_id", f"image id listed twice ({listed_stems[stem]} and {fname})",
                          object=oid, image=img_id)
                continue
            listed_stems[stem] = fname
            p = od / fname
            if not p.exists():
                rep.error("missing_file", "listed in instance.json but the file does not exist",
                          object=oid, image=img_id, field=f"views.{fname}")
                continue
            if not _permitted(root_res, p):
                rep.error("file_not_permitted", "not a regular file inside the dataset root (symlink out?)",
                          object=oid, image=img_id)
                continue
            if vmeta["role"] != EXPECTED_ROLE[stem]:
                rep.error("role_contradicts_view", f"{stem} must have role '{EXPECTED_ROLE[stem]}' "
                                                   f"(PROTOCOL §2), metadata says '{vmeta['role']}'",
                          object=oid, image=img_id, field=f"views.{fname}.role")
                continue
            views[stem], view_meta[stem] = p, vmeta
        for f in sorted(od.iterdir()):
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS + (".webp",) and f.name not in meta["views"]:
                rep.error("unlisted_image", f"image file '{f.name}' is not listed in instance.json views",
                          object=oid)
        for v in ALL_VIEWS:
            if v not in views and not any(i.object == oid and i.image == f"{oid}:{v}" for i in rep.errors):
                rep.gap("missing_view", "protocol requires 4 views; this one is missing", object=oid,
                        image=f"{oid}:{v}")
        objects.append({"id": oid, "category": cat, "slot": slot, "fold": fold_of(slot), "dir": od,
                        "views": views, "view_meta": view_meta, "lookalike_of": meta.get("lookalike_of")})

    # ---- negatives
    neg_dir = root / "negatives"
    neg_types = {}
    if neg_dir.is_dir():
        nj = neg_dir / "negatives.json"
        if nj.exists():
            try:
                neg_types = json.loads(nj.read_text())
                if not isinstance(neg_types, dict) or not all(
                        isinstance(v, dict) and isinstance(v.get("type"), str) for v in neg_types.values()):
                    raise ValueError
            except ValueError:
                rep.error("negatives_metadata", 'negatives.json must map file name -> {"type": "<text>"}',
                          field="negatives/negatives.json")
                neg_types = {}
        files = sorted(p for p in neg_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS)
        for name in neg_types:
            if not (neg_dir / name).is_file():
                rep.error("missing_file", "listed in negatives.json but missing",
                          image=f"campus_val:negative:{Path(name).stem}")
        for p in files:
            nid = f"campus_val:negative:{p.stem}"
            if not _permitted(root_res, p):
                rep.error("file_not_permitted", "not a regular file inside the dataset root", image=nid)
                continue
            rep.negatives.append({"id": nid, "path": p, "type": (neg_types.get(p.name) or {}).get("type")})

    # ---- §K-2 look-alike pairs from metadata
    _pairs(rep, objects, seen_ids)

    # ---- readability + §K-5 duplicates (before any evaluation)
    _duplicates(rep, root, objects, allow_near_duplicates)

    # objects that cannot be evaluated at all
    for o in objects:
        has_owner = any(v in o["views"] for v in OWNER_VIEWS)
        has_found = any(v in o["views"] for v in FOUND_VIEWS)
        if not (has_owner and has_found):
            rep.gap("not_evaluable", "needs at least one owner view (01/02) and one found view (03/04)",
                    object=o["id"])
    rep.objects = [o for o in objects if any(v in o["views"] for v in OWNER_VIEWS)
                   and any(v in o["views"] for v in FOUND_VIEWS)]

    _completeness(rep, objects)
    return rep.finalise()


def _pairs(rep: DatasetReport, objects: list, all_ids: dict) -> None:
    by_id = {o["id"]: o for o in objects}
    edges: dict = {}  # frozenset -> list of declaring objects
    for o in objects:
        t = o["lookalike_of"]
        if t is None:
            continue
        if t == o["id"]:
            rep.error("lookalike_self", "lookalike_of points to the object itself", object=o["id"],
                      field="lookalike_of")
            continue
        if t not in all_ids:
            rep.error("lookalike_unknown", f"lookalike_of references unknown object {t}", object=o["id"],
                      field="lookalike_of")
            continue
        if t not in by_id:  # known but excluded (e.g. consent) -> pair cannot be evaluated
            rep.gap("lookalike_partner_excluded", f"look-alike partner {t} is excluded", object=o["id"])
            continue
        if by_id[t]["category"] != o["category"]:
            rep.error("lookalike_cross_category", "look-alike pairs must be within one category (PROTOCOL §2)",
                      object=o["id"], field="lookalike_of")
            continue
        edges.setdefault(frozenset((o["id"], t)), []).append(o["id"])
    member: dict = {}
    for pair, declared_by in edges.items():
        for x in pair:
            member.setdefault(x, set()).add(pair)
        if len(declared_by) == 1:
            a = declared_by[0]
            b = next(iter(pair - {a}))
            rep.warn("lookalike_one_sided", f"pair declared only by {a}; {b} has no reciprocal lookalike_of",
                     object=b)
    bad = {x for x, ps in member.items() if len(ps) > 1}
    for x in sorted(bad):
        rep.error("lookalike_contradiction", "object is declared in more than one look-alike pair", object=x)
    pairs = sorted(tuple(sorted(p)) for p in edges if not (set(p) & bad))
    rep.pairs = pairs
    for o in objects:
        o["twin"] = None
    for a, b in pairs:
        by_id[a]["twin"], by_id[b]["twin"] = b, a
        if by_id[a]["fold"] == by_id[b]["fold"]:
            rep.warn("lookalike_same_fold", "look-alike twins share a fold; protocol §5 intends different folds",
                     object=a)


def _duplicates(rep: DatasetReport, root: Path, objects: list, allow_near: bool) -> None:
    recs = []  # (kind, owner_id, image_id, role, path)
    for o in objects:
        for v, p in o["views"].items():
            recs.append(("view", o["id"], f"{o['id']}:{v}", EXPECTED_ROLE[v], p))
    for n in rep.negatives:
        recs.append(("negative", n["id"], n["id"], None, n["path"]))
    slates = root / "_slates"
    if slates.is_dir():
        for p in sorted(slates.iterdir()):
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS + (".webp",):
                recs.append(("slate", f"slate:{p.stem}", f"slate:{p.stem}", None, p))

    # same file referenced twice (symlinks / hard links to one file)
    real: dict = {}
    for r in recs:
        try:
            st = r[4].stat()  # follows symlinks; hard links share (device, inode)
        except OSError:
            continue
        real.setdefault((st.st_dev, st.st_ino), []).append(r)
    for path, rs in real.items():
        if len(rs) > 1:
            rep.error("same_file_referenced_twice", "one file is used for: " + ", ".join(x[2] for x in rs),
                      image=rs[0][2])

    infos = []
    for r in recs:
        info = inspect_file(r[4])
        if not info["readable"]:
            if r[0] != "slate":
                rep.error("unreadable_image", "file cannot be decoded as an image", object=r[1], image=r[2])
            continue
        infos.append((r, info))
        if r[0] == "view":
            rep.images.append({"image": r[2], "object": r[1], "sha256": info["sha256"],
                               "path": _rel(root, r[4])})

    by_sha: dict = {}
    for r, info in infos:
        by_sha.setdefault(info["sha256"], []).append(r)
    for sha, rs in by_sha.items():
        if len(rs) < 2:
            continue
        owners = sorted({x[1] for x in rs})
        where = "; ".join(f"{x[2]} ({_rel(root, x[4])})" for x in rs)
        if len(owners) > 1:
            rep.error("duplicate_across_objects", f"identical image content assigned to {owners}: {where}",
                      image=rs[0][2])
        else:
            rep.error("duplicate_within_object", f"identical image content reused: {where}", object=owners[0])

    # near-duplicates (dHash <= NEAR_DUP_BITS), slates excluded (slate cards look alike by design)
    near = [(r, i) for r, i in infos if r[0] != "slate" and "dhash" in i]
    for a in range(len(near)):
        for b in range(a + 1, len(near)):
            (ra, ia), (rb, ib) = near[a], near[b]
            if ia["sha256"] == ib["sha256"] or hamming(ia["dhash"], ib["dhash"]) > NEAR_DUP_BITS:
                continue
            msg = (f"near-duplicate images (dHash distance {hamming(ia['dhash'], ib['dhash'])} <= {NEAR_DUP_BITS}): "
                   f"{ra[2]} ({_rel(root, ra[4])}) and {rb[2]} ({_rel(root, rb[4])})")
            if ra[1] != rb[1]:
                code, severe = "near_duplicate_across_objects", True
            elif ra[3] != rb[3]:
                code, severe = "near_duplicate_owner_vs_found", True  # query/gallery leakage
            else:
                code, severe = "near_duplicate_same_role", False      # e.g. view_01 vs view_02, same desk
            if severe and not allow_near:
                rep.error(code, msg + " — review; pass --allow-near-duplicates only after a human confirms "
                                      "they are genuinely different photos", image=ra[2])
            else:
                rep.warn(code, msg, image=ra[2])


def _completeness(rep: DatasetReport, objects: list) -> None:
    per_cat: dict = {c: 0 for c in CANONICAL_CATEGORIES}
    for o in objects:
        per_cat[o["category"]] += 1
    excluded_cat: dict = {}
    for oid in rep.excluded:
        cat = oid.split(":", 1)[1].rsplit("_", 1)[0]
        excluded_cat[cat] = excluded_cat.get(cat, 0) + 1
    for c, n in per_cat.items():
        if n + excluded_cat.get(c, 0) < PROTOCOL_OBJECTS_PER_CATEGORY:
            rep.gap("category_short", f"{n} of {PROTOCOL_OBJECTS_PER_CATEGORY} protocol objects present",
                    field=f"category:{c}")
    pairs_cat: dict = {}
    for a, _ in rep.pairs:
        c = a.split(":", 1)[1].rsplit("_", 1)[0]
        pairs_cat[c] = pairs_cat.get(c, 0) + 1
    for c in CANONICAL_CATEGORIES:
        if pairs_cat.get(c, 0) != PROTOCOL_PAIRS_PER_CATEGORY:
            rep.gap("lookalike_pairs_short", f"{pairs_cat.get(c, 0)} look-alike pair(s) declared via "
                                             f"lookalike_of; protocol expects {PROTOCOL_PAIRS_PER_CATEGORY}",
                    field=f"category:{c}")
