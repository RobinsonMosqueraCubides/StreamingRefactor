"""add_tipo_unidad_and_fix_duplicate_profiles

Revision ID: d1f4a8c9e201
Revises: 0c8e2bbe9d29
Create Date: 2026-11-15 22:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1f4a8c9e201'
down_revision: Union[str, Sequence[str], None] = '0c8e2bbe9d29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tipo_unidad to detalles_venta, backfill, and repair duplicate profile assignments."""
    op.add_column(
        'detalles_venta',
        sa.Column('tipo_unidad', sa.String(length=20), nullable=False, server_default='PANTALLA')
    )

    bind = op.get_bind()

    # 1. Backfill tipo_unidad for whole-account sales or details without perfil_id
    bind.execute(
        sa.text(
            "UPDATE detalles_venta "
            "SET tipo_unidad = 'CUENTA' "
            "WHERE perfil_id IS NULL "
            "OR venta_id IN (SELECT id FROM ventas WHERE tipo_venta = 'CUENTA')"
        )
    )

    # 2. Repair duplicate perfil_id assignments in detalles_venta
    detalles_rows = bind.execute(
        sa.text(
            "SELECT id, venta_id, cuenta_madre_id, perfil_id, tipo_unidad "
            "FROM detalles_venta ORDER BY id ASC"
        )
    ).mappings().all()

    perfiles_rows = bind.execute(
        sa.text(
            "SELECT id, cuenta_madre_id, nombre_perfil, reportado "
            "FROM perfiles ORDER BY id ASC"
        )
    ).mappings().all()

    used_perfil_ids = {r["perfil_id"] for r in detalles_rows if r["perfil_id"] is not None}
    seen_perfil_ids: set[int] = set()

    perfiles_by_cm: dict[int, list[dict]] = {}
    for p in perfiles_rows:
        perfiles_by_cm.setdefault(p["cuenta_madre_id"], []).append(dict(p))

    for det in detalles_rows:
        pid = det["perfil_id"]
        cm_id = det["cuenta_madre_id"]
        if pid is None:
            continue
        if pid in seen_perfil_ids:
            # Duplicate assignment found; locate a free profile in the same cuenta_madre
            replacement_pid = None
            if cm_id in perfiles_by_cm:
                for cand in perfiles_by_cm[cm_id]:
                    if cand["id"] not in used_perfil_ids and not cand["reportado"]:
                        replacement_pid = cand["id"]
                        break
            if replacement_pid is not None:
                bind.execute(
                    sa.text("UPDATE detalles_venta SET perfil_id = :new_pid WHERE id = :det_id"),
                    {"new_pid": replacement_pid, "det_id": det["id"]}
                )
                used_perfil_ids.add(replacement_pid)
                seen_perfil_ids.add(replacement_pid)
        else:
            seen_perfil_ids.add(pid)

    # 3. Synchronize perfiles.asignado with actual active detalles_venta
    refreshed_detalles = bind.execute(
        sa.text("SELECT cuenta_madre_id, perfil_id, tipo_unidad FROM detalles_venta")
    ).mappings().all()

    assigned_ids: set[int] = set()
    cuenta_completa_cm_ids: set[int] = set()
    for det in refreshed_detalles:
        if det["perfil_id"] is not None:
            assigned_ids.add(det["perfil_id"])
        if det["tipo_unidad"] == "CUENTA" and det["cuenta_madre_id"] is not None:
            cuenta_completa_cm_ids.add(det["cuenta_madre_id"])

    for cm_id in cuenta_completa_cm_ids:
        for p in perfiles_by_cm.get(cm_id, []):
            assigned_ids.add(p["id"])

    for p in perfiles_rows:
        should_be_assigned = (p["id"] in assigned_ids) or bool(p["reportado"])
        bind.execute(
            sa.text("UPDATE perfiles SET asignado = :val WHERE id = :pid"),
            {"val": should_be_assigned, "pid": p["id"]}
        )


def downgrade() -> None:
    """Remove tipo_unidad from detalles_venta."""
    op.drop_column('detalles_venta', 'tipo_unidad')
