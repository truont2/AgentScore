import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import (
    calculate_efficiency_score, 
    calculate_letter_grade,
    calculate_redundancy_score,
    calculate_model_fit_score,
    calculate_context_efficiency_score,
    calculate_savings_breakdown
)

def test_perfect_score():
    analysis = {
        "redundancies": {"items": []},
        "model_overkill": {"items": []},
        "prompt_bloat": {"items": []}
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 100
    assert result["grade"] == "A"

def test_redundancy_penalty():
    # 2 redundancies = -30 points
    analysis = {
        "redundancies": {"items": [{}, {}]},
        "model_overkill": {"items": []},
        "prompt_bloat": {"items": []}
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 70
    assert result["grade"] == "C"

def test_overkill_penalty():
    # 3 overkills = -30 points
    analysis = {
        "redundancies": {"items": []},
        "model_overkill": {"items": [{}, {}, {}]},
        "prompt_bloat": {"items": []}
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 70
    assert result["grade"] == "C"

def test_bloat_penalty():
    # 1000 tokens wasted = -5 points
    analysis = {
        "prompt_bloat": {
            "items": [
                {"estimated_necessary_tokens": 500, "current_tokens": 1500} # 1000 excess
            ]
        }
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 95 # 100 - 5
    assert result["grade"] == "A"

def test_vulnerable_agent_simulation():
    # Simulation of a very bad agent
    # 2 Redundancies (-30), 2 Overkills (-20), 4000 Bloat Tokens (-20)
    # Total Penalty: -70. Score: 30
    analysis = {
        "redundancies": {"items": [{}, {}]},
        "model_overkill": {"items": [{}, {}]},
        "prompt_bloat": {
            "items": [
                {"estimated_necessary_tokens": 100, "current_tokens": 2100}, # 2000 excess
                {"estimated_necessary_tokens": 100, "current_tokens": 2100}  # 2000 excess
            ]
        }
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 30
    assert result["grade"] == "F"

def test_score_floor():
    # Ensure score doesn't go below 0
    analysis = {
        "redundancies": {"items": [{}] * 10}, # -150
    }
    result = calculate_efficiency_score(analysis)
    assert result["score"] == 0
    assert result["grade"] == "F"


# NEW TESTS FOR SUB-SCORES

def test_redundancy_score_calculation():
    """Test redundancy score: 5 calls, 2 redundant → 60%"""
    redundancies = [
        {"call_ids": ["call_0", "call_2"]}  # 2 calls, 1 is redundant
    ]
    score = calculate_redundancy_score(redundancies, total_calls=5)
    assert score == 80  # 100 * (1 - 1/5) = 80

def test_redundancy_score_perfect():
    """Test no redundancies → 100%"""
    score = calculate_redundancy_score([], total_calls=5)
    assert score == 100

def test_model_fit_score_calculation():
    """Test model fit score: 5 calls, 1 overkill → 80%"""
    overkill_items = [{"call_id": "call_3"}]
    score = calculate_model_fit_score(overkill_items, total_calls=5)
    assert score == 80  # 100 * (1 - 1/5) = 80

def test_model_fit_score_perfect():
    """Test no overkill → 100%"""
    score = calculate_model_fit_score([], total_calls=5)
    assert score == 100

def test_context_efficiency_score_calculation():
    """Test context efficiency: 8000 tokens sent, only 2000 needed → 25%"""
    bloat_items = [
        {"current_tokens": 8000, "estimated_necessary_tokens": 2000}  # 6000 excess
    ]
    events = [
        {"tokens_in": 8000}
    ]
    score = calculate_context_efficiency_score(bloat_items, events)
    assert score == 25  # 100 * (2000 / 8000) = 25

def test_context_efficiency_score_perfect():
    """Test no bloat → 100%"""
    events = [{"tokens_in": 1000}]
    score = calculate_context_efficiency_score([], events)
    assert score == 100


# NEW TESTS FOR OPTIMIZED SCORES

def test_optimized_scores_returned():
    """Test that calculate_efficiency_score returns optimized predictions"""
    analysis = {
        "redundancies": {"items": [{"call_ids": ["call_0", "call_1"]}]},
        "model_overkill": {"items": [{"call_id": "call_2"}]},
        "prompt_bloat": {"items": [{"current_tokens": 5000, "estimated_necessary_tokens": 500}]}
    }
    events = [
        {"tokens_in": 1000, "run_id": "call_0", "cost": 0.001},
        {"tokens_in": 1000, "run_id": "call_1", "cost": 0.001},
        {"tokens_in": 1000, "run_id": "call_2", "cost": 0.002},
        {"tokens_in": 5000, "run_id": "call_3", "cost": 0.005},
        {"tokens_in": 1000, "run_id": "call_4", "cost": 0.001}
    ]
    
    result = calculate_efficiency_score(analysis, events=events)
    
    # Check new fields exist
    assert "sub_scores" in result
    assert "optimized_sub_scores" in result
    assert "optimized_score" in result
    assert "savings_breakdown" in result
    
    # Optimized scores should be better than current
    assert result["optimized_sub_scores"]["redundancy"] == 100
    assert result["optimized_sub_scores"]["model_fit"] == 100
    assert result["optimized_score"] > result["score"]


# NEW TESTS FOR SAVINGS BREAKDOWN

def test_savings_breakdown_structure():
    """Test that savings breakdown has correct structure"""
    analysis = {
        "redundancies": {"items": []},
        "model_overkill": {"items": []},
        "prompt_bloat": {"items": []}
    }
    events = [{"tokens_in": 1000, "cost": 0.001}]
    
    result = calculate_efficiency_score(analysis, events=events)
    breakdown = result["savings_breakdown"]
    
    assert "redundancy_savings" in breakdown
    assert "model_fit_savings" in breakdown
    assert "context_efficiency_savings" in breakdown
    assert "total_savings" in breakdown
    assert breakdown["total_savings"] == 0.0

def test_savings_breakdown_calculation():
    """Test savings calculation for redundancies"""
    analysis = {
        "redundancies": {"items": [{"call_ids": ["call_0", "call_1"]}]},
        "model_overkill": {"items": []},
        "prompt_bloat": {"items": []}
    }
    events = [
        {"run_id": "call_0", "cost": 0.001, "tokens_in": 100},
        {"run_id": "call_1", "cost": 0.001, "tokens_in": 100},
        {"run_id": "call_2", "cost": 0.002, "tokens_in": 200}
    ]
    
    breakdown = calculate_savings_breakdown(analysis, events)
    
    # Should save cost of 1 redundant call
    assert breakdown["redundancy_savings"] == 0.001
    assert breakdown["total_savings"] == 0.001


# INTEGRATION TEST

def test_full_integration_with_events():
    """Test complete flow with realistic vulnerable agent data"""
    analysis = {
        "redundancies": {"items": [{"call_ids": ["call_0", "call_2"]}]},
        "model_overkill": {"items": [{"call_id": "call_3", "current_model": "gemini-2.5-flash", "recommended_model": "gemini-2.5-flash-lite"}]},
        "prompt_bloat": {"items": [{"call_id": "call_4", "current_tokens": 5782, "estimated_necessary_tokens": 50}]}
    }
    
    events = [
        {"run_id": "call_0", "tokens_in": 100, "tokens_out": 50, "cost": 0.0001, "model": "gemini-2.5-flash-lite"},
        {"run_id": "call_1", "tokens_in": 100, "tokens_out": 50, "cost": 0.0001, "model": "gemini-2.5-flash-lite"},
        {"run_id": "call_2", "tokens_in": 100, "tokens_out": 50, "cost": 0.0001, "model": "gemini-2.5-flash-lite"},
        {"run_id": "call_3", "tokens_in": 20, "tokens_out": 10, "cost": 0.0002, "model": "gemini-2.5-flash"},
        {"run_id": "call_4", "tokens_in": 5782, "tokens_out": 20, "cost": 0.0020, "model": "gemini-2.5-flash-lite"}
    ]
    
    result = calculate_efficiency_score(analysis, events=events)
    
    # Verify all new fields are populated
    assert result["sub_scores"]["redundancy"] < 100  # Has redundancy
    assert result["sub_scores"]["model_fit"] < 100  # Has overkill
    assert result["sub_scores"]["context_efficiency"] < 100  # Has bloat
    
    assert result["optimized_sub_scores"]["redundancy"] == 100
    assert result["optimized_sub_scores"]["model_fit"] == 100
    assert result["optimized_sub_scores"]["context_efficiency"] > result["sub_scores"]["context_efficiency"]
    
    assert result["optimized_score"] > result["score"]
    
    assert result["savings_breakdown"]["total_savings"] > 0
