import torch
import torch.nn as nn
from torchvision.models import resnet50, ResNet50_Weights

class SiameseNetwork(nn.Module):
    """
    Siamese Network for Instance Retrieval.
    Uses a ResNet50 backbone (optionally frozen) and a custom projection head.
    """
    def __init__(self, embedding_dim=128, freeze_backbone=True):
        super(SiameseNetwork, self).__init__()
        
        # Load pre-trained ResNet50
        self.backbone = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
        
        if freeze_backbone:
            # Freeze all backbone parameters
            for param in self.backbone.parameters():
                param.requires_grad = False
                
            # Unfreeze layer4 to allow some learning while saving memory
            for param in self.backbone.layer4.parameters():
                param.requires_grad = True
                
        # Get the number of features before the final classification layer (2048 for ResNet50)
        num_features = self.backbone.fc.in_features
        
        # Remove the classification layer
        self.backbone.fc = nn.Identity()
        
        # Projection Head: Compress 2048 dims down to embedding_dim
        # Using a small MLP allows the network to learn instance-specific metric spaces
        self.projection_head = nn.Sequential(
            nn.Linear(num_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Linear(512, embedding_dim)
        )

    def forward(self, x):
        """
        Forward pass. Extracts features and projects them into the embedding space.
        """
        features = self.backbone(x)
        embeddings = self.projection_head(features)
        
        # L2 Normalization so Euclidean distance matches Cosine Similarity
        embeddings = nn.functional.normalize(embeddings, p=2, dim=1)
        
        return embeddings
