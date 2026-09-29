# Perception Error Analysis (M2-A Grounding DINO)

This document classifies and analyzes the failure modes of the Grounding DINO zero-shot perception module on the Objectron/PACO dataset test split.

## Benchmark Size
- **Total Evaluated:** 70 representative instances (including difficult examples, clutter, and unknown categories like chairs).
- **Categories Tested:** laptop, book, bottle, cup, shoe, camera.
- **Unknown Categories:** chair (used to test false acceptance).

## Overall Metrics
- **Precision:** 1.0000
- **Recall:** 0.8286
- **F1 Score:** 0.9062

## Failure Taxonomy

The failures are categorized as follows:

- **P1 (Object not proposed): 14**
  The model completely failed to propose any bounding box for the object. This primarily happened with specific categories like `book` and `camera` which had very low recall, suggesting the text prompts for these items might need tuning or the objects are heavily occluded.
  
- **P2 (Incorrect bounding box / Low IOU): 11**
  The model found an object but the bounding box IOU was below the threshold (0.5). This can happen when the model bounds only a part of the object (e.g., the screen of a laptop instead of the whole laptop) or bounds a larger context region.

- **P3 (Wrong category): 1**
  The model proposed a box with a good IOU, but misclassified it as a different known category.

- **P4 (Multiple ambiguous proposals): 9**
  The model proposed multiple bounding boxes for the same prompt that overlap or are in close proximity, indicating uncertainty or multiple instances. 

- **P7 (Unknown object incorrectly mapped to known category): 0**
  The model achieved a perfect score here. When presented with `chair` instances, it correctly refrained from classifying them as any of the known categories (laptop, book, bottle, cup, shoe, camera). 

## Category-Specific Insights
- **High Performers:** 
  - `laptop` (Recall: 0.9524)
- **Moderate Performers:**
  - `bottle` (Recall: 0.7333)
  - `shoe` (Recall: 0.6000)
- **Low Performers:**
  - `book` (Recall: 0.0000)
  - `cup` (Recall: 0.2500)
  - `camera` (Recall: 0.0000)

The extremely low recall for `book` and `camera` suggests that Grounding DINO's zero-shot capabilities for these specific domain appearances (or Objectron's specific manifestations of them) are weak. They likely suffer heavily from P1 (no proposal) or P2 (poor bounding boxes).

## Next Steps
- Implement the **Category Gate (M2-B)** to fuse Grounding DINO's confidence with the project's visual category head.
- Investigate prompt engineering for low-performing categories (e.g., "a camera", "a physical book").
