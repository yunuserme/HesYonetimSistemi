from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db

from app.models.turbine import Turbine

from app.schemas.turbine import TurbineCreate
from app.schemas.turbine import TurbineResponse

router = APIRouter(
    prefix="/turbines",
    tags=["Turbines"]
)


# ─────────────────────────────────────────────
# CREATE TURBINE
# ─────────────────────────────────────────────

@router.post(
    "/",
    response_model=TurbineResponse
)

async def create_turbine(

    turbine_data: TurbineCreate,

    db: AsyncSession = Depends(get_db)

):

    turbine = Turbine(

        turbine_name=turbine_data.turbine_name,

        status=turbine_data.status,

        rpm=turbine_data.rpm,

        temperature=turbine_data.temperature,

        power_output=turbine_data.power_output,
    )

    db.add(turbine)

    await db.commit()

    await db.refresh(turbine)

    return turbine


# ─────────────────────────────────────────────
# GET ALL TURBINES
# ─────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[TurbineResponse]
)

async def get_turbines(

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(Turbine)
    )

    turbines = result.scalars().all()

    return turbines