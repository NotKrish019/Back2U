import torch
import torch.nn as nn
import torch.nn.functional as F

class M4ProjectionHead(nn.Module):
    """
    MLP Projection Head for M4 instance re-identification.
    Projects frozen backbone embeddings to a compact, normalized metric space.
    
    Architecture:
    Input (e.g., 384 for DINOv2 ViT-S)
    -> Linear(input_dim, hidden_dim)
    -> GELU
    -> Dropout(p)
    -> Linear(hidden_dim, output_dim)
    -> L2 Normalization
    """
    def __init__(self, input_dim: int = 384, hidden_dim: int = 512, output_dim: int = 256, dropout: float = 0.1):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.gelu = nn.GELU()
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(hidden_dim, output_dim)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.fc1(x)
        x = self.gelu(x)
        x = self.dropout(x)
        x = self.fc2(x)
        # L2 Normalization for cosine similarity metric space
        x = F.normalize(x, p=2, dim=1)
        return x

class GeMPooling(nn.Module):
    def __init__(self, p=3.0, eps=1e-6):
        super().__init__()
        self.p = nn.Parameter(torch.ones(1) * p)
        self.eps = eps
        
    def forward(self, x):
        # x shape: (B, N, D)
        # pool over N (sequence length)
        x_clamp = x.clamp(min=self.eps)
        x_pow = x_clamp.pow(self.p)
        x_mean = x_pow.mean(dim=1)
        return x_mean.pow(1.0 / self.p)

class M4BFusionModel(nn.Module):
    """
    Fuses global CLS token and local patch tokens.
    """
    def __init__(self, input_dim=384, hidden_dim=512, output_dim=256, dropout=0.1, alpha=0.5):
        super().__init__()
        self.alpha = alpha
        
        # Global Branch
        self.global_proj = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim)
        )
        
        # Local Branch
        self.local_pool = GeMPooling(p=3.0)
        self.local_proj = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, output_dim)
        )
        
    def forward_global(self, cls_token):
        g = self.global_proj(cls_token)
        return F.normalize(g, p=2, dim=1)
        
    def forward_local(self, patch_tokens):
        # patch_tokens: (B, N, D)
        norm_patches = F.normalize(patch_tokens, p=2, dim=-1)
        pooled = self.local_pool(norm_patches)
        l = self.local_proj(pooled)
        return F.normalize(l, p=2, dim=1)
        
    def forward(self, cls_token, patch_tokens, mode="fused"):
        if mode == "global":
            return self.forward_global(cls_token)
        elif mode == "local":
            return self.forward_local(patch_tokens)
        else:
            g = self.forward_global(cls_token)
            l = self.forward_local(patch_tokens)
            fused = self.alpha * g + (1 - self.alpha) * l
            return F.normalize(fused, p=2, dim=1)

