import os
import json
import torch
import torch.nn as nn
from PIL import Image
from transformers import AutoProcessor, AutoModel
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

def load_m4c_model():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = M4C_Model().to(device)
    state_dict = torch.load("models/checkpoints/m4_c/best_val_recall_at_1.pt", map_location=device)
    model.proj.load_state_dict(state_dict)
    model.eval()
    return model, device

def load_siglip():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    processor = AutoProcessor.from_pretrained("google/siglip-base-patch16-224")
    model = AutoModel.from_pretrained("google/siglip-base-patch16-224").to(device)
    model.eval()
    return model, processor, device

def get_siglip_embeddings(model, processor, device, image_paths, texts):
    # Images
    images = [Image.open(p).convert("RGB") for p in image_paths]
    inputs = processor(images=images, text=texts, return_tensors="pt", padding="max_length").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        image_embeds = outputs.image_embeds
        text_embeds = outputs.text_embeds
        
        # Normalize
        image_embeds = image_embeds / image_embeds.norm(p=2, dim=-1, keepdim=True)
        text_embeds = text_embeds / text_embeds.norm(p=2, dim=-1, keepdim=True)
        
    return image_embeds, text_embeds

def compute_metrics(sim_matrix, is_positive_matrix):
    # sim_matrix: [num_queries, num_gallery]
    # is_positive_matrix: [num_queries, num_gallery] boolean
    
    num_queries = sim_matrix.shape[0]
    recalls = {1: 0, 5: 0, 10: 0}
    mrr = 0.0
    
    for i in range(num_queries):
        sims = sim_matrix[i]
        pos_mask = is_positive_matrix[i]
        
        if not pos_mask.any():
            num_queries -= 1 # Skip if no valid targets
            continue
            
        sorted_indices = torch.argsort(sims, descending=True)
        
        rank = -1
        for r, idx in enumerate(sorted_indices):
            if pos_mask[idx]:
                rank = r + 1
                break
                
        if rank > 0:
            mrr += 1.0 / rank
            if rank <= 1: recalls[1] += 1
            if rank <= 5: recalls[5] += 1
            if rank <= 10: recalls[10] += 1
            
    if num_queries == 0:
        return 0, 0, 0, 0
        
    return (
        recalls[1] / num_queries,
        recalls[5] / num_queries,
        recalls[10] / num_queries,
        mrr / num_queries
    )

def main():
    print("Loading test data...")
    gallery = []
    
    with open("data/processed/test_split.jsonl") as f:
        for line in f:
            if not line.strip(): continue
            r = json.loads(line)
            gallery.append(r)
            
    # For a realistic instance benchmark, we evaluate visual embedding for all instances
    # and text for a controlled query set.
    
    print("Loading models...")
    m4c, dev_m4 = load_m4c_model()
    siglip, processor, dev_sig = load_siglip()
    
    # 1. Precompute gallery embeddings
    print("Precomputing gallery embeddings...")
    gallery_paths = [g["image_path"] for g in gallery]
    
    m4c_gallery_embeds = []
    siglip_gallery_embeds = []
    
    for p in gallery_paths:
        try:
            # M4C
            m4c_emb = m4c(p)
            m4c_emb = m4c_emb / m4c_emb.norm(p=2, dim=-1)
            m4c_gallery_embeds.append(m4c_emb.detach().cpu())
        except:
            m4c_gallery_embeds.append(torch.zeros(256))
            
    # SigLIP visual embeddings in batches
    batch_size = 16
    for i in range(0, len(gallery_paths), batch_size):
        batch_paths = gallery_paths[i:i+batch_size]
        valid_paths = [p for p in batch_paths if os.path.exists(p)]
        if not valid_paths: continue
        i_emb, _ = get_siglip_embeddings(siglip, processor, dev_sig, valid_paths, ["dummy"]*len(valid_paths))
        for emb in i_emb:
            siglip_gallery_embeds.append(emb.cpu())
            
    m4c_gallery_embeds = torch.stack(m4c_gallery_embeds)
    siglip_gallery_embeds = torch.stack(siglip_gallery_embeds)
    
    print("--- M4-C VISUAL ONLY (BASELINE) ---")
    # Query every image against every other image, positive if same instance ID
    sim_m4c = torch.mm(m4c_gallery_embeds, m4c_gallery_embeds.t())
    # Mask out self
    sim_m4c.fill_diagonal_(-1.0)
    
    is_pos = torch.zeros((len(gallery), len(gallery)), dtype=torch.bool)
    for i, g1 in enumerate(gallery):
        for j, g2 in enumerate(gallery):
            if i != j and g1["item_instance_id"] == g2["item_instance_id"]:
                is_pos[i, j] = True
                
    r1, r5, r10, mrr = compute_metrics(sim_m4c, is_pos)
    print(f"M4-C -> R@1: {r1:.4f} | R@5: {r5:.4f} | R@10: {r10:.4f} | MRR: {mrr:.4f}")
    
    print("\n--- M5-A TEXT-TO-IMAGE ---")
    # Category level queries
    categories = ["laptop", "shoe", "bottle", "cup"]
    # We will test retrieving ALL items of a category (positive = matches category)
    # This evaluates semantic text-to-image
    _, text_embeds = get_siglip_embeddings(siglip, processor, dev_sig, [gallery_paths[0]]*len(categories), categories)
    text_embeds = text_embeds.cpu()
    
    sim_text = torch.mm(text_embeds, siglip_gallery_embeds.t())
    is_pos_cat = torch.zeros((len(categories), len(gallery)), dtype=torch.bool)
    for i, cat in enumerate(categories):
        for j, g in enumerate(gallery):
            if g["item_category"] == cat:
                is_pos_cat[i, j] = True
                
    r1, r5, r10, mrr = compute_metrics(sim_text, is_pos_cat)
    print(f"SigLIP Text (Category) -> R@1: {r1:.4f} | R@5: {r5:.4f} | R@10: {r10:.4f} | MRR: {mrr:.4f}")
    
    print("\n--- M5-B IMAGE + TEXT (FUSED) ---")
    # We do a basic fusion: Visual M4-C Similarity + Text SigLIP Similarity
    # Query: an image + its correct category text
    # Gallery: all images
    
    # We use all gallery items as queries, paired with their true category as text
    fused_r1_list = []
    fused_mrr_list = []
    
    # Pre-embed the category texts
    cat_texts = [g["item_category"] for g in gallery]
    # batch text embeddings
    siglip_q_text_embeds = []
    for i in range(0, len(cat_texts), batch_size):
        batch_t = cat_texts[i:i+batch_size]
        _, t_emb = get_siglip_embeddings(siglip, processor, dev_sig, [gallery_paths[0]]*len(batch_t), batch_t)
        siglip_q_text_embeds.append(t_emb.cpu())
    siglip_q_text_embeds = torch.cat(siglip_q_text_embeds, dim=0)
    
    # Fused similarity: 0.7 * M4C_Visual + 0.3 * SigLIP_Text
    # M4C Visual Sim
    sim_vis = torch.mm(m4c_gallery_embeds, m4c_gallery_embeds.t())
    sim_vis.fill_diagonal_(-1.0)
    
    # Text Sim
    sim_txt = torch.mm(siglip_q_text_embeds, siglip_gallery_embeds.t())
    sim_txt.fill_diagonal_(-1.0)
    
    sim_fused = 0.7 * sim_vis + 0.3 * sim_txt
    
    r1_f, r5_f, r10_f, mrr_f = compute_metrics(sim_fused, is_pos)
    print(f"Fused (0.7 Vis + 0.3 Txt) -> R@1: {r1_f:.4f} | R@5: {r5_f:.4f} | R@10: {r10_f:.4f} | MRR: {mrr_f:.4f}")

    print("\n--- VISUAL-SEMANTIC CONFLICT TEST ---")
    # Query visual: black laptop (find a laptop in the gallery)
    # Query text: "shoe"
    laptop_idx = -1
    for i, g in enumerate(gallery):
        if g["item_category"] == "laptop":
            laptop_idx = i
            break
            
    if laptop_idx != -1:
        # Visual = laptop
        q_vis = m4c_gallery_embeds[laptop_idx].unsqueeze(0)
        sim_vis_conflict = torch.mm(q_vis, m4c_gallery_embeds.t())
        
        # Text = shoe
        _, t_emb = get_siglip_embeddings(siglip, processor, dev_sig, [gallery_paths[0]], ["shoe"])
        t_emb = t_emb.cpu()
        sim_txt_conflict = torch.mm(t_emb, siglip_gallery_embeds.t())
        
        sim_fused_conflict = 0.7 * sim_vis_conflict + 0.3 * sim_txt_conflict
        sim_fused_conflict[0, laptop_idx] = -1.0
        
        # Top 5 for Visual Only
        v_top = torch.topk(sim_vis_conflict[0], 5).indices
        print(f"Visual-only Top-5 Categories:")
        for idx in v_top:
            if idx != laptop_idx:
                print(f"  - {gallery[idx]['item_category']}")
                
        # Top 5 for Conflict Fused
        f_top = torch.topk(sim_fused_conflict[0], 5).indices
        print(f"Fused (Laptop Vis + 'shoe' Text) Top-5 Categories:")
        for idx in f_top:
            if idx != laptop_idx:
                print(f"  - {gallery[idx]['item_category']}")
        print("Note: If 'shoe' pushes shoe items into top-5, the text signal is actively affecting retrieval.")

if __name__ == "__main__":
    main()
