"""§K-3 confidence intervals and §K-4 threshold sweep (pure functions, synthetic inputs)."""
import pytest

from src.evaluation.campus import stats as ST
from src.evaluation.campus import sweep as SW


# ============================================================================ K-3 intervals
def test_wilson_ordinary_proportion_matches_reference():
    lo, hi = ST.wilson(61, 90)  # reference values (also quoted in EXECUTION_PLAN §A2)
    assert lo == pytest.approx(0.576, abs=1e-3) and hi == pytest.approx(0.765, abs=1e-3)


def test_zero_and_all_successes_are_not_zero_width():
    zero = ST.proportion([(i, False) for i in range(10)])
    full = ST.proportion([(i, True) for i in range(10)])
    assert zero["point"] == 0.0 and zero["ci95"][0] == 0.0 and zero["ci95"][1] > 0.2
    assert full["point"] == 1.0 and full["ci95"][1] == 1.0 and full["ci95"][0] < 0.8
    assert ST.proportion([(i, True) for i in range(22)])["ci95"][0] == pytest.approx(0.851, abs=1e-3)


def test_small_denominators_are_wide_and_flagged():
    one = ST.proportion([("a", True)])
    assert one["n"] == 1 and one["ci95"][0] < 0.25 and one["small_sample"] and "small sample" in one["note"]
    assert ST.proportion([])["point"] is None and ST.proportion([])["ci95"] is None


def test_counts_and_denominators_are_preserved():
    p = ST.proportion([("a", True), ("a", False), ("b", True), ("c", False), ("c", False)])
    assert (p["successes"], p["n"], p["clusters"], p["point"]) == (2, 5, 3, 0.4)


def test_cluster_adjustment_widens_correlated_units():
    # two perfectly correlated queries per object: effectively 10 objects, not 20 queries
    corr = ST.proportion([(i, i < 6) for i in range(10) for _ in range(2)])
    indep = ST.proportion([(i, i < 12) for i in range(20)])
    assert corr["n_effective"] == pytest.approx(10, abs=0.01)
    assert indep["n_effective"] == pytest.approx(20, abs=0.01) and indep["design_effect"] == 1.0
    w = lambda d: d["ci95"][1] - d["ci95"][0]
    assert w(corr) > w(indep)
    assert corr["per_unit_wilson_ci95"] != corr["ci95"]


def test_rho_assumed_one_when_not_estimable():
    p = ST.proportion([(i, True) for i in range(5) for _ in range(2)])  # no variation at all
    assert p["rho"] is None and p["rho_used"] == 1.0 and p["n_effective"] == pytest.approx(5)


# ============================================================================ K-4 sweep
def _row(obj, fold, top1, score, decision="candidate", gate="SUPPORTED", open_score=0.0, open_decision="reject"):
    return {"object": obj, "fold": fold, "gate": gate, "top1": top1, "top1_score": score,
            "top1_decision": decision, "open_top1": "other", "open_top1_score": open_score,
            "open_top1_decision": open_decision}


ROWS = [
    _row("A", "fold_a", "A", 0.95),                                  # correct, high
    _row("A", "fold_a", "A", 0.80),                                  # correct, medium
    _row("B", "fold_a", "X", 0.92, open_score=0.91, open_decision="candidate"),  # wrong + open false
    _row("C", "fold_b", "C", 0.70),                                  # correct, low
    _row("D", "fold_b", "D", 0.60, decision="review"),               # below candidate cutoff
    _row("E", "fold_b", "E", 0.99, gate="UNCERTAIN"),                # uncertain gate: never suggested
    _row("F", "fold_b", None, None, decision=None, gate="UNSUPPORTED_ITEM", open_score=None, open_decision=None),
]


def test_thresholds_are_a_documented_inclusive_range():
    ts = SW.thresholds(0.5, 0.99, 0.01)
    assert ts[0] == 0.5 and ts[-1] == 0.99 and len(ts) == 50
    with pytest.raises(ValueError):
        SW.thresholds(0.9, 0.5, 0.01)


def test_sweep_counts_precision_coverage_and_false_rejections():
    by_t = {r["threshold"]: r for r in SW.sweep_rows(ROWS, [0.5, 0.75, 0.9, 0.96])}
    r = by_t[0.5]   # suggestions: A, A, B(wrong), C ; D is 'review'; E uncertain; F stopped
    assert (r["suggestions_closed"], r["correct"], r["incorrect"], r["false_open"]) == (4, 3, 1, 1)
    assert r["precision"]["successes"] == 3 and r["precision"]["n"] == 5          # closed + open events
    assert r["coverage"]["successes"] == 4 and r["coverage"]["n"] == 7
    assert r["missed_correct_top1"] == 2  # D (review) and E (uncertain) had the right top-1, no suggestion
    assert r["gate_stopped"] == 1 and r["needs_human_browsing"] == 3
    r = by_t[0.9]   # A(0.95) correct, B(0.92) wrong, open 0.91 false
    assert (r["correct"], r["incorrect"], r["false_open"]) == (1, 1, 1)
    assert r["missed_correct_top1"] == 4
    r = by_t[0.96]
    assert r["suggestions_closed"] == 0 and r["precision"]["point"] is None


def test_every_threshold_uses_the_same_fixed_rows():
    rows = SW.sweep_rows(ROWS, SW.thresholds(0.5, 0.99, 0.01))
    assert {r["queries"] for r in rows} == {len(ROWS)}
    sugg = [r["suggestions_closed"] for r in rows]
    assert sugg == sorted(sugg, reverse=True)  # monotone in the threshold


def test_sweep_labels_splits_and_never_selects():
    out = SW.threshold_sweep(ROWS, [0.5, 0.9], deployed=0.9, dev_fold="fold_a")
    assert out["selected_threshold"] is None and "No threshold is selected" in out["decision_note"]
    assert out["splits"]["fold_a"]["role"].startswith("development")
    assert out["splits"]["fold_b"]["role"].startswith("held_out")
    assert "never use it to both choose and report" in out["splits"]["pooled"]["role"]
    unassigned = SW.threshold_sweep(ROWS, [0.5], deployed=0.9)
    assert all(b["role"].startswith("unassigned") for k, b in unassigned["splits"].items() if k != "pooled")
    with pytest.raises(ValueError):
        SW.threshold_sweep(ROWS, [0.5], deployed=0.9, dev_fold="fold_c")
