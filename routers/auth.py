from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
import json

from core.database import get_db
from core.security import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, decode_token
)
from core.config import settings
from core.dependencies import get_current_user
from models.user import User, RefreshToken, AuditLog
from schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    AccessTokenResponse, RefreshRequest, UserResponse, CurrentUser
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Audit Log Yardımcısı ──────────────────────────────────────────────────────
async def log_action(
    db: AsyncSession,
    user_id: int | None,
    action: str,
    resource: str | None = None,
    detail: dict | None = None,
    ip_address: str | None = None,
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        detail=json.dumps(detail) if detail else None,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()


# ── POST /auth/register ───────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Yeni kullanıcı oluştur.
    - Username ve email unique olmalı
    - Şifre güvenlik politikasına uymalı
    """
    # Şifre güvenlik kontrolü
    valid, msg = validate_password_strength(body.password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Username kontrolü
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu kullanıcı adı zaten kullanılıyor.",
        )

    # Email kontrolü
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email zaten kayıtlı.",
        )

    # Kullanıcıyı oluştur
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()  # id'yi al

    await log_action(
        db, user.id, "REGISTER",
        detail={"username": user.username, "role": user.role},
        ip_address=request.client.host,
    )

    return user


# ── POST /auth/login ──────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Kullanıcı girişi.
    Başarılı → access_token + refresh_token döner.
    """
    # Kullanıcıyı bul
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    # Kullanıcı bulunamadı veya şifre yanlış — güvenlik için aynı mesaj
    if not user or not verify_password(body.password, user.hashed_password):
        await log_action(
            db, None, "LOGIN_FAILED",
            detail={"username": body.username, "reason": "invalid_credentials"},
            ip_address=request.client.host,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız devre dışı bırakılmış.",
        )

    # Token payload
    token_data = {"sub": str(user.id), "role": user.role}

    access_token  = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Refresh token'ı DB'ye kaydet
    rt = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)

    await log_action(
        db, user.id, "LOGIN",
        detail={"role": user.role},
        ip_address=request.client.host,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ── POST /auth/logout ─────────────────────────────────────────────────────────
@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    body: RefreshRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Çıkış işlemi.
    Refresh token'ı blacklist'e al (is_revoked=True).
    """
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.user_id == current_user.id,
        )
    )
    rt = result.scalar_one_or_none()

    if rt:
        rt.is_revoked = True

    await log_action(
        db, current_user.id, "LOGOUT",
        ip_address=request.client.host,
    )

    return {"message": "Başarıyla çıkış yapıldı."}


# ── POST /auth/refresh ────────────────────────────────────────────────────────
@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Refresh token ile yeni access token al.
    Refresh token geçerli ve revoke edilmemiş olmalı.
    """
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş refresh token.",
    )

    # Token'ı çöz
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise invalid_exc

    # DB'den kontrol et
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.is_revoked == False,
        )
    )
    rt = result.scalar_one_or_none()
    if not rt:
        raise invalid_exc

    # Yeni access token üret
    new_access = create_access_token(
        {"sub": payload["sub"], "role": payload["role"]}
    )

    return AccessTokenResponse(
        access_token=new_access,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Token'dan giriş yapmış kullanıcının bilgilerini döndür."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return user
