from abc import ABC, abstractmethod
from typing import Iterator
from src.data.schema import ItemInstanceRecord

class BaseDatasetAdapter(ABC):
    """
    Base interface for all dataset adapters.
    Adapters are responsible for downloading/parsing raw dataset metadata
    and yielding normalized ItemInstanceRecord objects.
    """
    
    @abstractmethod
    def generate_manifest(self) -> Iterator[ItemInstanceRecord]:
        """
        Parses the dataset source and yields canonical records.
        """
        pass
