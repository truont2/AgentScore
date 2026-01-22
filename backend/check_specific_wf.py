import os
from database import supabase
from dotenv import load_dotenv

load_dotenv()

def check_workflow_metrics(workflow_id):
    try:
        print(f"Checking metrics for workflow {workflow_id}...")
        res = supabase.table("workflows").select("*").eq("id", workflow_id).execute()
        if res.data:
            wf = res.data[0]
            print(f"Name: {wf.get('name')}")
            print(f"Graph Computed: {wf.get('graph_computed')}")
            print(f"Dead Branch Waste: ${wf.get('dead_branch_waste')}")
            print(f"Critical Path Latency: {wf.get('critical_path_latency')}ms")
            print(f"Information Efficiency: {wf.get('information_efficiency')}")
            
            # Check edge count
            edge_res = supabase.table("call_edges").select("*", count="exact").eq("workflow_id", workflow_id).execute()
            print(f"Edges detected: {edge_res.count}")
            if edge_res.data:
                for edge in edge_res.data:
                    print(f"  Edge: {edge['source_id']} -> {edge['target_id']} (Score: {edge['overlap_score']})")
        else:
            print("Workflow not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_workflow_metrics("514a80db-11e1-4fea-8433-d8b770ece68a")
