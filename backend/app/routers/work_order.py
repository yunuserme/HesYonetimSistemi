from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from datetime import datetime
from datetime import timezone

from app.core.dependencies import get_current_user
from app.database.database import get_db

from app.models.user import User
from app.models.user import UserRole
from app.models.work_order import WorkOrder
from app.models.work_order_log import WorkOrderLog

from app.schemas.auth import CurrentUser
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


WORK_ORDER_MANAGER_ROLES = {
    UserRole.ADMIN,
    UserRole.MANAGER
}


def get_user_role(current_user: CurrentUser) -> UserRole | None:
    try:
        return UserRole(current_user.role)
    except ValueError:
        return None


def is_work_order_manager(current_user: CurrentUser) -> bool:
    return get_user_role(current_user) in WORK_ORDER_MANAGER_ROLES


def is_technician(current_user: CurrentUser) -> bool:
    return get_user_role(current_user) == UserRole.TECHNICIAN


def raise_forbidden(detail: str = "You do not have permission for this action."):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail
    )


async def validate_assigned_technician(
    assigned_to: int,
    db: AsyncSession
) -> User:
    result = await db.execute(
        select(User).where(User.id == assigned_to)
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned technician not found"
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned technician is not active"
        )

    try:
        assigned_user_role = UserRole(user.role)
    except ValueError:
        assigned_user_role = None

    if assigned_user_role != UserRole.TECHNICIAN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user must be a technician"
        )

    return user


def ensure_can_access_work_order(
    work_order: WorkOrder,
    current_user: CurrentUser
):
    if is_work_order_manager(current_user):
        return

    if is_technician(current_user):
        if work_order.assigned_to == current_user.id:
            return

    raise_forbidden("You do not have access to this work order.")


# ─────────────────────────────────────────────
# CREATE WORK ORDER
# ─────────────────────────────────────────────

@router.post(
    "/",
    response_model=WorkOrderResponse
)
async def create_work_order(

    work_order_data: WorkOrderCreate,

    db: AsyncSession = Depends(get_db),

    current_user: CurrentUser = Depends(get_current_user)

):

    if not is_work_order_manager(current_user):
        raise_forbidden("Only admin or manager users can create work orders.")

    if work_order_data.assigned_to is not None:
        await validate_assigned_technician(
            work_order_data.assigned_to,
            db
        )

    work_order = WorkOrder(

        title=work_order_data.title,

        description=work_order_data.description,

        priority=work_order_data.priority,

        assigned_to=work_order_data.assigned_to,

        due_at=work_order_data.due_at,

        created_by=current_user.id,

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

    db: AsyncSession = Depends(get_db),

    current_user: CurrentUser = Depends(get_current_user)

):

    if is_work_order_manager(current_user):
        statement = select(WorkOrder)
    elif is_technician(current_user):
        statement = select(WorkOrder).where(
            WorkOrder.assigned_to == current_user.id
        )
    else:
        raise_forbidden("You do not have permission to view work orders.")

    result = await db.execute(
        statement
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

    db: AsyncSession = Depends(get_db),

    current_user: CurrentUser = Depends(get_current_user)

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

    ensure_can_access_work_order(
        work_order,
        current_user
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

    db: AsyncSession = Depends(get_db),

    current_user: CurrentUser = Depends(get_current_user)

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

    if is_work_order_manager(current_user):
        assigned_to = update_data.get("assigned_to")

        if assigned_to is not None:
            await validate_assigned_technician(
                assigned_to,
                db
            )
    elif is_technician(current_user):
        if work_order.assigned_to != current_user.id:
            raise_forbidden("You can update only your assigned work orders.")

        disallowed_fields = set(update_data) - {"status"}

        if disallowed_fields:
            raise_forbidden(
                "Technicians can update only the status of a work order."
            )
    else:
        raise_forbidden("You do not have permission to update work orders.")

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
