from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from db.models import Venta, DetalleVenta, Perfil, CuentaMadre, Plataforma, EstadoCuenta, EstadoPago, PlantillaMensaje, PagoVenta, Transaccion, TipoTransaccion
from db.database import get_or_404
from schemas.ventas_schemas import VentaCreate
from core.exceptions import BusinessRuleError
from decimal import Decimal
import urllib.parse

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

async def create_venta(db: AsyncSession, venta: VentaCreate):
    try:
        # 1. Crear cabecera de la venta
        db_venta = Venta(
            cliente_id=venta.cliente_id,
            fecha_corte=venta.fecha_corte,
            monto_total=venta.monto_total,
            estado_pago=EstadoPago.PENDIENTE
        )
        db.add(db_venta)
        await db.flush()

        detalles = []

        # 2. Iterar sobre cada item solicitado para asignar un perfil libre o una cuenta completa
        for item in venta.items:
            # Obtener el nombre de la plataforma para mensajes de error
            plat_res = await db.execute(select(Plataforma).where(Plataforma.id == item.plataforma_id))
            plat = plat_res.scalar_one_or_none()
            plat_name = plat.nombre if plat else f"ID {item.plataforma_id}"

            if getattr(item, "tipo_unidad", "PANTALLA") == "CUENTA":
                if getattr(item, "cuenta_madre_id", None) is not None:
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.id == item.cuenta_madre_id,
                            CuentaMadre.estado == EstadoCuenta.ACTIVA
                        )
                        .with_for_update(skip_locked=True)
                    )
                else:
                    subq_assigned = select(Perfil.cuenta_madre_id).where((Perfil.asignado == True) | (Perfil.reportado == True))
                    stmt_cm = (
                        select(CuentaMadre)
                        .where(
                            CuentaMadre.plataforma_id == item.plataforma_id,
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
                    .with_for_update(skip_locked=True)
                )
                res_p = await db.execute(stmt_p)
                perfiles = res_p.scalars().all()

                if not perfiles:
                    raise BusinessRuleError(f"La Cuenta Madre #{db_cm.id} no posee perfiles configurados.")

                # Calcular valor unitario por pantalla dentro del combo
                precio_unitario = Decimal(str(item.precio_aplicado)) / Decimal(len(perfiles))

                for perfil in perfiles:
                    perfil.asignado = True
                    db_detalle = DetalleVenta(
                        venta_id=db_venta.id,
                        combo_id=item.combo_id,
                        cuenta_madre_id=perfil.cuenta_madre_id,
                        perfil_id=perfil.id,
                        precio_aplicado=precio_unitario
                    )
                    detalles.append(db_detalle)
            else:
                stmt = select(Perfil).join(CuentaMadre)
                if getattr(item, "cuenta_madre_id", None) is not None:
                    stmt = stmt.where(
                        Perfil.cuenta_madre_id == item.cuenta_madre_id,
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
                stmt = stmt.with_for_update(skip_locked=True).limit(1)
                result = await db.execute(stmt)
                perfil = result.scalar_one_or_none()

                if not perfil:
                    raise BusinessRuleError(f"No hay perfiles disponibles para la plataforma {plat_name}")

                perfil.asignado = True
                
                db_detalle = DetalleVenta(
                    venta_id=db_venta.id,
                    combo_id=item.combo_id,
                    cuenta_madre_id=perfil.cuenta_madre_id,
                    perfil_id=perfil.id,
                    precio_aplicado=item.precio_aplicado
                )
                detalles.append(db_detalle)

        db.add_all(detalles)
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
        selectinload(CuentaMadre.credencial)
    )
    res_cm = await db.execute(stmt_cm)
    cm = res_cm.scalar_one_or_none()
    
    perfil = await get_or_404(db, Perfil, db_detalle.perfil_id)
    
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
    profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
    pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"

    msg = mensaje_base.replace('[Nombre Cliente]', venta.cliente.nombre) \
                      .replace('{plataforma}', plataforma) \
                      .replace('{usuario}', usuario) \
                      .replace('{password}', password) \
                      .replace('{perfil}', profile_name) \
                      .replace('{pin}', pin_val) \
                      .replace('{monto}', f"{db_detalle.precio_aplicado:,.2f}" if isinstance(db_detalle.precio_aplicado, Decimal) else str(db_detalle.precio_aplicado)) \
                      .replace('{fecha_corte}', venta.fecha_corte.strftime("%Y-%m-%d"))

    phone = venta.cliente.telefono.replace('+', '').replace(' ', '')
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
            
    msg = f"Hola *{venta.cliente.nombre}*, aquí tienes los accesos para tus suscripciones de streaming:\n\n"
    item_idx = 1
    
    for cm_id, list_detalles in detalles_por_cuenta.items():
        stmt_cm = select(CuentaMadre).where(CuentaMadre.id == cm_id).options(
            selectinload(CuentaMadre.plataforma),
            selectinload(CuentaMadre.credencial)
        )
        res_cm = await db.execute(stmt_cm)
        cm = res_cm.scalar_one_or_none()
        
        plat_name = cm.plataforma.nombre if (cm and cm.plataforma) else f"Plataforma #{cm_id}"
        email = cm.credencial.email if (cm and cm.credencial) else "N/A"
        password = cm.credencial.password if (cm and cm.credencial) else "N/A"
        
        # Verificar si es cuenta completa (los perfiles vendidos en esta orden coinciden con los max_perfiles de la cuenta madre)
        es_cuenta_completa = cm and (len(list_detalles) == cm.max_perfiles)
        
        if es_cuenta_completa:
            # Reportar como cuenta completa simplificada
            msg += f"*{item_idx}. {plat_name}*\n"
            msg += f"   • Correo: `{email}`\n"
            msg += f"   • Clave: `{password}`\n\n"
            item_idx += 1
        else:
            # Reportar perfiles individuales
            for detail in list_detalles:
                stmt_p = select(Perfil).where(Perfil.id == detail.perfil_id)
                res_p = await db.execute(stmt_p)
                perfil = res_p.scalar_one_or_none()
                
                profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
                pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"
                
                msg += f"*{item_idx}. {plat_name}*\n"
                msg += f"   • Correo: `{email}`\n"
                msg += f"   • Clave: `{password}`\n"
                msg += f"   • Perfil (Usuario): *{profile_name}*\n"
                msg += f"   • PIN: *{pin_val}*\n\n"
                item_idx += 1
        
    msg += f"Fecha de Vencimiento: *{venta.fecha_corte.strftime('%Y-%m-%d')}*\n\n"
    msg += "¡Gracias por tu confianza y preferencia! 🚀"
    
    phone = venta.cliente.telefono.replace('+', '').replace(' ', '')
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
