import os
from database import supabase
from dotenv import load_dotenv
import uuid

load_dotenv()

def verify_table():
    try:
        print("Verifying call_edges table...")
        # Try to select from call_edges
        res = supabase.table("call_edges").select("*").limit(1).execute()
        print("Successfully queried call_edges!")
        print(f"Data: {res.data}")
    except Exception as e:
        print(f"Error querying call_edges: {e}")

if __name__ == "__main__":
    verify_table()
