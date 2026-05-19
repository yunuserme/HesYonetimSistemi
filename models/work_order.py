import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from database import Base  # Kendi veritabanı bağlantı dosyanızın yolu

# İş Emri Durum Makinesi (State Machine)
class WorkOrderStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    WAITING = "WAITING"

# Veritabanı Tablosu
class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.OPEN)
    
    # Kim oluşturdu, kime atandı?
    created_by = Column(String) 
    assigned_to = Column(String, nullable=True)
    
    # Zaman damgaları
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())