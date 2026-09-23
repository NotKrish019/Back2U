import faiss
import numpy as np
from typing import List, Dict, Any

class RetrievalIndex:
    """
    Abstration over FAISS for nearest-neighbor search.
    Implements the Retrieval Contract for Coworker 2.
    """
    def __init__(self, embedding_dimension: int = 2048):
        self.embedding_dimension = embedding_dimension
        # IndexFlatIP calculates Inner Product. 
        # Since our embeddings are L2 normalized, this equals cosine similarity.
        self.index = faiss.IndexFlatIP(embedding_dimension)
        
        # Keep track of mapping from integer FAISS ID to our string instance ID
        self.id_map = {}
        self.metadata = {}
        self.current_id = 0

    def add_item(self, item_instance_id: str, embedding: np.ndarray, metadata: Dict[str, Any] = None):
        """Adds a candidate item to the retrieval index."""
        if embedding.shape[0] != self.embedding_dimension:
            raise ValueError(f"Expected embedding of dim {self.embedding_dimension}, got {embedding.shape[0]}")
            
        vector = embedding.reshape(1, -1).astype('float32')
        self.index.add(vector)
        
        self.id_map[self.current_id] = item_instance_id
        if metadata is not None:
            self.metadata[self.current_id] = metadata
            
        self.current_id += 1

    def search(self, query_embedding: np.ndarray, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Searches the index for the Top-K most similar candidates.
        Returns the retrieval response following the project contract.
        """
        if self.index.ntotal == 0:
            return []
            
        vector = query_embedding.reshape(1, -1).astype('float32')
        # FAISS search returns similarity scores (distances) and indices
        scores, indices = self.index.search(vector, min(top_k, self.index.ntotal))
        
        results = []
        for rank, (score, idx) in enumerate(zip(scores[0], indices[0])):
            if idx == -1: continue # FAISS returns -1 if not enough results
            
            results.append({
                "item_instance_id": self.id_map[idx],
                "similarity_score": float(score),
                "rank": rank + 1,
                "metadata": self.metadata.get(idx, {})
            })
            
        return results
