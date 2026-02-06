# backend/pricing.py

"""
Model pricing for cost calculation.
Prices are per 1M tokens (paid tier, standard processing).
Last updated: January 2026
"""

MODEL_PRICING = {
    # Google Gemini
    "gemini-3-pro": {"input": 2.00, "output": 12.00},
    "gemini-3-flash": {"input": 0.50, "output": 3.00},
    "gemini-2.5-pro": {"input": 1.25, "output": 10.00},
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40},
    "gemini-2.0-flash-lite": {"input": 0.075, "output": 0.30},
    "gemini-2.0-flash-exp": {"input": 0.10, "output": 0.40}, # Proxy to flash
    "gemini-1.5-pro-002": {"input": 1.25, "output": 5.00}, # Proxy to 1.5 Pro pricing
    
    # OpenAI
    "gpt-5.2": {"input": 1.75, "output": 14.00},
    "gpt-5.2-pro": {"input": 21.00, "output": 168.00},
    "gpt-5-mini": {"input": 0.25, "output": 2.00},
    "gpt-4.1": {"input": 3.00, "output": 12.00},
    "gpt-4.1-mini": {"input": 0.80, "output": 3.20},
    "gpt-4.1-nano": {"input": 0.20, "output": 0.80},
    "gpt-4": {"input": 30.00, "output": 60.00},
    "gpt-4o": {"input": 5.00, "output": 15.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    
    # Anthropic
    "claude-opus-4.5": {"input": 5.00, "output": 25.00},
    "claude-opus-4.1": {"input": 15.00, "output": 75.00},
    "claude-opus-4": {"input": 15.00, "output": 75.00},
    "claude-sonnet-4.5": {"input": 3.00, "output": 15.00},
    "claude-sonnet-4": {"input": 3.00, "output": 15.00},
    "claude-haiku-4.5": {"input": 1.00, "output": 5.00},
    "claude-haiku-3.5": {"input": 0.80, "output": 4.00},
    "claude-haiku-3": {"input": 0.25, "output": 1.25},
}


def normalize_model_name(model: str) -> str:
    """
    Normalize model names to match pricing table keys.
    Handles prefixes like 'models/' from different providers.
    """
    # Remove common prefixes
    prefixes_to_remove = ["models/", "openai/", "anthropic/"]
    normalized = model
    for prefix in prefixes_to_remove:
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix):]
    return normalized


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost in USD for a given model and token counts."""
    normalized_model = normalize_model_name(model)
    
    is_demo = False
    if normalized_model.endswith("-demo"):
        is_demo = True
        normalized_model = normalized_model.replace("-demo", "")

    if normalized_model not in MODEL_PRICING:
        # Log warning but don't crash - return 0
        print(f"Warning: Unknown model '{model}' (normalized: '{normalized_model}')")
        return 0.0
    
    pricing = MODEL_PRICING[normalized_model]
    
    # Apply 10,000x multiplier if it's a demo run
    multiplier = 10000.0 if is_demo else 1.0
    
    input_cost = (pricing["input"] / 1_000_000) * prompt_tokens * multiplier
    output_cost = (pricing["output"] / 1_000_000) * completion_tokens * multiplier
    
    return round(input_cost + output_cost, 6)