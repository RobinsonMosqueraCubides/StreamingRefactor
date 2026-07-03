from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.models import Venta, DetalleVenta, Perfil, CuentaMadre, Plataforma, EstadoCuenta, EstadoPago
from schemas.ventas_schemas import VentaCreate
from fastapi import HTTPException, status

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
            # Buscar una cuenta madre que tenga todos sus perfiles disponibles (ninguno asignado)
            # Subquery de cuentas que tienen al menos un perfil asignado
            subq_assigned = select(Perfil.cuenta_madre_id).where(Perfil.asignado == True)
            
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
            stmt = (
                select(Perfil)
                .join(CuentaMadre)
                .where(
                    CuentaMadre.plataforma_id == item.plataforma_id,
                    CuentaMadre.estado == EstadoCuenta.ACTIVA,
                    Perfil.asignado == False
                )
                .with_for_update(skip_locked=True)
                .limit(1)
            )
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
