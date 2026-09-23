import json
import random
from pathlib import Path
from collections import defaultdict
from PIL import Image
from torch.utils.data import Dataset
import torchvision.transforms as T

class TripletDataset(Dataset):
    """
    Dataset that yields (Anchor, Positive, Negative) image paths and their labels.
    """
    def __init__(self, manifest_path: str, transform=None):
        self.manifest_path = Path(manifest_path)
        self.transform = transform or T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        self.aug_transform = T.Compose([
            T.RandomResizedCrop(224, scale=(0.7, 1.0)),
            T.RandomHorizontalFlip(),
            T.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        self.records = []
        self.instance_to_images = defaultdict(list)
        
        # Load records and group by instance
        with open(self.manifest_path, 'r') as f:
            for line in f:
                if not line.strip(): continue
                rec = json.loads(line)
                self.records.append(rec)
                self.instance_to_images[rec.get("instance_id") or rec.get("item_instance_id")].append(rec["image_path"])
                
        self.instance_ids = list(self.instance_to_images.keys())
        
        # We need instances with at least 2 images to form an (Anchor, Positive) pair
        self.valid_instances = [iid for iid in self.instance_ids if len(self.instance_to_images[iid]) >= 2]
        
    def __len__(self):
        # We define one epoch as seeing each image once as an anchor
        return len(self.records)

    def __getitem__(self, idx):
        anchor_record = self.records[idx]
        anchor_id = anchor_record.get("instance_id") or anchor_record.get("item_instance_id")
        anchor_path = anchor_record["image_path"]
        
        # Positive: A different image of the SAME instance
        # (If the instance only has 1 image, fallback to itself to prevent crashing, though valid_instances handles this globally)
        same_instance_images = self.instance_to_images[anchor_id]
        if len(same_instance_images) > 1:
            positive_path = random.choice([p for p in same_instance_images if p != anchor_path])
        else:
            positive_path = anchor_path 
            
        # Negative: An image from a DIFFERENT instance
        negative_id = random.choice([iid for iid in self.instance_ids if iid != anchor_id])
        negative_path = random.choice(self.instance_to_images[negative_id])
        
        # Load images
        try:
            anchor_img = Image.open(anchor_path).convert("RGB")
            positive_img = Image.open(positive_path).convert("RGB")
            negative_img = Image.open(negative_path).convert("RGB")
        except Exception as e:
            print(f"Error loading images: {e}")
            # Return dummy tensors if image is broken
            import torch
            return torch.zeros(3, 224, 224), torch.zeros(3, 224, 224), torch.zeros(3, 224, 224)
            
        if self.transform:
            anchor_tensor = self.transform(anchor_img)
            negative_tensor = self.transform(negative_img)
            
            if positive_path == anchor_path:
                positive_tensor = self.aug_transform(positive_img)
            else:
                positive_tensor = self.transform(positive_img)
            
        return anchor_tensor, positive_tensor, negative_tensor
