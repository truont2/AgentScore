
import sys
import os
import json

# Add backend to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scoring import calculate_efficiency_score

# Load snapshot data
with open("snapshots/realistic_travel.json", "r") as f:
    data = json.load(f)

events = data["events"]

# Mock Analysis Results (since they are empty in the snapshot, we usually simulate what 
# the analysis would find based on the user's description of "Potential 93")
# If the snapshot has empty analyses, how did the user get "Potential 93"?
# The user likely ran an analysis *on* this workflow.
# I will simulate some findings typical for this workflow to stress test the scoring.

analysis_results = {
    "redundancies": {
        "items": []
    },
    "model_overkill": {
        "items": [
           {
             "call_id": events[0]["run_id"], # gemini-2.5-flash-lite
             "current_model": "gemini-2.5-flash-lite",
             "recommended_model": "gemini-2.0-flash-lite",
             "confidence": 0.9,
             "severity": "LOW"
           }
        ]
    },
    "prompt_bloat": {
        "items": [] 
    }
}

print(f"Total Cost: {sum(e.get('cost', 0) for e in events)}")

try:
    print("Running score calculation...")
    result = calculate_efficiency_score(analysis_results, events)
    print("✅ Calculation successful!")
    print(f"Score: {result['score']}")
    print(f"Breakdown: {json.dumps(result['breakdown'], indent=2)}")
except Exception as e:
    print(f"❌ Verification Failed:")
    print(e)
    import traceback
    traceback.print_exc()
