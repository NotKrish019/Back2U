# M5: SigLIP2 Cross-Modal Baseline

*Note: The original SigLIP experiment using `google/siglip-base-patch16-224` is now archived as **M5-preview**. The results below reflect the true **M5** experiment using `google/siglip2-base-patch16-224`.*

## Objective
Determine whether textual descriptions provide useful additional evidence for visual candidate retrieval. Use a Top-N semantic reranking approach instead of blindly blending semantic scores across the whole gallery.

## Setup
- **Visual Encoder (Instance):** Frozen DINOv2 ViT-S/14 + M4-C Projection Head.
- **Multimodal Encoder:** Frozen SigLIP2 `google/siglip2-base-patch16-224`.
- **Dataset:** 50 Test Images (known target items across laptop, cup, shoe, bottle).
- **Evaluation Modes:**
  - **A: M4-C Visual Only** (Image -> Image).
  - **B: SigLIP2 Text-to-Image** (Category Text -> Image).
  - **C: M4-C Top-N + SigLIP2 Reranking** (Visual retrieves Top 10, then SigLIP2 semantic similarity reranks the top 10).

## Results

| Configuration | R@1 | R@5 | R@10 | MRR |
|---------------|-----|-----|------|-----|
| A: M4-C Visual Only | 0.9400 | 0.9800 | 1.0000 | 0.9583 |
| B: SigLIP2 Text-to-Image (Category) | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| C: M4-C Top-10 + SigLIP2 Reranking | 0.9400 | 0.9800 | 1.0000 | 0.9583 |

## Conclusions
1. SigLIP2 maintains the exceptionally strong 1.0000 R@1 for coarse semantic category retrieval (e.g. mapping "laptop" to a laptop image).
2. However, coarse text categories do NOT improve physical-instance retrieval because they apply uniformly to all laptops. Reranking the Top 10 with semantic text does not degrade the score like direct blending did, but it also doesn't improve it because the text query lacks the granular physical details (like scratches, stickers, or specific angles) needed to disambiguate the final 10 visual matches.
3. **Architectural Choice:** The M4-C embedding must remain the primary retrieval mechanism for physical instance candidates. SigLIP2 functions correctly as a semantic verification and text-to-image filter, but should only rerank (not blend) when highly detailed textual evidence is available.
