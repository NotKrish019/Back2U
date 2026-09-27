# ML Design Decisions

**Date:** 2026-09-28
**Status:** Authoritative (Derived from MASTER_PLAN.md)

This document tracks the frozen architectural decisions (AD) that govern the Multimodal Lost Property Re-Identification system. These cannot be reversed without explicit evidence and logging.

### AD-001 — Separate perception from re-identification
The detector answers *what* (category). The metric encoder answers *which physical object* (identity). A single detector cannot do both.

### AD-002 — Use pretrained perception
Do not train a giant object detector from scratch. Use open-set perception (Grounding DINO) to generate object proposals and verify categories.

### AD-003 — Custom training belongs in the embedding system
The primary ML engineering effort is in training the domain-specific instance representation (DINOv2 custom projection heads), hard-negative strategy, and ranking/calibration components using Supervised Contrastive Loss.

### AD-004 — Keep the real corpus small
The final processed corpus is capped at approximately 6 GB. Optimize for multi-view and hard-negative richness (Objectron, PACO-LVIS) over raw image count.

### AD-005 — Preserve an unknown/uncertain state
Forced classification is prohibited. The system must output `CATEGORY_UNCERTAIN` or `UNKNOWN` if visual, semantic, and detector confidence signals disagree.

### AD-006 — Matching is not ownership proof
Visual similarity produces *candidates*. Private evidence (hidden scratches, owner descriptions) supports ownership verification. Do not expose private attributes publicly.

### AD-007 — Context is a prior
Time and location metadata may affect ranking but cannot override strong visual contradiction (e.g., if a black wallet was lost at the same time and place as a red phone).

### AD-008 — RAG is not core
RAG is excluded from the core retrieval engine. RAG may only be used later for text QA over campus policy/help documents.
