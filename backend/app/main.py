from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends

from slowapi import Limiter
from slowapi import _rate_limit_exceeded_handler

from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings

from app.database.database import engine
from app.database.database import Base

from app.routers.auth import router as auth_router

from app.schemas.auth import CurrentUser
from app.routers.work_order import router as work_order_router

from app.middleware.rbac import require_permission
from app.models.turbine import Turbine
from app.models.sensor import Sensor
from app.models.alarm import Alarm
from app.models.work_order import WorkOrder
from app.models.work_order_log import WorkOrderLog
from app.routers.turbine import router as turbine_router
from app.routers.alarm import router as alarm_router
from app.routers.sensor import router as sensor_router
from app.routers.scada import router as scada_router
from app.routers.energy import router as energy_router


# ─────────────────────────────────────────────────────────────
# RATE LIMITER
# ─────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address
)


# ─────────────────────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────────────────────

app = FastAPI(

    title=settings.APP_NAME,

    description="""
## HES Yönetim Sistemi — Auth & Security API

### Özellikler
- JWT tabanlı kimlik doğrulama
- Access + Refresh token sistemi
- Role Based Access Control (RBAC)
- bcrypt şifre güvenliği
- Audit logging
- Rate limiting

### Roller ve Yetkiler

| İşlem | Operator | Engineer | Admin | Technician | Manager |
|-------|----------|----------|-------|------------|---------|
| Türbin durdur | ✅ | ❌ | ✅ | ❌ | ❌ |
| Savak aç | ✅ | ❌ | ✅ | ❌ | ❌ |
| Tahmin gör | ❌ | ✅ | ✅ | ❌ | ✅ |
| İş emri gör | ❌ | ❌ | ✅ | ✅ | ❌ |
| Rapor export | ❌ | ❌ | ✅ | ❌ | ✅ |
    """,

    version="1.0.0",

    docs_url="/docs",

    redoc_url="/redoc",
)


# ─────────────────────────────────────────────────────────────
# RATE LIMIT HANDLER
# ─────────────────────────────────────────────────────────────

app.state.limiter = limiter

app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)


# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,

    allow_origins=settings.CORS_ORIGINS,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# ROUTERS
# ─────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(turbine_router)
app.include_router(work_order_router)
app.include_router(alarm_router)
app.include_router(sensor_router)
app.include_router(scada_router)
app.include_router(energy_router)

# ─────────────────────────────────────────────────────────────
# STARTUP
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():

    async with engine.begin() as conn:

        await conn.run_sync(
            Base.metadata.create_all
        )

    print("[OK] HES Backend baslatildi.")


# ─────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=["System"]
)

async def health_check():

    return {
        "status": "ok",
        "service": settings.APP_NAME
    }


# ─────────────────────────────────────────────────────────────
# PROTECTED ROUTE EXAMPLE
# ─────────────────────────────────────────────────────────────

@app.post(
    "/example/turbine-stop",
    tags=["Örnek - Protected Routes"]
)

async def example_turbine_stop(

    current_user: CurrentUser = require_permission(
        "turbine_stop"
    ),

):

    return {

        "message": "Türbin durdurma komutu gönderildi.",

        "executed_by": current_user.username,

        "role": current_user.role,
    }