from app.database.database import Base
from app.database.database import engine

from app.models.role import Role
from app.models.user import User
from app.models.turbine import Turbine
from app.models.sensor import Sensor
from app.models.alarm import Alarm
from app.models.work_order import WorkOrder
from app.models.work_order_log import WorkOrderLog


print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Tables created successfully.")