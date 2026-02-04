import os
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

sys.path.append(str(Path(__file__).resolve().parent.parent / "sdk"))
from agentscore import AgentScoreCallbackHandler, reset_trace_id, get_trace_id

env_path = Path(__file__).resolve().parent.parent / "sdk" / "agentscore" / ".env"
load_dotenv(dotenv_path=env_path)

async def test_run():
    reset_trace_id()
    handler = AgentScoreCallbackHandler()
    print(f"Trace ID: {get_trace_id()}")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        callbacks=[handler],
        google_api_key=os.getenv("GEMINI_AGENT_KEY")
    )
    
    try:
        print("Sending request...")
        resp = await llm.ainvoke([HumanMessage(content="Hello")])
        print(f"Response: {resp.content}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_run())
