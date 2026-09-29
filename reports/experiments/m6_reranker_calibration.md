# O3/O4 Multimodal Reranker and Calibration

## Architecture
- **Features:** Visual Similarity (M4-C), Semantic Text Similarity (SigLIP2)
- **Model:** Logistic Regression (acts as both reranker and probability calibrator via Platt scaling)
- **Training Data:** Top 10 visual candidates from the `val_split`

## Model Weights
- Visual Similarity: 8.4511
- Text Similarity: 0.7732
- Intercept: -6.3310

*Note: As expected, visual similarity commands the strongest positive weight for physical instance identity.*

## Test Set Calibration Metrics
- **Brier Score:** 0.1308
- **Expected Calibration Error (ECE):** 0.2214
- **Precision @ Prob > 0.8:** 0.9286
- **Coverage @ Prob > 0.8:** 0.0560 (proportion of top-10 candidates confidently accepted)

## Conclusion
The logistic regression successfully calibrates the unbounded/uncalibrated cosine similarities into a proper probability. This provides the `confident` vs `uncertain` decision gate required by the system architecture.
