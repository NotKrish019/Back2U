"""Auto-suggestion threshold sweep (§K-4). ANALYSIS ONLY.

- Uses the production rule ``src.api.services.matching.should_auto_match`` with an in-memory policy per
  candidate threshold. Nothing is written to configs/, the database or any index; the result only
  goes into the evaluation report.
- Every threshold is evaluated on the same fixed per-query results (one retrieval run), so the
  comparison between thresholds is fair.
- Every block is labelled with its split and role. ``selected_threshold`` is always None: choosing a
  threshold is a project-lead decision (EXECUTION_PLAN §E), and a value chosen on a split must be
  reported on the *other* split.

Per threshold t, for the queries of one split:
  suggestions_closed   top-1 suggested when the query's own object is in the gallery
  correct / incorrect  suggested top-1 is / is not the query's own object
  false_open           suggestion made when the own object is removed (always wrong)
  precision            correct / (all closed + open suggestions)   [cluster-adjusted Wilson CI]
  coverage             closed queries with a suggestion / closed queries
  missed_correct_top1  top-1 was the right object but no suggestion (a false rejection)
  gate_stopped         queries the open-set gate stopped (never suggested at any t)
"""
from __future__ import annotations

from typing import Iterable, Optional

from src.evaluation.campus.stats import proportion

DEFAULT_START, DEFAULT_STOP, DEFAULT_STEP = 0.50, 0.99, 0.01
POOLED_NOTE = ("pooled over all folds: development and held-out queries are mixed; descriptive only, "
               "never use it to both choose and report a threshold")


def thresholds(start: float = DEFAULT_START, stop: float = DEFAULT_STOP, step: float = DEFAULT_STEP) -> list[float]:
    if not (0 < step and 0 <= start <= stop <= 1.0):
        raise ValueError("need 0 <= start <= stop <= 1 and step > 0")
    n = int(round((stop - start) / step))
    return [round(start + i * step, 4) for i in range(n + 1)]


def suggested(score: Optional[float], decision: Optional[str], gate: Optional[str], t: float) -> bool:
    from src.api.services.matching import AutoMatchPolicy, should_auto_match
    if score is None:
        return False
    return should_auto_match(score, decision, "image", gate, AutoMatchPolicy(t, "threshold_sweep"))


def sweep_rows(rows: list[dict], ts: Iterable[float]) -> list[dict]:
    out = []
    for t in ts:
        closed_events, open_events, coverage_units = [], [], []
        missed = stopped = incorrect = correct = 0
        for r in rows:
            cid = r["object"]
            if r["gate"] == "UNSUPPORTED_ITEM":
                stopped += 1
            s_closed = suggested(r["top1_score"], r["top1_decision"], r["gate"], t)
            s_open = suggested(r["open_top1_score"], r["open_top1_decision"], r["gate"], t)
            coverage_units.append((cid, s_closed))
            if s_closed:
                ok = r["top1"] == r["object"]
                closed_events.append((cid, ok))
                correct += ok
                incorrect += not ok
            elif r["top1"] == r["object"]:
                missed += 1
            if s_open:
                open_events.append((cid, False))
        n = len(rows)
        out.append({
            "threshold": t, "queries": n,
            "suggestions_closed": len(closed_events), "correct": correct, "incorrect": incorrect,
            "false_open": len(open_events),
            "precision": proportion(closed_events + open_events),
            "coverage": proportion(coverage_units),
            "false_match_rate_open": proportion([(r["object"], suggested(r["open_top1_score"], r["open_top1_decision"],
                                                                         r["gate"], t)) for r in rows]),
            "missed_correct_top1": missed, "gate_stopped": stopped,
            "needs_human_browsing": n - len(closed_events),
        })
    return out


def threshold_sweep(rows: list[dict], ts: list[float], deployed: float, dev_fold: Optional[str] = None) -> dict:
    folds = sorted({r["fold"] for r in rows})
    if dev_fold is not None and dev_fold not in ("fold_a", "fold_b"):
        raise ValueError("dev_fold must be fold_a or fold_b")
    blocks = {}
    for f in folds:
        if dev_fold is None:
            role = "unassigned: choose a development fold before tuning (--dev-fold)"
        else:
            role = "development (threshold may be chosen here)" if f == dev_fold else \
                "held_out (report here; do not choose a threshold here)"
        blocks[f] = {"split": f, "role": role, "objects": len({r["object"] for r in rows if r["fold"] == f}),
                     "rows": sweep_rows([r for r in rows if r["fold"] == f], ts)}
    blocks["pooled"] = {"split": "pooled", "role": POOLED_NOTE, "objects": len({r["object"] for r in rows}),
                        "rows": sweep_rows(rows, ts)}
    return {
        "purpose": "analysis only - does not change any configuration",
        "rule": "src.api.services.matching.should_auto_match (image query, gate SUPPORTED, ML decision "
                "'candidate', reranker probability >= t)",
        "thresholds": {"start": ts[0], "stop": ts[-1], "count": len(ts)},
        "deployed_threshold": deployed, "dev_fold": dev_fold,
        "selected_threshold": None,
        "decision_note": "No threshold is selected or approved by this script. Proposals follow "
                         "docs/campus_validation/EXECUTION_PLAN.md §E (project-lead approval, change record, rollback).",
        "splits": blocks,
    }
