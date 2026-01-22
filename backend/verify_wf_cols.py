import os
from database import supabase
from dotenv import load_dotenv

load_dotenv()

def verify_workflows():
    try:
        print("Verifying workflows table columns...")
        res = supabase.table("workflows").select("*").limit(1).execute()
        if res.data:
            wf = res.data[0]
            cols = ["graph_computed", "dead_branch_waste", "critical_path_latency", "information_efficiency"]
            for col in cols:
                print(f"Column {col}: {'Exists' if col in wf else 'MISSING'}")
        else:
            print("No workflows found to check columns.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_workflows()
