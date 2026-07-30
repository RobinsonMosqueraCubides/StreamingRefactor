"""add_notas_to_cuentas_madre

Revision ID: 0c8e2bbe9d29
Revises: ca1acb6032b9
Create Date: 2026-07-29 21:29:01.932681

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_notas_to_cuentas_madre

Revision ID: 0c8e2bbe9d29
Revises: ca1acb6032b9
Create Date: 2026-07-29 21:29:01.932681

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0c8e2bbe9d29'
down_revision: Union[str, Sequence[str], None] = 'ca1acb6032b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('cuentas_madre', sa.Column('notas', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('cuentas_madre', 'notas')
