import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing Key: {api_key[:10]}...")

client = genai.Client(api_key=api_key)
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents="Say hello"
    )
    print("SUCCESS:", response.text)
except Exception as e:
    print("FAILED:", e)
