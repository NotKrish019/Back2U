"""QC-aware instance retrieval metrics (Phase 2C). Same protocol as retrieval_eval.evaluate, plus:

* restrict_category=True  — ORACLE diagnostic: each query is ranked only against gallery images of its
                            own ground-truth category (not production behaviour).
* uncertain_pairs         — set of frozenset({instance_a, instance_b}) whose identity relationship is
                            uncertain. Such negatives are EXCLUDED from hard-negative accuracy (they are
                            still ranked, because the instances are not merged).
* error taxonomy          — for every query with rank > 1, the top-ranked wrong instance is classified:
                            cross_category | uncertain_identity | within_category.

With restrict_category=False and no uncertain pairs, recall/MRR/ranks are identical to
retrieval_eval.evaluate (unit-tested).
"""
from __future__ import annotations

from collections import Counter, defaultdict

import numpy as np

from src.evaluation.phase2.manifest import record_key
from src.evaluation.phase2.retrieval_eval import DEFAULT_KS, pessimistic_rank


def evaluate_qc(records: list[dict], embeddings: np.ndarray, ks=DEFAULT_KS, restrict_category: bool = False,
                uncertain_pairs: set | None = None):
    uncertain_pairs = uncertain_pairs or set()
    emb = np.asarray(embeddings, dtype=np.float64)
    if not np.allclose(np.linalg.norm(emb, axis=1), 1.0, atol=1e-3):
        raise ValueError("embeddings must be L2-normalised")
    sims = emb @ emb.T
    cat_of_inst = {r["physical_instance_id"]: r["category"] for r in records}
    per_query, skipped = [], []
    for qi, rec in enumerate(records):
        q_sha, q_cat, true_iid = rec["sha256"], rec["category"], rec["physical_instance_id"]
        gallery = [j for j in range(len(records)) if j != qi and records[j]["sha256"] != q_sha
                   and (not restrict_category or records[j]["category"] == q_cat)]
        best = {}
        for j in gallery:
            iid = records[j]["physical_instance_id"]
            s = float(sims[qi, j])
            if iid not in best or s > best[iid]:
                best[iid] = s
        if true_iid not in best:
            skipped.append({"query": record_key(rec), "reason": "no_positive_in_gallery"})
            continue
        ranked = sorted(best.items(), key=lambda kv: (-kv[1], kv[0]))
        rank = pessimistic_rank(ranked, true_iid)
        tscore = best[true_iid]
        negs = [(i, s) for i, s in ranked if i != true_iid and cat_of_inst[i] == q_cat
                and frozenset((true_iid, i)) not in uncertain_pairs]
        hardest = max(negs, key=lambda kv: kv[1]) if negs else None
        err = None
        if rank > 1:
            wrong = next(i for i, s in ranked if i != true_iid)
            err = ("cross_category" if cat_of_inst[wrong] != q_cat else
                   "uncertain_identity" if frozenset((true_iid, wrong)) in uncertain_pairs else
                   "within_category")
        per_query.append({"query": record_key(rec), "category": q_cat, "true_instance": true_iid, "rank": rank,
                          "true_instance_score": round(tscore, 6),
                          "top": [{"instance": i, "score": round(s, 6)} for i, s in ranked[:5]],
                          "hard_negative_correct": (tscore > hardest[1]) if hardest else None,
                          "error_type": err})
    return per_query, aggregate_qc(per_query, skipped, ks)


def _block(rows, ks):
    n = len(rows)
    if not n:
        return {"n_queries": 0}
    hn = [r["hard_negative_correct"] for r in rows if r["hard_negative_correct"] is not None]
    out = {"n_queries": n, "n_query_instances": len({r["true_instance"] for r in rows}),
           "mrr": round(float(np.mean([1 / r["rank"] for r in rows])), 6),
           "hard_negative_top1_accuracy": round(float(np.mean(hn)), 6) if hn else None,
           "n_queries_with_eligible_negative": len(hn),
           "top1_errors": dict(Counter(r["error_type"] for r in rows if r["error_type"]))}
    for k in ks:
        out[f"recall@{k}"] = round(float(np.mean([r["rank"] <= k for r in rows])), 6)
    return out


def aggregate_qc(per_query, skipped, ks):
    by = defaultdict(list)
    for r in per_query:
        by[r["category"]].append(r)
    return {"overall": _block(per_query, ks) | {"n_skipped_queries": len(skipped)},
            "per_category": {c: _block(v, ks) for c, v in sorted(by.items())}, "skipped_queries": skipped}
