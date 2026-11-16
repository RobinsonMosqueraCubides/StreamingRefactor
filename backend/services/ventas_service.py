from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from db.models import Venta, DetalleVenta, Perfil, CuentaMadre, Plataforma, EstadoCuenta, EstadoPago, PlantillaMensaje, PagoVenta, Transaccion, TipoTransaccion
from db.database import get_or_404
from schemas.ventas_schemas import VentaCreate, VentaUpdate
from core.exceptions import BusinessRuleError
from datetime import date
from decimal import Decimal
import urllib.parse
import re

def _format_whatsapp_target(contacto: str) -> str:
    """Normalize a phone number or WhatsApp username for https://wa.me/<target> URLs."""
    cleaned = (contacto or "").strip()
    cleaned = re.sub(r"^https?://(www\.)?wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("?")[0].strip().strip("/")
    if cleaned.startswith("@"):
        cleaned = cleaned[1:].strip()
    return cleaned.replace("+", "").replace(" ", "").replace("-", "")


def _resolve_whatsapp_target(cliente) -> str:
    """Prioritize phone number; fall back to WhatsApp username when phone is not saved."""
    if cliente and getattr(cliente, "telefono", None) and cliente.telefono.strip():
        return _format_whatsapp_target(cliente.telefono)
    if cliente and getattr(cliente, "username", None) and cliente.username.strip():
        return _format_whatsapp_target(cliente.username)
    raise BusinessRuleError("El cliente no tiene teléfono ni username de WhatsApp registrado")


def _render_template_vars(template_text: str, ctx: dict) -> str:
    """Replace supported WhatsApp template placeholders consistently."""
    replacements = {
        "[Nombre Cliente]": ctx.get("cliente", "Cliente"),
        "{cliente}": ctx.get("cliente", "Cliente"),
        "{nombre_completo}": ctx.get("nombre_completo", ctx.get("cliente", "Cliente")),
        "{plataforma}": ctx.get("plataforma", "N/A"),
        "[Plataforma]": ctx.get("plataforma", "N/A"),
        "{usuario}": ctx.get("usuario", "N/A"),
        "{email}": ctx.get("usuario", "N/A"),
        "[Email]": ctx.get("usuario", "N/A"),
        "{password}": ctx.get("password", "N/A"),
        "{clave}": ctx.get("password", "N/A"),
        "[Clave]": ctx.get("password", "N/A"),
        "{perfil}": ctx.get("perfil", "N/A"),
        "[Perfil]": ctx.get("perfil", "N/A"),
        "{pin}": ctx.get("pin", "N/A"),
        "[PIN]": ctx.get("pin", "N/A"),
        "{monto}": ctx.get("monto", "0.00"),
        "[Monto]": ctx.get("monto", "0.00"),
        "{fecha_inicio}": ctx.get("fecha_inicio", ""),
        "[Fecha Inicio]": ctx.get("fecha_inicio", ""),
        "{fecha_corte}": ctx.get("fecha_corte", ""),
        "[Fecha Corte]": ctx.get("fecha_corte", ""),
        "{detalle_accesos}": ctx.get("detalle_accesos", ""),
    }
    msg = template_text
    for key, val in replacements.items():
        msg = msg.replace(key, str(val))
    return msg

async def get_ventas(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Venta)
        .options(
            selectinload(Venta.cliente),
            selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.credencial),
            selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.plataforma),
        )
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_venta(db: AsyncSession, venta_id: int):
    return await get_or_404(
        db,
        Venta,
        venta_id,
        options=[
            selectinload(Venta.cliente),
            selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.credencial),
            selectinload(Venta.detalles).selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.plataforma),
        ]
    )

async def _resolve_unique_profile_name(
    db: AsyncSession, cuenta_madre_id: int, perfil_id: int, desired_name: str
) -> str:
    """Ensure nombre_perfil is unique within the CuentaMadre to avoid IntegrityError."""
    clean_name = (desired_name or "").strip()[:50] or "Perfil"
    res = await db.execute(
        select(Perfil.nombre_perfil).where(
            Perfil.cuenta_madre_id == cuenta_madre_id,
            Perfil.id != perfil_id
        )
    )
    existing_names = set(res.scalars().all())
    if clean_name not in existing_names:
        return clean_name
    idx = 2
    while True:
        suffix = f" {idx}"
        candidate = f"{clean_name[:50 - len(suffix)]}{suffix}"
        if candidate not in existing_names:
            return candidate
        idx += 1


async def _calcular_tipo_venta(db: AsyncSession, detalles: list[DetalleVenta]) -> str:
    if not detalles:
        return "PANTALLA"
    if any(d.combo_id is not None for d in detalles):
        return "COMBO"
    cuentas_ids = {d.cuenta_madre_id for d in detalles if d.cuenta_madre_id is not None}
    if len(cuentas_ids) > 1:
        return "COMBO"
    if len(detalles) > 1 and not cuentas_ids:
        return "COMBO"
    if len(cuentas_ids) == 1:
        if all(getattr(d, "tipo_unidad", "PANTALLA") == "CUENTA" or d.perfil_id is None for d in detalles):
            return "CUENTA"
        elif len(detalles) > 1:
            return "COMBO"
        else:
            return "PANTALLA"
    return "PANTALLA"


async def create_venta(db: AsyncSession, venta: VentaCreate):
    try:
        # Determine tipo_venta
        if len(venta.items) > 1:
            tipo_venta = "COMBO"
        else:
            item = venta.items[0]
            if item.combo_id is not None:
                tipo_venta = "COMBO"
            elif getattr(item, "tipo_unidad", "PANTALLA") == "CUENTA":
                tipo_venta = "CUENTA"
            else:
                tipo_venta = "PANTALLA"

        # 1. Crear cabecera de la venta
        db_venta = Venta(
            cliente_id=venta.cliente_id,
            fecha_inicio=venta.fecha_inicio,
            fecha_corte=venta.fecha_corte,
            monto_total=venta.monto_total,
            estado_pago=EstadoPago.PENDIENTE,
            tipo_venta=tipo_venta,
            nota=venta.nota
        )
        db.add(db_venta)
        await db.flush()

        assigned_perfil_ids: set[int] = set()
        assigned_cm_ids: set[int] = set()

        # 2. Iterar sobre cada item solicitado para asignar un perfil libre o una cuenta completa
        for item in venta.items:
            # Obtener el nombre de la plataforma para mensajes de error
            plat_res = await db.execute(select(Plataforma).where(Plataforma.id == item.plataforma_id))
            plat = plat_res.scalar_one_or_none()
            plat_name = plat.nombre if plat else f"ID {item.plataforma_id}"
            tipo_unidad = getattr(item, "tipo_unidad", "PANTALLA")

            if tipo_unidad == "CUENTA":
                if getattr(item, "cuenta_madre_id", None) is not None:
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.id == item.cuenta_madre_id,
                            CuentaMadre.estado == EstadoCuenta.ACTIVA
                        )
                    )
                    if assigned_cm_ids:
                        stmt_cm = stmt_cm.where(~CuentaMadre.id.in_(assigned_cm_ids))
                    stmt_cm = stmt_cm.with_for_update(skip_locked=True)
                else:
                    subq_assigned = select(Perfil.cuenta_madre_id).where((Perfil.asignado == True) | (Perfil.reportado == True))
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.plataforma_id == item.plataforma_id,
                            CuentaMadre.estado == EstadoCuenta.ACTIVA,
                            ~CuentaMadre.id.in_(subq_assigned)
                        )
                    )
                    if assigned_cm_ids:
                        stmt_cm = stmt_cm.where(~CuentaMadre.id.in_(assigned_cm_ids))
                    stmt_cm = stmt_cm.with_for_update(skip_locked=True).limit(1)
                res_cm = await db.execute(stmt_cm)
                db_cm = res_cm.scalar_one_or_none()

                if not db_cm:
                    raise BusinessRuleError(f"No hay cuentas completas disponibles para la plataforma {plat_name}")

                stmt_p = (
                    select(Perfil)
                    .where(Perfil.cuenta_madre_id == db_cm.id)
                    .order_by(Perfil.id.asc())
                    .with_for_update(skip_locked=True)
                )
                res_p = await db.execute(stmt_p)
                perfiles = res_p.scalars().all()

                if not perfiles:
                    raise BusinessRuleError(f"La Cuenta Madre #{db_cm.id} no posee perfiles configurados.")

                if any(p.asignado or p.reportado or p.id in assigned_perfil_ids for p in perfiles):
                    raise BusinessRuleError(f"La Cuenta Madre #{db_cm.id} ya tiene perfiles asignados o reportados.")

                assigned_cm_ids.add(db_cm.id)

                # Calcular valor unitario por pantalla dentro del combo
                precio_unitario = Decimal(str(item.precio_aplicado)) / Decimal(len(perfiles))

                for perfil in perfiles:
                    perfil.asignado = True
                    assigned_perfil_ids.add(perfil.id)
                    db_detalle = DetalleVenta(
                        venta_id=db_venta.id,
                        combo_id=item.combo_id,
                        cuenta_madre_id=perfil.cuenta_madre_id,
                        perfil_id=perfil.id,
                        tipo_unidad="CUENTA",
                        precio_aplicado=precio_unitario
                    )
                    db.add(db_detalle)
                await db.flush()
            else:
                stmt = select(Perfil).join(CuentaMadre)
                if getattr(item, "cuenta_madre_id", None) is not None:
                    stmt = stmt.where(
                        Perfil.cuenta_madre_id == item.cuenta_madre_id,
                        CuentaMadre.estado == EstadoCuenta.ACTIVA,
                        Perfil.asignado == False,
                        Perfil.reportado == False
                    )
                else:
                    stmt = stmt.where(
                        CuentaMadre.plataforma_id == item.plataforma_id,
                        CuentaMadre.estado == EstadoCuenta.ACTIVA,
                        Perfil.asignado == False,
                        Perfil.reportado == False
                    )
                if assigned_perfil_ids:
                    stmt = stmt.where(~Perfil.id.in_(assigned_perfil_ids))
                stmt = stmt.order_by(Perfil.id.asc()).with_for_update(skip_locked=True).limit(1)
                result = await db.execute(stmt)
                perfil = result.scalar_one_or_none()

                if not perfil:
                    raise BusinessRuleError(f"No hay perfiles disponibles para la plataforma {plat_name}")

                perfil.asignado = True
                assigned_perfil_ids.add(perfil.id)
                db_detalle = DetalleVenta(
                    venta_id=db_venta.id,
                    combo_id=item.combo_id,
                    cuenta_madre_id=perfil.cuenta_madre_id,
                    perfil_id=perfil.id,
                    tipo_unidad="PANTALLA",
                    precio_aplicado=item.precio_aplicado
                )
                db.add(db_detalle)
                await db.flush()

        await db.commit()
        return await get_venta(db, db_venta.id)
    except Exception as e:
        await db.rollback()
        raise e

async def renovar_venta(db: AsyncSession, venta_id: int, nueva_fecha_corte):
    from sqlalchemy import delete
    from db.models import PagoVenta
    try:
        db_venta = await get_venta(db, venta_id)
        db_venta.fecha_inicio = date.today()
        db_venta.fecha_corte = nueva_fecha_corte
        db_venta.estado_pago = EstadoPago.PENDIENTE
        
        # Eliminar los abonos antiguos registrados para esta venta en el ciclo anterior
        await db.execute(delete(PagoVenta).where(PagoVenta.venta_id == venta_id))
        
        await db.commit()
        await db.refresh(db_venta)
        return db_venta
    except Exception as e:
        await db.rollback()
        raise e

async def generate_whatsapp_link(db: AsyncSession, venta_id: int, detail_id: int, template_type: str) -> str:
    stmt_v = select(Venta).where(Venta.id == venta_id).options(selectinload(Venta.cliente))
    res_v = await db.execute(stmt_v)
    venta = res_v.scalar_one_or_none()
    if not venta:
        raise BusinessRuleError("Venta no encontrada")
    
    db_detalle = await get_or_404(db, DetalleVenta, detail_id)
        
    stmt_cm = select(CuentaMadre).where(CuentaMadre.id == db_detalle.cuenta_madre_id).options(
        selectinload(CuentaMadre.plataforma),
        selectinload(CuentaMadre.credencial),
        selectinload(CuentaMadre.proveedor)
    )
    res_cm = await db.execute(stmt_cm)
    cm = res_cm.scalar_one_or_none()
    
    perfil = None
    if db_detalle.perfil_id is not None:
        perfil = await db.get(Perfil, db_detalle.perfil_id)
    
    es_cuenta_completa = (
        getattr(db_detalle, "tipo_unidad", "PANTALLA") == "CUENTA"
        or db_detalle.perfil_id is None
        or venta.tipo_venta == "CUENTA"
    )

    stmt_temp = select(PlantillaMensaje).where(PlantillaMensaje.nombre == template_type)
    res_temp = await db.execute(stmt_temp)
    temp = res_temp.scalar_one_or_none()
    
    if temp:
        mensaje_base = temp.mensaje
    else:
        if template_type == 'cobro':
            mensaje_base = "Hola [Nombre Cliente], te recordamos que tu suscripción de {plataforma} vence pronto ({fecha_corte}). Puedes renovarla realizando el pago de {monto} COP."
        elif template_type == 'corte':
            mensaje_base = "Hola [Nombre Cliente], tu suscripción de {plataforma} ha vencido y los perfiles asociados han sido suspendidos. Realiza tu pago de {monto} COP para reactivarlos."
        else:
            mensaje_base = "Hola [Nombre Cliente], aquí tienes tus credenciales para {plataforma}: Correo: {usuario}, Clave: {password}, Perfil: {perfil}, PIN: {pin}."

    # Obtener credenciales
    plataforma = cm.plataforma.nombre if (cm and cm.plataforma) else "N/A"
    usuario = cm.credencial.email if (cm and cm.credencial) else "N/A"
    password = cm.credencial.password if (cm and cm.credencial) else "N/A"
    
    if cm and cm.proveedor and cm.proveedor.nombre == "Correos A" and cm.credencial:
        from db.models import CorreoPropio, ClavePlataformaCorreoPropio
        stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == cm.credencial.email)
        res_cp = await db.execute(stmt_cp)
        correo_propio = res_cp.scalar_one_or_none()
        if correo_propio:
            res_cpcp = await db.execute(select(ClavePlataformaCorreoPropio).where(
                ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                ClavePlataformaCorreoPropio.plataforma_id == cm.plataforma_id
            ))
            cpcp = res_cpcp.scalar_one_or_none()
            if cpcp:
                password = cpcp.clave

    profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
    pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"

    if es_cuenta_completa:
        lines = mensaje_base.split('\n')
        filtered_lines = []
        for line in lines:
            lower_line = line.lower()
            if ('perfil' in lower_line and '{perfil}' in lower_line) or ('pin' in lower_line and '{pin}' in lower_line):
                continue
            filtered_lines.append(line)
        mensaje_base = '\n'.join(filtered_lines)
        # Fallback if profile/pin were on same line:
        mensaje_base = mensaje_base.replace('{perfil}', 'N/A').replace('{pin}', 'N/A')

    first_name = venta.cliente.nombre.strip().split()[0] if (venta.cliente and venta.cliente.nombre and venta.cliente.nombre.strip()) else "Cliente"
    monto_str = f"{db_detalle.precio_aplicado:,.2f}" if isinstance(db_detalle.precio_aplicado, Decimal) else str(db_detalle.precio_aplicado)

    msg = _render_template_vars(mensaje_base, {
        "cliente": first_name,
        "nombre_completo": venta.cliente.nombre if venta.cliente else "Cliente",
        "plataforma": plataforma,
        "usuario": usuario,
        "password": password,
        "perfil": profile_name,
        "pin": pin_val,
        "monto": monto_str,
        "fecha_inicio": venta.fecha_inicio.strftime("%Y-%m-%d") if venta.fecha_inicio else "",
        "fecha_corte": venta.fecha_corte.strftime("%Y-%m-%d") if venta.fecha_corte else "",
    })

    phone = _resolve_whatsapp_target(venta.cliente)
    encoded_msg = urllib.parse.quote(msg)
    return f"https://wa.me/{phone}?text={encoded_msg}"

async def generate_whatsapp_consolidated(db: AsyncSession, venta_id: int) -> str:
    stmt_v = select(Venta).where(Venta.id == venta_id).options(
        selectinload(Venta.cliente),
        selectinload(Venta.detalles)
    )
    res_v = await db.execute(stmt_v)
    venta = res_v.scalar_one_or_none()
    if not venta:
        raise BusinessRuleError("Venta no encontrada")
        
    # 1. Agrupar detalles por cuenta_madre_id
    detalles_por_cuenta = {}
    for detail in venta.detalles:
        if detail.cuenta_madre_id:
            if detail.cuenta_madre_id not in detalles_por_cuenta:
                detalles_por_cuenta[detail.cuenta_madre_id] = []
            detalles_por_cuenta[detail.cuenta_madre_id].append(detail)
            
    first_name = venta.cliente.nombre.strip().split()[0] if (venta.cliente and venta.cliente.nombre and venta.cliente.nombre.strip()) else "Cliente"
    detalle_accesos = ""
    item_idx = 1
    
    for cm_id, list_detalles in detalles_por_cuenta.items():
        stmt_cm = select(CuentaMadre).where(CuentaMadre.id == cm_id).options(
            selectinload(CuentaMadre.plataforma),
            selectinload(CuentaMadre.credencial),
            selectinload(CuentaMadre.proveedor)
        )
        res_cm = await db.execute(stmt_cm)
        cm = res_cm.scalar_one_or_none()
        
        plat_name = cm.plataforma.nombre if (cm and cm.plataforma) else f"Plataforma #{cm_id}"
        email = cm.credencial.email if (cm and cm.credencial) else "N/A"
        password = cm.credencial.password if (cm and cm.credencial) else "N/A"
        
        if cm and cm.proveedor and cm.proveedor.nombre == "Correos A" and cm.credencial:
            from db.models import CorreoPropio, ClavePlataformaCorreoPropio
            stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == cm.credencial.email)
            res_cp = await db.execute(stmt_cp)
            correo_propio = res_cp.scalar_one_or_none()
            if correo_propio:
                res_cpcp = await db.execute(select(ClavePlataformaCorreoPropio).where(
                    ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                    ClavePlataformaCorreoPropio.plataforma_id == cm.plataforma_id
                ))
                cpcp = res_cpcp.scalar_one_or_none()
                if cpcp:
                    password = cpcp.clave

        # Verificar si es cuenta completa según el tipo_unidad vendido (o si es venta de tipo CUENTA)
        es_cuenta_completa = cm and (
            venta.tipo_venta == "CUENTA"
            or all(getattr(d, "tipo_unidad", "PANTALLA") == "CUENTA" or d.perfil_id is None for d in list_detalles)
        )
        
        if es_cuenta_completa:
            # Reportar como cuenta completa simplificada
            detalle_accesos += f"*{item_idx}. {plat_name}*\n"
            detalle_accesos += f"   • Correo: `{email}`\n"
            detalle_accesos += f"   • Clave: `{password}`\n\n"
            item_idx += 1
        else:
            # Reportar perfiles individuales
            for detail in list_detalles:
                stmt_p = select(Perfil).where(Perfil.id == detail.perfil_id)
                res_p = await db.execute(stmt_p)
                perfil = res_p.scalar_one_or_none()
                
                profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
                pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"
                
                detalle_accesos += f"*{item_idx}. {plat_name}*\n"
                detalle_accesos += f"   • Correo: `{email}`\n"
                detalle_accesos += f"   • Clave: `{password}`\n"

                detalle_accesos += f"   • Perfil (Usuario): *{profile_name}*\n"
                detalle_accesos += f"   • PIN: *{pin_val}*\n\n"
                item_idx += 1
        
    stmt_temp = select(PlantillaMensaje).where(PlantillaMensaje.nombre == "compra")
    res_temp = await db.execute(stmt_temp)
    temp_compra = res_temp.scalar_one_or_none()

    if temp_compra:
        monto_total_str = f"{venta.monto_total:,.2f}" if isinstance(venta.monto_total, Decimal) else str(venta.monto_total)
        msg = _render_template_vars(temp_compra.mensaje, {
            "cliente": first_name,
            "nombre_completo": venta.cliente.nombre if venta.cliente else "Cliente",
            "monto": monto_total_str,
            "fecha_inicio": venta.fecha_inicio.strftime("%Y-%m-%d") if venta.fecha_inicio else "",
            "fecha_corte": venta.fecha_corte.strftime("%Y-%m-%d") if venta.fecha_corte else "",
            "detalle_accesos": detalle_accesos,
        })
    else:
        msg = f"Hola *{first_name}*, aquí tienes los accesos para tus suscripciones de streaming:\n\n"
        msg += detalle_accesos
        msg += f"Fecha de Vencimiento: *{venta.fecha_corte.strftime('%Y-%m-%d')}*\n\n"
        msg += "¡Gracias por tu confianza y preferencia! 🚀"
    
    phone = _resolve_whatsapp_target(venta.cliente)
    encoded_msg = urllib.parse.quote(msg)
    return f"https://wa.me/{phone}?text={encoded_msg}"

async def confirmar_pago_completo(db: AsyncSession, venta_id: int) -> Venta:
    venta = await get_or_404(
        db,
        Venta,
        venta_id,
        options=[
            selectinload(Venta.cliente),
            selectinload(Venta.detalles)
        ]
    )
        
    # Calcular pagos ya realizados
    stmt_pagos = select(func.sum(PagoVenta.monto)).where(PagoVenta.venta_id == venta_id)
    res_pagos = await db.execute(stmt_pagos)
    pagado = res_pagos.scalar() or Decimal("0.00")
    
    saldo_restante = venta.monto_total - pagado
    
    try:
        if saldo_restante > 0:
            # Registrar el pago por el saldo restante
            pago_restante = PagoVenta(
                venta_id=venta_id,
                monto=saldo_restante,
                entidad="NEQUI"  # Por defecto
            )
            db.add(pago_restante)
            
            # Registrar la transacción contable
            transaccion = Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="PAGO_VENTA",
                monto=saldo_restante,
                entidad="NEQUI",
                referencia_id=venta_id
            )
            db.add(transaccion)
            
        venta.estado_pago = EstadoPago.PAGADO
        await db.commit()
        await db.refresh(venta)
        return venta
    except Exception as e:
        await db.rollback()
        raise e


async def update_venta(db: AsyncSession, venta_id: int, venta_data: VentaUpdate) -> Venta:
    db_venta = await get_venta(db, venta_id)
    if venta_data.cliente_id is not None:
        db_venta.cliente_id = venta_data.cliente_id
    if venta_data.fecha_inicio is not None:
        db_venta.fecha_inicio = venta_data.fecha_inicio
    if venta_data.fecha_corte is not None:
        db_venta.fecha_corte = venta_data.fecha_corte
    if venta_data.monto_total is not None:
        db_venta.monto_total = venta_data.monto_total
    if venta_data.estado_pago is not None:
        db_venta.estado_pago = venta_data.estado_pago
    if venta_data.nota is not None:
        db_venta.nota = venta_data.nota
        
    if venta_data.detalles is not None:
        # 1. Identify which details to delete (not present in payload)
        payload_detail_ids = {d.id for d in venta_data.detalles if d.id is not None}
        details_to_delete = [d for d in list(db_venta.detalles) if d.id not in payload_detail_ids]

        for d in details_to_delete:
            old_perfil_id = d.perfil_id
            old_cm_id = d.cuenta_madre_id
            await db.delete(d)
            db_venta.detalles.remove(d)
            await db.flush()

            if old_perfil_id is not None:
                still_used = await db.execute(
                    select(DetalleVenta.id).where(DetalleVenta.perfil_id == old_perfil_id).limit(1)
                )
                if not still_used.scalar_one_or_none():
                    old_perf = await db.get(Perfil, old_perfil_id)
                    if old_perf and not old_perf.reportado:
                        old_perf.asignado = False
            elif old_cm_id is not None:
                res_old_perfiles = await db.execute(
                    select(Perfil).where(Perfil.cuenta_madre_id == old_cm_id)
                )
                for p in res_old_perfiles.scalars().all():
                    still_used = await db.execute(
                        select(DetalleVenta.id).where(DetalleVenta.perfil_id == p.id).limit(1)
                    )
                    if not still_used.scalar_one_or_none() and not p.reportado:
                        p.asignado = False
        await db.flush()

        assigned_perfil_ids: set[int] = set()

        # 2a. Process existing details first
        for det_update in [d for d in venta_data.detalles if d.id is not None]:
            db_detail = next((d for d in db_venta.detalles if d.id == det_update.id), None)
            if db_detail is not None:
                tipo_unidad = det_update.tipo_unidad or getattr(db_detail, "tipo_unidad", "PANTALLA")
                db_detail.tipo_unidad = tipo_unidad
                new_perfil_id = None if (det_update.perfil_id == 0 or tipo_unidad == "CUENTA") else det_update.perfil_id

                profile_changed = (det_update.perfil_id is not None and db_detail.perfil_id != new_perfil_id)
                account_changed = (det_update.cuenta_madre_id is not None and db_detail.cuenta_madre_id != det_update.cuenta_madre_id)

                if profile_changed or account_changed:
                    old_perfil_id = db_detail.perfil_id
                    old_cm_id = db_detail.cuenta_madre_id

                    # Apply new IDs
                    if det_update.cuenta_madre_id is not None:
                        db_detail.cuenta_madre_id = det_update.cuenta_madre_id
                    if det_update.perfil_id is not None:
                        db_detail.perfil_id = new_perfil_id

                    await db.flush()

                    # Release old only if no other detail still references it
                    if old_perfil_id is not None:
                        still_used = await db.execute(
                            select(DetalleVenta.id).where(DetalleVenta.perfil_id == old_perfil_id).limit(1)
                        )
                        if not still_used.scalar_one_or_none():
                            old_perf = await db.get(Perfil, old_perfil_id)
                            if old_perf and not old_perf.reportado:
                                old_perf.asignado = False
                    elif old_cm_id is not None:
                        res_old_perfiles = await db.execute(
                            select(Perfil).where(Perfil.cuenta_madre_id == old_cm_id)
                        )
                        for p in res_old_perfiles.scalars().all():
                            still_used = await db.execute(
                                select(DetalleVenta.id).where(DetalleVenta.perfil_id == p.id).limit(1)
                            )
                            if not still_used.scalar_one_or_none() and not p.reportado:
                                p.asignado = False

                    # Auto-pick free profile if PANTALLA and perfil_id is None
                    if tipo_unidad == "PANTALLA" and db_detail.perfil_id is None and db_detail.cuenta_madre_id is not None:
                        stmt_auto = select(Perfil).where(
                            Perfil.cuenta_madre_id == db_detail.cuenta_madre_id,
                            Perfil.asignado == False,
                            Perfil.reportado == False
                        )
                        if assigned_perfil_ids:
                            stmt_auto = stmt_auto.where(~Perfil.id.in_(assigned_perfil_ids))
                        stmt_auto = stmt_auto.order_by(Perfil.id.asc()).limit(1)
                        res_auto = await db.execute(stmt_auto)
                        auto_perf = res_auto.scalar_one_or_none()
                        if not auto_perf:
                            raise BusinessRuleError(f"No hay perfiles disponibles en la Cuenta Madre #{db_detail.cuenta_madre_id}")
                        db_detail.perfil_id = auto_perf.id

                    # Assign new
                    if db_detail.perfil_id is not None:
                        if db_detail.perfil_id in assigned_perfil_ids:
                            raise BusinessRuleError("No se puede asignar el mismo perfil a dos pantallas de la misma venta.")
                        new_perf = await db.get(Perfil, db_detail.perfil_id)
                        if new_perf:
                            new_perf.asignado = True
                            assigned_perfil_ids.add(new_perf.id)
                    elif db_detail.cuenta_madre_id is not None and tipo_unidad == "CUENTA":
                        res_new_perfiles = await db.execute(
                            select(Perfil).where(Perfil.cuenta_madre_id == db_detail.cuenta_madre_id)
                        )
                        for p in res_new_perfiles.scalars().all():
                            p.asignado = True
                            assigned_perfil_ids.add(p.id)
                elif db_detail.perfil_id is not None:
                    assigned_perfil_ids.add(db_detail.perfil_id)

                if det_update.precio_aplicado is not None:
                    db_detail.precio_aplicado = det_update.precio_aplicado

                if db_detail.perfil_id is not None:
                    if det_update.nombre_perfil is not None or det_update.pin is not None:
                        perf = await db.get(Perfil, db_detail.perfil_id)
                        if perf:
                            if det_update.nombre_perfil is not None:
                                perf.nombre_perfil = await _resolve_unique_profile_name(
                                    db, perf.cuenta_madre_id, perf.id, det_update.nombre_perfil
                                )
                            if det_update.pin is not None:
                                perf.pin = det_update.pin
                elif tipo_unidad == "CUENTA" and db_detail.cuenta_madre_id is not None and det_update.nombre_perfil is not None:
                    res_first = await db.execute(
                        select(Perfil)
                        .where(Perfil.cuenta_madre_id == db_detail.cuenta_madre_id)
                        .order_by(Perfil.id.asc())
                        .limit(1)
                    )
                    first_perf = res_first.scalar_one_or_none()
                    if first_perf:
                        first_perf.nombre_perfil = await _resolve_unique_profile_name(
                            db, first_perf.cuenta_madre_id, first_perf.id, det_update.nombre_perfil
                        )
                await db.flush()

        # 2b. Process new details
        for det_update in [d for d in venta_data.detalles if d.id is None]:
            if not det_update.plataforma_id:
                raise BusinessRuleError("Se requiere plataforma_id para agregar un servicio.")

            plat_res = await db.execute(select(Plataforma).where(Plataforma.id == det_update.plataforma_id))
            plat = plat_res.scalar_one_or_none()
            plat_name = plat.nombre if plat else f"ID {det_update.plataforma_id}"

            final_cuenta_madre_id = det_update.cuenta_madre_id
            final_perfil_id = det_update.perfil_id if det_update.perfil_id != 0 else None
            tipo_unidad = getattr(det_update, "tipo_unidad", "PANTALLA") or "PANTALLA"

            if tipo_unidad == "CUENTA":
                if final_cuenta_madre_id is not None:
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.id == final_cuenta_madre_id,
                            CuentaMadre.estado == EstadoCuenta.ACTIVA
                        )
                        .with_for_update(skip_locked=True)
                    )
                else:
                    subq_assigned = select(Perfil.cuenta_madre_id).where((Perfil.asignado == True) | (Perfil.reportado == True))
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.plataforma_id == det_update.plataforma_id,
                            CuentaMadre.estado == EstadoCuenta.ACTIVA,
                            ~CuentaMadre.id.in_(subq_assigned)
                        )
                        .with_for_update(skip_locked=True)
                        .limit(1)
                    )
                res_cm = await db.execute(stmt_cm)
                db_cm = res_cm.scalar_one_or_none()

                if not db_cm:
                    raise BusinessRuleError(f"No hay cuentas completas disponibles para la plataforma {plat_name}")

                stmt_p = (
                    select(Perfil)
                    .where(Perfil.cuenta_madre_id == db_cm.id)
                    .order_by(Perfil.id.asc())
                    .with_for_update(skip_locked=True)
                )
                res_p = await db.execute(stmt_p)
                perfiles = res_p.scalars().all()

                if not perfiles:
                    raise BusinessRuleError(f"La Cuenta Madre #{db_cm.id} no posee perfiles configurados.")

                precio_unitario = Decimal(str(det_update.precio_aplicado or 0)) / Decimal(len(perfiles))

                if det_update.nombre_perfil is not None and perfiles:
                    perfiles[0].nombre_perfil = await _resolve_unique_profile_name(
                        db, db_cm.id, perfiles[0].id, det_update.nombre_perfil
                    )

                for perfil in perfiles:
                    perfil.asignado = True
                    assigned_perfil_ids.add(perfil.id)
                    db_detalle = DetalleVenta(
                        venta_id=db_venta.id,
                        combo_id=None,
                        cuenta_madre_id=db_cm.id,
                        perfil_id=perfil.id,
                        tipo_unidad="CUENTA",
                        precio_aplicado=precio_unitario
                    )
                    db.add(db_detalle)
                    db_venta.detalles.append(db_detalle)
                await db.flush()
            else:
                if final_cuenta_madre_id is not None:
                    if final_perfil_id is not None:
                        stmt = select(Perfil).where(
                            Perfil.id == final_perfil_id,
                            Perfil.cuenta_madre_id == final_cuenta_madre_id,
                            Perfil.asignado == False,
                            Perfil.reportado == False
                        )
                    else:
                        stmt = select(Perfil).where(
                            Perfil.cuenta_madre_id == final_cuenta_madre_id,
                            Perfil.asignado == False,
                            Perfil.reportado == False
                        )
                else:
                    stmt = select(Perfil).join(CuentaMadre).where(
                        CuentaMadre.plataforma_id == det_update.plataforma_id,
                        CuentaMadre.estado == EstadoCuenta.ACTIVA,
                        Perfil.asignado == False,
                        Perfil.reportado == False
                    )
                if assigned_perfil_ids:
                    stmt = stmt.where(~Perfil.id.in_(assigned_perfil_ids))
                stmt = stmt.order_by(Perfil.id.asc()).with_for_update(skip_locked=True).limit(1)
                result = await db.execute(stmt)
                perfil = result.scalar_one_or_none()

                if not perfil:
                    raise BusinessRuleError(f"No hay perfiles disponibles para la plataforma {plat_name}")

                perfil.asignado = True
                assigned_perfil_ids.add(perfil.id)

                if det_update.nombre_perfil is not None:
                    perfil.nombre_perfil = await _resolve_unique_profile_name(
                        db, perfil.cuenta_madre_id, perfil.id, det_update.nombre_perfil
                    )
                if det_update.pin is not None:
                    perfil.pin = det_update.pin

                db_detalle = DetalleVenta(
                    venta_id=db_venta.id,
                    combo_id=None,
                    cuenta_madre_id=perfil.cuenta_madre_id,
                    perfil_id=perfil.id,
                    tipo_unidad="PANTALLA",
                    precio_aplicado=det_update.precio_aplicado or Decimal(0)
                )
                db.add(db_detalle)
                db_venta.detalles.append(db_detalle)
                await db.flush()

    if venta_data.detalles is not None:
        db_venta.tipo_venta = await _calcular_tipo_venta(db, db_venta.detalles)

    try:
        await db.commit()
        return await get_venta(db, venta_id)
    except Exception as e:
        await db.rollback()
        raise e


async def delete_venta(db: AsyncSession, venta_id: int) -> bool:
    from sqlalchemy import delete
    db_venta = await get_venta(db, venta_id)
    
    # 1. Liberar perfiles asignados a la venta
    for detail in db_venta.detalles:
        if detail.perfil_id is not None:
            perf = await db.get(Perfil, detail.perfil_id)
            if perf:
                perf.asignado = False
        elif detail.cuenta_madre_id is not None:
            res_perfiles = await db.execute(
                select(Perfil).where(Perfil.cuenta_madre_id == detail.cuenta_madre_id)
            )
            for p in res_perfiles.scalars().all():
                p.asignado = False
                
    # 2. Eliminar transacciones de caja asociadas
    await db.execute(
        delete(Transaccion).where(
            Transaccion.referencia_id == venta_id,
            Transaccion.categoria == "PAGO_VENTA"
        )
    )
    
    # 3. Eliminar la cabecera de la venta (eliminará detalles y pagos en cascada)
    await db.delete(db_venta)
    
    try:
        await db.commit()
        return True
    except Exception as e:
        await db.rollback()
        raise e


async def confirmar_corte(db: AsyncSession, venta_id: int, detail_id: int) -> bool:
    from db.models import Venta, DetalleVenta, Perfil, VentaVencida
    from sqlalchemy import select
    
    from sqlalchemy.orm import selectinload
    
    stmt_v = select(Venta).where(Venta.id == venta_id).options(
        selectinload(Venta.cliente),
        selectinload(Venta.detalles)
    )
    res_v = await db.execute(stmt_v)
    db_venta = res_v.scalar_one_or_none()
    if not db_venta:
        raise BusinessRuleError("Venta no encontrada")
        
    stmt_d = select(DetalleVenta).where(DetalleVenta.id == detail_id).options(
        selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.plataforma),
        selectinload(DetalleVenta.cuenta_madre).selectinload(CuentaMadre.credencial),
        selectinload(DetalleVenta.combo)
    )
    res_d = await db.execute(stmt_d)
    db_detail = res_d.scalar_one_or_none()
    if not db_detail:
        raise BusinessRuleError("Detalle de venta no encontrado")
        
    is_cuenta_completa = getattr(db_detail, "tipo_unidad", None) == "CUENTA" or db_detail.perfil_id is None
    
    cliente_nombre = db_venta.cliente.nombre if db_venta.cliente else f"Cliente ID {db_venta.cliente_id}"
    
    plataforma_nombre = "N/A"
    if db_detail.cuenta_madre and db_detail.cuenta_madre.plataforma:
        plataforma_nombre = db_detail.cuenta_madre.plataforma.nombre
    elif db_detail.combo:
        plataforma_nombre = f"Combo: {db_detail.combo.nombre}"
        
    cuenta_madre_email = "N/A"
    if db_detail.cuenta_madre and db_detail.cuenta_madre.credencial:
        cuenta_madre_email = db_detail.cuenta_madre.credencial.email
        
    if not is_cuenta_completa:
        # Corte de pantalla única
        monto_pagado = db_detail.precio_aplicado
        
        # Liberar perfil
        perf = await db.get(Perfil, db_detail.perfil_id)
        if perf:
            perf.asignado = False
            
        # Registrar en VentaVencida
        venta_vencida = VentaVencida(
            cliente=cliente_nombre,
            monto_pagado=monto_pagado,
            fecha_inicio=db_venta.fecha_inicio,
            fecha_fin=db_venta.fecha_corte,
            plataforma=plataforma_nombre,
            cuenta_madre=cuenta_madre_email
        )
        db.add(venta_vencida)
        
        # Eliminar el detalle
        await db.delete(db_detail)
        
        # ¿Quedan más detalles en la venta?
        other_details = [d for d in db_venta.detalles if d.id != detail_id]
        if not other_details:
            await db.delete(db_venta)
        else:
            db_venta.monto_total -= db_detail.precio_aplicado
            
    else:
        # Corte de cuenta completa
        # Buscar todos los detalles de esta cuenta madre en la venta
        stmt = select(DetalleVenta).where(
            DetalleVenta.venta_id == venta_id,
            DetalleVenta.cuenta_madre_id == db_detail.cuenta_madre_id
        )
        res = await db.execute(stmt)
        details_to_cut = res.scalars().all()
        
        total_pagado = sum(d.precio_aplicado for d in details_to_cut)
        
        # Liberar perfiles
        res_perfiles = await db.execute(
            select(Perfil).where(Perfil.cuenta_madre_id == db_detail.cuenta_madre_id)
        )
        for p in res_perfiles.scalars().all():
            p.asignado = False
            
        # Registrar en VentaVencida
        venta_vencida = VentaVencida(
            cliente=cliente_nombre,
            monto_pagado=total_pagado,
            fecha_inicio=db_venta.fecha_inicio,
            fecha_fin=db_venta.fecha_corte,
            plataforma=plataforma_nombre + " (Cuenta Completa)",
            cuenta_madre=cuenta_madre_email
        )
        db.add(venta_vencida)
        
        # Eliminar detalles
        for d in details_to_cut:
            await db.delete(d)
            
        # ¿Quedan más detalles en la venta?
        other_details = [d for d in db_venta.detalles if d.cuenta_madre_id != db_detail.cuenta_madre_id]
        if not other_details:
            await db.delete(db_venta)
        else:
            db_venta.monto_total -= total_pagado
            
    try:
        await db.commit()
        return True
    except Exception as e:
        await db.rollback()
        raise e


async def get_ventas_vencidas(db: AsyncSession, skip: int = 0, limit: int = 100):
    from db.models import VentaVencida
    from sqlalchemy import select
    stmt = select(VentaVencida).order_by(VentaVencida.fecha_corte_registro.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def update_venta_nota(db: AsyncSession, id: int, nota: str):
    db_venta = await get_or_404(db, Venta, id)
    try:
        db_venta.nota = nota
        await db.commit()
        await db.refresh(db_venta)
        return db_venta
    except Exception as e:
        await db.rollback()
        raise e


