import uuid
from contextvars import ContextVar

# ContextVar to store the current workflow Trace ID
# This ensures that all calls within the same async context share the same ID
_trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")

def get_trace_id() -> str:
    """
    Retrieves the current Trace ID.
    If no Trace ID is set, generates a new one and sets it.
    """
    trace_id = _trace_id_var.get()
    if not trace_id:
        trace_id = str(uuid.uuid4())
        _trace_id_var.set(trace_id)
    return trace_id

def set_trace_id(trace_id: str):
    """
    Sets a specific Trace ID for the current context.
    """
    _trace_id_var.set(trace_id)

def reset_trace_id():
    """
    Resets the Trace ID (generates a new one for the next workflow).
    """
    _trace_id_var.set(str(uuid.uuid4()))
