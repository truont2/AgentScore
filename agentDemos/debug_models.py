
import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / "sdk" / "kaizen" / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GEMINI_AGENT_KEY")
if not api_key:
    # Try getting from the other env location
    env_path_backend = Path(__file__).resolve().parent.parent / "backend" / ".env"
    load_dotenv(dotenv_path=env_path_backend)
    api_key = os.getenv("GEMINI_API_KEY") 

print(f"Using API Key: {api_key[:5]}... (from env)")

genai.configure(api_key=api_key)

print("\n--- Available Models ---")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
