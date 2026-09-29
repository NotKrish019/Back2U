# Category Gate Error Analysis

This document analyzes the failure modes of the Combined Category Gate (M2-B) over the 70 test instances (50 known targets, 20 unknown "chair" objects).

## Metrics Summary
- **Precision:** 1.0000
- **Recall:** 0.9600
- **F1 Score:** 0.9796
- **Unknown FAR:** 0.2500 (5/20 chairs incorrectly accepted)

## Error Taxonomy
- **P1 (no proposal):** Grounding DINO missed several valid objects, but the Visual Classifier was able to successfully flag them as `CATEGORY_CANDIDATE_FROM_VISUAL_MODEL` (C4). This explains the recall improvement from 90% to 96%.
- **C1 (classifier wrong category):** 0 (The classifier achieved 1.0000 precision and recall on the known test set).
- **C2 (classifier low confidence):** Minimal. The classifier was extremely confident due to the power of frozen DINOv2 embeddings.
- **C3 (detector/classifier disagreement):** 5 instances of "chair". Grounding DINO falsely proposed a box for a chair and labeled it as one of the 4 known classes. The Visual Classifier, forced to choose among 4 known classes, agreed with Grounding DINO's hallucination with high confidence, leading to a False Acceptance (FAR).
- **C4 (classifier correct but detector missed):** This was the primary success of the gate. Valid instances that Grounding DINO completely ignored were correctly recovered by the highly confident visual head.

## Failure Analysis
The primary remaining failure mode is **Unknown False Acceptance (25%)**.
When an unknown object (like a chair) is passed to the system, Grounding DINO occasionally misidentifies it as a `shoe` or `laptop`. Because the Visual Category Head was only trained on 4 classes and lacks an "unknown" class, it is forced to classify the chair as a `shoe` or `laptop`. When both models independently hallucinate the *same* category for the chair, the Category Gate marks it as `KNOWN`, leading to a false positive.

## Resolution
To further reduce the 25% FAR, we must either:
1. Increase the confidence threshold / margin threshold in the Category Gate.
2. Introduce a dedicated `UNKNOWN` or `BACKGROUND` class to the Visual Category Head so it can actively reject non-target objects, breaking the "agreement hallucination" loop.
3. Move to the next system layer (SigLIP2) for a stronger cross-modal verification.
