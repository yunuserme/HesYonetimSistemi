from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db

from app.core.security import decode_token

from app.models.user import User
from app.models.user import UserRole

from app.schemas.auth import CurrentUser


bearer_scheme = HTTPBearer()


async def get_current_user(

    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),

    db: AsyncSession = Depends(
        get_db
    ),

) -> CurrentUser:

    credentials_exception = HTTPException(

        status_code=status.HTTP_401_UNAUTHORIZED,

        detail="Geçersiz veya süresi dolmuş token.",

        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    token = credentials.credentials

    payload = decode_token(token)

    if payload is None:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")

    if user_id is None:
        raise credentials_exception

    result = await db.execute(
        select(User).where(
            User.id == int(user_id)
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesabınız devre dışı bırakılmış.",
        )

    return CurrentUser(
        id=user.id,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
    )


async def get_current_active_admin(

    current_user: CurrentUser = Depends(
        get_current_user
    ),

) -> CurrentUser:

    if current_user.role != UserRole.ADMIN:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem sadece admin tarafından yapılabilir.",
        )

    return current_user