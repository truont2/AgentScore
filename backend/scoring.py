"""
Scoring algorithm for assigning a value to an agentic system.
"""

from typing import Dict, Any, List, Optional
from pricing import calculate_cost, MODEL_PRICING, normalize_model_name

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


def calculate_redundancy_score(redundancies: List[Dict], total_calls: int) -> int:
    """
    Calculate redundancy score (0-100) based on what percentage of calls are NOT redundant.
    Formula: 100 × (1 - redundant_calls / total_calls)
    """
    if total_calls == 0:
        return 100  # No calls = perfect score
    
    # Count how many calls are redundant (all duplicates except the one to keep)
    redundant_call_count = 0
    for finding in redundancies:
        call_ids = finding.get("call_ids", [])
        # All calls in the group are redundant except one (the one we keep)
        if len(call_ids) > 1:
            redundant_call_count += len(call_ids) - 1
    
    score = 100 * (1 - redundant_call_count / total_calls)
    return int(max(0, min(100, score)))


def calculate_model_fit_score(overkill_items: List[Dict], total_calls: int) -> int:
    """
    Calculate model fit score (0-100) based on what percentage of calls use appropriate models.
    Formula: 100 × (1 - overkill_calls / total_calls)
    """
    if total_calls == 0:
        return 100
    
    overkill_count = len(overkill_items)
    score = 100 * (1 - overkill_count / total_calls)
    return int(max(0, min(100, score)))


def calculate_context_efficiency_score(bloat_items: List[Dict], events: List[Dict]) -> int:
    """
    Calculate context efficiency score (0-100) based on ratio of necessary tokens to actual tokens.
    Formula: 100 × (necessary_tokens / actual_tokens)
    """
    if not events:
        return 100
    
    # Calculate total tokens sent and total necessary tokens
    total_actual_tokens = sum(e.get("tokens_in", 0) for e in events)
    
    if total_actual_tokens == 0:
        return 100
    
    # Calculate total necessary tokens
    total_necessary_tokens = total_actual_tokens  # Start with assumption all are necessary
    
    for item in bloat_items:
        current = item.get("current_tokens", 0)
        necessary = item.get("estimated_necessary_tokens", 0)
        
        if necessary > 0 and current > necessary:
            # Subtract the excess (bloat) from necessary tokens
            total_necessary_tokens -= (current - necessary)
        elif item.get("unnecessary_token_count"):
            total_necessary_tokens -= item.get("unnecessary_token_count", 0)
    
    score = 100 * (total_necessary_tokens / total_actual_tokens)
    return int(max(0, min(100, score)))


def calculate_optimized_context_efficiency(current_efficiency: int, bloat_items: List[Dict]) -> int:
    """
    Estimate optimized context efficiency after removing bloat.
    If there's significant bloat, we can improve significantly. Otherwise, stay at current level.
    """
    if not bloat_items:
        return current_efficiency
    
    # Assume we can remove most of the bloat (80% improvement toward 100)
    improvement_potential = 100 - current_efficiency
    optimized = current_efficiency + int(improvement_potential * 0.8)
    
    return min(100, optimized)


def match_call_id_to_event(call_id: str, events: List[Dict]) -> Optional[Dict]:
    """
    Match Gemini's call_id to actual event by extracting sequence number.
    
    Gemini creates IDs like:
    - "llm_call_1", "llm_call_2" → matches events[0], events[1]
    - "a0a0a0a0-0000-4000-8000-000000000001" → matches events[0]
    
    Extracts the trailing number and uses it as 1-based index.
    """
    import re
    
    # Try to extract ANY number sequence (more permissive)
    match = re.search(r'(\d+)', call_id)
    if match:
        index = int(match.group(1)) - 1  # Convert to 0-based index
        if 0 <= index < len(events):
            return events[index]
    
    # Fallback: try exact UUID match (in case Gemini actually uses real UUIDs)
    for event in events:
        if call_id == str(event.get("run_id", "")):
            return event
    
    return None



def calculate_savings_breakdown(analysis_results: Dict, events: List[Dict]) -> Dict[str, float]:
    """
    Calculate dollar savings per category.
    """
    redundancy_savings = 0.0
    model_fit_savings = 0.0
    context_efficiency_savings = 0.0
    
    # 1. Redundancy savings: cost of all duplicate calls that would be eliminated
    redundancies = analysis_results.get("redundancies") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
    
    for finding in redundancies:
        call_ids = finding.get("call_ids", [])
        # Sum costs of all redundant calls except the first one (which we keep)
        for i, call_id in enumerate(call_ids):
            if i > 0:  # Skip the first call (the one we keep)
                event = match_call_id_to_event(call_id, events)
                if event:
                    redundancy_savings += event.get("cost", 0)



    
    # 2. Model fit savings: difference between current and recommended model costs
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
    
    for finding in overkill:
        current_model = finding.get("current_model", "")
        recommended_model = finding.get("recommended_model", "")
        
        if current_model and recommended_model:
            call_id = finding.get("call_id", "")
            event = match_call_id_to_event(call_id, events)
            
            if event:
                tokens_in = event.get("tokens_in", 0)
                tokens_out = event.get("tokens_out", 0)
                
                # Calculate cost difference
                current_cost = calculate_cost(current_model, tokens_in, tokens_out)
                recommended_cost = calculate_cost(recommended_model, tokens_in, tokens_out)
                model_fit_savings += max(0, current_cost - recommended_cost)

    
    # 3. Context efficiency savings: cost of unnecessary tokens
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
    
    for item in bloat_items:
        call_id = item.get("call_id", "")
        current_tokens = item.get("current_tokens", 0)
        necessary_tokens = item.get("estimated_necessary_tokens", 0)
        
        if current_tokens > necessary_tokens:
            event = match_call_id_to_event(call_id, events)
            
            if event:
                model = event.get("model", "")
                if model:
                    # Cost of unnecessary input tokens
                    wasted_tokens = current_tokens - necessary_tokens
                    normalized_model = normalize_model_name(model)
                    if normalized_model in MODEL_PRICING:
                        input_price_per_token = MODEL_PRICING[normalized_model]["input"] / 1_000_000
                        context_efficiency_savings += wasted_tokens * input_price_per_token

    
    return {
        "redundancy_savings": round(redundancy_savings, 10),
        "model_fit_savings": round(model_fit_savings, 10),
        "context_efficiency_savings": round(context_efficiency_savings, 10),
        "total_savings": round(redundancy_savings + model_fit_savings + context_efficiency_savings, 10)
    }


def calculate_efficiency_score(analysis_results: dict, events: Optional[List[Dict]] = None) -> dict:
    """
    Calculates an efficiency score (0-100) based on detected inefficiencies.
    
    Now also calculates:
    - Sub-scores for each category
    - Optimized predictions for each category
    - Overall optimized score
    - Savings breakdown
    
    Penalties:
    - Redundancy: -15 points per entry
    - Model Overkill: -10 points per entry
    - Context Bloat: -5 points per 1000 wasted tokens
    """
    score = 100
    
    # Extract findings (support both wrapper and direct list formats)
    redundancies = analysis_results.get("redundancies") or analysis_results.get("redundant_calls") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
        
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
        
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
    
    # Calculate penalty-based score (original logic)
    redundancy_count = len(redundancies)
    score -= (redundancy_count * 15)
    
    overkill_count = len(overkill)
    score -= (overkill_count * 10)
    
    total_bloat_tokens = 0
    for item in bloat_items:
        current = item.get("current_tokens", 0)
        necessary = item.get("estimated_necessary_tokens", 0)
        if necessary > 0 and current > necessary:
            total_bloat_tokens += (current - necessary)
        elif item.get("unnecessary_token_count"):
             total_bloat_tokens += item.get("unnecessary_token_count", 0)
        else:
            total_bloat_tokens += 500  # Conservative default
            
    bloat_penalty = int(total_bloat_tokens * 0.005)
    score -= bloat_penalty
    
    # Clamp score between 0 and 100
    score = max(0, min(100, score))
    
    # Calculate sub-scores (NEW)
    total_calls = len(events) if events else 5  # Default to 5 if events not provided
    
    sub_scores = {
        "redundancy": calculate_redundancy_score(redundancies, total_calls),
        "model_fit": calculate_model_fit_score(overkill, total_calls),
        "context_efficiency": calculate_context_efficiency_score(bloat_items, events) if events else 50
    }
    
    # Calculate optimized sub-scores (NEW)
    optimized_sub_scores = {
        "redundancy": 100,  # All redundancies eliminated via caching
        "model_fit": 100,   # All models appropriate after switching
        "context_efficiency": calculate_optimized_context_efficiency(
            sub_scores["context_efficiency"], 
            bloat_items
        )
    }
    
    # Calculate optimized overall score (weighted average)
    optimized_score = int(
        (optimized_sub_scores["redundancy"] + 
         optimized_sub_scores["model_fit"] + 
         optimized_sub_scores["context_efficiency"]) / 3
    )
    
    # Calculate savings breakdown (NEW)
    savings_breakdown = calculate_savings_breakdown(analysis_results, events) if events else {
        "redundancy_savings": 0.0,
        "model_fit_savings": 0.0,
        "context_efficiency_savings": 0.0,
        "total_savings": 0.0
    }
    
    return {
        "score": score,
        "grade": calculate_letter_grade(score),
        "breakdown": {
            "redundancy_penalty": redundancy_count * 15,
            "overkill_penalty": overkill_count * 10,
            "bloat_penalty": bloat_penalty
        },
        "sub_scores": sub_scores,
        "optimized_sub_scores": optimized_sub_scores,
        "optimized_score": optimized_score,
        "savings_breakdown": savings_breakdown
    }

