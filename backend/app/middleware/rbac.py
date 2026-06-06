from functools import wraps
from fastapi import HTTPException, status
from app.models.user import UserRole

# ── Yetki Matrisi ─────────────────────────────────────────────────────────────
# Dokümandaki tabloya birebir uygun:
# İşlem         Operator  Engineer  Admin  Technician  Manager
# Türbin durdur   ✅         ❌       ✅       ❌          ❌
# Savak aç        ✅         ❌       ✅       ❌          ❌
# Tahmin gör      ❌         ✅       ✅       ❌          ✅
# İş emri gör     ❌         ❌       ✅       ✅          ❌
# Rapor export    ❌         ❌       ✅       ❌          ✅

ROLE_PERMISSIONS: dict[UserRole, list[str]] = {
    UserRole.ADMIN: [
        # Admin her şeyi yapabilir
        "turbine_stop",
        "gate_open",
        "prediction_view",
        "work_order_view",
        "work_order_create",
        "work_order_close",
        "report_export",
        "alarm_resolve",
        "user_manage",
        "scada_control",
    ],
    UserRole.OPERATOR: [
        "turbine_stop",
        "gate_open",
        "scada_control",
        "alarm_view",
    ],
    UserRole.ENGINEER: [
        "prediction_view",
        "report_export",
        "alarm_view",
    ],
    UserRole.TECHNICIAN: [
        "work_order_view",
        "work_order_close",
        "alarm_view",
    ],
    UserRole.MANAGER: [
        "prediction_view",
        "report_export",
        "alarm_view",
    ],
}


def has_permission(role: UserRole, permission: str) -> bool:
    """Verilen rolün belirtilen yetkiye sahip olup olmadığını kontrol et."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def require_permission(permission: str):
    """
    FastAPI route'larında kullanılan yetki decorator'ı.

    Kullanım:
        @router.post("/turbines/{id}/stop")
        async def stop_turbine(
            turbine_id: int,
            current_user: CurrentUser = Depends(get_current_user),
            _: None = Depends(require_permission("turbine_stop"))
        ):
            ...
    """
    from fastapi import Depends
    from app.core.dependencies import get_current_user
    from app.schemas.auth import CurrentUser

    async def permission_checker(
        current_user: CurrentUser = Depends(get_current_user),
    ):
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için yetkiniz yok. Gerekli yetki: '{permission}'",
            )
        return current_user

    return Depends(permission_checker)
