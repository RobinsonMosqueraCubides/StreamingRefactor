"""expand_telefono_for_whatsapp_username

Revision ID: e2a9c4b71f02
Revises: d1f4a8c9e201
Create Date: 2026-11-15 22:36:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2a9c4b71f02'
down_revision: Union[str, Sequence[str], None] = 'd1f4a8c9e201'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Expand telefono column length to 60 on clientes and proveedores to support WhatsApp usernames."""
    with op.batch_alter_table('clientes') as batch_op:
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=20),
            type_=sa.String(length=60),
            existing_nullable=False,
        )
    with op.batch_alter_table('proveedores') as batch_op:
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=20),
            type_=sa.String(length=60),
            existing_nullable=False,
        )


def downgrade() -> None:
    """Revert telefono column length to 20 on clientes and proveedores."""
    with op.batch_alter_table('proveedores') as batch_op:
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=60),
            type_=sa.String(length=20),
            existing_nullable=False,
        )
    with op.batch_alter_table('clientes') as batch_op:
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=60),
            type_=sa.String(length=20),
            existing_nullable=False,
        )
