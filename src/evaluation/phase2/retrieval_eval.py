"""Instance-level retrieval metrics with leave-one-out queries.

Protocol for each query image q:
  * gallery = every other record whose image bytes differ from q (the exact query image and any
    byte-identical copy are excluded, so a duplicate can never be a "free" positive);
  * image scores are cosine similarities (embeddings must be L2-normalised);
  * scores are aggregated per physical instance with max() and instances are ranked;
  * ties are broken pessimistically (the true instance is ranked after every tied instance);
  * q is a valid query only if its own instance still has ≥1 gallery image; otherwise it is
    counted in ``skipped_queries`` and still serves as a gallery distractor for other queries.

Hard-negative top-1 accuracy: fraction of valid queries whose true-instance score is strictly
higher than the best *same-category, different-instance* score. Queries with no same-category
negative in the gallery are excluded from that metric (counted separately).
"""
from __future__ import annotations

from collections import defaultdict

import numpy as np

from src.evaluation.phase2.manifest import record_key

DEFAULT_KS = (1, 5, 10)


def rank_instances(query_idx: int, records: list[dict], sims: np.ndarray) -> tuple[list[tuple[str, float]], list[int]]:
    """Return [(instance_id, score)] sorted best-first and the gallery indices used."""
    q_sha = records[query_idx]["sha256"]
    gallery = [j for j in range(len(records)) if j != query_idx and records[j]["sha256"] != q_sha]
    best: dict[str, float] = {}
    for j in gallery:
        iid = records[j]["physical_instance_id"]
        s = float(sims[query_idx, j])
        if iid not in best or s > best[iid]:
            best[iid] = s
    ranked = sorted(best.items(), key=lambda kv: (-kv[1], kv[0]))
    return ranked, gallery


def pessimistic_rank(ranked: list[tuple[str, float]], true_iid: str) -> int:
    true_score = dict(ranked)[true_iid]
    better_or_tied = sum(1 for iid, s in ranked if iid != true_iid and s >= true_score)
    return better_or_tied + 1


def evaluate(records: list[dict], embeddings: np.ndarray, ks=DEFAULT_KS) -> tuple[list[dict], dict]:
    if len(records) != len(embeddings):
        raise ValueError("records and embeddings length differ")
    emb = np.asarray(embeddings, dtype=np.float64)
    norms = np.linalg.norm(emb, axis=1)
    if not np.allclose(norms, 1.0, atol=1e-3):
        raise ValueError("embeddings must be L2-normalised")
    sims = emb @ emb.T

    per_query, skipped = [], []
    for qi, rec in enumerate(records):
        ranked, gallery = rank_instances(qi, records, sims)
        true_iid = rec["physical_instance_id"]
        positives = [j for j in gallery if records[j]["physical_instance_id"] == true_iid]
        if not positives:
            skipped.append({"query": record_key(rec), "reason": "no_positive_in_gallery"})
            continue
        rank = pessimistic_rank(ranked, true_iid)
        true_score = dict(ranked)[true_iid]
        same_cat_negs = [(iid, s) for iid, s in ranked if iid != true_iid
                         and any(records[j]["physical_instance_id"] == iid and records[j]["category"] == rec["category"]
                                 for j in gallery)]
        hardest = max(same_cat_negs, key=lambda kv: kv[1]) if same_cat_negs else None
        per_query.append({
            "query": record_key(rec),
            "image_path": rec["image_path"],
            "category": rec["category"],
            "true_instance": true_iid,
            "rank": rank,
            "true_instance_score": round(true_score, 6),
            "top": [{"instance": iid, "score": round(s, 6)} for iid, s in ranked[:10]],
            "n_gallery_images": len(gallery),
            "n_positive_images": len(positives),
            "hardest_same_category_negative": (
                {"instance": hardest[0], "score": round(hardest[1], 6)} if hardest else None),
            "hard_negative_correct": (true_score > hardest[1]) if hardest else None,
            "correct_at_1": rank == 1,
        })
    return per_query, aggregate(per_query, skipped, records, ks)


def _block(rows: list[dict], ks) -> dict:
    n = len(rows)
    if n == 0:
        return {"n_queries": 0, "n_query_instances": 0}
    hn = [r["hard_negative_correct"] for r in rows if r["hard_negative_correct"] is not None]
    out = {
        "n_queries": n,
        "n_query_instances": len({r["true_instance"] for r in rows}),
        "mrr": round(float(np.mean([1.0 / r["rank"] for r in rows])), 6),
        "hard_negative_top1_accuracy": round(float(np.mean(hn)), 6) if hn else None,
        "n_queries_with_same_category_negative": len(hn),
    }
    for k in ks:
        out[f"recall@{k}"] = round(float(np.mean([r["rank"] <= k for r in rows])), 6)
    return out


def aggregate(per_query: list[dict], skipped: list[dict], records: list[dict], ks=DEFAULT_KS) -> dict:
    by_cat = defaultdict(list)
    for r in per_query:
        by_cat[r["category"]].append(r)
    n_gallery_instances = len({r["physical_instance_id"] for r in records})
    overall = _block(per_query, ks)
    overall["n_gallery_instances"] = n_gallery_instances
    overall["n_gallery_images"] = len(records)
    overall["n_skipped_queries"] = len(skipped)
    # recall@k is trivially 1.0 once k >= number of instances a query can rank
    overall["trivial_recall_ks"] = [k for k in ks if k >= n_gallery_instances]
    return {
        "overall": overall,
        "per_category": {c: _block(rows, ks) for c, rows in sorted(by_cat.items())},
        "skipped_queries": skipped,
    }
