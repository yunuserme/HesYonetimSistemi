"""add water gates

Revision ID: b8f2c1a4d9e7
Revises: 3fd725988be7
Create Date: 2026-06-08 00:00:00.000000

"""
from typing import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8f2c1a4d9e7"
down_revision: Union[str, Sequence[str], None] = "3fd725988be7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "water_gates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("gate_name", sa.String(), nullable=False),
        sa.Column(
            "open_percentage",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0"
        ),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="CLOSED"
        ),
        sa.Column("flow_rate", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true")
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=True
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=True
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("gate_name")
    )
    op.create_index(
        op.f("ix_water_gates_id"),
        "water_gates",
        ["id"],
        unique=False
    )

    op.create_table(
        "water_gate_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("water_gate_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column(
            "previous_open_percentage",
            sa.Numeric(5, 2),
            nullable=False
        ),
        sa.Column(
            "new_open_percentage",
            sa.Numeric(5, 2),
            nullable=False
        ),
        sa.Column("status_after", sa.String(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "requires_supervisor_approval",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false")
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=True
        ),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["water_gate_id"],
            ["water_gates.id"],
        ),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(
        op.f("ix_water_gate_logs_id"),
        "water_gate_logs",
        ["id"],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_water_gate_logs_id"),
        table_name="water_gate_logs"
    )
    op.drop_table("water_gate_logs")
    op.drop_index(
        op.f("ix_water_gates_id"),
        table_name="water_gates"
    )
    op.drop_table("water_gates")
