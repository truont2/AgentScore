import os
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid
from datetime import datetime

# Load variables from .env
load_dotenv('backend/.env')

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key starts with: {key[:10]}...")

if not url or not key:
    print("Error: Supabase credentials not found")
    exit(1)

supabase: Client = create_client(url, key)

def test_insert():
    try:
        wf_id = str(uuid.uuid4())
        print(f"Step 1: Creating workflow {wf_id}...")
        supabase.table("workflows").insert({
            "id": wf_id,
            "name": "Repro Test",
            "status": "active"
        }).execute()
        print("Workflow created.")

        print("Step 2: Inserting event...")
        event_data = {
            "run_id": str(uuid.uuid4()),
            "workflow_id": wf_id,
            "event_type": "llm_call",
            "model": "test-model",
            "prompt": "This is a plain string prompt", # SQL is jsonb, this might fail!
            "response": "This is a plain string response",
            "tokens_in": 10,
            "tokens_out": 20,
            "cost": 0.001,
            "latency_ms": 100
        }
        
        res = supabase.table("events").insert(event_data).execute()
        print("Success!")
        print(res.data)

    except Exception as e:
        print(f"Failed with error: {e}")

if __name__ == "__main__":
    test_insert()
