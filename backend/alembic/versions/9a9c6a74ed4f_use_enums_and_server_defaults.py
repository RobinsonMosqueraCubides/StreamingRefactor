"""use_enums_and_server_defaults

Revision ID: 9a9c6a74ed4f
Revises: 64e7dc3693a3
Create Date: 2026-07-05 15:59:53.542772

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a9c6a74ed4f'
down_revision: Union[str, Sequence[str], None] = '64e7dc3693a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('credenciales') as batch_op:
        batch_op.alter_column('password',
               existing_type=sa.VARCHAR(length=150),
               type_=sa.String(length=255),
               existing_nullable=False)
    with op.batch_alter_table('garantias_proveedores') as batch_op:
        batch_op.alter_column('tipo_garantia',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.Enum('CAMBIO_CLAVE', 'CAMBIO_CUENTA', 'SALDO_A_FAVOR', name='tipo_garantia_proveedor'),
               existing_nullable=False)
    with op.batch_alter_table('transacciones') as batch_op:
        batch_op.alter_column('tipo',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.Enum('INGRESO', 'EGRESO', name='tipo_transaccion'),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('transacciones') as batch_op:
        batch_op.alter_column('tipo',
               existing_type=sa.Enum('INGRESO', 'EGRESO', name='tipo_transaccion'),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)
    with op.batch_alter_table('garantias_proveedores') as batch_op:
        batch_op.alter_column('tipo_garantia',
               existing_type=sa.Enum('CAMBIO_CLAVE', 'CAMBIO_CUENTA', 'SALDO_A_FAVOR', name='tipo_garantia_proveedor'),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
    with op.batch_alter_table('credenciales') as batch_op:
        batch_op.alter_column('password',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=150),
               existing_nullable=False)
