import torch
import torchvision.transforms as T
from PIL import Image

class Dinov2ImageEncoder:
    """
    DINOv2 ViT-S/14 Frozen Baseline Image Encoder.
    Uses Facebook's pre-trained DINOv2 model.
    """
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Load pre-trained DINOv2 ViT-S/14
        self.model = torch.hub.load('facebookresearch/dinov2', 'dinov2_vits14')
        self.model.eval()
        self.model.to(self.device)
        
        self.transform = T.Compose([
            T.Resize(256, interpolation=T.InterpolationMode.BICUBIC),
            T.CenterCrop(224),
            T.ToTensor(),
            T.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ])

    def encode_image(self, image_path: str) -> torch.Tensor:
        """
        Loads an image from disk and returns its L2-normalized CLS embedding.
        """
        try:
            image = Image.open(image_path).convert("RGB")
            tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                embedding = self.model(tensor)
                # L2 Normalize the embedding for cosine similarity
                embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
                return embedding.cpu().squeeze()
        except Exception as e:
            print(f"Error encoding {image_path}: {e}")
            return torch.zeros(384) # ViT-S/14 produces 384-dim embeddings
