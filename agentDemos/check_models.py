import os
from google import genai
from dotenv import load_dotenv

load_dotenv(dotenv_path="../backend/.env")

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

for m in client.models.list():
    print(f"Name: {m.name}, Display Name: {m.display_name}, Methods: {m.supported_generation_methods}")
