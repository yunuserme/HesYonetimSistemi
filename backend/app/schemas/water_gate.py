from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import Field
from pydantic import model_validator


class WaterGateResponse(BaseModel):
    id: int
    name: str
    gate_name: str
    opening_percentage: float
    open_percentage: float
    status: str
    flow_rate: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class WaterGateOpeningUpdate(BaseModel):
    opening_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    open_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    confirm: bool = True
    reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_percentage(self):
        if self.opening_percentage is None and self.open_percentage is None:
            raise ValueError("opening_percentage zorunludur.")

        return self

    @property
    def target_percentage(self) -> float:
        if self.opening_percentage is not None:
            return self.opening_percentage

        return self.open_percentage


class WaterGateOpeningResponse(BaseModel):
    id: int
    name: str
    gate_name: str
    previous_open_percentage: float
    previous_opening_percentage: float
    opening_percentage: float
    open_percentage: float
    status: str
    requires_supervisor_approval: bool
    updated_by: int
    updated_at: datetime


class WaterGateLogResponse(BaseModel):
    id: int
    water_gate_id: int
    user_id: int
    action: str
    previous_open_percentage: float
    new_open_percentage: float
    status_after: str
    reason: Optional[str] = None
    requires_supervisor_approval: bool
    created_at: datetime
    ip_address: Optional[str] = None

    model_config = {
        "from_attributes": True
    }
