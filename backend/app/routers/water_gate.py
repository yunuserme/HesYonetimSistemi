from datetime import datetime
from datetime import timezone

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import Request
from fastapi import status

from sqlalchemy import desc
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.middleware.rbac import has_permission
from app.models.user import UserRole
from app.models.water_gate import WaterGate
from app.models.water_gate_log import WaterGateLog
from app.schemas.auth import CurrentUser
from app.schemas.water_gate import WaterGateLogResponse
from app.schemas.water_gate import WaterGateOpeningResponse
from app.schemas.water_gate import WaterGateOpeningUpdate
from app.schemas.water_gate import WaterGateResponse


router = APIRouter(
    prefix="",
    tags=["Water Gates"]
)


def calculate_gate_status(open_percentage: float) -> str:
    if open_percentage <= 0:
        return "CLOSED"

    if open_percentage >= 100:
        return "OPEN"

    return "PARTIAL"


def user_has_permission(current_user: CurrentUser, permission: str) -> bool:
    role = current_user.role

    if isinstance(role, str):
        role = UserRole(role)

    return has_permission(role, permission)


@router.get(
    "/gates",
    response_model=list[WaterGateResponse]
)
@router.get(
    "/api/gates",
    response_model=list[WaterGateResponse]
)
async def get_water_gates(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WaterGate).order_by(WaterGate.id)
    )

    return result.scalars().all()


@router.get(
    "/gates/{gate_id}",
    response_model=WaterGateResponse
)
@router.get(
    "/api/gates/{gate_id}",
    response_model=WaterGateResponse
)
async def get_water_gate(
    gate_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(WaterGate).where(WaterGate.id == gate_id)
    )

    gate = result.scalar_one_or_none()

    if gate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water gate not found"
        )

    return gate


@router.patch(
    "/gates/{gate_id}",
    response_model=WaterGateOpeningResponse
)
@router.patch(
    "/api/gates/{gate_id}",
    response_model=WaterGateOpeningResponse
)
@router.patch(
    "/api/gates/{gate_id}/opening",
    response_model=WaterGateOpeningResponse
)
async def update_water_gate_opening(
    gate_id: int,
    body: WaterGateOpeningUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    if body.confirm is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Savak kapak islemi icin confirm=true gonderilmelidir."
        )

    target_percentage = float(body.target_percentage)
    requires_supervisor_approval = target_percentage > 80

    if requires_supervisor_approval:
        is_allowed = (
            current_user.role == UserRole.ADMIN
            or user_has_permission(current_user, "scada_control")
        )
    else:
        is_allowed = (
            user_has_permission(current_user, "gate_open")
            or user_has_permission(current_user, "scada_control")
        )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu savak kapak islemi icin yetkiniz yok."
        )

    result = await db.execute(
        select(WaterGate).where(WaterGate.id == gate_id)
    )

    gate = result.scalar_one_or_none()

    if gate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water gate not found"
        )

    previous_percentage = float(gate.open_percentage or 0)
    new_status = calculate_gate_status(target_percentage)
    updated_at = datetime.now(timezone.utc)

    gate.open_percentage = target_percentage
    gate.status = new_status
    gate.updated_at = updated_at

    log = WaterGateLog(
        water_gate_id=gate.id,
        user_id=current_user.id,
        action="OPENING_UPDATED",
        previous_open_percentage=previous_percentage,
        new_open_percentage=target_percentage,
        status_after=new_status,
        reason=body.reason,
        requires_supervisor_approval=requires_supervisor_approval,
        ip_address=request.client.host if request.client else None
    )

    db.add(log)

    await db.commit()
    await db.refresh(gate)

    return WaterGateOpeningResponse(
        id=gate.id,
        name=gate.gate_name,
        gate_name=gate.gate_name,
        previous_open_percentage=previous_percentage,
        previous_opening_percentage=previous_percentage,
        opening_percentage=float(gate.open_percentage or 0),
        open_percentage=float(gate.open_percentage or 0),
        status=gate.status,
        requires_supervisor_approval=requires_supervisor_approval,
        updated_by=current_user.id,
        updated_at=gate.updated_at or updated_at
    )


@router.get(
    "/gates/{gate_id}/logs",
    response_model=list[WaterGateLogResponse]
)
@router.get(
    "/api/gates/{gate_id}/logs",
    response_model=list[WaterGateLogResponse]
)
async def get_water_gate_logs(
    gate_id: int,
    db: AsyncSession = Depends(get_db)
):
    gate_result = await db.execute(
        select(WaterGate).where(WaterGate.id == gate_id)
    )

    gate = gate_result.scalar_one_or_none()

    if gate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Water gate not found"
        )

    result = await db.execute(
        select(WaterGateLog)
        .where(WaterGateLog.water_gate_id == gate_id)
        .order_by(desc(WaterGateLog.created_at))
    )

    return result.scalars().all()
