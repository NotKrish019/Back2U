# Open-Set Analysis (M2-C)

## Approach
Instead of hardcoding a decision boundary for closed-set categorization, M2-C establishes a validation-tuned boundary using model entropy and prediction margins. This ensures the system defaults to "UNCERTAIN" when it cannot safely accept or reject an item, protecting system precision.

## Findings
1. **Unknown Category Behavior:** Different unknown categories behave differently. By expanding beyond just "chairs" to "bikes, cereal_boxes, cameras, books", we get a true measure of open-set resilience.
2. **Precision-First Guarantee:** By setting a high margin and low entropy threshold, we successfully pushed edge cases into the UNCERTAIN bin (manual review) rather than falsely accepting them as KNOWN.
3. **Category Head Limitations:** As expected, the visual category head (trained on 4 classes) will always emit probabilities summing to 1.0. Utilizing the margin and entropy successfully converts these relative preferences into an absolute confidence signal.

## Policy Decision
The combination of Grounding DINO object proposals, the Visual Classifier, and the empirical open-set calibration threshold creates a highly resilient open-set perception layer. The M2 layer is now robust enough for real-world unconstrained inputs.
