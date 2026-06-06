from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Boolean
from sqlalchemy import Text
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base


class Alarm(Base):

    __tablename__ = "alarms"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    sensor_id = Column(
        Integer,
        ForeignKey("sensors.id"),
        nullable=False
    )

    severity = Column(
        String,
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    resolved = Column(
        Boolean,
        default=False
    )

    status = Column(
        String,
        default="OPEN"
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    sensor = relationship(
        "Sensor"
    )