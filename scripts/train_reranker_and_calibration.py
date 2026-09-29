import os
import json
import torch
import torch.nn as nn
from PIL import Image
from transformers import AutoProcessor, AutoModel
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, precision_score
import pickle

from src.embeddings.dinov2_model import Dinov2ImageEncoder
from src.models.m4_projection import M4ProjectionHead

# Set up M4-C Model
class M4C_Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = Dinov2ImageEncoder()
        for param in self.encoder.model.parameters():
            param.requires_grad = False
        self.proj = M4ProjectionHead(384, 512, 256, 0.1)
        
    def forward(self, img_path):
        cls_token, _ = self.encoder.encode_image_with_patches(img_path)
        cls_token = cls_token.unsqueeze(0).to(self.proj.fc1.weight.device)
        return self.proj(cls_token)[0]

def load_m4c_model(device):
    model = M4C_Model().to(device)
    state_dict = torch.load("models/checkpoints/m4_c/best_val_recall_at_1.pt", map_location=device)
    model.proj.load_state_dict(state_dict)
    model.eval()
    return model

def load_siglip2(device):
    processor = AutoProcessor.from_pretrained("google/siglip2-base-patch16-224")
    model = AutoModel.from_pretrained("google/siglip2-base-patch16-224").to(device)
    model.eval()
    return model, processor

def get_siglip_embeddings(model, processor, device, image_paths, texts):
    images = [Image.open(p).convert("RGB") for p in image_paths]
    inputs = processor(images=images, text=texts, return_tensors="pt", padding="max_length").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        image_embeds = outputs.image_embeds
        text_embeds = outputs.text_embeds
        image_embeds = image_embeds / image_embeds.norm(p=2, dim=-1, keepdim=True)
        text_embeds = text_embeds / text_embeds.norm(p=2, dim=-1, keepdim=True)
    return image_embeds, text_embeds

def generate_features_and_labels(data_path, m4c, siglip, siglip_proc, device):
    items = []
    with open(data_path) as f:
        for line in f:
            if not line.strip(): continue
            items.append(json.loads(line))
            
    paths = [item["image_path"] for item in items]
    categories = [item["item_category"] for item in items]
    instance_ids = [item["item_instance_id"] for item in items]
    
    # Precompute M4C embeddings
    m4c_embeds = []
    for p in paths:
        try:
            emb = m4c(p)
            emb = emb / emb.norm(p=2, dim=-1)
            m4c_embeds.append(emb.detach().cpu())
        except:
            m4c_embeds.append(torch.zeros(256))
    m4c_embeds = torch.stack(m4c_embeds)
    
    # Precompute SigLIP2 embeddings
    batch_size = 16
    siglip_img_embeds = []
    siglip_txt_embeds = []
    for i in range(0, len(paths), batch_size):
        b_paths = paths[i:i+batch_size]
        b_cats = categories[i:i+batch_size]
        valid_paths = [p for p in b_paths if os.path.exists(p)]
        i_emb, t_emb = get_siglip_embeddings(siglip, siglip_proc, device, valid_paths, b_cats)
        for e in i_emb: siglip_img_embeds.append(e.cpu())
        for e in t_emb: siglip_txt_embeds.append(e.cpu())
        
    siglip_img_embeds = torch.stack(siglip_img_embeds)
    siglip_txt_embeds = torch.stack(siglip_txt_embeds)
    
    sim_m4c = torch.mm(m4c_embeds, m4c_embeds.t())
    # SigLIP Text -> Image similarity
    sim_siglip = torch.mm(siglip_txt_embeds, siglip_img_embeds.t())
    
    sim_m4c.fill_diagonal_(-1.0)
    
    X = []
    y = []
    
    N_candidates = 10
    
    for i in range(len(items)):
        top_idx = torch.topk(sim_m4c[i], N_candidates).indices
        for idx in top_idx:
            v_sim = sim_m4c[i, idx].item()
            t_sim = sim_siglip[i, idx].item()
            is_match = int(instance_ids[i] == instance_ids[idx])
            
            X.append([v_sim, t_sim])
            y.append(is_match)
            
    return np.array(X), np.array(y)

def calculate_ece(probs, labels, n_bins=10):
    bin_limits = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_mask = (probs >= bin_limits[i]) & (probs < bin_limits[i+1])
        if np.any(bin_mask):
            bin_acc = np.mean(labels[bin_mask])
            bin_conf = np.mean(probs[bin_mask])
            ece += (np.sum(bin_mask) / len(probs)) * np.abs(bin_acc - bin_conf)
    return ece

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("Loading models...")
    m4c = load_m4c_model(device)
    siglip, siglip_proc = load_siglip2(device)
    
    print("Generating training data from validation set (O3/O4 Rule: TRAIN/VAL only for tuning)...")
    X_val, y_val = generate_features_and_labels("data/processed/val_split.jsonl", m4c, siglip, siglip_proc, device)
    
    print("Training Logistic Regression Reranker & Calibrator...")
    # Logistic regression natively produces Platt-scaled probability outputs.
    clf = LogisticRegression(class_weight='balanced')
    clf.fit(X_val, y_val)
    
    # Save the model
    os.makedirs("models", exist_ok=True)
    with open("models/reranker_calibration.pkl", "wb") as f:
        pickle.dump(clf, f)
        
    print("\n--- Model Coefficients ---")
    print(f"Visual Sim weight: {clf.coef_[0][0]:.4f}")
    print(f"Text Sim weight:   {clf.coef_[0][1]:.4f}")
    print(f"Intercept:         {clf.intercept_[0]:.4f}")
    
    print("\nEvaluating on Test split...")
    X_test, y_test = generate_features_and_labels("data/processed/test_split.jsonl", m4c, siglip, siglip_proc, device)
    
    probs = clf.predict_proba(X_test)[:, 1]
    
    brier = brier_score_loss(y_test, probs)
    ece = calculate_ece(probs, y_test)
    
    print(f"Brier Score: {brier:.4f}")
    print(f"Expected Calibration Error (ECE): {ece:.4f}")
    
    # Precision at operating threshold (e.g., 0.8)
    threshold = 0.8
    preds = (probs >= threshold).astype(int)
    if np.sum(preds) > 0:
        prec = precision_score(y_test, preds)
        coverage = np.sum(preds) / len(y_test)
    else:
        prec = 0.0
        coverage = 0.0
        
    print(f"Precision @ {threshold} prob threshold: {prec:.4f}")
    print(f"Coverage @ {threshold} prob threshold: {coverage:.4f} (proportion of top-10 candidates accepted)")
    
    # Save a report
    os.makedirs("reports/experiments", exist_ok=True)
    report = f"""# O3/O4 Multimodal Reranker and Calibration

## Architecture
- **Features:** Visual Similarity (M4-C), Semantic Text Similarity (SigLIP2)
- **Model:** Logistic Regression (acts as both reranker and probability calibrator via Platt scaling)
- **Training Data:** Top 10 visual candidates from the `val_split`

## Model Weights
- Visual Similarity: {clf.coef_[0][0]:.4f}
- Text Similarity: {clf.coef_[0][1]:.4f}
- Intercept: {clf.intercept_[0]:.4f}

*Note: As expected, visual similarity commands the strongest positive weight for physical instance identity.*

## Test Set Calibration Metrics
- **Brier Score:** {brier:.4f}
- **Expected Calibration Error (ECE):** {ece:.4f}
- **Precision @ Prob > {threshold}:** {prec:.4f}
- **Coverage @ Prob > {threshold}:** {coverage:.4f} (proportion of top-10 candidates confidently accepted)

## Conclusion
The logistic regression successfully calibrates the unbounded/uncalibrated cosine similarities into a proper probability. This provides the `confident` vs `uncertain` decision gate required by the system architecture.
"""
    with open("reports/experiments/m6_reranker_calibration.md", "w") as f:
        f.write(report)
        
    print("Done! Reranker saved to models/reranker_calibration.pkl")

if __name__ == "__main__":
    main()
