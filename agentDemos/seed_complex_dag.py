import requests
import uuid
import datetime
import time

API_URL = "http://127.0.0.1:8000"

def send_mock_event(workflow_id, run_id, model, prompt, response, parents=None, latency=800):
    event = {
        "run_id": run_id,
        "workflow_id": workflow_id,
        "event_type": "llm_call",
        "model": model,
        "prompt": prompt,
        "response": response,
        "tokens_in": 100,
        "tokens_out": 50,
        "latency_ms": latency,
        "parent_relationships": parents or [],
        "created_at": datetime.datetime.now().isoformat()
    }
    
    try:
        resp = requests.post(f"{API_URL}/events", json=event)
        resp.raise_for_status()
        print(f"[SUCCESS] Sent event: {run_id[:8]}... (Parents: {len(parents or [])})")
    except Exception as e:
        print(f"[ERROR] Failed to send event: {e}")

def seed_complex_dag():
    workflow_id = str(uuid.uuid4())
    print(f"\nSeeding Complex DAG for Workflow ID: {workflow_id}")
    print("-" * 60)

    # Layer 1: Parallel Research
    run1a = str(uuid.uuid4())
    run1b = str(uuid.uuid4())
    
    send_mock_event(
        workflow_id, run1a, "gemini-2.5-flash-lite", 
        "Research history of the Slinky", 
        "The Slinky was invented by Richard James in 1943."
    )
    
    send_mock_event(
        workflow_id, run1b, "gemini-2.5-flash-lite", 
        "Research physics of the Slinky", 
        "Slinkys walk due to a combination of gravity and longitudinal waves."
    )
    
    time.sleep(0.5)

    # Layer 2: Merge (Branching)
    run2 = str(uuid.uuid4())
    send_mock_event(
        workflow_id, run2, "gemini-2.5-flash-lite",
        "Combine history and physics into a summary.",
        "Invented in 1943, the Slinky uses tension and gravity to walk down stairs.",
        parents=[
            {"parent_id": run1a, "score": 1.0, "type": "exact"},
            {"parent_id": run1b, "score": 0.8, "type": "partial"}
        ]
    )

    time.sleep(0.5)

    # Layer 3: Final Output
    run3 = str(uuid.uuid4())
    send_mock_event(
        workflow_id, run3, "gemini-2.5-flash",
        "Write a slogan based on the summary.",
        "Slinky: Physics in Motion Since 1943.",
        parents=[
            {"parent_id": run2, "score": 1.0, "type": "exact"}
        ]
    )

    # Side Branch: Dead Branch (Not used in anything)
    run4 = str(uuid.uuid4())
    send_mock_event(
        workflow_id, run4, "gemini-2.5-flash-lite",
        "Who invented the rubber duck?",
        "The rubber duck was patented by Peter Ganine in 1949."
    )

    print("-" * 60)
    print(f"DONE! Please open the dashboard and look for Workflow ID:")
    print(f"👉 {workflow_id}")
    print("-" * 60)

if __name__ == "__main__":
    seed_complex_dag()
