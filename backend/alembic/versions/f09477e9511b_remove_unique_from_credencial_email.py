"""remove_unique_from_credencial_email

Revision ID: f09477e9511b
Revises: 407545411226
Create Date: 2026-07-10 21:37:43.114051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f09477e9511b'
down_revision: Union[str, Sequence[str], None] = '407545411226'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # Recreate table in SQLite
        op.execute('ALTER TABLE credenciales RENAME TO _credenciales_old')
        op.execute('''
            CREATE TABLE credenciales (
                id INTEGER NOT NULL PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        ''')
        op.execute('INSERT INTO credenciales (id, email, password) SELECT id, email, password FROM _credenciales_old')
        op.execute('DROP TABLE _credenciales_old')
    else:
        # Standard PostgreSQL DROP CONSTRAINT
        op.execute('ALTER TABLE credenciales DROP CONSTRAINT IF EXISTS credenciales_email_key')
        op.execute('ALTER TABLE credenciales DROP CONSTRAINT IF EXISTS uq_credenciales_email')


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        op.execute('ALTER TABLE credenciales RENAME TO _credenciales_old')
        op.execute('''
            CREATE TABLE credenciales (
                id INTEGER NOT NULL PRIMARY KEY,
                email VARCHAR(150) NOT NULL,
                password VARCHAR(255) NOT NULL,
                UNIQUE (email)
            )
        ''')
        op.execute('INSERT INTO credenciales (id, email, password) SELECT id, email, password FROM _credenciales_old')
        op.execute('DROP TABLE _credenciales_old')
    else:
        op.execute('ALTER TABLE credenciales ADD CONSTRAINT uq_credenciales_email UNIQUE (email)')
