import os

content = """

### 2026-09-28 21:15 - M4-C Hard-Negative Mining

**Change:**
Implemented `HardNegativeBatchSampler` inside `scripts/train_m4c.py` to enforce that each training batch contains specifically chosen "Hard Negatives" (different instances of the same category that look highly similar).

**Evidence/results:**
- Evaluated on the exact same 50-image test split as M3/M4-A.
- **MRR improved**: 0.9617 (M4-A) -> 0.9650 (M4-C).
- **Recall@1**: held constant at 0.9400.

**Decision:**
The hard-negative sampling successfully improved Mean Reciprocal Rank (MRR). M4-C is strictly better/equal to M4-A, making it the new baseline.

### 2026-09-28 21:40 - M4-B Local Feature Branch

**Change:**
Implemented a parallel GeM-pooling branch over DINOv2 patch tokens and fused it with the global CLS token. Note: M4-B was a brand new training loop where the global and local branches were trained jointly, unlike M4-C which solely optimized the global branch.

**Evidence/results:**
- Local-only Recall@1: 0.9200
- Fused Recall@1 (Alpha=0.25): 0.9000
- Qualitative audit (`reports/evaluation/m4b_retrieval_visual_audit.md`) showed representation collapse: Local similarities for almost all pairs hovered between 0.9900 and 0.9995.

**Decision:**
Local features degraded performance because 256 un-normalized patch tokens are dominated by generic background information. Joint training destabilized the global gradients, leading to M4-B Global performing slightly worse than M4-C (0.9200 vs 0.9400). Rejected M4-B. Reverted to M4-C.

### 2026-09-28 22:45 - M4-D Partial DINOv2 Fine-Tuning

**Change:**
Unfroze the final transformer block of DINOv2 (`blocks[-1]`) using a highly constrained learning rate (1e-5), while using a larger LR (1e-4) for the projection head.

**Files changed:**
- `scripts/train_m4d.py`
- `reports/experiments/m4_d_finetuning_results.md`

**Reason:**
To test if backpropagating through the last backbone block allows the representation to adapt specifically to the physical-instance separation task, without destroying the pretrained global structure.

**Evidence/results:**
- Test Recall@1: 0.9400 (Tied with M4-C)
- Test MRR: 0.9650 (Tied with M4-C)
- Test mAP: 0.9583 (Worse than M4-C's 0.9617)
- Training loss steadily decreased from 1.50 to 1.15, but validation MRR stagnated at 0.9872 from epoch 4 to 30.

**Decision:**
Fine-tuning the backbone provided zero held-out improvement and slight degradation in mAP, indicating mild overfitting to the small dataset size (152 train images). Per the scientific directive, the added complexity is unjustified. **DINOv2 is permanently frozen.** M4-C remains the final metric learning architecture.

**Risks/issues:**
The benchmark metrics (0.94+ Recall@1) are extremely high, but they represent a small 117-instance universe. This does NOT guarantee production-level robustness in the wild, and this limitation must be explicitly acknowledged before moving to the next system layer.

**Next action:**
Move to the next system layer (e.g., Cross-Modal Architecture or Deployment).
"""

with open("docs/context.md", "a", encoding="utf-8") as f:
    f.write(content)

print("Appended to docs/context.md")
