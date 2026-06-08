import enum

from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Boolean
from sqlalchemy import ForeignKey
from sqlalchemy import TIMESTAMP
from sqlalchemy import Text

from sqlalchemy.sql import func

from sqlalchemy.orm import relationship

from app.database.database import Base
from app.models.role import Role


# ─────────────────────────────────────────────────────────────
# USER ROLE ENUM
# ─────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    ENGINEER = "ENGINEER"
    TECHNICIAN = "TECHNICIAN"
    MANAGER = "MANAGER"


# ─────────────────────────────────────────────────────────────
# USER MODEL
# ─────────────────────────────────────────────────────────────

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String,
        unique=True,
        nullable=False
    )

    full_name = Column(
        String,
        nullable=True
    )

    email = Column(
        String,
        unique=True,
        nullable=False
    )

    hashed_password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default=UserRole.OPERATOR.value
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=True
    )

    is_active = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    role_relation = relationship(
        "Role",
        back_populates="users"
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan"
    )


# ─────────────────────────────────────────────────────────────
# REFRESH TOKEN MODEL
# ─────────────────────────────────────────────────────────────

class RefreshToken(Base):

    __tablename__ = "refresh_tokens"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    token = Column(
        Text,
        nullable=False,
        unique=True
    )

    is_revoked = Column(
        Boolean,
        default=False
    )

    expires_at = Column(
        TIMESTAMP(timezone=True),
        nullable=False
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    user = relationship(
        "User",
        back_populates="refresh_tokens"
    )


# ─────────────────────────────────────────────────────────────
# AUDIT LOG MODEL
# ─────────────────────────────────────────────────────────────

class AuditLog(Base):

    __tablename__ = "audit_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    action = Column(
        String,
        nullable=False
    )

    resource = Column(
        String,
        nullable=True
    )

    detail = Column(
        Text,
        nullable=True
    )

    ip_address = Column(
        String,
        nullable=True
    )

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    user = relationship(
        "User",
        back_populates="audit_logs"
    )