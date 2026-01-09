import json
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

        trace_id = get_trace_id()
        
        # Simple logging of the event
        # In a real system, we might buffer this or send a "start" event.
        print(json.dumps({
            "event": "llm_start",
            "trace_id": trace_id,
            "run_id": str(run_id),
            "timestamp": datetime.now().isoformat(),
            "model": serialized.get("name", "unknown"),
             # Simply converting messages to string for readability in logs
            "messages": str(messages[0]),
            "parent_run_id": str(parent_run_id) if parent_run_id else None
        }, indent=2))

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
        # DEBUG: Verify this method is called
        # print("DEBUG: on_chat_model_end called")

        trace_id = get_trace_id()
        
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
            gen_info = result.generations[0][0].generation_info or {}
            token_usage = gen_info.get("usage_metadata") or gen_info.get("token_usage", {})

        # Get the actual text response
        generation_text = ""
        if result.generations:
             # Just taking the first generation
            generation_text = result.generations[0][0].text

        print(json.dumps({
            "event": "llm_end",
            "trace_id": trace_id,
            "run_id": str(run_id),
            "timestamp": datetime.now().isoformat(),
            "response": generation_text,
            "response": generation_text,
            "token_usage": token_usage,
            "parent_run_id": str(parent_run_id) if parent_run_id else None
        }, indent=2))

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        inputs: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Called when a tool is about to run.
        """
        trace_id = get_trace_id()
        print(json.dumps({
            "event": "tool_start",
            "trace_id": trace_id,
            "run_id": str(run_id),
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "timestamp": datetime.now().isoformat(),
            "tool_name": serialized.get("name", "unknown"),
            "tool_input": inputs if inputs else input_str
        }, indent=2))

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Called when a tool finishes running.
        """
        trace_id = get_trace_id()
        print(json.dumps({
            "event": "tool_end",
            "trace_id": trace_id,
            "run_id": str(run_id),
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "timestamp": datetime.now().isoformat(),
            "tool_output": output
        }, indent=2))

    def on_agent_action(
        self,
        action: AgentAction,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Called when the agent decides to take a specific action (use a tool).
        """
        trace_id = get_trace_id()
        print(json.dumps({
            "event": "agent_action",
            "trace_id": trace_id,
            "run_id": str(run_id),
            "parent_run_id": str(parent_run_id) if parent_run_id else None,
            "timestamp": datetime.now().isoformat(),
            "tool": action.tool,
            "tool_input": action.tool_input,
            "log": action.log  # This is the "Reasoning" or thought process
        }, indent=2))

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
