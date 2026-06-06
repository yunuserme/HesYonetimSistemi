from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from datetime import datetime
from datetime import timezone

from app.database.database import get_db

from app.models.work_order import WorkOrder
from app.models.work_order_log import WorkOrderLog

from app.schemas.work_order import WorkOrderCreate
from app.schemas.work_order import WorkOrderUpdate
from app.schemas.work_order import WorkOrderResponse


router = APIRouter(
    prefix="/work-orders",
    tags=["Work Orders"]
)


ALLOWED_STATUS_FLOW = {
    "PENDING": ["ACCEPTED"],
    "ACCEPTED": ["IN_PROGRESS"],
    "IN_PROGRESS": ["COMPLETED"],
    "COMPLETED": []
}


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

        due_at=work_order_data.due_at,

        status="PENDING"
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


# ─────────────────────────────────────────────
# GET WORK ORDER BY ID
# ─────────────────────────────────────────────

@router.get(
    "/{work_order_id}",
    response_model=WorkOrderResponse
)
async def get_work_order(

    work_order_id: int,

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )

    work_order = result.scalar_one_or_none()

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found"
        )

    return work_order


# ─────────────────────────────────────────────
# UPDATE WORK ORDER
# ─────────────────────────────────────────────

@router.patch(
    "/{work_order_id}",
    response_model=WorkOrderResponse
)
async def update_work_order(

    work_order_id: int,

    work_order_data: WorkOrderUpdate,

    db: AsyncSession = Depends(get_db)

):

    result = await db.execute(
        select(WorkOrder).where(WorkOrder.id == work_order_id)
    )

    work_order = result.scalar_one_or_none()

    if work_order is None:
        raise HTTPException(
            status_code=404,
            detail="Work order not found"
        )

    update_data = work_order_data.model_dump(
        exclude_unset=True
    )

    new_status = update_data.get("status")

    if new_status is not None:

        new_status = new_status.upper()

        current_status = work_order.status

        if new_status not in ALLOWED_STATUS_FLOW:
            raise HTTPException(
                status_code=400,
                detail="Invalid work order status"
            )

        allowed_next_statuses = ALLOWED_STATUS_FLOW.get(
            current_status,
            []
        )

        if new_status != current_status and new_status not in allowed_next_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition: {current_status} -> {new_status}"
            )

        work_order.status = new_status

        if new_status == "COMPLETED":
            work_order.closed_at = datetime.now(timezone.utc)

        log = WorkOrderLog(
            work_order_id=work_order.id,
            action=f"Status changed from {current_status} to {new_status}"
        )

        db.add(log)

    for field, value in update_data.items():

        if field == "status":
            continue

        setattr(
            work_order,
            field,
            value
        )

    await db.commit()

    await db.refresh(work_order)

    return work_order