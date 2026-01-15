"""
AgentScore - Gemini Analysis Prompt
Usage: ANALYSIS_PROMPT + "\n\n## WORKFLOW CALLS\n" + json.dumps(events, default=str)
"""

ANALYSIS_PROMPT = """You are an expert AI systems optimizer analyzing a multi-agent workflow trace.

Your job: Identify inefficiencies in the workflow. Do NOT calculate costs or scores - just find the issues.

You will receive a JSON array of LLM calls. Each call has:
- run_id or id: Unique identifier (use this as call_id in your response)
- model: AI model used (gpt-4, gpt-3.5-turbo, etc.)
- prompt: Input sent to model
- response: Output received
- tokens_in: Input token count
- tokens_out: Output token count

Find THREE types of issues:

---

## 1. REDUNDANT CALLS

Calls asking semantically identical questions, even if worded differently.

Look for:
- Same question in different words ("Translate myocardial infarction" vs "What does MI mean in plain English?")
- Same information requested multiple times
- One agent asking what another agent already answered
- Repeated lookups for identical data

Key: Detect SEMANTIC similarity, not just string matching. "MI" = "myocardial infarction"

---

## 2. MODEL OVERKILL

Expensive models (GPT-4, Claude Opus) used for tasks that cheap models handle equally well.

SIMPLE tasks (should use GPT-3.5-turbo, Gemini Flash, GPT-4o-mini):
- Translation between languages
- Text formatting, cleanup, restructuring
- Data extraction from structured content
- Classification into predefined categories
- Routing decisions
- Basic summarization
- Template filling
- Simple factual Q&A
- Date/time formatting
- Data format conversion

COMPLEX tasks (need GPT-4, Claude Opus, Gemini Pro):
- Multi-step reasoning
- Nuanced judgment requiring world knowledge
- Creative writing with style constraints
- Complex code generation
- Synthesis of multiple concepts
- Critical accuracy requirements

Key: Evaluate task complexity, not prompt length.

---

## 3. PROMPT BLOAT

Significantly more tokens sent than necessary.

Look for:
- Full conversation history when only last message matters
- Same system prompt repeated in every call
- Irrelevant context or documents included
- Verbose instructions that could be condensed
- Entire documents when only a section is needed

Key: Estimate what portion of tokens_in was actually necessary.

---

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown, no code blocks, no explanation.

{
  "original_cost": 0.1543,
  "optimized_cost": 0.0512,
  "redundant_calls": [
    {
      "call_ids": ["<run_id_1>", "<run_id_2>"],
      "reason": "Both calls ask for translation of the same medical term",
      "keep_call_id": "<run_id_1>",
      "confidence": 0.95,
      "fix_suggestion": "Cache result from first call and reuse for second"
    }
  ],
  "model_overkill": [
    {
      "call_id": "<run_id>",
      "current_model": "gpt-4",
      "recommended_model": "gpt-3.5-turbo",
      "task_type": "simple_translation",
      "reason": "This is straightforward translation requiring no complex reasoning",
      "confidence": 0.91,
      "fix_suggestion": "Switch to gpt-3.5-turbo for translation tasks"
    }
  ],
  "prompt_bloat": [
    {
      "call_id": "<run_id>",
      "current_tokens": 8500,
      "estimated_necessary_tokens": 1200,
      "unnecessary_content": "Full conversation history included but only last exchange was relevant",
      "confidence": 0.82,
      "fix_suggestion": "Implement sliding window - keep only last 3 messages"
    }
  ]
}

---

## RULES

1. Return ONLY valid JSON - no markdown, no backticks, no explanation text
2. Only include findings with confidence >= 0.7
3. Use the run_id or id field from each call as the call_id in your response
4. fix_suggestion must be actionable and specific
5. If no issues found in a category, return empty array []
6. task_type must be one of: simple_translation, formatting, classification, routing, summarization, extraction, data_conversion, simple_qa, other_simple
7. recommended_model must be one of: gpt-3.5-turbo, gpt-4o-mini, gemini-flash, claude-3-haiku

---

## CONFIDENCE LEVELS

- 0.9-1.0: Certain - obvious case
- 0.7-0.89: High confidence - strong indicators
- Below 0.7: Don't include

---

## FIX SUGGESTIONS - BE SPECIFIC

Good examples:
- "Cache the translation result from call_003 in a dictionary keyed by medical term"
- "Replace GPT-4 with GPT-3.5-turbo for date formatting - identical output quality"
- "Remove conversation history from context - only current query needed"

Bad examples:
- "Use caching" (too vague)
- "Use cheaper model" (not specific)
- "Reduce prompt size" (not actionable)
"""