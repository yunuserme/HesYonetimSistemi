from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base
import enum


# ── Rol Enum ──────────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    ADMIN      = "admin"
    OPERATOR   = "operator"
    ENGINEER   = "engineer"
    TECHNICIAN = "technician"
    MANAGER    = "manager"


# ── Kullanıcı Tablosu ─────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role          = Column(Enum(UserRole), nullable=False, default=UserRole.OPERATOR)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler
    audit_logs    = relationship("AuditLog", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"


# ── Refresh Token Tablosu ─────────────────────────────────────────────────────
class RefreshToken(Base):
    """
    Refresh token'ları DB'de sakla → logout'ta blacklist'e al.
    """
    __tablename__ = "refresh_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token      = Column(Text, nullable=False, unique=True)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


# ── Audit Log Tablosu ─────────────────────────────────────────────────────────
class AuditLog(Base):
    """
    Kritik işlemleri kaydet:
    login, logout, türbin durdurma, kapak açma, iş emri kapatma vb.
    """
    __tablename__ = "audit_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action     = Column(String(100), nullable=False)   # "LOGIN", "TURBINE_STOP" vb.
    resource   = Column(String(100), nullable=True)    # "turbine_2", "gate_3" vb.
    detail     = Column(Text, nullable=True)           # JSON string
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
