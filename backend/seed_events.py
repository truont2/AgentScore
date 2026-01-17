import requests
import uuid
import datetime
import random
import time
import os
from database import supabase

API_URL = "http://127.0.0.1:8000"

def create_event(workflow_id, model, prompt_text, response_text, tokens_in, tokens_out, cost=0.0):
    event = {
        "run_id": str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "event_type": "llm",
        "model": model,
        "prompt": {"role": "user", "content": prompt_text},
        "response": {"role": "assistant", "content": response_text},
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost": cost,
        "created_at": datetime.datetime.now().isoformat()
    }
    
    try:
        resp = requests.post(f"{API_URL}/events", json=event)
        resp.raise_for_status()
        print(f"[SUCCESS] Sent event: {prompt_text[:30]}... ({model}) - Cost: ${cost}")
        return cost
    except Exception as e:
        print(f"[ERROR] Failed to send event: {e}")
        return 0.0

def seed_data():
    workflow_id = str(uuid.uuid4())
    print(f"Seeding events for Workflow ID: {workflow_id}")

    # 1. Create Workflow Record Explicitly with Name
    try:
        supabase.table("workflows").insert({
            "id": workflow_id,
            "name": f"Test Workflow {datetime.datetime.now().strftime('%H:%M:%S')}",
            "status": "active",
            "total_cost": 0.0
        }).execute()
        print(f"Created named workflow: {workflow_id}")
    except Exception as e:
        print(f"Failed to create workflow: {e}")
        return

    total_cost = 0.0

    # 1. Redundancy Scenario
    redundancy_prompts = [
        "How do I reset my password?",
        "I forgot my password, can you help me change it?",
        "Steps to recover lost password please",
        "Password reset instructions"
    ]
    
    print("\n--- Seeding Redundancy Scenario ---")
    for p in redundancy_prompts:
        c = 0.001
        create_event(workflow_id, "gpt-3.5-turbo", p, "Reset via settings.", 50, 20, c)
        total_cost += c
        time.sleep(0.1)

    # 2. Model Overkill
    print("\n--- Seeding Model Overkill Scenario ---")
    overkill_requests = [
        ("What is 2 + 2?", "4", 0.03),
        ("Write a hello world in Python", "print('Hello World')", 0.03),
        ("What is the capital of France?", "Paris", 0.03)
    ]
    
    for p, r, c in overkill_requests:
        create_event(workflow_id, "gpt-4", p, r, 30, 10, c)
        total_cost += c
        time.sleep(0.1)

    # 3. Context Bloat
    print("\n--- Seeding Context Bloat Scenario ---")
    huge_context = "This is a conversation log..." + ("bla " * 5000) 
    bloated_prompt = huge_context + "\nUser: What is my name?"
    c_bloat = 0.15
    create_event(workflow_id, "gpt-4", bloated_prompt, "You mentioned your name is User.", 5000, 10, c_bloat)
    total_cost += c_bloat
    
    # 4. Efficient Scenario
    print("\n--- Seeding Efficient Scenario ---")
    c_efficient = 0.0001
    create_event(workflow_id, "gemini-flash", "Summarize this.", "Short summary.", 50, 10, c_efficient)
    total_cost += c_efficient

    # Update Workflow Total Cost
    print(f"\nUpdating Total Cost to: ${total_cost:.4f}")
    try:
        supabase.table("workflows").update({"total_cost": total_cost}).eq("id", workflow_id).execute()
        print("Workflow cost updated.")
    except Exception as e:
        print(f"Failed to update cost: {e}")

    print(f"\n[DONE] Workflow {workflow_id} seeded.")
    print(f"Run analysis via Frontend or CURL.")

if __name__ == "__main__":
    seed_data()
