from datetime import date, datetime, time
import calendar
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

async def obtener_balance_periodos(db: AsyncSession):
    hoy = date.today()
    
    # 1. Mes en Curso
    inicio_mes_actual = date(hoy.year, hoy.month, 1)
    dias_en_mes = calendar.monthrange(hoy.year, hoy.month)[1]
    fin_mes_actual = date(hoy.year, hoy.month, dias_en_mes)

    # 2. Últimos 3 Meses (mes actual + 2 meses anteriores)
    m = hoy.month - 2
    y = hoy.year
    if m < 1:
        m += 12
        y -= 1
    inicio_tres_meses = date(y, m, 1)
    fin_tres_meses = fin_mes_actual

    # 3. Año en Curso
    inicio_anio_actual = date(hoy.year, 1, 1)
    fin_anio_actual = date(hoy.year, 12, 31)

    periodos_config = [
        {
            "periodo": "MES_ACTUAL",
            "etiqueta": "Mes en Curso",
            "inicio": inicio_mes_actual,
            "fin": fin_mes_actual
        },
        {
            "periodo": "TRES_MESES",
            "etiqueta": "Últimos 3 Meses",
            "inicio": inicio_tres_meses,
            "fin": fin_tres_meses
        },
        {
            "periodo": "ANIO_ACTUAL",
            "etiqueta": f"Año en Curso ({hoy.year})",
            "inicio": inicio_anio_actual,
            "fin": fin_anio_actual
        }
    ]

    resultados = []
    for cfg in periodos_config:
        ini_dt = datetime.combine(cfg["inicio"], time.min)
        fin_dt = datetime.combine(cfg["fin"], time.max)

        # Costo de ventas registradas en el rango (el monto_total registrado en la venta es el coste por mes)
        res_ventas = await db.execute(
            select(func.sum(Venta.monto_total)).where(
                Venta.fecha_inicio >= cfg["inicio"],
                Venta.fecha_inicio <= cfg["fin"]
            )
        )
        costo_ventas = res_ventas.scalar() or Decimal("0.00")

        # Ingresos reales (Pagos recibidos)
        res_ingresos = await db.execute(
            select(func.sum(Transaccion.monto)).where(
                Transaccion.tipo == TipoTransaccion.INGRESO,
                Transaccion.fecha >= ini_dt,
                Transaccion.fecha <= fin_dt
            )
        )
        ingresos_reales = res_ingresos.scalar() or Decimal("0.00")

        # Gastos manuales (Egresos de caja excluyendo compras automáticas de cuentas)
        res_gastos = await db.execute(
            select(func.sum(Transaccion.monto)).where(
                Transaccion.tipo == TipoTransaccion.EGRESO,
                Transaccion.categoria != "COMPRA_CUENTA",
                Transaccion.fecha >= ini_dt,
                Transaccion.fecha <= fin_dt
            )
        )
        gastos_manuales = res_gastos.scalar() or Decimal("0.00")

        costo_total = costo_ventas + gastos_manuales
        balance_neto = ingresos_reales - costo_total

        resultados.append({
            "periodo": cfg["periodo"],
            "etiqueta": cfg["etiqueta"],
            "ingresos_reales": ingresos_reales,
            "costo_ventas": costo_ventas,
            "gastos_manuales": gastos_manuales,
            "costo_total": costo_total,
            "balance_neto": balance_neto
        })

    return {"periodos": resultados}

