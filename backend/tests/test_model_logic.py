import pytest
from unittest.mock import MagicMock, patch
from model_manager import ModelManager

@pytest.fixture
def mock_model_manager():
    with patch('model_manager.AutoTokenizer') as mock_tokenizer, \
         patch('model_manager.AutoModelForCausalLM') as mock_model:
        
        manager = ModelManager()
        # Reset singleton state for testing
        manager.model = None
        manager.tokenizer = None
        manager.current_model_name = None
        
        yield manager

def test_singleton(mock_model_manager):
    m1 = ModelManager()
    m2 = ModelManager()
    assert m1 is m2

def test_load_model_calls_huggingface(mock_model_manager):
    mock_model_manager.load_model("test-model", quantize=False)
    assert mock_model_manager.current_model_name == "test-model"
    assert mock_model_manager.model is not None

def test_get_status_not_loaded(mock_model_manager):
    mock_model_manager.model = None
    status = mock_model_manager.get_status()
    assert status["status"] == "not_loaded"
