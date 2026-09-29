import torch
import torch.nn as nn

class M2CategoryHead(nn.Module):
    def __init__(self, num_categories, dropout_prob=0.1):
        super().__init__()
        self.encoder = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
        # Freeze DINOv2
        for param in self.encoder.parameters():
            param.requires_grad = False
            
        self.head = nn.Sequential(
            nn.Linear(384, 128),
            nn.GELU(),
            nn.Dropout(dropout_prob),
            nn.Linear(128, num_categories)
        )
        
    def forward(self, x):
        features = self.encoder(x) # [B, 384]
        logits = self.head(features)
        return logits
