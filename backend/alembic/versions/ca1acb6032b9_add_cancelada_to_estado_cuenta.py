"""add_cancelada_to_estado_cuenta

Revision ID: ca1acb6032b9
Revises: 99e8ff098b49
Create Date: 2026-07-20 21:29:17.439943

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca1acb6032b9'
down_revision: Union[str, Sequence[str], None] = '99e8ff098b49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("COMMIT")
        op.execute("ALTER TYPE estado_cuenta ADD VALUE IF NOT EXISTS 'CANCELADA'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
