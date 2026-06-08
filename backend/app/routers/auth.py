from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import status
from fastapi import Request

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from datetime import datetime
from datetime import timezone
from datetime import timedelta

import json

from app.database.database import get_db

from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_token
)

from app.core.config import settings

from app.core.dependencies import get_current_user

from app.models.user import (
    User,
    RefreshToken,
    AuditLog
)

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    AccessTokenResponse,
    RefreshRequest,
    UserResponse,
    CurrentUser
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


# ─────────────────────────────────────────────────────────────
# AUDIT LOG HELPER
# ─────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)

async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):

    valid, msg = validate_password_strength(
        body.password
    )

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    # username kontrol
    result = await db.execute(
        select(User).where(
            User.username == body.username
        )
    )

    if result.scalar_one_or_none():

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu kullanıcı adı zaten kullanılıyor."
        )

    # email kontrol
    result = await db.execute(
        select(User).where(
            User.email == body.email
        )
    )

    if result.scalar_one_or_none():

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email zaten kayıtlı."
        )

    # user oluştur
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(
            body.password
        ),
        role=body.role.value,
    )

    db.add(user)

    await db.flush()

    await log_action(
        db=db,
        user_id=user.id,
        action="REGISTER",
        detail={
            "username": user.username,
            "role": user.role
        },
        ip_address=request.client.host,
    )

    await db.commit()

    await db.refresh(user)

    return user


# ─────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse
)

async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(User).where(
            User.username == body.username
        )
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        body.password,
        user.hashed_password
    ):

        await log_action(
            db=db,
            user_id=None,
            action="LOGIN_FAILED",
            detail={
                "username": body.username
            },
            ip_address=request.client.host,
        )

        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı."
        )

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap aktif değil."
        )

    token_data = {
        "sub": str(user.id),
        "role": user.role,
    }

    access_token = create_access_token(
        token_data
    )

    refresh_token = create_refresh_token(
        token_data
    )

    rt = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=datetime.now(
            timezone.utc
        ) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        ),
    )

    db.add(rt)

    await log_action(
        db=db,
        user_id=user.id,
        action="LOGIN",
        detail={
            "role": user.role
        },
        ip_address=request.client.host,
    )

    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ─────────────────────────────────────────────────────────────
# REFRESH
# ─────────────────────────────────────────────────────────────

@router.post(
    "/refresh",
    response_model=AccessTokenResponse
)

async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):

    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz refresh token."
    )

    payload = decode_token(
        body.refresh_token
    )

    if not payload:
        raise invalid_exc

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.is_revoked == False
        )
    )

    rt = result.scalar_one_or_none()

    if not rt:
        raise invalid_exc

    new_access = create_access_token(
        {
            "sub": payload["sub"],
            "role": payload["role"],
        }
    )

    return AccessTokenResponse(
        access_token=new_access,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ─────────────────────────────────────────────────────────────
# LOGOUT
# ─────────────────────────────────────────────────────────────

@router.post("/logout")

async def logout(
    body: RefreshRequest,
    request: Request,
    current_user: CurrentUser = Depends(
        get_current_user
    ),
    db: AsyncSession = Depends(get_db),
):

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
        db=db,
        user_id=current_user.id,
        action="LOGOUT",
        ip_address=request.client.host,
    )

    await db.commit()

    return {
        "message": "Çıkış başarılı."
    }


# ─────────────────────────────────────────────────────────────
# CURRENT USER
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse
)

async def get_me(
    current_user: CurrentUser = Depends(
        get_current_user
    ),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(User).where(
            User.id == current_user.id
        )
    )

    user = result.scalar_one_or_none()

    if not user:

        raise HTTPException(
            status_code=404,
            detail="Kullanıcı bulunamadı."
        )

    return user