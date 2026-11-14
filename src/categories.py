"""Canonical item categories shared by the backend API and the ML inference service.

Phase 1 agreed set — do not add categories here without a product decision.
Anything that cannot be mapped to one of these labels normalizes to ``None``
(the caller decides whether to keep the raw text elsewhere).
"""
from __future__ import annotations

import re
from typing import Optional

CANONICAL_CATEGORIES: tuple[str, ...] = (
    "laptop",
    "mobile_phone",
    "wallet",
    "earphones",
    "headphones",
    "keys",
    "book",
)

# Natural-language phrase used in the Grounding DINO text prompt for each label.
DETECTOR_PHRASES: dict[str, str] = {
    "laptop": "laptop",
    "mobile_phone": "mobile phone",
    "wallet": "wallet",
    "earphones": "earphones",
    "headphones": "headphones",
    "keys": "keys",
    "book": "book",
}

# Whole-phrase aliases (after lowercasing and collapsing separators to single spaces).
_ALIASES: dict[str, str] = {
    # laptop
    "laptop": "laptop", "laptops": "laptop", "laptop computer": "laptop",
    "laptop_computer": "laptop", "notebook computer": "laptop", "macbook": "laptop",
    # mobile phone
    "mobile phone": "mobile_phone", "mobile phones": "mobile_phone", "mobile": "mobile_phone",
    "phone": "mobile_phone", "phones": "mobile_phone", "cell phone": "mobile_phone",
    "cellphone": "mobile_phone", "cellular telephone": "mobile_phone",
    "smartphone": "mobile_phone", "smart phone": "mobile_phone", "iphone": "mobile_phone",
    # wallet
    "wallet": "wallet", "wallets": "wallet",
    # earphones
    "earphones": "earphones", "earphone": "earphones", "earbuds": "earphones",
    "earbud": "earphones", "airpods": "earphones", "in ear headphones": "earphones",
    # headphones
    "headphones": "headphones", "headphone": "headphones", "headset": "headphones",
    "over ear headphones": "headphones",
    # keys
    "keys": "keys", "key": "keys", "keychain": "keys", "key chain": "keys", "car keys": "keys",
    "house keys": "keys", "key ring": "keys",
    # book
    "book": "book", "books": "book", "textbook": "book", "text book": "book",
}

# Tokens searched inside free text ("Black HP laptop with stickers"). Ordered so that
# more specific phrases win ("headphones" before "phone", "earphones" before "phone").
_KEYWORD_ORDER: tuple[tuple[str, str], ...] = (
    ("mobile phone", "mobile_phone"), ("cell phone", "mobile_phone"),
    ("headphones", "headphones"), ("headphone", "headphones"), ("headset", "headphones"),
    ("earphones", "earphones"), ("earphone", "earphones"), ("earbuds", "earphones"),
    ("earbud", "earphones"), ("airpods", "earphones"),
    ("smartphone", "mobile_phone"), ("cellphone", "mobile_phone"), ("iphone", "mobile_phone"),
    ("phone", "mobile_phone"),
    ("laptop", "laptop"), ("macbook", "laptop"),
    ("wallet", "wallet"),
    ("keychain", "keys"), ("keys", "keys"), ("key", "keys"),
    ("textbook", "book"), ("books", "book"), ("book", "book"),
)


def _clean(raw: str) -> str:
    text = raw.strip().lower()
    text = re.sub(r"[_\-/]+", " ", text)
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_category(raw: Optional[str]) -> Optional[str]:
    """Map a user/DB/model label to a canonical category, or ``None`` if unmappable.

    Exact aliases are tried first, then whole-word keyword search in free text.
    Text matching more than one canonical category is ambiguous and returns ``None``.
    """
    if raw is None:
        return None
    text = _clean(str(raw))
    if not text:
        return None
    if text in _ALIASES:
        return _ALIASES[text]
    if text.replace(" ", "_") in CANONICAL_CATEGORIES:
        return text.replace(" ", "_")

    found: list[str] = []
    remaining = f" {text} "
    for phrase, label in _KEYWORD_ORDER:
        needle = f" {phrase} "
        if needle in remaining:
            if label not in found:
                found.append(label)
            # consume so "headphones" does not also count as "phone"
            remaining = remaining.replace(needle, " | ")
    if len(found) == 1:
        return found[0]
    return None


def normalize_detector_label(label: Optional[str]) -> Optional[str]:
    """Map a Grounding DINO output label to a canonical category.

    Grounding DINO can emit merged sub-word labels such as ``"laptop laptop"`` or
    ``"headphonesphones"``; we take the first canonical phrase found, longest first.
    """
    if not label:
        return None
    text = _clean(label)
    exact = normalize_category(text)
    if exact is not None:
        return exact
    squashed = text.replace(" ", "")
    for label_key, phrase in sorted(DETECTOR_PHRASES.items(), key=lambda kv: -len(kv[1])):
        if phrase.replace(" ", "") in squashed:
            return label_key
    return None


def detector_prompt() -> str:
    """Grounding DINO text prompt covering exactly the canonical categories."""
    return ". ".join(DETECTOR_PHRASES[c] for c in CANONICAL_CATEGORIES) + "."
