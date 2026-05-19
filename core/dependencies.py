from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import decode_token
from models.user import User
from schemas.auth import CurrentUser

# Bearer token şeması — Swagger'da Authorization butonu çıkar
bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Her protected route'da kullanılır.
    Authorization: Bearer <access_token> header'ından kullanıcıyı çeker.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # Token'ı çöz
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Token tipi access mi?
    if payload.get("type") != "access":
        raise credentials_exception

    # user_id al
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # DB'den kullanıcıyı çek
    result = await db.execute(select(User).where(User.id == int(user_id)))
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
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Sadece admin erişimi gerektiren route'lar için."""
    from models.user import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem sadece admin tarafından yapılabilir.",
        )
    return current_user
