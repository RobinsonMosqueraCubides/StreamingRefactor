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
    # Crear tipos ENUM en PostgreSQL si es necesario
    tipo_garantia_enum = sa.Enum('CAMBIO_CLAVE', 'CAMBIO_CUENTA', 'SALDO_A_FAVOR', name='tipo_garantia_proveedor')
    tipo_garantia_enum.create(op.get_bind(), checkfirst=True)
    
    tipo_transaccion_enum = sa.Enum('INGRESO', 'EGRESO', name='tipo_transaccion')
    tipo_transaccion_enum.create(op.get_bind(), checkfirst=True)

    with op.batch_alter_table('credenciales') as batch_op:
        batch_op.alter_column('password',
               existing_type=sa.VARCHAR(length=150),
               type_=sa.String(length=255),
               existing_nullable=False)
    with op.batch_alter_table('garantias_proveedores') as batch_op:
        batch_op.alter_column('tipo_garantia',
               existing_type=sa.VARCHAR(length=50),
               type_=tipo_garantia_enum,
               existing_nullable=False,
               postgresql_using='tipo_garantia::tipo_garantia_proveedor')
    with op.batch_alter_table('transacciones') as batch_op:
        batch_op.alter_column('tipo',
               existing_type=sa.VARCHAR(length=10),
               type_=tipo_transaccion_enum,
               existing_nullable=False,
               postgresql_using='tipo::tipo_transaccion')


def downgrade() -> None:
    """Downgrade schema."""
    tipo_garantia_enum = sa.Enum('CAMBIO_CLAVE', 'CAMBIO_CUENTA', 'SALDO_A_FAVOR', name='tipo_garantia_proveedor')
    tipo_transaccion_enum = sa.Enum('INGRESO', 'EGRESO', name='tipo_transaccion')

    with op.batch_alter_table('transacciones') as batch_op:
        batch_op.alter_column('tipo',
               existing_type=tipo_transaccion_enum,
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)
    with op.batch_alter_table('garantias_proveedores') as batch_op:
        batch_op.alter_column('tipo_garantia',
               existing_type=tipo_garantia_enum,
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
    with op.batch_alter_table('credenciales') as batch_op:
        batch_op.alter_column('password',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=150),
               existing_nullable=False)

    tipo_garantia_enum.drop(op.get_bind(), checkfirst=True)
    tipo_transaccion_enum.drop(op.get_bind(), checkfirst=True)
