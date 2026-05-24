from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import Boolean
from sqlalchemy import TIMESTAMP

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base


class Turbine(Base):

    __tablename__ = "turbines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    turbine_name = Column(
        String,
        nullable=False,
        unique=True
    )

    status = Column(
        String,
        default="ACTIVE"
    )

    rpm = Column(
        Integer,
        default=0
    )

    temperature = Column(
        Numeric,
        default=0
    )

    power_output = Column(
        Numeric,
        default=0
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    sensors = relationship(
        "Sensor",
        back_populates="turbine",
        cascade="all, delete-orphan"
    )
