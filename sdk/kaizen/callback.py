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

    def __init__(self, backend_url:str = "http://localhost:3000"):
        super().__init__()
        self.backend_url = backend_url
        # create an instance variable that gets updated for each instance of callBackHandler
        self._pending_starts: Dict[str, dict] = {} 

    def _send_event(self, event_data: dict):
        """Send events to the backend in background thread"""
        def _send():
            try:
                response = requests.post(f"{self.backend_url}/events",
                    json=event_data,
                    timeout=5)
                if response.status_code in (200, 201):
                    print("Capturing Event ...")
                else:
                    print(f"Warning: Backend returned {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"Warning: Could not reach backend: {e}")
        
        thread = threading.Thread(target=_send, daemon=True)
        thread.start()
    

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
        # "messages" is a list of lists because LangChain supports batching.
        # For simple agents, it's usually just one list of messages.
        if not messages:
            return
        
        # Store start data keyed by run_id - we'll complete it in on_chat_model_end
        # Try to get the actual model name from kwargs (more accurate)
        model_name = "unknown"
        if "invocation_params" in kwargs:
            model_name = kwargs["invocation_params"].get("model") or kwargs["invocation_params"].get("model_name")
        
        if not model_name or model_name == "unknown":
            model_name = serialized.get("name", "unknown")

        self._pending_starts[str(run_id)] = {
            "run_id": str(run_id),
            "workflow_id": get_trace_id(),
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "event_type": "llm_call",
            "model": model_name,
            "prompt": str(messages[0]),
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
                # result.generations is List[List[ChatGeneration]]
                first_gen = result.generations[0][0]
                # ChatGeneration has a 'message' attribute which is BaseMessage
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
             # Just taking the first generation
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
            "cost": 0.0,  # Backend can calculate this from model + tokens
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
        # Forward to the chat model handler for consistency
        self.on_chat_model_end(
            result=response,
            run_id=run_id,
            parent_run_id=parent_run_id,
            **kwargs
        )
