"""Minimal JSON-Schema interpreter for configs/campus_validation/instance.schema.json (§K-1).

Why not the ``jsonschema`` package: it is not a declared project dependency. This interpreter
supports exactly the keywords the committed schema uses and **raises** on any other keyword, so
a future schema edit can never be silently ignored.
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = ROOT / "configs" / "campus_validation" / "instance.schema.json"

# keywords that only annotate
_ANNOTATIONS = {"$schema", "$id", "title", "description", "default"}
_SUPPORTED = _ANNOTATIONS | {"type", "required", "properties", "enum", "pattern", "format", "propertyNames",
                             "additionalProperties", "items", "minItems", "maxItems"}
_TYPES = {
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
    "string": lambda v: isinstance(v, str),
    "boolean": lambda v: isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "null": lambda v: v is None,
}


class UnsupportedSchemaKeyword(ValueError):
    pass


def load_schema(path: Path = SCHEMA_PATH) -> dict:
    schema = json.loads(Path(path).read_text())
    check_supported(schema)
    return schema


def check_supported(schema: Any, where: str = "$") -> None:
    if not isinstance(schema, dict):
        return
    unknown = set(schema) - _SUPPORTED
    if unknown:
        raise UnsupportedSchemaKeyword(f"{where}: unsupported schema keyword(s) {sorted(unknown)}")
    for key in ("properties",):
        for name, sub in (schema.get(key) or {}).items():
            check_supported(sub, f"{where}.{name}")
    for key in ("items", "propertyNames", "additionalProperties"):
        if isinstance(schema.get(key), dict):
            check_supported(schema[key], f"{where}.<{key}>")


def _type_ok(value, t) -> bool:
    types = t if isinstance(t, list) else [t]
    return any(_TYPES[x](value) for x in types)


def validate(value: Any, schema: dict, path: str = "") -> list[tuple[str, str]]:
    """Returns a list of (field_path, message). Empty list = valid."""
    errs: list[tuple[str, str]] = []
    field = path or "<root>"
    if "type" in schema and not _type_ok(value, schema["type"]):
        return [(field, f"expected type {schema['type']}, got {type(value).__name__}")]
    if "enum" in schema and value not in schema["enum"]:
        errs.append((field, f"value {value!r} not in allowed values {schema['enum']}"))
    if isinstance(value, str):
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errs.append((field, f"value {value!r} does not match pattern {schema['pattern']}"))
        if schema.get("format") == "date":
            try:
                date.fromisoformat(value)
            except ValueError:
                errs.append((field, f"value {value!r} is not a YYYY-MM-DD date"))
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errs.append((field, f"needs at least {schema['minItems']} items"))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errs.append((field, f"allows at most {schema['maxItems']} items"))
        if isinstance(schema.get("items"), dict):
            for i, item in enumerate(value):
                errs += validate(item, schema["items"], f"{path}[{i}]")
    if isinstance(value, dict):
        for req in schema.get("required", []):
            if req not in value:
                errs.append((f"{path}.{req}".lstrip("."), "required field missing"))
        props = schema.get("properties", {})
        for k, v in value.items():
            sub = f"{path}.{k}".lstrip(".")
            if "propertyNames" in schema:
                errs += [(sub, f"property name: {m}") for _, m in validate(k, schema["propertyNames"], sub)]
            if k in props:
                errs += validate(v, props[k], sub)
            elif isinstance(schema.get("additionalProperties"), dict):
                errs += validate(v, schema["additionalProperties"], sub)
            elif schema.get("additionalProperties") is False:
                errs.append((sub, "unexpected field"))
    return errs
