import sys
import json
import uuid
import argparse
from datetime import datetime, timedelta, timezone
import dateutil.parser
from database import supabase

def seed_demos(snapshot_file, reset_state=False, count=1):
    print(f"Seeding demo from {snapshot_file} (Count: {count})...")
    
    with open(snapshot_file, "r") as f:
        data = json.load(f)
        
    workflow_data = data["workflow"]
    events_data = data["events"]
    analyses_data = data["analyses"]
    
    for i in range(count):
        print(f"\n--- Seeding Copy {i+1}/{count} ---")
        # 1. Calculate Time Shift
        # Using created_at of workflow as the anchor
        original_start_str = workflow_data.get('created_at') or workflow_data.get('start_time')
        if not original_start_str:
            print("Error: Workflow has no created_at or start_time")
            return

        original_start = dateutil.parser.isoparse(original_start_str)
        now = datetime.now(timezone.utc)
        time_shift = now - original_start
        
        # 2. Prepare New Workflow
        new_wf_id = str(uuid.uuid4())
        old_wf_id = workflow_data['id']
        
        print(f"Creating new workflow: {new_wf_id} (was {old_wf_id})")
        
        new_workflow = workflow_data.copy()
        new_workflow['id'] = new_wf_id
        
        # Judge Mode: Reset status to pending
        if reset_state:
            new_workflow['status'] = 'pending'
            new_workflow['total_cost'] = 0 
        
        # Shift workflow timestamps
        for field in ['created_at', 'start_time', 'end_time']:
            if new_workflow.get(field):
                dt = dateutil.parser.isoparse(new_workflow[field])
                new_workflow[field] = (dt + time_shift).isoformat()
                
        # Insert Workflow
        res = supabase.table("workflows").insert(new_workflow).execute()
        
        # 3. Process Events
        run_id_map = {} # old_run_id -> new_run_id
        
        # Generate map for ALL events first
        for evt in events_data:
            run_id_map[evt['run_id']] = str(uuid.uuid4())
            
        new_events = []
        for evt in events_data:
            new_evt = evt.copy()
            new_evt['run_id'] = run_id_map[evt['run_id']]
            new_evt['workflow_id'] = new_wf_id
            
            # Update parent_run_id if it exists
            if new_evt.get('parent_run_id') and new_evt['parent_run_id'] in run_id_map:
                new_evt['parent_run_id'] = run_id_map[new_evt['parent_run_id']]
            elif new_evt.get('parent_run_id'):
                 pass 
                
            # Shift timestamps
            if new_evt.get('created_at'):
                 dt = dateutil.parser.isoparse(new_evt['created_at'])
                 new_evt['created_at'] = (dt + time_shift).isoformat()
                 
            if new_evt.get('timestamp'):
                 dt = dateutil.parser.isoparse(new_evt['timestamp'])
                 new_evt['timestamp'] = (dt + time_shift).isoformat()

            new_events.append(new_evt)
            
        # Batch insert events
        chunk_size = 100
        for i in range(0, len(new_events), chunk_size):
            chunk = new_events[i:i+chunk_size]
            supabase.table("events").insert(chunk).execute()
            
        print("Events inserted.")
        
        # 4. Process Analyses (Skip if reset_state is True)
        if reset_state:
            print("Judge Mode: Skipping analysis import.")
        else:
            new_analyses = []
            for ana in analyses_data:
                new_ana = ana.copy()
                new_ana['id'] = str(uuid.uuid4())
                new_ana['workflow_id'] = new_wf_id
                
                if new_ana.get('created_at'):
                     dt = dateutil.parser.isoparse(new_ana['created_at'])
                     new_ana['created_at'] = (dt + time_shift).isoformat()
                     
                new_analyses.append(new_ana)
                
            if new_analyses:
                supabase.table("analyses").insert(new_analyses).execute()
                print("Analyses inserted.")
            
        print(f"Done! New Trace ID: {new_wf_id}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed database with demo snapshot.")
    parser.add_argument("snapshot_file", help="Path to snapshot JSON file")
    parser.add_argument("--reset-state", action="store_true", help="Judge Mode: Reset status to pending and skip analyses")
    parser.add_argument("--count", type=int, default=1, help="Number of copies to generate")
    
    args = parser.parse_args()
    seed_demos(args.snapshot_file, args.reset_state, args.count)
