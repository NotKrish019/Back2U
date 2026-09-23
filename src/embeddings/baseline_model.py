import torch
import torchvision.transforms as T
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image

class BaselineImageEncoder:
    """
    Simplest credible baseline image encoder.
    Uses a frozen pre-trained ResNet50 to extract visual embeddings.
    """
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        # Load pre-trained ResNet
        self.model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V1)
        self.model.eval()
        self.model.to(self.device)
        
        # Remove the final classification layer to get the 2048-dim feature vector
        self.model.fc = torch.nn.Identity()
        
        self.transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def encode_image(self, image_path: str) -> torch.Tensor:
        """
        Loads an image from disk and returns its L2-normalized embedding.
        The L2 normalization ensures cosine similarity can be computed via dot product.
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
            # Return a zero vector if encoding fails to keep pipeline running
            return torch.zeros(2048)
