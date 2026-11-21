"""Confidence intervals for campus metrics (§K-3).

Method: **Wilson score interval (95%) with a cluster (design-effect) adjustment.**

- Every campus proportion is computed over units that are *clustered by physical object*: two owner
  queries per object, four views per object for gate rates, and suggestions that come from those
  queries. Units within one object are correlated, so a plain Wilson interval over units would be
  too narrow.
- Adjustment (Kish design effect): ``n_eff = n / deff`` with ``deff = 1 + (m̄ − 1)·ρ``, where m̄ is
  the mean cluster size and ρ the one-way-ANOVA intra-cluster correlation of the 0/1 outcome,
  clipped to [0, 1]. When ρ cannot be estimated (fewer than 2 clusters, or no variation at all,
  e.g. 0% or 100%), ρ = 1 is assumed: the conservative choice that makes n_eff = number of clusters.
- The Wilson interval never collapses to zero width at 0% or 100% and behaves sensibly for small n.
- The unadjusted per-unit Wilson interval is also reported (``per_unit_wilson_ci95``) for transparency;
  it assumes independence and is optimistic.
- ``small_sample`` is set when n_eff < 30: treat the interval as a rough guide only.

Not covered: MRR (not a proportion). With ~28 objects an object-level bootstrap is unstable, so no
interval is reported for it; this is stated in the output instead of inventing one.
"""
from __future__ import annotations

from math import sqrt
from typing import Hashable, Iterable, Optional

Z95 = 1.959963984540054
SMALL_SAMPLE_N_EFF = 30
METHOD = "wilson_95_cluster_adjusted"
METHOD_NOTE = ("95% Wilson score interval on an effective sample size n_eff = n / design_effect; clusters = "
               "physical objects (queries/views of one object are correlated). rho=1 assumed when not estimable.")


def wilson(successes: float, n: float, z: float = Z95) -> Optional[tuple[float, float]]:
    """Wilson score interval. ``n`` may be non-integer (effective sample size). None if n == 0."""
    if n <= 0:
        return None
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * sqrt(max(p * (1 - p) / n + z * z / (4 * n * n), 0.0)) / denom
    return max(0.0, centre - half), min(1.0, centre + half)


def icc_binary(groups: list[list[int]]) -> Optional[float]:
    """One-way ANOVA intra-cluster correlation for 0/1 outcomes; None if not estimable."""
    groups = [g for g in groups if g]
    c = len(groups)
    n = sum(len(g) for g in groups)
    if c < 2 or n <= c:
        return None
    grand = sum(sum(g) for g in groups) / n
    ssb = sum(len(g) * (sum(g) / len(g) - grand) ** 2 for g in groups)
    ssw = sum(sum((x - sum(g) / len(g)) ** 2 for x in g) for g in groups)
    msb, msw = ssb / (c - 1), ssw / (n - c)
    n0 = (n - sum(len(g) ** 2 for g in groups) / n) / (c - 1)
    denom = msb + (n0 - 1) * msw
    if denom <= 0:
        return None
    return (msb - msw) / denom


def proportion(units: Iterable[tuple[Hashable, bool]]) -> dict:
    """Point estimate + intervals for a proportion over (cluster_id, success) units."""
    units = list(units)
    n = len(units)
    k = sum(1 for _, s in units if s)
    if n == 0:
        return {"successes": 0, "n": 0, "point": None, "ci95": None, "method": METHOD,
                "note": "no observations: metric not estimable"}
    clusters: dict = {}
    for cid, s in units:
        clusters.setdefault(cid, []).append(1 if s else 0)
    c = len(clusters)
    m_bar = n / c
    rho = icc_binary(list(clusters.values()))
    rho_used = 1.0 if rho is None else min(1.0, max(0.0, rho))
    deff = 1 + (m_bar - 1) * rho_used
    n_eff = n / deff
    p = k / n
    lo, hi = wilson(p * n_eff, n_eff)
    plo, phi = wilson(k, n)
    out = {
        "successes": k, "n": n, "point": round(p, 4), "ci95": [round(lo, 4), round(hi, 4)],
        "method": METHOD, "clusters": c, "rho": None if rho is None else round(rho, 4),
        "rho_used": round(rho_used, 4), "design_effect": round(deff, 4), "n_effective": round(n_eff, 2),
        "per_unit_wilson_ci95": [round(plo, 4), round(phi, 4)],
        "small_sample": n_eff < SMALL_SAMPLE_N_EFF,
    }
    if out["small_sample"]:
        out["note"] = f"small sample (n_eff={n_eff:.1f} < {SMALL_SAMPLE_N_EFF}): interval is a rough guide only"
    return out
