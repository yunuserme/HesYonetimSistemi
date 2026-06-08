from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from app.models.user import UserRole
from datetime import datetime


# ── Register ──────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.OPERATOR

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Kullanıcı adı en az 3 karakter olmalıdır.")
        if not v.replace("_", "").isalnum():
            raise ValueError("Kullanıcı adı sadece harf, rakam ve _ içerebilir.")
        return v.lower()


# ── Login ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


# ── Token Response ────────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int       # saniye cinsinden


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


# ── Refresh Request ───────────────────────────────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str


# ── Kullanıcı Bilgisi (response) ──────────────────────────────────────────────
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Current User (token'dan gelen) ───────────────────────────────────────────
class CurrentUser(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
