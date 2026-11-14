import pytest

from src.categories import (CANONICAL_CATEGORIES, detector_prompt, normalize_category,
                            normalize_detector_label)


def test_canonical_set_is_exactly_the_agreed_seven():
    assert CANONICAL_CATEGORIES == ("laptop", "mobile_phone", "wallet", "earphones",
                                    "headphones", "keys", "book")
    assert all(c == c.lower() for c in CANONICAL_CATEGORIES)


@pytest.mark.parametrize("raw,expected", [
    ("laptop", "laptop"), ("Laptop", "laptop"), ("  LAPTOP ", "laptop"),
    ("Black HP Victus laptop with stickers", "laptop"), ("MacBook Pro", "laptop"),
    ("mobile_phone", "mobile_phone"), ("Mobile Phone", "mobile_phone"), ("mobile-phone", "mobile_phone"),
    ("iPhone 13", "mobile_phone"), ("cell phone", "mobile_phone"), ("Smartphone", "mobile_phone"),
    ("Wallet", "wallet"), ("brown leather wallet", "wallet"),
    ("AirPods", "earphones"), ("earbuds", "earphones"), ("Earphones", "earphones"),
    ("Sony headphones", "headphones"), ("headset", "headphones"),
    ("car keys", "keys"), ("Key", "keys"), ("keychain with 3 keys", "keys"),
    ("Book", "book"), ("Textbook", "book"), ("books", "book"),
])
def test_normalize_category_maps_to_canonical(raw, expected):
    assert normalize_category(raw) == expected


@pytest.mark.parametrize("raw", [
    None, "", "   ", "backpack", "notebook", "umbrella", "water bottle", "keyboard",
    "phone and wallet",  # ambiguous → not guessed
])
def test_normalize_category_unmappable_returns_none(raw):
    assert normalize_category(raw) is None


@pytest.mark.parametrize("label,expected", [
    ("laptop", "laptop"), ("laptop laptop", "laptop"), ("headphonesphones", "headphones"),
    ("mobile phone", "mobile_phone"), ("phone", "mobile_phone"), ("earphones", "earphones"),
    ("keys", "keys"), ("book", "book"), ("wallet", "wallet"), ("chair", None), ("", None),
])
def test_normalize_detector_label(label, expected):
    assert normalize_detector_label(label) == expected


def test_detector_prompt_covers_all_categories_only():
    prompt = detector_prompt()
    phrases = [p.strip() for p in prompt.rstrip(".").split(".")]
    assert [normalize_detector_label(p) for p in phrases] == list(CANONICAL_CATEGORIES)
