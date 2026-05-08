from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Text
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base


class WorkOrderLog(Base):

    __tablename__ = "work_order_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    work_order_id = Column(
        Integer,
        ForeignKey("work_orders.id"),
        nullable=False
    )

    action = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    work_order = relationship(
        "WorkOrder"
    )