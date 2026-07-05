from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from db.models import Venta, PagoVenta, Transaccion, EstadoPago, TipoTransaccion
from db.database import get_or_404
from schemas.finanzas_schemas import PagoVentaCreate, GastoManualCreate

async def registrar_pago_venta(db: AsyncSession, venta_id: int, pago: PagoVentaCreate):
    # 1. Validar la existencia de la venta
    db_venta = await get_or_404(db, Venta, venta_id)
    
    try:
        # 2. Registrar el abono
        db_pago = PagoVenta(
            venta_id=venta_id,
            monto=pago.monto,
            entidad=pago.entidad
        )
        db.add(db_pago)
        await db.flush()

        # 3. Registrar transacción de INGRESO
        db_transaccion = Transaccion(
            tipo=TipoTransaccion.INGRESO,
            categoria="PAGO_VENTA",
            monto=pago.monto,
            entidad=pago.entidad,
            referencia_id=venta_id
        )
        db.add(db_transaccion)

        # 4. Calcular suma de pagos para actualizar estado de la venta
        suma_pagos_result = await db.execute(
            select(func.sum(PagoVenta.monto)).where(PagoVenta.venta_id == venta_id)
        )
        suma_total = suma_pagos_result.scalar() or Decimal("0.00")

        if suma_total >= db_venta.monto_total:
            db_venta.estado_pago = EstadoPago.PAGADO
        else:
            db_venta.estado_pago = EstadoPago.PAGO_PARCIAL

        await db.commit()
        await db.refresh(db_pago)
        return db_pago
    except Exception as e:
        await db.rollback()
        raise e

async def registrar_gasto_manual(db: AsyncSession, gasto: GastoManualCreate):
    try:
        db_trans = Transaccion(
            tipo=TipoTransaccion.EGRESO,
            categoria=gasto.categoria,
            monto=gasto.monto,
            entidad=gasto.entidad,
            referencia_id=None
        )
        db.add(db_trans)
        await db.commit()
        await db.refresh(db_trans)
        return db_trans
    except Exception as e:
        await db.rollback()
        raise e

async def get_transacciones(db: AsyncSession):
    result = await db.execute(select(Transaccion).order_by(Transaccion.fecha.desc()))
    return result.scalars().all()
