"""Open-set gate: decide whether a query photo shows a supported item before retrieval runs.

Design (see docs/OPEN_SET_GATE.md):
- Classification is done by SigLIP2 zero-shot against *supported* prompts (one per canonical
  category) plus *unsupported* prompts (common campus objects Back2U does not handle yet).
- The cosine similarities are turned into probabilities with a calibrated temperature
  (``softmax(cos / T)``). ``T`` and the thresholds live in ``configs/open_set_gate.json`` and are
  produced by ``scripts/calibrate_open_set.py`` on labelled real photographs.
- Grounding DINO is NOT part of this decision. It may only provide a crop box. A detector
  can therefore never turn an uncertain classification into a confident one.

Decisions
- ``SUPPORTED``        top class is a supported category with prob >= min_prob and margin >= min_margin
- ``UNSUPPORTED_ITEM`` the probability mass on unsupported prompts wins (>= unsupported_min_prob)
- ``UNCERTAIN``        anything else. Retrieval still runs, but results are never auto-matched.
"""
from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional, Sequence

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "configs" / "open_set_gate.json"

SUPPORTED = "SUPPORTED"
UNCERTAIN = "UNCERTAIN"
UNSUPPORTED_ITEM = "UNSUPPORTED_ITEM"

# Canonical category -> SigLIP2 prompts (several phrasings are averaged per category).
SUPPORTED_PROMPTS: dict[str, list[str]] = {
    "laptop": ["a photo of a laptop computer", "a photo of an open notebook computer"],
    "mobile_phone": ["a photo of a mobile phone", "a photo of a smartphone"],
    "wallet": ["a photo of a wallet", "a photo of a leather billfold wallet"],
    "earphones": ["a photo of wireless earbuds", "a photo of in-ear earphones"],
    "headphones": ["a photo of over-ear headphones", "a photo of a headset"],
    "keys": ["a photo of a bunch of keys", "a photo of keys on a keyring"],
    "book": ["a photo of a book", "a photo of a textbook"],
}

# Common lost-and-found objects that Back2U does not support yet. Listing them explicitly
# gives "everything else" somewhere to go; a single "other object" prompt does not work.
UNSUPPORTED_PROMPTS: dict[str, list[str]] = {
    "backpack": ["a photo of a backpack"],
    "water_bottle": ["a photo of a water bottle"],
    "umbrella": ["a photo of an umbrella"],
    "mug": ["a photo of a mug or cup"],
    "shoe": ["a photo of a shoe or sneaker"],
    "sunglasses": ["a photo of sunglasses or eyeglasses"],
    "clothing": ["a photo of a jacket or piece of clothing"],
    "watch": ["a photo of a wristwatch"],
    "bag": ["a photo of a handbag or tote bag"],
    "id_card": ["a photo of an id card or bank card"],
    "pen": ["a photo of a pen or pencil"],
    "charger": ["a photo of a charger cable or power bank"],
    "calculator": ["a photo of a calculator"],
    "tablet": ["a photo of a tablet computer"],
    "scene": ["a photo of an empty room or street with no object", "a blank or blurry photo"],
}


@dataclass
class GateConfig:
    temperature: float = 0.01          # softmax(cos / T); SigLIP cosines are small (~0.0-0.2)
    min_prob: float = 0.50             # supported top-1 probability needed for SUPPORTED
    min_margin: float = 0.10           # top-1 minus top-2 supported probability
    unsupported_min_prob: float = 0.50 # total unsupported mass needed for UNSUPPORTED_ITEM
    provenance: str = "provisional default (not calibrated)"
    metrics: dict = field(default_factory=dict)

    @classmethod
    def load(cls, path: Optional[os.PathLike] = None) -> "GateConfig":
        path = Path(path or os.environ.get("ML_OPEN_SET_CONFIG", DEFAULT_CONFIG_PATH))
        if not path.exists():
            return cls()
        raw = json.loads(path.read_text())
        known = {k: raw[k] for k in cls.__dataclass_fields__ if k in raw}
        return cls(**known)

    def to_dict(self) -> dict:
        return asdict(self)


def prompt_table() -> tuple[list[str], list[str], list[bool]]:
    """Flattened prompts, their label and whether the label is supported."""
    prompts, labels, supported = [], [], []
    for table, sup in ((SUPPORTED_PROMPTS, True), (UNSUPPORTED_PROMPTS, False)):
        for label, ps in table.items():
            for p in ps:
                prompts.append(p)
                labels.append(label)
                supported.append(sup)
    return prompts, labels, supported


def label_cosines(prompt_cos: Sequence[float], labels: Sequence[str]) -> tuple[list[str], np.ndarray]:
    """Average prompt cosines per label (order of first appearance)."""
    order: list[str] = []
    acc: dict[str, list[float]] = {}
    for c, lab in zip(prompt_cos, labels):
        if lab not in acc:
            order.append(lab)
            acc[lab] = []
        acc[lab].append(float(c))
    return order, np.asarray([np.mean(acc[l]) for l in order], dtype=np.float64)


def softmax(x: np.ndarray, temperature: float) -> np.ndarray:
    z = np.asarray(x, dtype=np.float64) / max(float(temperature), 1e-6)
    z = z - z.max()
    e = np.exp(z)
    return e / e.sum()


def decide(label_names: Sequence[str], label_cos: np.ndarray, config: GateConfig) -> dict:
    """Pure decision function (unit-tested without any model)."""
    supported_set = set(SUPPORTED_PROMPTS)
    probs = softmax(label_cos, config.temperature)
    sup_idx = [i for i, l in enumerate(label_names) if l in supported_set]
    uns_idx = [i for i, l in enumerate(label_names) if l not in supported_set]
    sup_probs = probs[sup_idx]
    order = np.argsort(-sup_probs)
    top1 = float(sup_probs[order[0]]) if len(order) else 0.0
    top2 = float(sup_probs[order[1]]) if len(order) > 1 else 0.0
    category = label_names[sup_idx[order[0]]] if len(order) else None
    unsupported_mass = float(probs[uns_idx].sum()) if uns_idx else 0.0
    best_uns = label_names[uns_idx[int(np.argmax(probs[uns_idx]))]] if uns_idx else None
    overall_top = label_names[int(np.argmax(probs))]

    if unsupported_mass >= config.unsupported_min_prob and overall_top not in supported_set:
        decision, reason = UNSUPPORTED_ITEM, f"looks like an unsupported item ({best_uns})"
    elif top1 >= config.min_prob and (top1 - top2) >= config.min_margin:
        decision, reason = SUPPORTED, "confident supported category"
    else:
        decision, reason = UNCERTAIN, "low confidence or ambiguous between categories"

    return {
        "decision": decision,
        "category": category if decision != UNSUPPORTED_ITEM else None,
        "candidate_category": category,
        "confidence": round(top1, 4),
        "margin": round(top1 - top2, 4),
        "unsupported_prob": round(unsupported_mass, 4),
        "closest_unsupported": best_uns,
        "reason": reason,
        "probs": {l: round(float(p), 4) for l, p in zip(label_names, probs)},
    }
