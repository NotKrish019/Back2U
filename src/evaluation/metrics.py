from typing import List, Dict

def calculate_recall_at_k(results: List[Dict], ground_truth_id: str, k: int) -> int:
    """
    Calculates if the ground truth instance was retrieved within the Top K.
    Returns 1 if found, 0 otherwise.
    """
    top_k_results = results[:k]
    for candidate in top_k_results:
        if candidate["item_instance_id"] == ground_truth_id:
            return 1
    return 0

def calculate_mrr(results: List[Dict], ground_truth_id: str) -> float:
    """
    Calculates the Reciprocal Rank of the first relevant candidate.
    """
    for rank, candidate in enumerate(results, 1):
        if candidate["item_instance_id"] == ground_truth_id:
            return 1.0 / rank
    return 0.0
