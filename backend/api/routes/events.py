from fastapi import APIRouter
from models.events import Event

router = APIRouter()

@router.post("/events")
async def capture_event(event: Event):
    #This does all the capture Pipeline
    print(f"Captured event: {event} call for {event.workflow_id} ")

    #Returns reponse so the SDK knows it was successful
    return {"status": "success", "received": event.workflow_id}
