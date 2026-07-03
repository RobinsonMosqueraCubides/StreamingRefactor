from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from db.models import Venta, PagoVenta, Transaccion, EstadoPago
from schemas.finanzas_schemas import PagoVentaCreate, GastoManualCreate
from fastapi import HTTPException, status

async def registrar_pago_venta(db: AsyncSession, venta_id: int, pago: PagoVentaCreate):
    # 1. Validar la existencia de la venta
    result = await db.execute(select(Venta).where(Venta.id == venta_id))
    db_venta = result.scalar_one_or_none()
    if not db_venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con id {venta_id} no encontrada"
        )
    
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
        tipo="INGRESO",
        categoria="PAGO_VENTA",
        monto=pago.monto,
        entidad=pago.entidad,
        referencia_id=venta_id
    )
    db.add(db_transaccion)

    # 4. Calcular suma de pagos para actualizar estado de la venta
    # Obtenemos la suma de todos los pagos registrados para esta venta
    suma_pagos_result = await db.execute(
        select(func.sum(PagoVenta.monto)).where(PagoVenta.venta_id == venta_id)
    )
    suma_total = suma_pagos_result.scalar() or 0.0

    if suma_total >= db_venta.monto_total:
        db_venta.estado_pago = EstadoPago.PAGADO
    else:
        db_venta.estado_pago = EstadoPago.PAGO_PARCIAL

    await db.commit()
    await db.refresh(db_pago)
    return db_pago

async def registrar_gasto_manual(db: AsyncSession, gasto: GastoManualCreate):
    db_trans = Transaccion(
        tipo="EGRESO",
        categoria=gasto.categoria,
        monto=gasto.monto,
        entidad=gasto.entidad,
        referencia_id=None
    )
    db.add(db_trans)
    await db.commit()
    await db.refresh(db_trans)
    return db_trans

async def get_transacciones(db: AsyncSession):
    result = await db.execute(select(Transaccion).order_by(Transaccion.fecha.desc()))
    return result.scalars().all()
