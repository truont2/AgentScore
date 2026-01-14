import os
from typing import List
from fastapi import FastAPI, HTTPException, Depends
from google import genai
from google.genai import types
from datetime import datetime
from uuid import UUID
import traceback
import json
from prompt import ANALYSIS_PROMPT

from database import supabase
from schemas import BatchEvents, Workflow, WorkflowDetail, AnalysisResult, EventCreate
from pricing import calculate_cost

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

@app.post("/events")
def receive_event(event: EventCreate):
    """Receives a single AI call event."""
    
    event_dict = event.model_dump()
    # Convert UUIDs to strings for JSON serialization/Supabase
    for key, value in event_dict.items():
        if isinstance(value, datetime):
            event_dict[key] = value.isoformat()
        if isinstance(value, UUID):
            event_dict[key] = str(value)

    # Ensure Workflow Exists (Fix for FK Constraint)
    try:
        supabase.table("workflows").upsert({
            "id": event_dict["workflow_id"],
            "name": "Untitled Workflow",
            "status": "active"
        }, on_conflict="id").execute()
    except Exception as e:
        print(f"Warning: Workflow upsert failed: {e}")
            
    # Calculate Cost if missing
    if event_dict.get("cost", 0) == 0 and event_dict.get("model") and event_dict.get("tokens_in") is not None:
        try:
            event_dict["cost"] = calculate_cost(
                event_dict["model"], 
                event_dict.get("tokens_in", 0), 
                event_dict.get("tokens_out", 0)
            )
        except ValueError:
            pass # Unknown model, keep 0
            
    # Insert single event
    data = [event_dict]

    try:
        response = supabase.table("events").insert(data).execute()
        return {"message": "Events logged successfully", "data": response.data}
    except Exception as e:
        print(f"Error inserting events: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows", response_model=List[Workflow])
def list_workflows():
    """Returns list of workflows with basic stats."""
    try:
        # Assuming 'workflows' table exists. 
        # If workflows are derived from events, we might need a different query.
        # For now, assuming a dedicated workflows table or view.
        response = supabase.table("workflows").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows/{id}", response_model=WorkflowDetail)
def get_workflow_details(id: str):
    """Returns full details of a specific workflow."""
    try:
        wf_response = supabase.table("workflows").select("*").eq("id", id).execute()
        if not wf_response.data:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        workflow = wf_response.data[0]
        
        # Fetch related events
        # Assuming 'session_id' in events maps to workflow 'id' or there's a workflow_id field
        # Adjusting schema assumption: events have session_id. 
        events_response = supabase.table("events").select("*").eq("workflow_id", id).order("created_at").execute()
        
        workflow["events"] = events_response.data
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workflows/{id}/analyze", response_model=AnalysisResult)
def analyze_workflow(id: str):
    """Triggers Gemini analysis on a workflow."""
    if not gemini_client:
        raise HTTPException(status_code=503, detail="Gemini API not configured")

    try:
        # 1. Fetch Workflow Data
        wf_response = supabase.table("workflows").select("*").eq("id", id).execute()
        if not wf_response.data:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        events_response = supabase.table("events").select("*").eq("workflow_id", id).order("created_at").execute()
        events = events_response.data
        
        if not events:
             raise HTTPException(status_code=400, detail="No events found for this workflow to analyze")

        # 2. Construct Prompt using new schema fields
        events_str = ""
        calculated_total_cost = 0.0
        for e in events:
            role = e.get('event_type', 'unknown')
            prompt_data = e.get('prompt', '')
            response_data = e.get('response', '')
            model = e.get('model', 'unknown')
            cost = e.get('cost', 0)
            calculated_total_cost += cost
            events_str += f"\n- [{role}] Model: {model}, Cost: ${cost}\n  Input: {prompt_data}\n  Output: {response_data}\n"

        prompt = ANALYSIS_PROMPT + "\n\n## WORKFLOW CALLS\n" + events_str
        
        
        # 3. Call Gemini
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        analysis_json = json.loads(response.text)

        # 4. Store Analysis
        from scoring import calculate_efficiency_score
        
        # Calculate score first
        score_data = calculate_efficiency_score(analysis_json)
        
        analysis_entry = {
            "workflow_id": id,
            "original_cost": analysis_json.get("original_cost") or calculated_total_cost,
            "optimized_cost": analysis_json.get("optimized_cost") or (calculated_total_cost * 0.8), # Fallback if missing
            "redundancies": {"items": analysis_json.get("redundancies") or analysis_json.get("redundant_calls") or []},
            "model_overkill": {"items": analysis_json.get("model_overkill") or []},
            "prompt_bloat": {"items": analysis_json.get("prompt_bloat") or []},
            "efficiency_score": score_data["score"],
            "efficiency_grade": score_data["grade"]
            # "created_at": datetime.now().isoformat() # defaulted in DB
        }
        
        # Insert and return inserted data to get the ID and timestamp
        res_insert = supabase.table("analyses").insert(analysis_entry).execute()
        return res_insert.data[0]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows/{id}/analysis")
def get_workflow_analysis(id: str):
    """Returns analysis results for a workflow."""
    try:
        response = supabase.table("analyses").select("*").eq("workflow_id", id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))