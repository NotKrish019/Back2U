from typing import List
from src.api.schemas import RetrievalQuery, RetrievalResult, RetrievalResultItem
import random

class RetrievalService:
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        raise NotImplementedError()

class MockRetrievalService(RetrievalService):
    def search(self, query: RetrievalQuery) -> RetrievalResult:
        # ML is not connected yet; do not fabricate matches.
        return RetrievalResult(
            model_version="ml-pending",
            results=[]
        )

class RealRetrievalService(RetrievalService):
    def __init__(self):
        import torch
        from torchvision import transforms
        from src.models.siamese_network import SiameseNetwork
        from src.retrieval.faiss_index import RetrievalIndex
        from pathlib import Path
        import json
        from PIL import Image

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = SiameseNetwork().to(self.device)
        self.project_root = Path(__file__).resolve().parent.parent.parent.parent

        checkpoint_path = self.project_root / "models" / "checkpoints" / "mir_siamese_best.pth"
        if checkpoint_path.exists():
            self.model.load_state_dict(torch.load(checkpoint_path, map_location=self.device, weights_only=True))
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self.index = RetrievalIndex(embedding_dimension=128)
        test_split_path = self.project_root / "data" / "processed" / "test_split.jsonl"
        
        # Load index
        if test_split_path.exists():
            with open(test_split_path, 'r') as f:
                for line in f:
                    if not line.strip(): continue
                    rec = json.loads(line)
                    try:
                        img = Image.open(self.project_root / rec["image_path"]).convert("RGB")
                        img_tensor = self.transform(img).unsqueeze(0).to(self.device)
                        with torch.no_grad():
                            emb = self.model(img_tensor).cpu().numpy().flatten()
                        self.index.add_item(
                            item_instance_id=rec.get("instance_id") or rec.get("item_instance_id"),
                            embedding=emb,
                            metadata={"image_path": rec["image_path"]}
                        )
                    except Exception as e:
                        pass

    def search(self, query: RetrievalQuery) -> RetrievalResult:
        import torch
        from PIL import Image
        import base64
        import io
        
        # If we had real image bytes sent over:
        # For now, just generate a random embedding or parse dummy
        # Ideally query.image is a path or base64
        
        # Mocking the forward pass for this example since API doesn't handle actual images yet 
        # (It gets base64 strings in the real app)
        
        query_emb = None
        if query.image and query.image.startswith("data:image"):
            # strip header
            header, encoded = query.image.split(",", 1)
            img_data = base64.b64decode(encoded)
            img = Image.open(io.BytesIO(img_data)).convert("RGB")
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)
            with torch.no_grad():
                query_emb = self.model(img_tensor).cpu().numpy().flatten()
        else:
            # fallback dummy
            query_emb = torch.randn(128).numpy()

        raw_results = self.index.search(query_emb, top_k=query.top_k)
        
        results = []
        for res in raw_results:
            results.append(RetrievalResultItem(
                item_instance_id=res["item_instance_id"],
                similarity_score=round(res["similarity_score"], 4),
                rank=res["rank"]
            ))
            
        return RetrievalResult(
            model_version="mir-siamese-v0.1.0",
            results=results
        )

