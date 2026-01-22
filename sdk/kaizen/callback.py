import json
import threading
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import ChatGenerationChunk, GenerationChunk, LLMResult
from langchain_core.agents import AgentAction, AgentFinish

from .utils import get_trace_id

class KaizenCallbackHandler(BaseCallbackHandler):
    """
    A LangChain Callback Handler that captures LLM interaction data
    (prompts, completions, usage) and logs it for analysis.
    
    It uses a deterministic Trace ID (via contextvars) to link all steps
    of a single workflow together, even in async environments.
    """

    def __init__(self, backend_url: str = "http://localhost:8000", timeout: int = 10):
        super().__init__()
        self.backend_url = backend_url
        self.timeout = timeout
        self._pending_starts: Dict[str, dict] = {}
        self._threads: List[threading.Thread] = []
        # Local cache of responses in this workflow to detect information flow
        self._response_cache: Dict[str, List[dict]] = {}

    def _detect_parents(self, workflow_id: str, prompt: str) -> List[dict]:
        """
        Detects if this prompt contains content from previous responses
        in the same workflow (Information Flow Tracking).
        """
        if not workflow_id or not prompt or workflow_id not in self._response_cache:
            return []
        
        prompt_norm = prompt.lower()
        parents = []
        
        for record in self._response_cache[workflow_id]:
            response_text = record["response"].lower()
            run_id = record["run_id"]
            
            if not response_text: continue
            
            score = 0.0
            type = "none"
            
            # Simple heuristic detection
            if response_text in prompt_norm:
                score = 1.0
                type = "exact"
            elif len(response_text) > 100:
                # Check for significant chunks
                chunks = [response_text[i:i+50] for i in range(0, len(response_text)-50, 50)]
                matches = sum(1 for c in chunks if c in prompt_norm)
                if matches > 1:
                    score = matches / len(chunks)
                    type = "partial"

            if score >= 0.1:
                parents.append({
                    "parent_id": run_id,
                    "score": round(score, 2),
                    "type": type
                })
        
        return parents

    def _send_event(self, event_data: dict):
        """Send events to the backend, waiting for completion."""
        def _send():
            try:
                response = requests.post(
                    f"{self.backend_url}/events",
                    json=event_data,
                    timeout=self.timeout
                )
                if response.status_code in (200, 201):
                    print("Capturing Event ...")
                else:
                    print(f"Warning: Backend returned {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"Warning: Could not reach backend: {e}")
        
        thread = threading.Thread(target=_send)
        thread.start()
        thread.join(timeout=self.timeout)  # Wait for completion
        
        if thread.is_alive():
            print("Warning: Event send timed out, continuing...")

    def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[Any]],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Called when the LLM starts processing a request (before it answers).
        We capture the input prompt here.
        """
        if not messages:
            return
        
        # Try to get the actual model name from kwargs (more accurate)
        model_name = "unknown"
        if "invocation_params" in kwargs:
            model_name = kwargs["invocation_params"].get("model") or kwargs["invocation_params"].get("model_name")
        
        if not model_name or model_name == "unknown":
            model_name = serialized.get("name", "unknown")

        workflow_id = get_trace_id()
        
        # Extract actual text from messages
        prompt_texts = []
        for msg_list in messages:
            for msg in msg_list:
                if hasattr(msg, "content"):
                    prompt_texts.append(str(msg.content))
                else:
                    prompt_texts.append(str(msg))
        
        prompt_text = "\n".join(prompt_texts)
        
        # Detect Information Flow
        parents = self._detect_parents(workflow_id, prompt_text)
        if parents:
            print(f"DEBUG: Detected {len(parents)} parent relationships for this call.")

        self._pending_starts[str(run_id)] = {
            "run_id": str(run_id),
            "workflow_id": workflow_id,
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "event_type": "llm_call",
            "model": model_name,
            "prompt": prompt_text,
            "start_time": datetime.now(),
            "parent_relationships": parents
        }

    def on_chat_model_end(
        self,
        result: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Called when the LLM finishes generating a response.
        We capture the output text and token usage/costs here.
        """
        start_data = self._pending_starts.pop(str(run_id), None)
        if not start_data:
            print(f"Warning: No matching start for run_id {run_id}")
            return
        
        # LangChain provides usage info in llm_output
        llm_output = result.llm_output or {}
        token_usage = llm_output.get("token_usage", {})
        
        # Fallback: Check the first generation's message metadata (standard for Chat Models)
        if not token_usage and result.generations:
            try:
                first_gen = result.generations[0][0]
                if hasattr(first_gen, "message"):
                    token_usage = getattr(first_gen.message, "usage_metadata", {}) or {}
            except Exception:
                pass
        
        # Fallback 2: Check generation_info (Google legacy)
        if not token_usage and result.generations:
            try:
                gen_info = result.generations[0][0].generation_info or {}
                token_usage = gen_info.get("usage_metadata") or gen_info.get("token_usage", {})
            except IndexError:
                pass

        # Get the actual text response
        generation_text = ""
        if result.generations:
            try:
                generation_text = result.generations[0][0].text
            except IndexError:
                pass

        # Calculate latency
        latency_ms = int((datetime.now() - start_data["start_time"]).total_seconds() * 1000)

        # Normalize token keys (different providers use different names)
        tokens_in = (
            token_usage.get("prompt_tokens") or 
            token_usage.get("input_tokens") or 
            token_usage.get("input_token_count", 0)
        )
        tokens_out = (
            token_usage.get("completion_tokens") or 
            token_usage.get("output_tokens") or 
            token_usage.get("output_token_count", 0)
        )

        # Build complete event matching EventCreate schema
        event_data = {
            "run_id": start_data["run_id"],
            "workflow_id": start_data["workflow_id"],
            "parent_run_id": start_data["parent_run_id"],
            "event_type": "llm_call",
            "model": start_data["model"],
            "prompt": start_data["prompt"],
            "response": generation_text,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost": 0.0,  # Backend calculates this from model + tokens
            "latency_ms": latency_ms,
            "parent_relationships": start_data.get("parent_relationships", [])
        }

        # Send to backend
        self._send_event(event_data)
        
        # Update local cache for future flow detection
        workflow_id = event_data["workflow_id"]
        if workflow_id not in self._response_cache:
            self._response_cache[workflow_id] = []
        
        self._response_cache[workflow_id].append({
            "run_id": event_data["run_id"],
            "response": event_data["response"]
        })

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Fallback for when on_chat_model_end is not called.
        """
        self.on_chat_model_end(
            result=response,
            run_id=run_id,
            parent_run_id=parent_run_id,
            **kwargs
        )