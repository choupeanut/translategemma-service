from typing import Generator
from model_manager import model_manager, ModelManager

def get_model_manager() -> ModelManager:
    """
    Dependency to get the ModelManager instance.
    In a more complex setup, this could handle pool management or lazy loading
    logic tied to the request scope, but for a global singleton ML model,
    returning the instance is appropriate.
    """
    return model_manager
