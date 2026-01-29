import requests
import uuid
import datetime
import time

API_URL = "http://localhost:8000"
GOLDEN_ID = "00000000-0000-4000-8000-000000000000"

def send_mock_event(workflow_id, run_id, model, prompt, response, parents=None, latency=800, cost=0.0001):
    event = {
        "run_id": run_id,
        "workflow_id": workflow_id,
        "event_type": "llm_call",
        "model": model,
        "prompt": prompt,
        "response": response,
        "tokens_in": 1000,
        "tokens_out": 500,
        "latency_ms": latency,
        "cost": cost,
        "parent_relationships": parents or [],
        "created_at": datetime.datetime.now().isoformat()
    }
    
    try:
        resp = requests.post(f"{API_URL}/events", json=event)
        resp.raise_for_status()
        print(f"[SUCCESS] Sent event: {run_id[:8]}... (Parents: {len(parents or [])})")
    except Exception as e:
        print(f"[ERROR] Failed to send event: {e}")

def seed_golden_demo():
    print(f"\nSeeding GOLDEN DEMO Workflow: {GOLDEN_ID}")
    print("-" * 60)

    # We just need to trigger the existence of this ID in the system 
    # so the frontend can navigate to it.
    
    # Layer 1
    n1 = "00000000-0000-4000-8000-000000000001"
    n2 = "00000000-0000-4000-8000-000000000002"
    send_mock_event(GOLDEN_ID, n1, "gemini-2.1-flash-lite", "Initial research", "Results A", cost=0.0001)
    send_mock_event(GOLDEN_ID, n2, "gemini-2.1-flash-lite", "User survey", "Results B", cost=0.0001)
    
    # Dead Branch
    g1 = "00000000-0000-4000-8000-000000000010"
    send_mock_event(GOLDEN_ID, g1, "gemini-2.5-pro", "Legacy Audit", "Unused data", cost=0.0025)

    # Layer 2
    n3 = "00000000-0000-4000-8000-000000000003"
    send_mock_event(GOLDEN_ID, n3, "gemini-2.5-pro", "Product Strategy", "Final Strategy", 
                   parents=[{"parent_id": n1, "score": 1.0, "type": "exact"}, {"parent_id": n2, "score": 1.0, "type": "exact"}])

    print("-" * 60)
    print(f"DONE! Please open the dashboard and look for the GOLDEN Workflow:")
    print(f"👉 {GOLDEN_ID}")
    print("-" * 60)

if __name__ == "__main__":
    seed_golden_demo()
