from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.models.sensor import Sensor
from app.schemas.sensor import SensorCreate, SensorResponse, SensorUpdate

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

# ─────────────────────────────────────────────
# UPDATE SENSOR
# ─────────────────────────────────────────────
@router.patch(
    "/{sensor_id}",
    response_model=SensorResponse
)
async def update_sensor(
    sensor_id: int,
    sensor_data: SensorUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Sensor).where(Sensor.id == sensor_id)
    )
    sensor = result.scalar_one_or_none()
    if not sensor:
        raise HTTPException(
            status_code=404,
            detail="Sensor not found"
        )

    update_data = sensor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sensor, field, value)

    await db.commit()
    await db.refresh(sensor)
    return sensor