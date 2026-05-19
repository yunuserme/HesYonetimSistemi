from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from core.config import settings

# ── Şifre Hashleme ────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Şifreyi bcrypt ile hashle."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Düz şifre ile hash'i karşılaştır."""
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Şifre güvenlik politikası:
    - En az 8 karakter
    - En az 1 büyük harf
    - En az 1 rakam
    """
    if len(password) < 8:
        return False, "Şifre en az 8 karakter olmalıdır."
    if not any(c.isupper() for c in password):
        return False, "Şifre en az 1 büyük harf içermelidir."
    if not any(c.isdigit() for c in password):
        return False, "Şifre en az 1 rakam içermelidir."
    return True, "OK"


# ── JWT Token Üretimi ─────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Access token üret.
    Kısa ömürlü (default: 30 dakika).
    data içinde mutlaka 'sub' (user_id) ve 'role' olmalı.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """
    Refresh token üret.
    Uzun ömürlü (default: 7 gün).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Token'ı çöz ve payload'u döndür.
    Hatalı veya expired token → None döner.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
