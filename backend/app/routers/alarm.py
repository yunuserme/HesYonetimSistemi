from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db

from app.models.alarm import Alarm

from app.schemas.alarm import AlarmCreate
from app.schemas.alarm import AlarmResponse


router = APIRouter(
    prefix="/alarms",
    tags=["Alarms"]
)


# ─────────────────────────────────────────────
# CREATE ALARM
# ─────────────────────────────────────────────

@router.post(
    "/",
    response_model=AlarmResponse
)

async def create_alarm(

    alarm_data: AlarmCreate,

    db: AsyncSession = Depends(get_db)

):

    alarm = Alarm(

        sensor_id=alarm_data.sensor_id,

        severity=alarm_data.severity,

        message=alarm_data.message,
    )

    db.add(alarm)

    await db.commit()

    await db.refresh(alarm)

    return alarm


# ─────────────────────────────────────────────
# GET ALL ALARMS
# ─────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[AlarmResponse]
)

async def get_alarms(

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(Alarm)
    )

    alarms = result.scalars().all()

    return alarms