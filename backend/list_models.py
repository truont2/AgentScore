import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Try to load from ../backend/.env if running from root or elsewhere
    load_dotenv("backend/.env")
    api_key = os.getenv("GEMINI_API_KEY")

print(f"Key found: {bool(api_key)}")

client = genai.Client(api_key=api_key)

try:
    print("Listing models...")
    # The new SDK syntax for listing models might be different, 
    # but let's try the common ones or inspect the client if possible.
    # Based on types import in main.py, this is the new google-genai library.
    # It usually has models.list()
    
    # We will try to iterate and print. 
    # If this fails, we catch it.
    for m in client.models.list():
        print(f"Model: {m.name}")
        # print(f" - {m.display_name}")
            
except Exception as e:
    print(f"Error listing models: {e}")
