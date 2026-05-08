from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db

from app.models.work_order import WorkOrder

from app.schemas.work_order import WorkOrderCreate
from app.schemas.work_order import WorkOrderResponse


router = APIRouter(
    prefix="/work-orders",
    tags=["Work Orders"]
)


# ─────────────────────────────────────────────
# CREATE WORK ORDER
# ─────────────────────────────────────────────

@router.post(
    "/",
    response_model=WorkOrderResponse
)

async def create_work_order(

    work_order_data: WorkOrderCreate,

    db: AsyncSession = Depends(get_db)

):

    work_order = WorkOrder(

        title=work_order_data.title,

        description=work_order_data.description,

        priority=work_order_data.priority,

        assigned_to=work_order_data.assigned_to,
    )

    db.add(work_order)

    await db.commit()

    await db.refresh(work_order)

    return work_order


# ─────────────────────────────────────────────
# GET ALL WORK ORDERS
# ─────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[WorkOrderResponse]
)

async def get_work_orders(

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(WorkOrder)
    )

    work_orders = result.scalars().all()

    return work_orders