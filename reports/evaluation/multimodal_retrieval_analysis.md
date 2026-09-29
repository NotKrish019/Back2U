# Multimodal Retrieval Analysis (M5)

## Overview
This document analyzes the interplay between raw visual physical-instance retrieval (M4-C) and cross-modal semantic retrieval (M5 SigLIP2).

## Text-to-Image Semantic Alignment (M5-A)
SigLIP2 demonstrated a 1.0000 Recall@1 when mapping coarse categorical text queries (e.g. "laptop", "shoe") to the gallery of test items. It forms a perfect semantic baseline for text-based filtering and verification.

## M4-C Top-N + SigLIP2 Reranking
When retrieving the Top 10 physical instance candidates visually via M4-C and then reranking them with SigLIP2 text similarity:
- **Visual Only MRR:** 0.9583
- **Reranked MRR:** 0.9583
- **Visual Only R@1:** 0.9400
- **Reranked R@1:** 0.9400

**Analysis:**
Unlike the M5-preview direct blending approach which *degraded* the instance retrieval from 0.94 -> 0.92, Top-N reranking preserves the physical hard-negative separations created by M4-C. However, coarse semantic queries (like "laptop") do not improve the MRR within the Top 10 because all 10 candidates are laptops. 

To improve upon M4-C using text, the text queries must be highly detailed and specific to the instance (e.g., "black laptop with two stickers on the right corner").

## The Fundamental Distinction
We must strictly separate:
- **Semantic Category Retrieval:** Finding ANY object of a class (e.g., "laptop"). SigLIP2 solves this perfectly.
- **Physical-Instance Retrieval:** Finding THIS specific object (e.g., "My specific black laptop with a scratch"). M4-C solves this visually.

## Future Architecture Role
The correct multimodal architecture for this system is:
1. **M4-C** -> retrieves Top-N physical candidates visually.
2. **SigLIP2** -> serves as an independent semantic evidence/reranking signal. It verifies the candidate matches the semantic textual attributes, rather than directly blending into the raw physical embedding space for the entire gallery.
