import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import calculate_efficiency_score, calculate_letter_grade

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
