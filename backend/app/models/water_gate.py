from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import TIMESTAMP

from sqlalchemy.orm import relationship

from sqlalchemy.sql import func

from app.database.database import Base


class WaterGate(Base):

    __tablename__ = "water_gates"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    gate_name = Column(
        String,
        unique=True,
        nullable=False
    )

    open_percentage = Column(
        Numeric(5, 2),
        nullable=False,
        default=0
    )

    status = Column(
        String,
        nullable=False,
        default="CLOSED"
    )

    flow_rate = Column(
        Numeric(10, 2),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    logs = relationship(
        "WaterGateLog",
        back_populates="water_gate",
        cascade="all, delete-orphan"
    )

    @property
    def name(self):
        return self.gate_name

    @property
    def opening_percentage(self):
        return self.open_percentage
