import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from typing import List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from datetime import datetime
from uuid import UUID
import traceback
import json
from prompt import ANALYSIS_PROMPT
from scoring import calculate_efficiency_score, compute_workflow_graph_metrics

from database import supabase
from schemas import Workflow, WorkflowDetail, AnalysisResult, EventCreate
from pricing import calculate_cost

app = FastAPI()
# force reload

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "https://agent-score.vercel.app",
    "https://www.agent-score.vercel.app",
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
def receive_event(event: EventCreate, background_tasks: BackgroundTasks):
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
        # Check if workflow already exists
        existing = supabase.table("workflows").select("id").eq("id", event_dict["workflow_id"]).execute()
        
        if not existing.data:
            # First event - create with timestamp name
            timestamp = datetime.now().strftime("%b %d, %I:%M %p")
            default_name = f"Workflow - {timestamp}"
            
            supabase.table("workflows").insert({
                "id": event_dict["workflow_id"],
                "name": default_name,
                "status": "active"
            }).execute()
    except Exception as e:
        print(f"Warning: Workflow creation failed: {e}")
            
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
            
    print(f"DEBUG: Calculated Cost: {event_dict.get('cost')} for model {event_dict.get('model')} (Tokens: {event_dict.get('tokens_in')}/{event_dict.get('tokens_out')})")

    # Insert single event
    # We pop parent_relationships as it's kept in a separate join table
    parent_relationships = event_dict.pop("parent_relationships", None)
    data = [event_dict]

    try:
        response = supabase.table("events").insert(data).execute()
        
        # Insert Call Edges if provided
        workflow_id = event_dict["workflow_id"]
        if parent_relationships:
            edge_data = []
            for rel in parent_relationships:
                edge_data.append({
                    "workflow_id": workflow_id,
                    "source_id": rel["parent_id"],
                    "target_id": event_dict["run_id"],
                    "overlap_score": rel.get("score", 1.0),
                    "overlap_type": rel.get("type", "exact")
                })
            supabase.table("call_edges").insert(edge_data).execute()

        # Update workflow statistics after event insertion
        
        # Aggregate statistics from all events for this workflow
        events_response = supabase.table("events")\
            .select("cost, created_at")\
            .eq("workflow_id", workflow_id)\
            .execute()
        
        if events_response.data:
            # Calculate totals
            total_calls = len(events_response.data)
            total_cost = sum(float(e.get("cost", 0)) for e in events_response.data)
            
            # Get start and end times
            timestamps = [e["created_at"] for e in events_response.data if e.get("created_at")]
            start_time = min(timestamps) if timestamps else None
            end_time = max(timestamps) if timestamps else None
            
            # Update workflow with aggregated stats
            supabase.table("workflows").update({
                "total_calls": total_calls,
                "total_cost": total_cost,
                "start_time": start_time,
                "end_time": end_time,
                "status": "active"
            }).eq("id", workflow_id).execute()
        
        # Trigger Graph Computation
        background_tasks.add_task(compute_workflow_graph_metrics, str(workflow_id), supabase)

        return {"message": "Events logged successfully", "data": response.data}
    except Exception as e:
        print(f"Error inserting events: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows", response_model=List[Workflow])
def list_workflows():
    """Returns list of workflows with basic stats."""
    try:
        # Fetch workflows with latest analysis efficiency score
        # Note: Supabase join doesn't always guarantee order, so we fetch created_at to sort in code
        response = supabase.table("workflows").select("*, analyses(efficiency_score, created_at)").order("created_at", desc=True).execute()
        
        workflows = response.data
        for wf in workflows:
            # Flatten the nested analysis score
            analyses = wf.get("analyses", [])
            if analyses and len(analyses) > 0:
                # Sort by created_at descending to ensure we get the latest analysis
                # (Handle None created_at just in case)
                analyses.sort(key=lambda x: x.get("created_at") or "", reverse=True)
                wf["efficiency_score"] = analyses[0].get("efficiency_score")
            else:
                wf["efficiency_score"] = None
                
        return workflows
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

@app.post("/workflows/{id}/analyze")
async def analyze_workflow(id: str):
    """Triggers Gemini analysis on a workflow, streaming progress updates."""
    if not gemini_client:
        raise HTTPException(status_code=503, detail="Gemini API not configured")

    def event_generator():
        try:
            # 1. Fetch Workflow Data
            yield f"data: {json.dumps({'progress': 5, 'status': 'Initializing analysis...'})}\n\n"
            
            wf_response = supabase.table("workflows").select("*").eq("id", id).execute()
            if not wf_response.data:
                yield f"data: {json.dumps({'error': 'Workflow not found'})}\n\n"
                return
            
            yield f"data: {json.dumps({'progress': 10, 'status': 'Fetching workflow events...'})}\n\n"

            events_response = supabase.table("events").select("*").eq("workflow_id", id).order("created_at").execute()
            events = events_response.data
            
            if not events:
                 yield f"data: {json.dumps({'error': 'No events found for this workflow'})}\n\n"
                 return

            # 2. Construct Prompt
            yield f"data: {json.dumps({'progress': 20, 'status': 'Preparing AI context...'})}\n\n"
            
            events_str = ""
            calculated_total_cost = 0.0
            for idx, e in enumerate(events, start=1):
                role = e.get('event_type', 'unknown')
                prompt_data = e.get('prompt', '')
                response_data = e.get('response', '')
                
                # Deterministic content formatting
                if isinstance(prompt_data, (dict, list)):
                    prompt_str = json.dumps(prompt_data, sort_keys=True)
                else:
                    prompt_str = str(prompt_data)
                    
                if isinstance(response_data, (dict, list)):
                    response_str = json.dumps(response_data, sort_keys=True)
                else:
                    response_str = str(response_data)

                model = e.get('model', 'unknown')
                cost = e.get('cost', 0)
                calculated_total_cost += cost
                events_str += f"\\n---\\nID: call_{idx}\\nEvent Type: [{e.get('event_type')}]\\nModel: {model}\\nCost: ${cost}\\nInput: {prompt_str}\\nOutput: {response_str}\\n"

            prompt = ANALYSIS_PROMPT + "\\n\\n## WORKFLOW CALLS\\n" + events_str
            prompt += "\\n\\n**IMPORTANT: In your response, ALWAYS use the provided ID (e.g., 'call_1', 'call_2') as the call_id.**"

            # 3. Call Gemini
            yield f"data: {json.dumps({'progress': 30, 'status': 'Sending data to Gemini (this may take 30s)...'})}\n\n"
            
            print(f"\n--- DEBUG: PROMPT SENT TO GEMINI ({len(prompt)} chars) ---\n")
            print(prompt[:500] + "...")
            print("\n------------------------------------------------------------\n")

            # Using stream=True (optional, but we can't easily parse partial JSON)
            # For now, we'll just wait for the result but keep the connection open
            try:
                response = gemini_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0,
                        seed=42
                    )
                )
                print(f"\n--- DEBUG: RAW GEMINI RESPONSE ---\n{response.text}\n------------------------------\n")
            except Exception as e:
                print(f"Gemini API Error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                return
            
            yield f"data: {json.dumps({'progress': 80, 'status': 'Processing AI insights...'})}\n\n"
            
            analysis_json = json.loads(response.text)

            # 4. Store Analysis & Score
            yield f"data: {json.dumps({'progress': 90, 'status': 'Calculating efficiency scores...'})}\n\n"

            from scoring import calculate_efficiency_score
            
            # Use events for scoring calculations
            score_data = calculate_efficiency_score(analysis_json, events=events)
            
            analysis_entry = {
                "workflow_id": id,
                "original_cost": calculated_total_cost,
                "optimized_cost": max(0, calculated_total_cost - score_data["savings_breakdown"]["total_savings"]),
                "redundancies": {"items": analysis_json.get("redundancies") or analysis_json.get("redundant_calls") or []},
                "model_overkill": {"items": analysis_json.get("model_overkill") or []},
                "prompt_bloat": {"items": analysis_json.get("prompt_bloat") or []},
                "efficiency_score": score_data["score"],
                "efficiency_grade": score_data["grade"],
                "sub_scores": score_data["sub_scores"],
                "optimized_sub_scores": score_data["optimized_sub_scores"],
                "optimized_score": score_data["optimized_score"],
                "savings_breakdown": score_data["savings_breakdown"]
            }
            
            # Insert analysis
            supabase.table("analyses").insert(analysis_entry).execute()
            
            # Update workflow status
            supabase.table("workflows").update({"status": "analyzed"}).eq("id", id).execute()
            
            yield f"data: {json.dumps({'progress': 100, 'status': 'Analysis complete!', 'complete': True})}\n\n"

        except Exception as e:
            print(f"Analysis failed: {e}")
            traceback.print_exc()
            error_msg = str(e)
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/workflows/{id}/analysis")
def get_workflow_analysis(id: str):
    """Returns analysis results for a workflow."""
    try:
        response = supabase.table("analyses").select("*").eq("workflow_id", id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/workflows/{id}/graph")
def get_workflow_graph(id: str):
    """Returns the dependency graph for a workflow (nodes and edges)."""
    # GOLDEN DEMO INTERCEPTOR
    GOLDEN_ID = "00000000-0000-4000-8000-000000000000"
    if id == GOLDEN_ID:
        # Perfectly curated demo data
        nodes = [
            {"id": "00000000-0000-4000-8000-000000000001", "label": "Market Analysis", "model": "gemini-2.1-flash-lite", "cost": 0.0001, "latency": 850, "type": "critical"},
            {"id": "00000000-0000-4000-8000-000000000002", "label": "User Insights", "model": "gemini-2.1-flash-lite", "cost": 0.0001, "latency": 920, "type": "critical"},
            
            # THE GHOST BRANCH (WASTED)
            {"id": "00000000-0000-4000-8000-000000000010", "label": "Legacy Audit", "model": "gemini-2.5-pro", "cost": 0.0025, "latency": 1500, "type": "dead"},
            {"id": "00000000-0000-4000-8000-000000000011", "label": "Legacy Audit Support", "model": "gemini-2.5-pro", "cost": 0.0022, "latency": 1400, "type": "dead"},
            {"id": "00000000-0000-4000-8000-000000000012", "label": "Format Legacy PDF", "model": "gemini-2.5-flash", "cost": 0.0002, "latency": 500, "type": "dead"},

            {"id": "00000000-0000-4000-8000-000000000003", "label": "Product Strategy", "model": "gemini-2.5-pro", "cost": 0.0015, "latency": 2500, "type": "critical"},
            {"id": "00000000-0000-4000-8000-000000000004", "label": "Final Localization", "model": "gemini-2.5-flash", "cost": 0.0002, "latency": 1200, "type": "critical"},
        ]
        edges = [
            {"id": "e1", "source": "00000000-0000-4000-8000-000000000001", "target": "00000000-0000-4000-8000-000000000003", "score": 1, "type": "exact"},
            {"id": "e2", "source": "00000000-0000-4000-8000-000000000002", "target": "00000000-0000-4000-8000-000000000003", "score": 0.9, "type": "partial"},
            
            # GHOST BRANCH EDGES
            {"id": "eg1", "source": "00000000-0000-4000-8000-000000000010", "target": "00000000-0000-4000-8000-000000000011", "score": 1, "type": "exact"},
            {"id": "eg2", "source": "00000000-0000-4000-8000-000000000011", "target": "00000000-0000-4000-8000-000000000012", "score": 1, "type": "exact"},

            {"id": "e3", "source": "00000000-0000-4000-8000-000000000003", "target": "00000000-0000-4000-8000-000000000004", "score": 1, "type": "exact"},
        ]
        return {
            "nodes": nodes,
            "edges": edges,
            "metrics": {
                "dead_branch_cost": 0.0049,
                "critical_path_latency": 5470,
                "info_efficiency": 88.5,
            }
        }

    try:
        wf_res = supabase.table("workflows").select("*").eq("id", id).execute()
        if not wf_res.data:
            raise HTTPException(status_code=404, detail="Workflow not found")
        workflow = wf_res.data[0]

        events_res = supabase.table("events").select("*").eq("workflow_id", id).order("created_at").execute()
        events = events_res.data

        edges_res = supabase.table("call_edges").select("*").eq("workflow_id", id).execute()
        edges = edges_res.data

        nodes = []
        for e in events:
            nodes.append({
                "id": str(e["run_id"]),
                "label": f"Call {str(e['run_id'])[:4]}",
                "model": e.get("model", "unknown"),
                "cost": float(e.get("cost", 0)),
                "latency": e.get("latency_ms", 0),
                "tokens_in": e.get("tokens_in", 0),
                "tokens_out": e.get("tokens_out", 0),
                "type": e.get("node_type", "normal") 
            })

        formatted_edges = []
        for edge in edges:
            formatted_edges.append({
                "id": f"e-{edge['source_id']}-{edge['target_id']}",
                "source": str(edge["source_id"]),
                "target": str(edge["target_id"]),
                "score": edge.get("overlap_score", 0),
                "type": edge.get("overlap_type", "exact")
            })

        return {
            "nodes": nodes,
            "edges": formatted_edges,
            "metrics": {
                "dead_branch_cost": float(workflow.get("dead_branch_waste", 0) or 0),
                "critical_path_latency": workflow.get("critical_path_latency", 0) or 0,
                "info_efficiency": workflow.get("information_efficiency", 0) or 0,
            }
        }
    except Exception as e:
        print(f"Failed to fetch graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))
