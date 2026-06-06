"""add due_at to work_orders and update status flow

Revision ID: 3fd725988be7
Revises: 7950fd0206c6
Create Date: 2026-05-24 14:11:39.959791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fd725988be7'
down_revision: Union[str, Sequence[str], None] = '7950fd0206c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "work_orders",
        sa.Column(
            "due_at",
            sa.TIMESTAMP(timezone=True),
            nullable=True
        )
    )

    op.alter_column(
        "work_orders",
        "status",
        existing_type=sa.String(),
        server_default="PENDING",
        nullable=False
    )

    op.execute(
        "UPDATE work_orders SET status = 'PENDING' WHERE status = 'OPEN'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "UPDATE work_orders SET status = 'OPEN' WHERE status = 'PENDING'"
    )

    op.alter_column(
        "work_orders",
        "status",
        existing_type=sa.String(),
        server_default="OPEN",
        nullable=True
    )

    op.drop_column(
        "work_orders",
        "due_at"
    )