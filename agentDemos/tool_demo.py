import os
import asyncio
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from agentscore import AgentScoreCallbackHandler, reset_trace_id, get_trace_id

# Load environment variables
load_dotenv(dotenv_path="sdk/agentscore/.env")

# 1. Define a simple tool
@tool
def calculator(expression: str) -> str:
    """Calculates a mathematical expression."""
    print(f"  [System] Tool 'calculator' executing: {expression}")
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

async def main():
    print("=== Tool Usage Demo ===")
    
    reset_trace_id()
    
    # 2. Setup Handler
    handler = AgentScoreCallbackHandler()
    
    # 3. Setup LLM with Tools
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp",
        callbacks=[handler],
        temperature=0.0,
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    # Bind the tool to the LLM
    llm_with_tools = llm.bind_tools([calculator])
    
    print(f"Trace ID: {get_trace_id()}")
    
    # 4. Invoke
    query = "What is 153 * 99?"
    print(f"Query: {query}")
    
    # NOTE: In a raw bind_tools call, 'tool_call' events are handled a bit differently 
    # than full Agents. We might see 'llm_end' contain tool_calls, but 'on_tool_start'
    # requires the tool to actually be EXECUTED by a runtime (AgentExecutor or custom loop).
    # 
    # For this demo, we will manually simulate the loop to ensure callbacks fire:
    
    messages = [HumanMessage(content=query)]
    
    # A. LLM decides to call tool
    ai_msg = await llm_with_tools.ainvoke(messages)
    messages.append(ai_msg)
    
    # B. Execute tool if requested
    if ai_msg.tool_calls:
        print("\n--- Agent decided to use tool ---")
        for tool_call in ai_msg.tool_calls:
            # We must manually invoke the tool to trigger on_tool_start/end
            # because we aren't using AgentExecutor here (kept it simple).
            # BUT: invoking the tool directly (calculator.invoke) DOES trigger callbacks
            # if we pass the config!
            
            tool_invocation = tool_call["args"]
            
            # Manually running tool with callback config
            result = calculator.invoke(
                tool_invocation, 
                config={"callbacks": [handler]}
            )
            print(f"--- Tool Result: {result} ---\n")

if __name__ == "__main__":
    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not found.")
        exit(1)
        
    asyncio.run(main())
