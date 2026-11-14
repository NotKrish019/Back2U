"""Phase 2C: QC-aware retrieval metrics and QC application rules."""
import json
import sys
from pathlib import Path

import numpy as np
import pytest

from src.evaluation.phase2.retrieval_eval import evaluate
from src.evaluation.phase2.retrieval_eval_qc import evaluate_qc

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "evaluation"))
import co3d_apply_qc as Q  # noqa: E402


def unit(v):
    v = np.asarray(v, float); return v / np.linalg.norm(v)


def rec(iid, view, cat):
    return {"physical_instance_id": iid, "view_id": view, "category": cat, "sha256": f"{iid}{view}",
            "image_path": "x", "source_sequence_id": iid.split(":")[-1]}


RECS = [rec("a", "0", "laptop"), rec("a", "1", "laptop"), rec("b", "0", "laptop"), rec("b", "1", "laptop"),
        rec("p", "0", "mobile_phone"), rec("p", "1", "mobile_phone")]
EMB = np.array([unit([1, 0, 0]), unit([0.6, 0.8, 0]), unit([0.7, 0.7, 0.1]), unit([0, 1, 0]),
                unit([0.9, 0.1, 0.05]), unit([0, 0, 1])])


def test_matches_existing_evaluator_when_unrestricted():
    pq_old, m_old = evaluate(RECS, EMB, (1, 2, 10))
    pq_new, m_new = evaluate_qc(RECS, EMB, (1, 2, 10))
    assert [r["rank"] for r in pq_old] == [r["rank"] for r in pq_new]
    for k in ("recall@1", "recall@2", "recall@10", "mrr", "hard_negative_top1_accuracy"):
        assert m_old["overall"][k] == m_new["overall"][k]


def test_category_restriction_removes_cross_category_errors():
    _, mixed = evaluate_qc(RECS, EMB, (1, 5))
    pq_r, restricted = evaluate_qc(RECS, EMB, (1, 5), restrict_category=True)
    by = {r["query"]: r for r in evaluate_qc(RECS, EMB, (1, 5))[0]}
    assert by["a/0"]["error_type"] == "cross_category"           # phone p/0 is closest to a/0
    assert "cross_category" not in restricted["overall"]["top1_errors"]
    assert restricted["overall"]["recall@1"] >= mixed["overall"]["recall@1"]
    assert all(r["top"][0]["instance"] != "p" for r in pq_r if r["category"] == "laptop")


def test_uncertain_pairs_excluded_from_hard_negatives_and_labelled():
    unc = {frozenset(("a", "b"))}
    pq, m = evaluate_qc(RECS, EMB, (1, 5), restrict_category=True, uncertain_pairs=unc)
    by = {r["query"]: r for r in pq}
    assert by["b/0"]["error_type"] == "uncertain_identity"
    assert by["b/0"]["hard_negative_correct"] is None              # only negative was uncertain
    assert m["per_category"]["laptop"]["n_queries_with_eligible_negative"] == 0


ITEMS = {"sequence_decisions": ["APPROVE", "REJECT", "UNCERTAIN"],
         "pair_decisions": ["same_physical_unit", "same_model_different_unit", "different_physical_units", "uncertain_identity"],
         "sequences": [{"sequence": s} for s in ("s1", "s2", "s3", "s4")],
         "pairs": [{"a": "s1", "b": "s2"}, {"a": "s3", "b": "s4"}],
         "groups": [{"group": "laptop:1", "sequences": ["s1", "s2", "s3"]}]}
MREC = [{"source_sequence_id": s, "physical_instance_id": f"co3d:{s}", "view_id": "v", "identity_status": "SOURCE_SEQUENCE",
         "verification_status": "PENDING_HUMAN_QC"} for s in ("s1", "s2", "s3", "s4", "s5")]


def results(**over):
    r = {"status": "SUBMITTED", "final_approval": True, "reviewer": "QC person",
         "sequences": {"s1": {"decision": "APPROVE"}, "s2": {"decision": "APPROVE"}, "s3": {"decision": "UNCERTAIN"},
                       "s4": {"decision": "REJECT"}},
         "pairs": {"s1|s2": {"decision": "same_physical_unit"}, "s3|s4": {"decision": "uncertain_identity"}},
         "groups": {"laptop:1": {"reviewed": True, "same_unit_sets": []}}}
    r.update(over)
    return r


def test_pending_results_change_nothing_and_flag_everything_uncertain():
    out, rel = Q.build(MREC, {"status": "PENDING", "sequences": {}, "pairs": {}, "groups": {}}, ITEMS)
    assert not rel["qc_applied"] and rel["problems_blocking_application"]
    assert {r["physical_instance_id"] for r in out} == {f"co3d:s{i}" for i in range(1, 6)}
    assert all(r["identity_status"] == "SOURCE_SEQUENCE" for r in out)
    assert ["s1", "s2"] in rel["uncertain_relationships"] and ["s1", "s3"] in rel["uncertain_relationships"]
    assert rel["verified_negative_relationships"] == [] and rel["merged_instances"] == {}


def test_missing_single_decision_blocks_everything():
    r = results(); r["sequences"]["s3"]["decision"] = None
    _, rel = Q.build(MREC, r, ITEMS)
    assert not rel["qc_applied"] and any("s3" in p for p in rel["problems_blocking_application"])
    r = results(final_approval=False)
    assert not Q.build(MREC, r, ITEMS)[1]["qc_applied"]


def test_applied_results_merge_reject_and_verify():
    out, rel = Q.build(MREC, results(), ITEMS)
    assert rel["qc_applied"]
    ids = {r["source_sequence_id"]: r for r in out}
    assert "s4" not in ids                                                    # rejected → excluded
    assert ids["s1"]["physical_instance_id"] == ids["s2"]["physical_instance_id"] == "co3d-merged:s1+s2"
    assert ids["s1"]["identity_status"] == "MERGED_BY_HUMAN_QC"
    assert ids["s3"]["identity_status"] == "SOURCE_SEQUENCE" and ids["s5"]["identity_status"] == "SOURCE_SEQUENCE"
    assert ["s1", "s3"] in rel["verified_negative_relationships"]             # reviewed group, not merged
    assert ["s3", "s4"] in rel["uncertain_relationships"]
    assert all(r["reserved_from_training"] for r in out)
