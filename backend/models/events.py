from pydantic import BaseModel
from uuid import UUID

class Event(BaseModel):
    #Ensures every even is linked to a specific run via UUID
    workflow_id: UUID
    model: str
    prompt: str
    #remaining will be filled out once we have database schema figured out

