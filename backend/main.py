from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import events

# Initialize the app with the correct project name
app = FastAPI(title="Kaizen API", version="1.0.0")

# CORS Middleware - Critical for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],    
)

# This connects your events.py file to the main app
# Your endpoints will now live at http://localhost:8000/api/v1/events
app.include_router(events.router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "active", "version": "1.0.0"}