from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

class AlarmCreate(BaseModel):

    sensor_id: int

    severity: str

    message: str


# ─────────────────────────────────────────────
# RESPONSE
# ─────────────────────────────────────────────

class AlarmResponse(BaseModel):

    id: int

    sensor_id: int

    severity: str

    message: str

    resolved: bool

    status: str

    created_at: datetime

    model_config = {
        "from_attributes": True
    }