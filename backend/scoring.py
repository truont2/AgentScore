"""
Scoring algorithm for assigning a value to an agentic system.
"""

def calculate_letter_grade(score: int) -> str:
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"

def calculate_efficiency_score(analysis_results: dict) -> dict:
    """
    Calculates an efficiency score (0-100) based on detected inefficiencies.
    
    Penalties:
    - Redundancy: -15 points per entry
    - Model Overkill: -10 points per entry
    - Context Bloat: -5 points per 1000 wasted tokens
    """
    score = 100
    
    
    # 1. Redundancy Penalty (Support both 'redundancies' and 'redundant_calls' keys)
    # Check for 'items' wrapper OR direct list
    redundancies = analysis_results.get("redundancies") or analysis_results.get("redundant_calls") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
        
    redundancy_count = len(redundancies)
    score -= (redundancy_count * 15)
    
    # 2. Model Overkill Penalty
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
        
    overkill_count = len(overkill)
    score -= (overkill_count * 10)
    
    # 3. Context Bloat Penalty
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
        
    total_bloat_tokens = 0
    
    for item in bloat_items:
        current = item.get("current_tokens", 0)
        necessary = item.get("estimated_necessary_tokens", 0)
        # If explicitly calculated in finding
        if necessary > 0 and current > necessary:
            total_bloat_tokens += (current - necessary)
        # Fallback if specific excess not calculated but item exists
        elif item.get("unnecessary_token_count"):
             total_bloat_tokens += item.get("unnecessary_token_count", 0)
        else:
            # Conservative default if we just know it's bloated but not how much
            # Assuming at least 500 wasted tokens if flagged
            total_bloat_tokens += 500
            
    # -5 points per 1000 tokens (or -0.005 per token)
    bloat_penalty = int(total_bloat_tokens * 0.005)
    score -= bloat_penalty
    
    # Clamp score between 0 and 100
    score = max(0, min(100, score))
    
    return {
        "score": score,
        "grade": calculate_letter_grade(score),
        "breakdown": {
            "redundancy_penalty": redundancy_count * 15,
            "overkill_penalty": overkill_count * 10,
            "bloat_penalty": bloat_penalty
        }
    }
