
import time
import uuid
import sys
import os

# Ensure sdk is in path
sys.path.append(os.path.join(os.getcwd(), 'sdk'))

try:
    from agentscore.callback import AgentScoreCallbackHandler
    from langchain_core.outputs import LLMResult, ChatGeneration
    from langchain_core.messages import AIMessage
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def verify_db_storage():
    print("Initializing Handler with http://localhost:3000 ...")
    handler = AgentScoreCallbackHandler(backend_url="http://localhost:3000")
    
    run_id = uuid.uuid4()
    parent_run_id = uuid.uuid4()
    
    print(f"Sending Start Event for Run ID: {run_id}")
    # Using kwargs to pass specific model info to test the new logic
    handler.on_chat_model_start(
        serialized={"name": "gpt-4o-wrapper"},
        messages=[["Human: Database verification test."]],
        run_id=run_id,
        parent_run_id=parent_run_id,
        invocation_params={"model": "gpt-4o"} 
    )
    
    time.sleep(0.5)
    
    print("Sending End Event...")
    message = AIMessage(
        content="AI: Verifying storage.", 
        usage_metadata={"input_tokens": 12, "output_tokens": 8, "total_tokens": 20}
    )
    generation = ChatGeneration(message=message)
    result = LLMResult(generations=[[generation]])
    
    handler.on_chat_model_end(
        result=result,
        run_id=run_id,
        parent_run_id=parent_run_id
    )
    
    print("Waiting for background thread to send...")
    time.sleep(3) 
    print("Done.")

if __name__ == "__main__":
    verify_db_storage()
