"""add_fecha_inicio_to_venta

Revision ID: 407545411226
Revises: bba7b8ca9217
Create Date: 2026-07-10 21:25:54.287043

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '407545411226'
down_revision: Union[str, Sequence[str], None] = 'bba7b8ca9217'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add the column as nullable first to allow SQLite to accept it
    op.add_column('ventas', sa.Column('fecha_inicio', sa.Date(), nullable=True))
    
    # 2. Populate existing rows with fecha_corte - 30 days
    op.execute("UPDATE ventas SET fecha_inicio = DATE(fecha_corte, '-30 days')")
    
    # 3. Handle any fallback
    op.execute("UPDATE ventas SET fecha_inicio = DATE('now') WHERE fecha_inicio IS NULL")
    
    # 4. Alter column to be NOT NULL with server_default using batch_alter_table
    with op.batch_alter_table('ventas') as batch_op:
        batch_op.alter_column('fecha_inicio',
               existing_type=sa.Date(),
               nullable=False,
               server_default=sa.text('(CURRENT_DATE)'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('ventas') as batch_op:
        batch_op.drop_column('fecha_inicio')
