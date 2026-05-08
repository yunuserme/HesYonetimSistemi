from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base


class WorkOrder(Base):

    __tablename__ = "work_orders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String,
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    priority = Column(
        String,
        default="MEDIUM"
    )

    status = Column(
        String,
        default="OPEN"
    )

    assigned_to = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    closed_at = Column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    assigned_user = relationship(
        "User",
        foreign_keys=[assigned_to]
    )

    creator_user = relationship(
        "User",
        foreign_keys=[created_by]
    )