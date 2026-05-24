from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

class SensorCreate(BaseModel):

    sensor_name: str

    sensor_type: str

    turbine_id: int

    current_value: Optional[float] = 0


# ─────────────────────────────────────────────
# RESPONSE
# ─────────────────────────────────────────────

class SensorResponse(BaseModel):

    id: int

    sensor_name: str

    sensor_type: str

    turbine_id: int

    current_value: float

    status: str

    created_at: datetime

    model_config = {
        "from_attributes": True
    }
