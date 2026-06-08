from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Numeric
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base


class Sensor(Base):

    __tablename__ = "sensors"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sensor_name = Column(
        String,
        nullable=False,
        unique=True
    )

    sensor_type = Column(
        String,
        nullable=False
    )

    turbine_id = Column(
        Integer,
        ForeignKey("turbines.id"),
        nullable=False
    )

    current_value = Column(
        Numeric,
        default=0
    )

    status = Column(
        String,
        default="ACTIVE"
    )

    last_signal_time = Column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    turbine = relationship(
        "Turbine",
        back_populates="sensors"
    )