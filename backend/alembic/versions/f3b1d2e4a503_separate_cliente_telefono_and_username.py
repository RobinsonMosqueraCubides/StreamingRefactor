"""separate_cliente_telefono_and_username

Revision ID: f3b1d2e4a503
Revises: e2a9c4b71f02
Create Date: 2026-11-15 22:56:30.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3b1d2e4a503'
down_revision: Union[str, Sequence[str], None] = 'e2a9c4b71f02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make clientes.telefono nullable and add clientes.username unique column."""
    with op.batch_alter_table('clientes') as batch_op:
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=60),
            nullable=True,
        )
        batch_op.add_column(sa.Column('username', sa.String(length=60), nullable=True))
        batch_op.create_unique_constraint('uq_clientes_username', ['username'])


def downgrade() -> None:
    """Remove clientes.username and restore clientes.telefono as non-nullable."""
    with op.batch_alter_table('clientes') as batch_op:
        batch_op.drop_constraint('uq_clientes_username', type_='unique')
        batch_op.drop_column('username')
        batch_op.alter_column(
            'telefono',
            existing_type=sa.String(length=60),
            nullable=False,
        )
