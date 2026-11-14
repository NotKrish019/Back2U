"""Apply human QC decisions to the CO3D pilot → derived evaluation manifest (original untouched).

Inputs : data/processed/co3d_phase2_pilot_manifest.jsonl (never modified)
         reports/evaluation/co3d_pilot/human_qc_results.json
         reports/evaluation/co3d_pilot/qc_review/review_items.json
Outputs: data/processed/co3d_phase2_qc_reviewed_manifest.jsonl
         data/processed/co3d_phase2_identity_relations.json

Rules
  * Results count only if status == "SUBMITTED", final_approval is true, a reviewer is named and
    EVERY required item has an explicit decision. Otherwise the run is PENDING: no identity changes,
    and every flagged relationship is UNCERTAIN.
  * Sequence APPROVE → identity_status TRUSTWORTHY (that sequence only); REJECT → excluded from the
    derived manifest (still reserved); UNCERTAIN → stays SOURCE_SEQUENCE.
  * Pair same_physical_unit, or a group same-unit set → identities merged (derived manifest only).
    same_model_different_unit / different_physical_units → VERIFIED negative.
    uncertain_identity, or anything flagged but unreviewed → UNCERTAIN relationship.
  * Reviewed group with no same-unit set → all within-group pairs VERIFIED negatives.
  * Merged or not, every sequence stays in the permanent training holdout.

    python scripts/evaluation/co3d_apply_qc.py
"""
import itertools
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data/processed/co3d_phase2_pilot_manifest.jsonl"
RESULTS = ROOT / "reports/evaluation/co3d_pilot/human_qc_results.json"
ITEMS = ROOT / "reports/evaluation/co3d_pilot/qc_review/review_items.json"
OUT = ROOT / "data/processed/co3d_phase2_qc_reviewed_manifest.jsonl"
REL = ROOT / "data/processed/co3d_phase2_identity_relations.json"


def completeness(res: dict, items: dict) -> list[str]:
    problems = []
    if res.get("status") != "SUBMITTED":
        problems.append(f"status is {res.get('status')!r}, not 'SUBMITTED'")
    if not res.get("final_approval"):
        problems.append("final_approval is not true")
    if not res.get("reviewer"):
        problems.append("no reviewer named")
    for s in items["sequences"]:
        d = (res.get("sequences") or {}).get(s["sequence"], {}).get("decision")
        if d not in items["sequence_decisions"]:
            problems.append(f"sequence {s['sequence']}: no explicit decision")
    for p in items["pairs"]:
        d = (res.get("pairs") or {}).get(f"{p['a']}|{p['b']}", {}).get("decision")
        if d not in items["pair_decisions"]:
            problems.append(f"pair {p['a']}|{p['b']}: no explicit decision")
    for g in items["groups"]:
        if not (res.get("groups") or {}).get(g["group"], {}).get("reviewed"):
            problems.append(f"group {g['group']}: not marked reviewed")
    return problems


def build(records: list[dict], res: dict, items: dict) -> tuple[list[dict], dict]:
    problems = completeness(res, items)
    applied = not problems
    seqs = sorted({r["source_sequence_id"] for r in records})
    parent = {s: s for s in seqs}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    uncertain, verified_neg, approved, rejected, seq_uncertain = set(), set(), set(), set(), set()
    flagged_pairs = [(p["a"], p["b"]) for p in items["pairs"]]
    flagged_pairs += [pr for g in items["groups"] for pr in itertools.combinations(g["sequences"], 2)]
    if not applied:
        uncertain = {frozenset(p) for p in flagged_pairs}
    else:
        for s, v in res["sequences"].items():
            {"APPROVE": approved, "REJECT": rejected, "UNCERTAIN": seq_uncertain}[v["decision"]].add(s)
        for p in items["pairs"]:
            d = res["pairs"][f"{p['a']}|{p['b']}"]["decision"]
            pr = frozenset((p["a"], p["b"]))
            if d == "same_physical_unit":
                union(p["a"], p["b"])
            elif d in ("same_model_different_unit", "different_physical_units"):
                verified_neg.add(pr)
            else:
                uncertain.add(pr)
        for g in items["groups"]:
            gv = res["groups"][g["group"]]
            in_set = set()
            for st in gv.get("same_unit_sets", []):
                st = [x for x in st if x in parent]
                for x in st[1:]:
                    union(st[0], x)
                in_set.update(st)
            for a, b in itertools.combinations(g["sequences"], 2):
                pr = frozenset((a, b))
                if find(a) != find(b) and pr not in uncertain and pr not in verified_neg:
                    verified_neg.add(pr)
        # a relationship cannot be both a verified negative and merged
        verified_neg = {p for p in verified_neg if len({find(x) for x in p}) == 2}
        uncertain = {p for p in uncertain if len({find(x) for x in p}) == 2}

    clusters = defaultdict(list)
    for s in seqs:
        clusters[find(s)].append(s)
    inst_of = {s: ("co3d:" + s if len(clusters[find(s)]) == 1
                   else "co3d-merged:" + "+".join(sorted(clusters[find(s)]))) for s in seqs}
    unc_by_seq = defaultdict(set)
    for p in uncertain:
        a, b = sorted(p)
        unc_by_seq[a].add(inst_of[b])
        unc_by_seq[b].add(inst_of[a])

    out = []
    for r in records:
        s = r["source_sequence_id"]
        if s in rejected:
            continue
        d = dict(r)
        d["physical_instance_id"] = inst_of[s]
        d["source_physical_instance_id"] = "co3d:" + s
        if s in approved and len(clusters[find(s)]) == 1:
            d["identity_status"] = "TRUSTWORTHY"
        elif len(clusters[find(s)]) > 1:
            d["identity_status"] = "MERGED_BY_HUMAN_QC"
        else:
            d["identity_status"] = "SOURCE_SEQUENCE"
        d["qc_status"] = "APPLIED" if applied else "PENDING"
        d["verification_status"] = ("HUMAN_QC_APPROVED" if s in approved else
                                    "HUMAN_QC_UNCERTAIN" if s in seq_uncertain else
                                    "PENDING_HUMAN_QC")
        d["uncertain_identity_with"] = sorted(unc_by_seq.get(s, set()))
        d["reserved_from_training"] = True
        out.append(d)
    rel = {
        "qc_applied": applied, "problems_blocking_application": problems,
        "merged_instances": {k: v for k, v in ((inst_of[c[0]], sorted(c)) for c in clusters.values()) if len(v) > 1},
        "uncertain_relationships": sorted(sorted(p) for p in uncertain),
        "verified_negative_relationships": sorted(sorted(p) for p in verified_neg),
        "approved_sequences": sorted(approved), "rejected_sequences": sorted(rejected),
        "uncertain_sequences": sorted(seq_uncertain),
        "all_other_cross_sequence_relationships": "UNVERIFIED (not human-checked; source-asserted distinct sequences)",
    }
    return out, rel


def main():
    src_bytes = SRC.read_bytes()
    records = [json.loads(l) for l in src_bytes.decode().splitlines() if l.strip()]
    res = json.loads(RESULTS.read_text())
    items = json.loads(ITEMS.read_text())
    out, rel = build(records, res, items)
    OUT.write_text("".join(json.dumps(r, sort_keys=True) + "\n" for r in out))
    REL.write_text(json.dumps(rel, indent=1))
    assert SRC.read_bytes() == src_bytes, "original manifest must not change"
    print(json.dumps({"qc_applied": rel["qc_applied"], "n_blocking_problems": len(rel["problems_blocking_application"]),
                      "first_problems": rel["problems_blocking_application"][:3], "records": len(out),
                      "instances": len({r["physical_instance_id"] for r in out}),
                      "merged": rel["merged_instances"], "uncertain_relationships": len(rel["uncertain_relationships"]),
                      "verified_negatives": len(rel["verified_negative_relationships"]),
                      "approved": len(rel["approved_sequences"])}, indent=1))


if __name__ == "__main__":
    main()
