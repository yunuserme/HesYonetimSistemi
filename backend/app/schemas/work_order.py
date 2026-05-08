from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

class WorkOrderCreate(BaseModel):

    title: str

    description: Optional[str] = None

    priority: Optional[str] = "MEDIUM"

    assigned_to: Optional[int] = None


# ─────────────────────────────────────────────
# RESPONSE
# ─────────────────────────────────────────────

class WorkOrderResponse(BaseModel):

    id: int

    title: str

    description: Optional[str]

    priority: str

    status: str

    assigned_to: Optional[int]

    created_by: Optional[int]

    created_at: datetime

    closed_at: Optional[datetime]

    model_config = {
        "from_attributes": True
    }