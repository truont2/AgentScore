import requests
import uuid
import datetime
import time

API_URL = "http://localhost:8000"

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

def seed_enterprise_dag():
    workflow_id = str(uuid.uuid4())
    print(f"\nSeeding Enterprise Multi-Layer DAG with Ghost Branch: {workflow_id}")
    print("-" * 60)

    # Layer 1: Market Research (Parallel)
    id1a = str(uuid.uuid4()) # Competitor Analysis
    id1b = str(uuid.uuid4()) # User Pain Points
    id1c = str(uuid.uuid4()) # Tech Trends
    
    send_mock_event(workflow_id, id1a, "gemini-2.1-flash-lite", "Analyze competitor pricing", "Competitors are at $49-59 range.", cost=0.00003)
    send_mock_event(workflow_id, id1b, "gemini-2.1-flash-lite", "Search for user pain points", "Users hate the slow onboarding.", cost=0.00003)
    send_mock_event(workflow_id, id1c, "gemini-2.1-flash-lite", "Check tech stack trends", "Next.js and FastAPI are dominant.", cost=0.00003)
    
    time.sleep(0.5)

    # GHOST BRANCH - Expensive Research that goes nowhere
    g1 = str(uuid.uuid4())
    g2 = str(uuid.uuid4())
    g3 = str(uuid.uuid4())
    
    send_mock_event(workflow_id, g1, "gemini-2.5-pro", "Deep historical market analysis (1990-2020)", "Found legacy trends that aren't relevant to AI.", cost=0.0015)
    send_mock_event(workflow_id, g2, "gemini-2.5-pro", "Analyze legacy trend impact on modern users", "Modern users don't care about legacy trends.", 
                   parents=[{"parent_id": g1, "score": 1.0, "type": "exact"}], cost=0.0012)
    send_mock_event(workflow_id, g3, "gemini-2.5-flash", "Summarize legacy report", "Nothing useful here.", 
                   parents=[{"parent_id": g2, "score": 1.0, "type": "exact"}], cost=0.0002)

    time.sleep(0.5)

    # Layer 2: Analysis (Merging 1a & 1b)
    id2a = str(uuid.uuid4())
    send_mock_event(workflow_id, id2a, "gemini-2.5-flash", "Synthesize pricing and pain points", "Value-based pricing at $49 with instant onboarding focus.", 
                   parents=[{"parent_id": id1a, "score": 1.0, "type": "exact"}, {"parent_id": id1b, "score": 0.8, "type": "partial"}],
                   latency=1200, cost=0.00015)

    # Layer 2 Side: Architecture Design (From 1c)
    id2b = str(uuid.uuid4())
    send_mock_event(workflow_id, id2b, "gemini-2.5-pro", "Design system architecture", "Microservices with Redis for fast onboarding state.",
                   parents=[{"parent_id": id1c, "score": 1.0, "type": "exact"}],
                   latency=2500, cost=0.0008)

    time.sleep(0.5)

    # Layer 3: Product Strategy (Merging 2a & 2b) - THE INTENDED OUTPUT
    id3 = str(uuid.uuid4())
    send_mock_event(workflow_id, id3, "gemini-2.5-pro", "Final Product Strategy", "Focus on $49 Redis-backed instant onboarding.",
                   parents=[{"parent_id": id2a, "score": 0.9, "type": "partial"}, {"parent_id": id2b, "score": 1.0, "type": "exact"}],
                   latency=3000, cost=0.0012)

    # Note: id3 is the latest leaf node in the "Main chain"

    print("-" * 60)
    print(f"DONE! Please open the dashboard and look for Workflow ID:")
    print(f"👉 {workflow_id}")
    print("-" * 60)

if __name__ == "__main__":
    seed_enterprise_dag()
