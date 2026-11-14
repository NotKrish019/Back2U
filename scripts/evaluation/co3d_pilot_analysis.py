"""Summarise a CO3D pilot run: visual-only metrics (primary) and, separately, what the EXISTING
reranker/calibrator would output for the same visual scores (diagnostic only — it was fitted on
historical Objectron full-image features and is NOT trusted as calibrated for CO3D or crops).

With no text query the calibrator is a monotonic function of visual similarity
(p = sigmoid(8.4511·v − 6.3310)), so rankings — and therefore Recall/MRR — are identical; only the
probability values and the 0.8 / 0.2 decision thresholds are evaluated here.

    python scripts/evaluation/co3d_pilot_analysis.py --run reports/evaluation/phase2_runs/co3d_pilot
"""
import argparse
import json
import pickle
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def wilson(k, n, z=1.96):
    if n == 0:
        return (None, None)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / d
    return (round(c - h, 4), round(c + h, 4))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    a = ap.parse_args()
    run = ROOT / a.run
    summary = json.loads((run / "metrics_summary.json").read_text())
    reranker = pickle.load(open(ROOT / "models/reranker_calibration.pkl", "rb"))
    out = {"run": a.run, "model_version": summary["model_version"], "conditions": {}}
    for cond, info in summary["conditions"].items():
        if info["status"] != "RUN":
            out["conditions"][cond] = info
            continue
        m = json.loads((run / cond / "metrics.json").read_text())
        preds = [json.loads(l) for l in (run / cond / "predictions.jsonl").read_text().splitlines()]
        n = len(preds)
        k1 = sum(p["rank"] == 1 for p in preds)
        top_scores = np.array([p["top"][0]["score"] for p in preds])
        correct = np.array([p["rank"] == 1 for p in preds])
        prob = reranker.predict_proba(np.c_[top_scores, np.zeros(n)])[:, 1]
        cand = prob > 0.8
        rej = prob < 0.2
        pos = np.array([p["true_instance_score"] for p in preds])
        neg = np.array([p["hardest_same_category_negative"]["score"] for p in preds
                        if p["hardest_same_category_negative"]])
        out["conditions"][cond] = {
            "visual_only": {
                "overall": m["overall"] | {"recall@1_wilson95": wilson(k1, n)},
                "per_category": {c: v | {"recall@1_wilson95": wilson(
                    sum(p["rank"] == 1 for p in preds if p["category"] == c), v["n_queries"])}
                                 for c, v in m["per_category"].items()},
                "true_instance_score_mean": round(float(pos.mean()), 4),
                "hardest_same_category_negative_mean": round(float(neg.mean()), 4) if len(neg) else None,
            },
            "existing_calibrator_diagnostic": {
                "note": "monotonic in visual score without text → same ranking; probabilities UNVALIDATED for CO3D",
                "top1_candidate_rate_p>0.8": round(float(cand.mean()), 4),
                "precision_of_candidate_decisions": round(float(correct[cand].mean()), 4) if cand.any() else None,
                "top1_reject_rate_p<0.2": round(float(rej.mean()), 4),
                "correct_top1_wrongly_rejected": int((rej & correct).sum()),
                "mean_top1_probability_correct": round(float(prob[correct].mean()), 4) if correct.any() else None,
                "mean_top1_probability_wrong": round(float(prob[~correct].mean()), 4) if (~correct).any() else None,
            },
        }
    (run / "pilot_analysis.json").write_text(json.dumps(out, indent=1))
    hdr = f"{'condition':28s} {'n_q':>5s} {'seq':>4s} {'R@1':>6s} {'95% CI':>15s} {'R@5':>6s} {'R@10':>6s} {'MRR':>6s} | " + \
          " ".join(f"{c[:5]}R@1" for c in ("book", "laptop", "mobile_phone"))
    print(hdr)
    for cond, d in out["conditions"].items():
        if "visual_only" not in d:
            print(f"{cond:28s} {d['status']}: {d.get('reason')}")
            continue
        o, pc = d["visual_only"]["overall"], d["visual_only"]["per_category"]
        ci = o["recall@1_wilson95"]
        print(f"{cond:28s} {o['n_queries']:5d} {o['n_query_instances']:4d} {o['recall@1']:6.3f} [{ci[0]:.3f},{ci[1]:.3f}] "
              f"{o['recall@5']:6.3f} {o['recall@10']:6.3f} {o['mrr']:6.3f} | " +
              " ".join(f"{pc.get(c, {}).get('recall@1', float('nan')):9.3f}" for c in ("book", "laptop", "mobile_phone")))
    print("written:", run / "pilot_analysis.json")


if __name__ == "__main__":
    main()
