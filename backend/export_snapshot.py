import sys
import json
import argparse
from datetime import datetime
from database import supabase

# Custom JSON encoder for datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def export_snapshot(trace_id=None, output_file="snapshot.json"):
    print(f"Exporting snapshot...")
    
    # 1. Get the workflow
    if trace_id:
        query = supabase.table("workflows").select("*").eq("id", trace_id)
    else:
        # Get latest
        query = supabase.table("workflows").select("*").order("created_at", desc=True).limit(1)
        
    response = query.execute()
    if not response.data:
        print("No workflow found.")
        return
        
    workflow = response.data[0]
    wf_id = workflow['id']
    print(f"Found Workflow: {workflow.get('name', 'Unnamed')} ({wf_id})")
    
    # 2. Get Events
    print("Fetching events...")
    events_resp = supabase.table("events").select("*").eq("workflow_id", wf_id).order("created_at").execute()
    events = events_resp.data
    print(f"Found {len(events)} events.")
    
    # 3. Get Analyses
    print("Fetching analyses...")
    analyses_resp = supabase.table("analyses").select("*").eq("workflow_id", wf_id).execute()
    analyses = analyses_resp.data
    print(f"Found {len(analyses)} analyses.")
    
    # 4. Construct Snapshot
    snapshot = {
        "workflow": workflow,
        "events": events,
        "analyses": analyses,
        "exported_at": datetime.now().isoformat()
    }
    
    # 5. Save to file
    with open(output_file, "w") as f:
        json.dump(snapshot, f, indent=2, cls=DateTimeEncoder)
        
    print(f"Snapshot saved to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export a workflow snapshot.")
    parser.add_argument("--trace-id", help="UUID of the workflow to export")
    parser.add_argument("--output", default="snapshot.json", help="Output JSON file path")
    
    args = parser.parse_args()
    export_snapshot(args.trace_id, args.output)
