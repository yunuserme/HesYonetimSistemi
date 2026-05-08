from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ─────────────────────────────────────────────
# CREATE
# ─────────────────────────────────────────────

class TurbineCreate(BaseModel):

    turbine_name: str

    status: Optional[str] = "ACTIVE"

    rpm: Optional[int] = 0

    temperature: Optional[float] = 0

    power_output: Optional[float] = 0


# ─────────────────────────────────────────────
# RESPONSE
# ─────────────────────────────────────────────

class TurbineResponse(BaseModel):

    id: int

    turbine_name: str

    status: str

    rpm: int

    temperature: float

    power_output: float

    is_active: bool

    created_at: datetime

    model_config = {
        "from_attributes": True
    }