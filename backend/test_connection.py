import os
from database import supabase
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    try:
        print("Testing Supabase connection...")
        # Try to select from events table (even if empty)
        response = supabase.table("events").select("*").limit(1).execute()
        print("Select successful!")
        print(f"Data received: {response.data}")

        print("Testing Insert...")
        
        # Generate valid UUIDs
        import uuid
        wf_id = str(uuid.uuid4())
        run_id = str(uuid.uuid4())
        
        # Insert a dummy workflow first (since foreign key constraint exists)
        try:
            print(f"Creating test workflow {wf_id}...")
            supabase.table("workflows").insert({
                "id": wf_id,
                "name": "Test Workflow",
                "status": "pending"
            }).execute()
        except Exception as wf_error:
            print(f"Warning: Workflow insert failed (might not exist in DB yet or permissions): {wf_error}")

        test_event = {
            "run_id": run_id,
            "workflow_id": wf_id,
            "event_type": "llm",
            "model": "gpt-4-test",
            "prompt": {"role": "user", "content": "Hello World"},
            "response": {"role": "assistant", "content": "Hi there"},
            "tokens_in": 10,
            "tokens_out": 20,
            "cost": 0.002
        }
        # Let timestamps be auto-generated or provide standard ISO
        
        res_insert = supabase.table("events").insert(test_event).execute()
        print("Insert successful!")
        print(res_insert.data)
        
    except Exception as e:
        print(f"Connection/Operation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection()
