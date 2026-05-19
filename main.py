from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import engine, Base
from routers.auth import router as auth_router

# ── Rate Limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Uygulama ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## HES Yönetim Sistemi — Auth & Security API

### Özellikler
- JWT tabanlı kimlik doğrulama (Access + Refresh token)
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
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc UI
)

# ── Rate Limit Handler ────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router'ları Ekle ──────────────────────────────────────────────────────────
app.include_router(auth_router)

# ── Startup: Tabloları Oluştur ────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Veritabanı tabloları hazır.")

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok", "service": settings.APP_NAME}


# ── Korumalı Route Örneği (diğer modüller için referans) ─────────────────────
from fastapi import Depends
from schemas.auth import CurrentUser
from core.dependencies import get_current_user
from middleware.rbac import require_permission

@app.post("/example/turbine-stop", tags=["Örnek - Protected Routes"])
async def example_turbine_stop(
    current_user: CurrentUser = require_permission("turbine_stop"),
):
    """
    Bu endpoint sadece OPERATOR ve ADMIN rolü için erişilebilir.
    Diğer roller 403 alır.
    
    Diğer modüller bu pattern'i kullanacak:
        current_user = require_permission("gate_open")
        current_user = require_permission("work_order_close")
        vb.
    """
    return {
        "message": f"Türbin durdurma komutu gönderildi.",
        "executed_by": current_user.username,
        "role": current_user.role,
    }
