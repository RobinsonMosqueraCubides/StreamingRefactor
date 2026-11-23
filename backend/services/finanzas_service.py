from datetime import date, datetime, time
from core.time_utils import get_bogota_date
import calendar
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from sqlalchemy.orm import selectinload
from db.models import Venta, DetalleVenta, PagoVenta, Transaccion, CuentaMadre, VentaVencida, Plataforma, EstadoPago, TipoTransaccion
from db.database import get_or_404
from core.exceptions import BusinessRuleError
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
    hoy = get_bogota_date()
    
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

        # Ingresos reales (Pagos recibidos de clientes en la fecha del pago)
        res_ingresos = await db.execute(
            select(func.sum(Transaccion.monto)).where(
                Transaccion.tipo == TipoTransaccion.INGRESO,
                Transaccion.fecha >= ini_dt,
                Transaccion.fecha <= fin_dt
            )
        )
        ingresos_reales = res_ingresos.scalar() or Decimal("0.00")

        # Coste de Cuentas Madre (Compras y Renovaciones a proveedores en la fecha del pago/renovación)
        res_cuentas_madre = await db.execute(
            select(func.sum(Transaccion.monto)).where(
                Transaccion.tipo == TipoTransaccion.EGRESO,
                Transaccion.categoria == "COMPRA_CUENTA",
                Transaccion.fecha >= ini_dt,
                Transaccion.fecha <= fin_dt
            )
        )
        costo_cuentas_madre = res_cuentas_madre.scalar() or Decimal("0.00")

        # Gastos manuales (Egresos operativos de caja en la fecha del egreso)
        res_gastos = await db.execute(
            select(func.sum(Transaccion.monto)).where(
                Transaccion.tipo == TipoTransaccion.EGRESO,
                Transaccion.categoria != "COMPRA_CUENTA",
                Transaccion.fecha >= ini_dt,
                Transaccion.fecha <= fin_dt
            )
        )
        gastos_manuales = res_gastos.scalar() or Decimal("0.00")

        costo_total = costo_cuentas_madre + gastos_manuales
        balance_neto = ingresos_reales - costo_total

        resultados.append({
            "periodo": cfg["periodo"],
            "etiqueta": cfg["etiqueta"],
            "ingresos_reales": ingresos_reales,
            "costo_cuentas_madre": costo_cuentas_madre,
            "gastos_manuales": gastos_manuales,
            "costo_total": costo_total,
            "balance_neto": balance_neto
        })

    return {"periodos": resultados}


MESES_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]


async def obtener_resumen_mensual(db: AsyncSession, anio: int, mes: int):
    """Calcula estadísticas financieras del mes seleccionado, contando cada venta en el mes de su fecha_inicio (inicio o renovación)."""
    dias_mes = calendar.monthrange(anio, mes)[1]
    inicio_mes = date(anio, mes, 1)
    fin_mes = date(anio, mes, dias_mes)
    ini_dt = datetime.combine(inicio_mes, time.min)
    fin_dt = datetime.combine(fin_mes, time.max)

    # 1. Ventas activas cuya fecha_inicio / renovación cae en el mes
    stmt_ventas = (
        select(Venta)
        .where(Venta.fecha_inicio >= inicio_mes, Venta.fecha_inicio <= fin_mes)
        .options(
            selectinload(Venta.cliente),
            selectinload(Venta.pagos),
            selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.plataforma),
            selectinload(Venta.detalles).selectinload(DetalleVenta.combo),
        )
        .order_by(Venta.fecha_inicio.desc(), Venta.id.desc())
    )
    ventas_mes = (await db.execute(stmt_ventas)).scalars().all()

    # 2. Ventas cortadas (VentaVencida) cuya fecha_inicio cae en el mes
    stmt_vencidas = (
        select(VentaVencida)
        .where(VentaVencida.fecha_inicio >= inicio_mes, VentaVencida.fecha_inicio <= fin_mes)
        .order_by(VentaVencida.fecha_inicio.desc(), VentaVencida.id.desc())
    )
    vencidas_mes = (await db.execute(stmt_vencidas)).scalars().all()

    # 3. Cuentas Madre compradas en el mes (para contraste por plataforma)
    stmt_cm = (
        select(CuentaMadre)
        .where(CuentaMadre.fecha_compra >= inicio_mes, CuentaMadre.fecha_compra <= fin_mes)
        .options(selectinload(CuentaMadre.plataforma))
    )
    cuentas_mes = (await db.execute(stmt_cm)).scalars().all()

    # 4. Transacciones de caja del mes
    stmt_trans = select(Transaccion).where(Transaccion.fecha >= ini_dt, Transaccion.fecha <= fin_dt)
    trans_mes = (await db.execute(stmt_trans)).scalars().all()

    ingresos_caja_mes = sum((t.monto for t in trans_mes if t.tipo == TipoTransaccion.INGRESO), Decimal("0.00"))
    egresos_cuentas_madre_mes = sum(
        (t.monto for t in trans_mes if t.tipo == TipoTransaccion.EGRESO and t.categoria == "COMPRA_CUENTA"),
        Decimal("0.00"),
    )
    egresos_gastos_manuales_mes = sum(
        (t.monto for t in trans_mes if t.tipo == TipoTransaccion.EGRESO and t.categoria != "COMPRA_CUENTA"),
        Decimal("0.00"),
    )
    total_egresos_mes = egresos_cuentas_madre_mes + egresos_gastos_manuales_mes

    # Acumuladores por plataforma
    plat_stats: dict[str, dict] = {}

    def ensure_plat(plat_name: str, plat_id: int | None = None):
        if plat_name not in plat_stats:
            plat_stats[plat_name] = {
                "plataforma_id": plat_id,
                "plataforma": plat_name,
                "pantallas_vendidas": 0,
                "cuentas_completas_vendidas": 0,
                "total_vendido": Decimal("0.00"),
                "costo_cuentas_madre": Decimal("0.00"),
                "utilidad_estimada": Decimal("0.00"),
            }
        elif plat_id is not None and plat_stats[plat_name]["plataforma_id"] is None:
            plat_stats[plat_name]["plataforma_id"] = plat_id
        return plat_stats[plat_name]

    for cm in cuentas_mes:
        p_name = cm.plataforma.nombre if cm.plataforma else f"Plataforma #{cm.plataforma_id}"
        st = ensure_plat(p_name, cm.plataforma_id)
        st["costo_cuentas_madre"] += cm.precio_compra or Decimal("0.00")

    total_vendido_mes = Decimal("0.00")
    total_cobrado_mes = Decimal("0.00")
    total_pendiente_mes = Decimal("0.00")
    pantallas_vendidas = 0
    cuentas_completas_vendidas = 0
    ventas_detalle = []

    for v in ventas_mes:
        monto_v = v.monto_total or Decimal("0.00")
        total_vendido_mes += monto_v

        if v.estado_pago == EstadoPago.PAGADO:
            cobrado_v = monto_v
        elif v.estado_pago == EstadoPago.PAGO_PARCIAL:
            abonos = sum((p.monto for p in (v.pagos or [])), Decimal("0.00"))
            cobrado_v = min(monto_v, abonos)
        else:
            cobrado_v = Decimal("0.00")

        total_cobrado_mes += cobrado_v
        total_pendiente_mes += max(Decimal("0.00"), monto_v - cobrado_v)

        plat_names_v = []
        seen_full_accounts: set[int] = set()

        for d in v.detalles:
            cm = d.cuenta_madre
            p_id = cm.plataforma_id if cm else None
            if cm and cm.plataforma:
                p_name = cm.plataforma.nombre
            elif d.combo:
                p_name = f"Combo: {d.combo.nombre}"
            else:
                p_name = "Otras"

            if p_name not in plat_names_v:
                plat_names_v.append(p_name)

            st = ensure_plat(p_name, p_id)
            precio_d = d.precio_aplicado or Decimal("0.00")
            st["total_vendido"] += precio_d

            is_full = getattr(d, "tipo_unidad", "PANTALLA") == "CUENTA" or d.perfil_id is None
            if is_full:
                cm_key = d.cuenta_madre_id or d.id
                if cm_key not in seen_full_accounts:
                    seen_full_accounts.add(cm_key)
                    st["cuentas_completas_vendidas"] += 1
                    cuentas_completas_vendidas += 1
            else:
                st["pantallas_vendidas"] += 1
                pantallas_vendidas += 1

        ventas_detalle.append({
            "id": v.id,
            "cliente_nombre": v.cliente.nombre if v.cliente else f"Cliente #{v.cliente_id}",
            "plataformas": ", ".join(plat_names_v) if plat_names_v else "Sin detalle",
            "tipo_venta": v.tipo_venta or "PANTALLA",
            "fecha_inicio": v.fecha_inicio,
            "fecha_corte": v.fecha_corte,
            "monto_total": monto_v,
            "estado_pago": v.estado_pago.value if hasattr(v.estado_pago, "value") else str(v.estado_pago),
            "origen": "ACTIVA",
        })

    for vv in vencidas_mes:
        monto_vv = vv.monto_pagado or Decimal("0.00")
        total_vendido_mes += monto_vv
        total_cobrado_mes += monto_vv

        raw_plat = vv.plataforma or "Otras"
        is_full_vv = "(Cuenta Completa)" in raw_plat
        clean_plat = raw_plat.replace(" (Cuenta Completa)", "").strip()
        st = ensure_plat(clean_plat)
        st["total_vendido"] += monto_vv
        if is_full_vv:
            st["cuentas_completas_vendidas"] += 1
            cuentas_completas_vendidas += 1
        else:
            st["pantallas_vendidas"] += 1
            pantallas_vendidas += 1

        ventas_detalle.append({
            "id": vv.id,
            "cliente_nombre": vv.cliente,
            "plataformas": raw_plat,
            "tipo_venta": "CUENTA" if is_full_vv else "PANTALLA",
            "fecha_inicio": vv.fecha_inicio,
            "fecha_corte": vv.fecha_fin,
            "monto_total": monto_vv,
            "estado_pago": "PAGADO",
            "origen": "CORTADA",
        })

    por_plataforma = []
    for st in plat_stats.values():
        st["utilidad_estimada"] = st["total_vendido"] - st["costo_cuentas_madre"]
        por_plataforma.append(st)
    por_plataforma.sort(key=lambda x: x["total_vendido"], reverse=True)

    # 5. Comparativa anual (los 12 meses del año seleccionado)
    inicio_anio = date(anio, 1, 1)
    fin_anio = date(anio, 12, 31)
    anio_ini_dt = datetime.combine(inicio_anio, time.min)
    anio_fin_dt = datetime.combine(fin_anio, time.max)

    ventas_anio = (
        await db.execute(select(Venta).where(Venta.fecha_inicio >= inicio_anio, Venta.fecha_inicio <= fin_anio))
    ).scalars().all()
    vencidas_anio = (
        await db.execute(select(VentaVencida).where(VentaVencida.fecha_inicio >= inicio_anio, VentaVencida.fecha_inicio <= fin_anio))
    ).scalars().all()
    egresos_anio = (
        await db.execute(
            select(Transaccion).where(
                Transaccion.tipo == TipoTransaccion.EGRESO,
                Transaccion.fecha >= anio_ini_dt,
                Transaccion.fecha <= anio_fin_dt,
            )
        )
    ).scalars().all()

    comparativa_map = {
        m: {"mes": m, "etiqueta": MESES_ES[m], "ventas_mes": Decimal("0.00"), "egresos_mes": Decimal("0.00"), "balance_neto": Decimal("0.00"), "cantidad_ventas": 0}
        for m in range(1, 13)
    }
    for v in ventas_anio:
        if v.fecha_inicio:
            comparativa_map[v.fecha_inicio.month]["ventas_mes"] += v.monto_total or Decimal("0.00")
            comparativa_map[v.fecha_inicio.month]["cantidad_ventas"] += 1
    for vv in vencidas_anio:
        if vv.fecha_inicio:
            comparativa_map[vv.fecha_inicio.month]["ventas_mes"] += vv.monto_pagado or Decimal("0.00")
            comparativa_map[vv.fecha_inicio.month]["cantidad_ventas"] += 1
    for t in egresos_anio:
        if t.fecha:
            comparativa_map[t.fecha.month]["egresos_mes"] += t.monto or Decimal("0.00")

    comparativa_anual = []
    for m in range(1, 13):
        item = comparativa_map[m]
        item["balance_neto"] = item["ventas_mes"] - item["egresos_mes"]
        comparativa_anual.append(item)

    return {
        "anio": anio,
        "mes": mes,
        "etiqueta_mes": f"{MESES_ES[mes]} {anio}",
        "total_vendido_mes": total_vendido_mes,
        "total_cobrado_mes": total_cobrado_mes,
        "total_pendiente_mes": total_pendiente_mes,
        "ingresos_caja_mes": ingresos_caja_mes,
        "egresos_cuentas_madre_mes": egresos_cuentas_madre_mes,
        "egresos_gastos_manuales_mes": egresos_gastos_manuales_mes,
        "total_egresos_mes": total_egresos_mes,
        "balance_ventas_vs_egresos": total_vendido_mes - total_egresos_mes,
        "balance_caja_real": ingresos_caja_mes - total_egresos_mes,
        "cantidad_ventas": len(ventas_detalle),
        "pantallas_vendidas": pantallas_vendidas,
        "cuentas_completas_vendidas": cuentas_completas_vendidas,
        "por_plataforma": por_plataforma,
        "ventas_detalle": ventas_detalle,
        "comparativa_anual": comparativa_anual,
    }


def _calc_sale_pending(venta: Venta) -> tuple[Decimal, Decimal]:
    """Retorna (abonado, saldo_pendiente) para una venta activa usando la lógica de caja."""
    monto_total = venta.monto_total or Decimal("0.00")
    if venta.estado_pago == EstadoPago.PAGADO:
        return monto_total, Decimal("0.00")
    if venta.estado_pago == EstadoPago.PAGO_PARCIAL:
        abonado = sum((p.monto for p in (venta.pagos or [])), Decimal("0.00"))
        saldo = max(Decimal("0.00"), monto_total - abonado)
        return abonado, saldo
    return Decimal("0.00"), monto_total


def _extract_sale_platforms(venta: Venta) -> str:
    names: list[str] = []
    for d in venta.detalles:
        if d.cuenta_madre and d.cuenta_madre.plataforma:
            name = d.cuenta_madre.plataforma.nombre
        elif d.combo:
            name = f"Combo: {d.combo.nombre}"
        else:
            name = "Otras"
        if name not in names:
            names.append(name)
    return ", ".join(names) if names else "Sin detalle"


async def obtener_reporte_financiero(
    db: AsyncSession,
    anio: int,
    mes: int | None = None,
    fecha_inicio: date | None = None,
    fecha_fin: date | None = None,
):
    """Reporte financiero unificado (Anual, Mensual o Rango) replicando la lógica de caja del Dashboard."""
    if (fecha_inicio is None) != (fecha_fin is None):
        raise BusinessRuleError("Debes proporcionar tanto fecha_inicio como fecha_fin para filtrar por rango.")
    if fecha_inicio is not None and fecha_fin is not None and fecha_inicio > fecha_fin:
        raise BusinessRuleError("La fecha de inicio no puede ser mayor que la fecha fin.")

    if fecha_inicio is not None and fecha_fin is not None:
        modo = "RANGO"
        periodo_inicio = fecha_inicio
        periodo_fin = fecha_fin
        etiqueta_periodo = f"{fecha_inicio.strftime('%d/%m/%Y')} — {fecha_fin.strftime('%d/%m/%Y')}"
    elif mes is not None:
        modo = "MES"
        dias_mes = calendar.monthrange(anio, mes)[1]
        periodo_inicio = date(anio, mes, 1)
        periodo_fin = date(anio, mes, dias_mes)
        etiqueta_periodo = f"{MESES_ES[mes]} {anio}"
    else:
        modo = "ANIO"
        periodo_inicio = date(anio, 1, 1)
        periodo_fin = date(anio, 12, 31)
        etiqueta_periodo = f"Año {anio}"

    anio_ini_dt = datetime.combine(date(anio, 1, 1), time.min)
    anio_fin_dt = datetime.combine(date(anio, 12, 31), time.max)
    per_ini_dt = datetime.combine(periodo_inicio, time.min)
    per_fin_dt = datetime.combine(periodo_fin, time.max)

    trans_anio = (
        await db.execute(
            select(Transaccion)
            .where(Transaccion.fecha >= anio_ini_dt, Transaccion.fecha <= anio_fin_dt)
            .order_by(Transaccion.fecha.desc(), Transaccion.id.desc())
        )
    ).scalars().all()

    if periodo_inicio.year == anio and periodo_fin.year == anio:
        trans_periodo = [t for t in trans_anio if per_ini_dt <= t.fecha <= per_fin_dt]
    else:
        trans_periodo = (
            await db.execute(
                select(Transaccion)
                .where(Transaccion.fecha >= per_ini_dt, Transaccion.fecha <= per_fin_dt)
                .order_by(Transaccion.fecha.desc(), Transaccion.id.desc())
            )
        ).scalars().all()

    # Ventas activas pendientes o parciales para Por Cobrar (sin límite de 100)
    ventas_pendientes = (
        await db.execute(
            select(Venta)
            .where(Venta.estado_pago != EstadoPago.PAGADO)
            .options(
                selectinload(Venta.cliente),
                selectinload(Venta.pagos),
                selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.plataforma),
                selectinload(Venta.detalles).selectinload(DetalleVenta.combo),
            )
            .order_by(Venta.fecha_inicio.desc(), Venta.id.desc())
        )
    ).scalars().all()

    # Construir resumen anual de los 12 meses del año seleccionado
    anual_map = {
        m: {
            "mes": m,
            "etiqueta": MESES_ES[m],
            "ingresos": Decimal("0.00"),
            "egresos_compras": Decimal("0.00"),
            "egresos_otros": Decimal("0.00"),
            "egresos_totales": Decimal("0.00"),
            "balance_neto": Decimal("0.00"),
            "por_cobrar": Decimal("0.00"),
            "cantidad_compras": 0,
            "cantidad_otros_egresos": 0,
            "cantidad_ingresos": 0,
        }
        for m in range(1, 13)
    }

    for t in trans_anio:
        if not t.fecha:
            continue
        bucket = anual_map[t.fecha.month]
        monto = t.monto or Decimal("0.00")
        if t.tipo == TipoTransaccion.INGRESO:
            bucket["ingresos"] += monto
            bucket["cantidad_ingresos"] += 1
        elif t.categoria == "COMPRA_CUENTA":
            bucket["egresos_compras"] += monto
            bucket["egresos_totales"] += monto
            bucket["cantidad_compras"] += 1
        else:
            bucket["egresos_otros"] += monto
            bucket["egresos_totales"] += monto
            bucket["cantidad_otros_egresos"] += 1

    por_cobrar_global = Decimal("0.00")
    por_cobrar_periodo = Decimal("0.00")
    pendientes_detalle = []

    for v in ventas_pendientes:
        abonado, saldo = _calc_sale_pending(v)
        por_cobrar_global += saldo
        if v.fecha_inicio:
            if v.fecha_inicio.year == anio:
                anual_map[v.fecha_inicio.month]["por_cobrar"] += saldo
            if periodo_inicio <= v.fecha_inicio <= periodo_fin and saldo > 0:
                por_cobrar_periodo += saldo
                pendientes_detalle.append({
                    "venta_id": v.id,
                    "cliente_nombre": v.cliente.nombre if v.cliente else f"Cliente #{v.cliente_id}",
                    "plataformas": _extract_sale_platforms(v),
                    "fecha_inicio": v.fecha_inicio,
                    "fecha_corte": v.fecha_corte,
                    "estado_pago": v.estado_pago.value if hasattr(v.estado_pago, "value") else str(v.estado_pago),
                    "monto_total": v.monto_total or Decimal("0.00"),
                    "abonado": abonado,
                    "saldo_pendiente": saldo,
                })

    resumen_anual = []
    for m in range(1, 13):
        item = anual_map[m]
        item["balance_neto"] = item["ingresos"] - item["egresos_totales"]
        resumen_anual.append(item)

    # Enriquecimiento en lote de referencias (CuentaMadre y Venta) para el periodo seleccionado
    cm_ids = {
        t.referencia_id
        for t in trans_periodo
        if t.referencia_id is not None and t.categoria in ("COMPRA_CUENTA", "REEMBOLSO_CUENTA")
    }
    venta_ids = {
        t.referencia_id
        for t in trans_periodo
        if t.referencia_id is not None and t.categoria in ("PAGO_VENTA", "REEMBOLSO_GARANTIA")
    }

    cm_map: dict[int, CuentaMadre] = {}
    if cm_ids:
        cms = (
            await db.execute(
                select(CuentaMadre)
                .where(CuentaMadre.id.in_(cm_ids))
                .options(
                    selectinload(CuentaMadre.plataforma),
                    selectinload(CuentaMadre.credencial),
                    selectinload(CuentaMadre.proveedor),
                )
            )
        ).scalars().all()
        cm_map = {cm.id: cm for cm in cms}

    venta_map: dict[int, Venta] = {}
    if venta_ids:
        ventas_ref = (
            await db.execute(
                select(Venta)
                .where(Venta.id.in_(venta_ids))
                .options(selectinload(Venta.cliente))
            )
        ).scalars().all()
        venta_map = {v.id: v for v in ventas_ref}

    ingresos_totales = Decimal("0.00")
    ingresos_ventas = Decimal("0.00")
    egresos_totales = Decimal("0.00")
    egresos_cuentas_madre = Decimal("0.00")
    entidad_stats: dict[str, dict] = {}
    compras_detalle = []
    otros_egresos_detalle = []
    ingresos_detalle = []

    for t in trans_periodo:
        monto = t.monto or Decimal("0.00")
        ent_name = t.entidad.value if hasattr(t.entidad, "value") else str(t.entidad)
        if ent_name not in entidad_stats:
            entidad_stats[ent_name] = {
                "entidad": ent_name,
                "ingresos": Decimal("0.00"),
                "egresos": Decimal("0.00"),
                "balance": Decimal("0.00"),
            }

        if t.tipo == TipoTransaccion.INGRESO:
            ingresos_totales += monto
            entidad_stats[ent_name]["ingresos"] += monto
            if t.categoria == "PAGO_VENTA":
                ingresos_ventas += monto

            detalle_txt = None
            if t.categoria == "PAGO_VENTA" and t.referencia_id in venta_map:
                v_ref = venta_map[t.referencia_id]
                cli = v_ref.cliente.nombre if v_ref.cliente else f"Cliente #{v_ref.cliente_id}"
                detalle_txt = f"{cli} (Venta #{v_ref.id})"
            elif t.categoria == "REEMBOLSO_CUENTA" and t.referencia_id in cm_map:
                cm_ref = cm_map[t.referencia_id]
                plat = cm_ref.plataforma.nombre if cm_ref.plataforma else "Plataforma"
                correo = cm_ref.credencial.email if cm_ref.credencial else "N/A"
                detalle_txt = f"{plat} ({correo})"

            ingresos_detalle.append({
                "id": t.id,
                "categoria": t.categoria,
                "monto": monto,
                "entidad": ent_name,
                "referencia_id": t.referencia_id,
                "detalle": detalle_txt,
                "fecha": t.fecha,
            })
        else:
            egresos_totales += monto
            entidad_stats[ent_name]["egresos"] += monto

            if t.categoria == "COMPRA_CUENTA":
                egresos_cuentas_madre += monto
                cm_ref = cm_map.get(t.referencia_id) if t.referencia_id is not None else None
                plataforma = cm_ref.plataforma.nombre if (cm_ref and cm_ref.plataforma) else "Cuenta no disponible"
                correo = cm_ref.credencial.email if (cm_ref and cm_ref.credencial) else "N/A"
                proveedor = cm_ref.proveedor.nombre if (cm_ref and cm_ref.proveedor) else "N/A"
                estado_cuenta = (
                    cm_ref.estado.value if (cm_ref and hasattr(cm_ref.estado, "value"))
                    else (str(cm_ref.estado) if cm_ref else None)
                )
                tipo_mov = "Compra / Renov."
                if cm_ref and cm_ref.fecha_compra and t.fecha:
                    tipo_mov = "Renovación" if t.fecha.date() > cm_ref.fecha_compra else "Compra"

                compras_detalle.append({
                    "id": t.id,
                    "cuenta_madre_id": t.referencia_id,
                    "plataforma": plataforma,
                    "correo": correo,
                    "proveedor": proveedor,
                    "estado_cuenta": estado_cuenta,
                    "tipo_movimiento": tipo_mov,
                    "monto": monto,
                    "entidad": ent_name,
                    "fecha": t.fecha,
                })
            else:
                detalle_txt = None
                if t.categoria == "REEMBOLSO_GARANTIA" and t.referencia_id in venta_map:
                    v_ref = venta_map[t.referencia_id]
                    cli = v_ref.cliente.nombre if v_ref.cliente else f"Cliente #{v_ref.cliente_id}"
                    detalle_txt = f"{cli} (Venta #{v_ref.id})"

                otros_egresos_detalle.append({
                    "id": t.id,
                    "categoria": t.categoria,
                    "monto": monto,
                    "entidad": ent_name,
                    "referencia_id": t.referencia_id,
                    "detalle": detalle_txt,
                    "fecha": t.fecha,
                })

    por_entidad = []
    for st in entidad_stats.values():
        st["balance"] = st["ingresos"] - st["egresos"]
        por_entidad.append(st)
    por_entidad.sort(key=lambda x: x["ingresos"] + x["egresos"], reverse=True)

    return {
        "anio": anio,
        "mes": mes if modo == "MES" else None,
        "fecha_inicio": periodo_inicio,
        "fecha_fin": periodo_fin,
        "modo": modo,
        "etiqueta_periodo": etiqueta_periodo,
        "ingresos_totales": ingresos_totales,
        "ingresos_ventas": ingresos_ventas,
        "ingresos_otros": ingresos_totales - ingresos_ventas,
        "egresos_totales": egresos_totales,
        "egresos_cuentas_madre": egresos_cuentas_madre,
        "egresos_otros": egresos_totales - egresos_cuentas_madre,
        "balance_neto": ingresos_totales - egresos_totales,
        "por_cobrar_periodo": por_cobrar_periodo,
        "por_cobrar_global": por_cobrar_global,
        "resumen_anual": resumen_anual,
        "por_entidad": por_entidad,
        "compras_detalle": compras_detalle,
        "otros_egresos_detalle": otros_egresos_detalle,
        "ingresos_detalle": ingresos_detalle,
        "pendientes_detalle": pendientes_detalle,
    }


