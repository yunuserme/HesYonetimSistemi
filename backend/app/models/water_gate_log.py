from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import ForeignKey
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import TIMESTAMP

from sqlalchemy.orm import relationship

from sqlalchemy.sql import func

from app.database.database import Base


class WaterGateLog(Base):

    __tablename__ = "water_gate_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    water_gate_id = Column(
        Integer,
        ForeignKey("water_gates.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    action = Column(
        String,
        nullable=False
    )

    previous_open_percentage = Column(
        Numeric(5, 2),
        nullable=False
    )

    new_open_percentage = Column(
        Numeric(5, 2),
        nullable=False
    )

    status_after = Column(
        String,
        nullable=False
    )

    reason = Column(
        Text,
        nullable=True
    )

    requires_supervisor_approval = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    ip_address = Column(
        String,
        nullable=True
    )

    water_gate = relationship(
        "WaterGate",
        back_populates="logs"
    )

    user = relationship(
        "User"
    )
