import json
import os
import threading
import requests
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import ChatGenerationChunk, GenerationChunk, LLMResult
from langchain_core.agents import AgentAction, AgentFinish

from .utils import get_trace_id

class AgentScoreCallbackHandler(BaseCallbackHandler):
    """
    A LangChain Callback Handler that captures LLM interaction data
    (prompts, completions, usage) and logs it for analysis.
    
    It uses a deterministic Trace ID (via contextvars) to link all steps
    of a single workflow together, even in async environments.
    """

    def __init__(self, backend_url: Optional[str] = None, timeout: int = 10):
        super().__init__()
        self.backend_url = backend_url or os.getenv("AGENTSCORE_BACKEND_URL", "http://localhost:8000")
        self.timeout = timeout
        self._pending_starts: Dict[str, dict] = {}
        self._threads: List[threading.Thread] = []

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

        # Serialize messages to a list of dicts for better readability
        serialized_messages = []
        for inner_list in messages:
            for msg in inner_list:
                msg_dict = {"type": msg.type, "content": msg.content}
                if hasattr(msg, "additional_kwargs") and msg.additional_kwargs:
                    msg_dict["additional_kwargs"] = msg.additional_kwargs
                serialized_messages.append(msg_dict)
                
        self._pending_starts[str(run_id)] = {
            "run_id": str(run_id),
            "workflow_id": get_trace_id(),
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "event_type": "llm_call",
            "model": model_name,
            "prompt": serialized_messages, # Capture full structured logs
            "start_time": datetime.now(),
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
            token_usage.get("input_token_count") or
            token_usage.get("prompt_token_count", 0)
        )
        tokens_out = (
            token_usage.get("completion_tokens") or 
            token_usage.get("output_tokens") or 
            token_usage.get("output_token_count") or
            token_usage.get("candidates_token_count", 0)
        )

        if tokens_in == 0 and tokens_out == 0:
            print(f"DEBUG: Zero tokens found. Available keys: {list(token_usage.keys()) if token_usage else 'None'}")
            # Try to print generation info if available for deeper debug
            if result.generations:
                try:
                    print(f"DEBUG Gen Info: {result.generations[0][0].generation_info}")
                except:
                    pass

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
        }

        # Send to backend
        self._send_event(event_data)

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