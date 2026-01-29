from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class EventCreate(BaseModel):
    # Required fields for creating an event
    run_id: UUID
    workflow_id: Optional[UUID] = None
    parent_run_id: Optional[UUID] = None
    event_type: str
    model: Optional[str] = None
    prompt: Optional[Union[Dict[str, Any], List[Any], str]] = None
    response: Optional[Union[Dict[str, Any], List[Any], str]] = None
    tokens_in: Optional[int] = 0
    tokens_out: Optional[int] = 0
    cost: Optional[float] = 0.0
    latency_ms: Optional[int] = None
    parent_relationships: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.now)

class BatchEvents(BaseModel):
    events: List[EventCreate]

class Workflow(BaseModel):
    id: UUID
    name: Optional[str] = None
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_calls: int = 0
    total_cost: float = 0.0
    efficiency_score: Optional[int] = None
    created_at: datetime

class WorkflowDetail(Workflow):
    events: List[Dict[str, Any]] = []

class AnalysisResult(BaseModel):
    id: UUID
    workflow_id: UUID
    original_cost: Optional[float] = None
    optimized_cost: Optional[float] = None
    redundancies: Optional[Dict[str, Any]] = None
    model_overkill: Optional[Dict[str, Any]] = None
    prompt_bloat: Optional[Dict[str, Any]] = None
    efficiency_score: Optional[int] = None
    efficiency_grade: Optional[str] = None
    sub_scores: Optional[Dict[str, Any]] = None
    optimized_sub_scores: Optional[Dict[str, Any]] = None
    optimized_score: Optional[int] = None
    savings_breakdown: Optional[Dict[str, Any]] = None
    created_at: datetime
