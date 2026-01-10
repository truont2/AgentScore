from pricing import calculate_cost, MODEL_PRICING
import pytest


def test_calculate_cost_gpt4():
    """Acceptance criteria: calculate_cost('gpt-4', 1000, 1000) returns $0.09"""
    # Input: (30.00 / 1M) * 1000 = 0.03
    # Output: (60.00 / 1M) * 1000 = 0.06
    # Total: 0.09
    result = calculate_cost("gpt-4", 1000, 1000)
    assert result == 0.09


def test_calculate_cost_gemini_flash():
    """Test Gemini 3 Flash pricing"""
    # Input: (0.50 / 1M) * 1000 = 0.0005
    # Output: (3.00 / 1M) * 1000 = 0.003
    # Total: 0.0035
    result = calculate_cost("gemini-3-flash-preview", 1000, 1000)
    assert result == 0.0035


def test_unknown_model_raises_error():
    """Should raise ValueError for unknown models"""
    with pytest.raises(ValueError):
        calculate_cost("fake-model-xyz", 1000, 1000)