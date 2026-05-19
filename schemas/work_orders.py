from pydantic import BaseModel
from typing import Optional

class WorkOrderCreate(BaseModel):
    title: str
    description: str

class WorkOrderResponse(WorkOrderCreate):
    id: int
    status: str
    created_by: str
    assigned_to: Optional[str]

    class Config:
        orm_mode = True