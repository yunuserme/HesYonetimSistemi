from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db

from app.models.sensor import Sensor

from app.schemas.sensor import SensorCreate
from app.schemas.sensor import SensorResponse


router = APIRouter(
    prefix="/sensors",
    tags=["Sensors"]
)


# ─────────────────────────────────────────────
# CREATE SENSOR
# ─────────────────────────────────────────────

@router.post(
    "/",
    response_model=SensorResponse
)

async def create_sensor(

    sensor_data: SensorCreate,

    db: AsyncSession = Depends(get_db)

):

    sensor = Sensor(

        sensor_name=sensor_data.sensor_name,

        sensor_type=sensor_data.sensor_type,

        turbine_id=sensor_data.turbine_id,

        current_value=sensor_data.current_value,
    )

    db.add(sensor)

    await db.commit()

    await db.refresh(sensor)

    return sensor


# ─────────────────────────────────────────────
# GET ALL SENSORS
# ─────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[SensorResponse]
)

async def get_sensors(

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(Sensor)
    )

    sensors = result.scalars().all()

    return sensors