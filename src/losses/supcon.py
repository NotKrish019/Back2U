import torch
import torch.nn as nn
import torch.nn.functional as F

class SupervisedContrastiveLoss(nn.Module):
    """
    Supervised Contrastive Learning Loss (SupCon).
    Pulls embeddings with the same class label (item_instance_id) closer,
    pushes embeddings with different labels apart.
    """
    def __init__(self, temperature: float = 0.07):
        super().__init__()
        self.temperature = temperature

    def forward(self, embeddings: torch.Tensor, labels: torch.Tensor) -> torch.Tensor:
        """
        embeddings: (batch_size, embed_dim) - L2 normalized embeddings
        labels: (batch_size,) - integer labels for instances
        """
        device = embeddings.device
        batch_size = embeddings.shape[0]

        # Compute cosine similarity matrix
        # embeddings are assumed to be L2 normalized
        similarity_matrix = torch.matmul(embeddings, embeddings.T) / self.temperature

        # Create a boolean mask for positive pairs (same label)
        labels = labels.contiguous().view(-1, 1)
        mask = torch.eq(labels, labels.T).float().to(device)
        
        # Remove self-similarity from positive mask
        logits_mask = torch.scatter(
            torch.ones_like(mask),
            1,
            torch.arange(batch_size).view(-1, 1).to(device),
            0
        )
        mask = mask * logits_mask

        # Check if there is at least one positive pair in the batch
        if mask.sum() == 0:
            raise ValueError("SupCon loss requires at least one positive pair per batch. Check your batch sampler!")

        # For numerical stability
        max_logits, _ = torch.max(similarity_matrix, dim=1, keepdim=True)
        logits = similarity_matrix - max_logits.detach()

        # Compute log probabilities
        exp_logits = torch.exp(logits) * logits_mask
        log_prob = logits - torch.log(exp_logits.sum(1, keepdim=True) + 1e-9)

        # Compute mean of log-likelihood over positive pairs
        mask_pos_count = mask.sum(1)
        # Avoid division by zero for instances that have no positive pairs in the batch
        mask_pos_count = torch.clamp(mask_pos_count, min=1.0)
        
        mean_log_prob_pos = (mask * log_prob).sum(1) / mask_pos_count

        # Loss
        loss = -mean_log_prob_pos
        
        # Only compute loss for elements that had at least one positive in the batch
        valid_loss = loss[mask.sum(1) > 0]
        
        if len(valid_loss) == 0:
            return torch.tensor(0.0, requires_grad=True).to(device)
            
        return valid_loss.mean()
