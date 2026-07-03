from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.models import Venta, DetalleVenta, Perfil, CuentaMadre, Plataforma, EstadoCuenta, EstadoPago, PlantillaMensaje
from schemas.ventas_schemas import VentaCreate
from fastapi import HTTPException, status
from decimal import Decimal
import urllib.parse

async def get_ventas(db: AsyncSession):
    result = await db.execute(
        select(Venta).options(selectinload(Venta.detalles))
    )
    return result.scalars().all()

async def get_venta(db: AsyncSession, venta_id: int):
    result = await db.execute(
        select(Venta)
        .options(selectinload(Venta.detalles))
        .where(Venta.id == venta_id)
    )
    db_venta = result.scalar_one_or_none()
    if not db_venta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Venta con id {venta_id} no encontrada"
        )
    return db_venta

async def create_venta(db: AsyncSession, venta: VentaCreate):
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
            # Buscar una cuenta madre que tenga todos sus perfiles disponibles (ninguno asignado ni reportado)
            # O directamente la seleccionada por el usuario
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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No hay cuentas completas disponibles para la plataforma {plat_name}"
                )

            # Obtener y bloquear todos los perfiles asociados a la cuenta madre seleccionada
            stmt_p = (
                select(Perfil)
                .where(Perfil.cuenta_madre_id == db_cm.id)
                .with_for_update(skip_locked=True)
            )
            res_p = await db.execute(stmt_p)
            perfiles = res_p.scalars().all()

            if not perfiles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La cuenta completa seleccionada no tiene perfiles configurados."
                )

            # Dividir el precio entre el número de perfiles para el registro individual de cada detalle
            precio_unitario = item.precio_aplicado / len(perfiles)

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
            # Asignación estándar de una sola pantalla (PANTALLA)
            # SELECT FOR UPDATE SKIP LOCKED
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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No hay perfiles disponibles para la plataforma {plat_name}"
                )

            # Asignar el perfil
            perfil.asignado = True
            
            # Crear detalle de la venta
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

    # Retornar la venta con los detalles precargados
    return await get_venta(db, db_venta.id)


async def renovar_venta(db: AsyncSession, venta_id: int, nueva_fecha_corte):
    db_venta = await get_venta(db, venta_id)
    db_venta.fecha_corte = nueva_fecha_corte
    await db.commit()
    await db.refresh(db_venta)
    return db_venta


async def generate_whatsapp_link(db: AsyncSession, venta_id: int, detail_id: int, template_type: str) -> str:
    stmt_v = select(Venta).where(Venta.id == venta_id).options(selectinload(Venta.cliente))
    res_v = await db.execute(stmt_v)
    venta = res_v.scalar_one_or_none()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    
    stmt_d = select(DetalleVenta).where(DetalleVenta.id == detail_id)
    res_d = await db.execute(stmt_d)
    detail = res_d.scalar_one_or_none()
    if not detail:
        raise HTTPException(status_code=404, detail="Detalle no encontrado")
        
    stmt_cm = select(CuentaMadre).where(CuentaMadre.id == detail.cuenta_madre_id).options(
        selectinload(CuentaMadre.plataforma),
        selectinload(CuentaMadre.credencial)
    )
    res_cm = await db.execute(stmt_cm)
    cm = res_cm.scalar_one_or_none()
    
    stmt_p = select(Perfil).where(Perfil.id == detail.perfil_id)
    res_p = await db.execute(stmt_p)
    perfil = res_p.scalar_one_or_none()
    
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
            mensaje_base = "Hola [Nombre Cliente], aquí están tus accesos de {plataforma}:\nUsuario: {email}\nContraseña: {password}\nUsuario Perfil: {usuario}\nPIN: {pin}"

    plat_name = cm.plataforma.nombre if (cm and cm.plataforma) else f"Plataforma #{detail.cuenta_madre_id}"
    email = cm.credencial.email if (cm and cm.credencial) else "N/A"
    password = cm.credencial.password if (cm and cm.credencial) else "N/A"
    profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
    pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"
    
    msg = mensaje_base.replace('[Nombre Cliente]', venta.cliente.nombre) \
                      .replace('{plataforma}', plat_name) \
                      .replace('{email}', email) \
                      .replace('{password}', password) \
                      .replace('{usuario}', profile_name) \
                      .replace('{pin}', pin_val) \
                      .replace('{monto}', f"{detail.precio_aplicado:,.2f}" if isinstance(detail.precio_aplicado, Decimal) else str(detail.precio_aplicado)) \
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
        raise HTTPException(status_code=404, detail="Venta no encontrada")
        
    msg = f"Hola *{venta.cliente.nombre}*, aquí tienes los accesos para tus suscripciones de streaming:\n\n"
    
    for idx, detail in enumerate(venta.detalles):
        stmt_cm = select(CuentaMadre).where(CuentaMadre.id == detail.cuenta_madre_id).options(
            selectinload(CuentaMadre.plataforma),
            selectinload(CuentaMadre.credencial)
        )
        res_cm = await db.execute(stmt_cm)
        cm = res_cm.scalar_one_or_none()
        
        stmt_p = select(Perfil).where(Perfil.id == detail.perfil_id)
        res_p = await db.execute(stmt_p)
        perfil = res_p.scalar_one_or_none()
        
        plat_name = cm.plataforma.nombre if (cm and cm.plataforma) else f"Plataforma #{detail.cuenta_madre_id}"
        email = cm.credencial.email if (cm and cm.credencial) else "N/A"
        password = cm.credencial.password if (cm and cm.credencial) else "N/A"
        profile_name = perfil.nombre_perfil if perfil else venta.cliente.nombre
        pin_val = perfil.pin if (perfil and perfil.pin) else "N/A"
        
        msg += f"*{idx + 1}. {plat_name}*\n"
        msg += f"   • Correo: `{email}`\n"
        msg += f"   • Clave: `{password}`\n"
        msg += f"   • Perfil (Usuario): *{profile_name}*\n"
        msg += f"   • PIN: *{pin_val}*\n\n"
        
    msg += f"Fecha de Vencimiento: *{venta.fecha_corte.strftime('%Y-%m-%d')}*\n\n"
    msg += "¡Gracias por tu confianza y preferencia! 🚀"
    
    phone = venta.cliente.telefono.replace('+', '').replace(' ', '')
    encoded_msg = urllib.parse.quote(msg)
    return f"https://wa.me/{phone}?text={encoded_msg}"

