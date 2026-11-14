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


def load_m2_weights(model: M2CategoryHead, path, map_location="cpu") -> M2CategoryHead:
    """Load M2 weights from either checkpoint format.

    The DINOv2 encoder is frozen during training, so it is identical to the public
    pretrained weights that ``torch.hub`` already loads in ``__init__``. Checkpoints
    therefore only need the trained ``head``. Older checkpoints that also stored the
    encoder (``encoder.*`` keys) are still accepted.
    """
    state = torch.load(path, map_location=map_location)
    if any(k.startswith("encoder.") for k in state):
        model.load_state_dict(state)
    else:
        model.head.load_state_dict(state)
    return model
