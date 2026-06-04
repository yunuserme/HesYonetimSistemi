"""initial migration

Revision ID: 7950fd0206c6
Revises: 
Create Date: 2026-05-07 22:36:15.386799

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7950fd0206c6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. roles tablosu (bağımsız)
    op.create_table('roles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('role_name', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    # 2. turbines tablosu (bağımsız)
    op.create_table('turbines',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('turbine_name', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('capacity_mw', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', sa.String(length=30), server_default=sa.text("'ACTIVE'"), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_turbines_id'), 'turbines', ['id'], unique=False)

    # 3. users tablosu (roles'a bağlı)
    op.create_table('users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=200), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 4. sensors tablosu (turbines'a bağlı)
    op.create_table('sensors',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('sensor_name', sa.String(length=100), nullable=False),
        sa.Column('sensor_type', sa.String(length=50), nullable=True),
        sa.Column('turbine_id', sa.Integer(), nullable=True),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['turbine_id'], ['turbines.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sensors_id'), 'sensors', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_sensors_id'), table_name='sensors')
    op.drop_table('sensors')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_turbines_id'), table_name='turbines')
    op.drop_table('turbines')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
