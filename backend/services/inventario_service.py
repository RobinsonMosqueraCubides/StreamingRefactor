from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from db.models import Credencial, CuentaMadre, Perfil, Transaccion, EstadoCuenta, TipoTransaccion
from db.database import get_or_404
from schemas.inventario_schemas import (
    CredencialCreate, CredencialUpdate,
    CuentaMadreCreate, CuentaMadreUpdate,
    PerfilUpdate
)
from core.exceptions import BusinessRuleError

# --- Credenciales Services ---

async def get_credenciales(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Credencial).offset(skip).limit(limit))
    return result.scalars().all()

async def get_credencial(db: AsyncSession, credencial_id: int):
    return await get_or_404(db, Credencial, credencial_id)

async def create_credencial(db: AsyncSession, credencial: CredencialCreate):
    # Validar si ya existe exactamente la misma credencial (mismo correo y misma contraseña)
    existing_res = await db.execute(select(Credencial).where(Credencial.email == credencial.email))
    existing_list = existing_res.scalars().all()
    for ext_cred in existing_list:
        if ext_cred.password == credencial.password:
            return ext_cred
            
    try:
        db_cred = Credencial(email=credencial.email, password=credencial.password)
        db.add(db_cred)
        await db.commit()
        await db.refresh(db_cred)
        return db_cred
    except Exception as e:
        await db.rollback()
        raise e

async def update_credencial(db: AsyncSession, credencial_id: int, credencial: CredencialUpdate):
    db_cred = await get_credencial(db, credencial_id)
    if db_cred.email != credencial.email:
        existing = await db.execute(select(Credencial).where(Credencial.email == credencial.email))
        if existing.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otra credencial registrada con este correo electrónico")
    try:
        db_cred.email = credencial.email
        db_cred.password = credencial.password
        await db.commit()
        await db.refresh(db_cred)
        return db_cred
    except Exception as e:
        await db.rollback()
        raise e

async def delete_credencial(db: AsyncSession, credencial_id: int):
    db_cred = await get_credencial(db, credencial_id)
    try:
        await db.delete(db_cred)
        await db.commit()
        return db_cred
    except Exception as e:
        await db.rollback()
        raise e


# --- Cuentas Madre Services ---

async def _populate_clave_plataforma(db: AsyncSession, cuenta: CuentaMadre):
    if cuenta.proveedor and cuenta.proveedor.nombre == "Correos A" and cuenta.credencial:
        from db.models import CorreoPropio, ClavePlataformaCorreoPropio
        stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == cuenta.credencial.email)
        res_cp = await db.execute(stmt_cp)
        correo_propio = res_cp.scalar_one_or_none()
        if correo_propio:
            stmt_cpcp = select(ClavePlataformaCorreoPropio).where(
                ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                ClavePlataformaCorreoPropio.plataforma_id == cuenta.plataforma_id
            )
            res_cpcp = await db.execute(stmt_cpcp)
            cpcp = res_cpcp.scalar_one_or_none()
            if cpcp:
                cuenta.clave_plataforma = cpcp.clave
                return
    cuenta.clave_plataforma = None

async def get_cuentas_madre(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(CuentaMadre)
        .options(
            selectinload(CuentaMadre.perfiles),
            selectinload(CuentaMadre.proveedor),
            selectinload(CuentaMadre.credencial)
        )
        .offset(skip)
        .limit(limit)
    )
    cuentas = result.scalars().all()
    for c in cuentas:
        await _populate_clave_plataforma(db, c)
    return cuentas

async def get_cuenta_madre(db: AsyncSession, cuenta_id: int):
    cuenta = await get_or_404(
        db,
        CuentaMadre,
        cuenta_id,
        options=[
            selectinload(CuentaMadre.perfiles),
            selectinload(CuentaMadre.proveedor),
            selectinload(CuentaMadre.credencial)
        ]
    )
    await _populate_clave_plataforma(db, cuenta)
    return cuenta


async def create_cuenta_madre(db: AsyncSession, cuenta: CuentaMadreCreate):
    try:
        from db.models import Proveedor, Credencial, CorreoPropio, ClavePlataformaCorreoPropio
        db_prov = await db.get(Proveedor, cuenta.proveedor_id)
        if db_prov and db_prov.nombre == "Correos A":
            if not cuenta.clave_plataforma:
                raise BusinessRuleError("La clave de plataforma es obligatoria para el proveedor Correos A")

        # 1. Crear Cuenta Madre
        db_cuenta = CuentaMadre(
            proveedor_id=cuenta.proveedor_id,
            credencial_id=cuenta.credencial_id,
            plataforma_id=cuenta.plataforma_id,
            max_perfiles=cuenta.max_perfiles,
            precio_compra=cuenta.precio_compra,
            fecha_compra=cuenta.fecha_compra,
            fecha_vencimiento=cuenta.fecha_vencimiento,
            estado=cuenta.estado
        )
        db.add(db_cuenta)
        
        # Hacemos flush para obtener el ID asignado por la base de datos
        await db.flush()

        # Guardar clave plataforma si proveedor es Correos A
        if db_prov and db_prov.nombre == "Correos A":
            db_cred = await db.get(Credencial, cuenta.credencial_id)
            if db_cred:
                stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == db_cred.email)
                res_cp = await db.execute(stmt_cp)
                correo_propio = res_cp.scalar_one_or_none()
                if correo_propio:
                    stmt_cpcp = select(ClavePlataformaCorreoPropio).where(
                        ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                        ClavePlataformaCorreoPropio.plataforma_id == cuenta.plataforma_id
                    )
                    res_cpcp = await db.execute(stmt_cpcp)
                    cpcp = res_cpcp.scalar_one_or_none()
                    if cpcp:
                        cpcp.clave = cuenta.clave_plataforma
                    else:
                        cpcp = ClavePlataformaCorreoPropio(
                            correo_propio_id=correo_propio.id,
                            plataforma_id=cuenta.plataforma_id,
                            clave=cuenta.clave_plataforma
                        )
                        db.add(cpcp)

        # 2. Generar Perfiles Fragmentados en Bloque (Bulk Insert)
        perfiles = []
        for i in range(1, cuenta.max_perfiles + 1):
            perfiles.append(
                Perfil(
                    cuenta_madre_id=db_cuenta.id,
                    nombre_perfil=f"Perfil {i}",
                    pin=None,
                    asignado=False
                )
            )
        db.add_all(perfiles)

        # 3. Disparar registro de egreso contable en transacciones (UC-01)
        db_transaccion = Transaccion(
            tipo=TipoTransaccion.EGRESO,
            categoria="COMPRA_CUENTA",
            monto=cuenta.precio_compra,
            entidad=cuenta.entidad_pago,
            referencia_id=db_cuenta.id
        )
        db.add(db_transaccion)

        await db.commit()
        return await get_cuenta_madre(db, db_cuenta.id)
    except Exception as e:
        await db.rollback()
        raise e

async def update_cuenta_madre(db: AsyncSession, cuenta_id: int, cuenta: CuentaMadreUpdate):
    db_cuenta = await get_cuenta_madre(db, cuenta_id)
    
    try:
        from db.models import Proveedor, Credencial, CorreoPropio, ClavePlataformaCorreoPropio, DetalleVenta, Venta
        from sqlalchemy import func, delete
        from decimal import Decimal

        db_prov = await db.get(Proveedor, cuenta.proveedor_id)
        if db_prov and db_prov.nombre == "Correos A":
            if not cuenta.clave_plataforma:
                raise BusinessRuleError("La clave de plataforma es obligatoria para el proveedor Correos A")

            db_cred = await db.get(Credencial, cuenta.credencial_id)
            if db_cred:
                stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == db_cred.email)
                res_cp = await db.execute(stmt_cp)
                correo_propio = res_cp.scalar_one_or_none()
                if correo_propio:
                    stmt_cpcp = select(ClavePlataformaCorreoPropio).where(
                        ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                        ClavePlataformaCorreoPropio.plataforma_id == cuenta.plataforma_id
                    )
                    res_cpcp = await db.execute(stmt_cpcp)
                    cpcp = res_cpcp.scalar_one_or_none()
                    if cpcp:
                        cpcp.clave = cuenta.clave_plataforma
                    else:
                        cpcp = ClavePlataformaCorreoPropio(
                            correo_propio_id=correo_propio.id,
                            plataforma_id=cuenta.plataforma_id,
                            clave=cuenta.clave_plataforma
                        )
                        db.add(cpcp)

        # 1. Update the db_cuenta properties early so any subsequent queries see these new values
        db_cuenta.proveedor_id = cuenta.proveedor_id
        db_cuenta.credencial_id = cuenta.credencial_id
        db_cuenta.plataforma_id = cuenta.plataforma_id
        db_cuenta.max_perfiles = cuenta.max_perfiles
        db_cuenta.precio_compra = cuenta.precio_compra
        db_cuenta.fecha_compra = cuenta.fecha_compra
        db_cuenta.fecha_vencimiento = cuenta.fecha_vencimiento
        db_cuenta.estado = cuenta.estado
        await db.flush()

        # 2. Get existing profiles of the account from the relationship
        existing_perfiles = db_cuenta.perfiles
        old_count = len(existing_perfiles)
        new_count = cuenta.max_perfiles
        diff = new_count - old_count

        whole_account_sale_id = None
        if old_count > 0:
            # Check if all existing profiles were sold in a single sale (whole-account sale)
            existing_profile_ids = [p.id for p in existing_perfiles]
            stmt_v = (
                select(DetalleVenta.venta_id)
                .join(Venta, DetalleVenta.venta_id == Venta.id)
                .where(
                    DetalleVenta.perfil_id.in_(existing_profile_ids),
                    Venta.tipo_venta == "CUENTA"
                )
                .group_by(DetalleVenta.venta_id)
                .having(func.count(DetalleVenta.id) == old_count)
            )
            res_v = await db.execute(stmt_v)
            row_v = res_v.first()
            if row_v:
                whole_account_sale_id = row_v[0]

        if diff > 0:
            # Increase profiles
            for i in range(old_count + 1, new_count + 1):
                new_perfil = Perfil(
                    cuenta_madre=db_cuenta,  # link in memory!
                    nombre_perfil=f"Perfil {i}",
                    pin=None,
                    asignado=True if whole_account_sale_id else False
                )
                db.add(new_perfil)
                await db.flush()

                if whole_account_sale_id:
                    new_detail = DetalleVenta(
                        venta_id=whole_account_sale_id,
                        combo_id=None,
                        cuenta_madre_id=cuenta_id,
                        perfil_id=new_perfil.id,
                        precio_aplicado=Decimal(0)
                    )
                    db.add(new_detail)

            await db.flush()

            if whole_account_sale_id:
                # Redistribute price for the whole account sale
                stmt_details = select(DetalleVenta).where(
                    DetalleVenta.venta_id == whole_account_sale_id,
                    DetalleVenta.cuenta_madre_id == cuenta_id
                )
                res_details = await db.execute(stmt_details)
                all_details = res_details.scalars().all()
                total_cuenta_precio = sum(d.precio_aplicado for d in all_details)

                if all_details:
                    new_unit_price = total_cuenta_precio / Decimal(len(all_details))
                    for d in all_details:
                        d.precio_aplicado = new_unit_price

                # Recalculate sale type
                stmt_sale = select(Venta).where(Venta.id == whole_account_sale_id)
                res_sale = await db.execute(stmt_sale)
                sale = res_sale.scalar_one_or_none()
                if sale:
                    stmt_all_sale_details = select(DetalleVenta).where(DetalleVenta.venta_id == whole_account_sale_id)
                    res_all_sale_details = await db.execute(stmt_all_sale_details)
                    from services.ventas_service import _calcular_tipo_venta
                    sale.tipo_venta = await _calcular_tipo_venta(db, res_all_sale_details.scalars().all())

        elif diff < 0:
            # Decrease profiles
            num_to_delete = abs(diff)
            if whole_account_sale_id:
                sorted_perfiles = sorted(existing_perfiles, key=lambda p: p.id)
                perfiles_to_delete = sorted_perfiles[-num_to_delete:]
                delete_profile_ids = [p.id for p in perfiles_to_delete]

                # Get original total price of the account in this sale
                stmt_details = select(DetalleVenta).where(
                    DetalleVenta.venta_id == whole_account_sale_id,
                    DetalleVenta.cuenta_madre_id == cuenta_id
                )
                res_details = await db.execute(stmt_details)
                all_details = res_details.scalars().all()
                total_cuenta_precio = sum(d.precio_aplicado for d in all_details)

                # Delete DetalleVenta records
                stmt_del_det = delete(DetalleVenta).where(
                    DetalleVenta.venta_id == whole_account_sale_id,
                    DetalleVenta.perfil_id.in_(delete_profile_ids)
                )
                await db.execute(stmt_del_det)

                # Delete profiles from relation and DB
                for p in perfiles_to_delete:
                    db_cuenta.perfiles.remove(p)
                    await db.delete(p)

                # Redistribute price among remaining details
                stmt_remaining_details = select(DetalleVenta).where(
                    DetalleVenta.venta_id == whole_account_sale_id,
                    DetalleVenta.cuenta_madre_id == cuenta_id,
                    ~DetalleVenta.perfil_id.in_(delete_profile_ids)
                )
                res_rem = await db.execute(stmt_remaining_details)
                remaining_details = res_rem.scalars().all()

                if remaining_details:
                    new_unit_price = total_cuenta_precio / Decimal(len(remaining_details))
                    for d in remaining_details:
                        d.precio_aplicado = new_unit_price

                # Recalculate sale type
                stmt_sale = select(Venta).where(Venta.id == whole_account_sale_id)
                res_sale = await db.execute(stmt_sale)
                sale = res_sale.scalar_one_or_none()
                if sale:
                    stmt_all_sale_details = select(DetalleVenta).where(DetalleVenta.venta_id == whole_account_sale_id)
                    res_all_sale_details = await db.execute(stmt_all_sale_details)
                    from services.ventas_service import _calcular_tipo_venta
                    sale.tipo_venta = await _calcular_tipo_venta(db, res_all_sale_details.scalars().all())
            else:
                # Not a whole-account sale, check if we have enough unassigned profiles to delete
                unassigned_perfiles = [p for p in existing_perfiles if not p.asignado]
                if len(unassigned_perfiles) < num_to_delete:
                    raise BusinessRuleError("No se pueden reducir los perfiles porque algunos ya están asignados o vendidos de forma individual.")

                unassigned_sorted = sorted(unassigned_perfiles, key=lambda p: p.id, reverse=True)
                perfiles_to_delete = unassigned_sorted[:num_to_delete]
                for p in perfiles_to_delete:
                    db_cuenta.perfiles.remove(p)
                    await db.delete(p)

        await db.commit()
        return await get_cuenta_madre(db, db_cuenta.id)

    except Exception as e:
        await db.rollback()
        raise e

async def delete_cuenta_madre(db: AsyncSession, cuenta_id: int):
    db_cuenta = await get_cuenta_madre(db, cuenta_id)
    try:
        await db.delete(db_cuenta)
        await db.commit()
        return db_cuenta
    except Exception as e:
        await db.rollback()
        raise e

async def renovar_cuenta_madre(db: AsyncSession, cuenta_id: int, nueva_fecha_vencimiento):
    from db.models import EntidadFinanciera
    db_cuenta = await get_cuenta_madre(db, cuenta_id)
    try:
        db_cuenta.fecha_vencimiento = nueva_fecha_vencimiento
        db_cuenta.estado = EstadoCuenta.ACTIVA
        
        # Registrar egreso contable automático por la renovación
        db_transaccion = Transaccion(
            tipo=TipoTransaccion.EGRESO,
            categoria="COMPRA_CUENTA",
            monto=db_cuenta.precio_compra,
            entidad=EntidadFinanciera.BANCOLOMBIA, # Entidad de egreso predeterminada para renovaciones
            referencia_id=db_cuenta.id
        )
        db.add(db_transaccion)
        
        await db.commit()
        await db.refresh(db_cuenta)
        return db_cuenta
    except Exception as e:
        await db.rollback()
        raise e


async def cancelar_cuenta_madre(db: AsyncSession, cuenta_id: int, data: "CuentaMadreCancelar"):
    from db.models import DetalleVenta, Venta, CuentaMadreCancelada, Transaccion, TipoTransaccion, CorreoPropio, ClavePlataformaCorreoPropio, EntidadFinanciera
    from core.exceptions import NotFoundError
    from decimal import Decimal

    stmt = select(CuentaMadre).where(CuentaMadre.id == cuenta_id).options(
        selectinload(CuentaMadre.plataforma),
        selectinload(CuentaMadre.credencial),
        selectinload(CuentaMadre.proveedor),
        selectinload(CuentaMadre.perfiles)
    )
    res = await db.execute(stmt)
    db_cuenta = res.scalar_one_or_none()
    if not db_cuenta:
        raise NotFoundError(f"CuentaMadre con id {cuenta_id} no encontrada")

    if db_cuenta.estado == EstadoCuenta.CANCELADA:
        raise BusinessRuleError("La cuenta madre ya está cancelada.")

    plataforma_nombre = db_cuenta.plataforma.nombre if db_cuenta.plataforma else "N/A"
    correo = db_cuenta.credencial.email if db_cuenta.credencial else "N/A"
    clave = db_cuenta.credencial.password if db_cuenta.credencial else "N/A"
    proveedor_nombre = db_cuenta.proveedor.nombre if db_cuenta.proveedor else "N/A"

    if db_cuenta.proveedor and db_cuenta.proveedor.nombre == "Correos A" and db_cuenta.credencial:
        stmt_cp = select(CorreoPropio).where(CorreoPropio.correo_gmail == db_cuenta.credencial.email)
        res_cp = await db.execute(stmt_cp)
        correo_propio = res_cp.scalar_one_or_none()
        if correo_propio:
            res_cpcp = await db.execute(select(ClavePlataformaCorreoPropio).where(
                ClavePlataformaCorreoPropio.correo_propio_id == correo_propio.id,
                ClavePlataformaCorreoPropio.plataforma_id == db_cuenta.plataforma_id
            ))
            cpcp = res_cpcp.scalar_one_or_none()
            if cpcp:
                clave = cpcp.clave

    devolucion_caja = Decimal("0.0")
    devolucion_proveedor = Decimal("0.0")

    try:
        if data.devolucion_tipo == "CAJA":
            devolucion_caja = data.monto_devolucion
            db_trans = Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="REEMBOLSO_CUENTA",
                monto=data.monto_devolucion,
                entidad=data.entidad_pago or EntidadFinanciera.EFECTIVO,
                referencia_id=db_cuenta.id
            )
            db.add(db_trans)

        elif data.devolucion_tipo == "SALDO_PROVEEDOR":
            devolucion_proveedor = data.monto_devolucion
            if db_cuenta.proveedor:
                db_cuenta.proveedor.saldo_a_favor = (db_cuenta.proveedor.saldo_a_favor or Decimal("0.0")) + data.monto_devolucion

        archive = CuentaMadreCancelada(
            cuenta_madre_id=db_cuenta.id,
            plataforma_nombre=plataforma_nombre,
            correo=correo,
            clave=clave,
            max_perfiles=db_cuenta.max_perfiles,
            proveedor_nombre=proveedor_nombre,
            precio_compra=db_cuenta.precio_compra,
            fecha_compra=db_cuenta.fecha_compra,
            fecha_vencimiento=db_cuenta.fecha_vencimiento,
            motivo_cancelacion=data.motivo_cancelacion,
            devolucion_caja=devolucion_caja,
            devolucion_proveedor=devolucion_proveedor
        )
        db.add(archive)

        db_cuenta.estado = EstadoCuenta.CANCELADA
        for p in db_cuenta.perfiles:
            p.asignado = False

        await db.commit()
        await db.refresh(db_cuenta)
        return db_cuenta
    except Exception as e:
        await db.rollback()
        raise e

async def get_cuentas_canceladas(db: AsyncSession):
    from db.models import CuentaMadreCancelada
    result = await db.execute(select(CuentaMadreCancelada).order_by(CuentaMadreCancelada.fecha_cancelacion.desc()))
    return result.scalars().all()


# --- Perfil Services ---

async def get_perfiles(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Perfil).offset(skip).limit(limit))
    return result.scalars().all()

async def get_perfil(db: AsyncSession, perfil_id: int):
    return await get_or_404(db, Perfil, perfil_id)

async def update_perfil(db: AsyncSession, perfil_id: int, perfil: PerfilUpdate):
    db_perfil = await get_perfil(db, perfil_id)
    
    try:
        if perfil.nombre_perfil is not None:
            db_perfil.nombre_perfil = perfil.nombre_perfil
        if perfil.pin is not None:
            db_perfil.pin = perfil.pin
        if perfil.asignado is not None:
            db_perfil.asignado = perfil.asignado
            
        await db.commit()
        await db.refresh(db_perfil)
        return db_perfil
    except IntegrityError as e:
        await db.rollback()
        if "UNIQUE constraint failed" in str(e):
            raise BusinessRuleError("Ya existe un perfil con este nombre en esta cuenta madre.")
        raise e
    except Exception as e:
        await db.rollback()
        raise e


async def get_correos_propios(db: AsyncSession, skip: int = 0, limit: int = 100):
    from db.models import CorreoPropio
    result = await db.execute(select(CorreoPropio).offset(skip).limit(limit))
    return result.scalars().all()


async def get_correo_propio(db: AsyncSession, id: int):
    from db.models import CorreoPropio
    return await get_or_404(db, CorreoPropio, id)


async def create_correo_propio(db: AsyncSession, obj):
    from db.models import CorreoPropio
    existing = await db.execute(select(CorreoPropio).where(CorreoPropio.correo_gmail == obj.correo_gmail))
    if existing.scalar_one_or_none():
        raise BusinessRuleError("Ya existe este correo en la lista de correos propios")
        
    try:
        db_obj = CorreoPropio(
            correo_gmail=obj.correo_gmail,
            password_gmail=obj.password_gmail,
            correo_verificacion=obj.correo_verificacion,
            numero_asociado=obj.numero_asociado,
            ultimo_ingreso=obj.ultimo_ingreso,
            pide_validacion=obj.pide_validacion,
            nota=obj.nota,
            notas_pago_netflix=obj.notas_pago_netflix,
            nombre_correo=obj.nombre_correo,
            fecha_nacimiento=obj.fecha_nacimiento,
            sexo=obj.sexo
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e


async def update_correo_propio(db: AsyncSession, id: int, obj):
    from db.models import CorreoPropio, Credencial
    db_obj = await get_correo_propio(db, id)
    old_email = db_obj.correo_gmail
    
    if db_obj.correo_gmail != obj.correo_gmail:
        existing = await db.execute(select(CorreoPropio).where(CorreoPropio.correo_gmail == obj.correo_gmail))
        if existing.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otro registro con este correo de Gmail")
            
    try:
        db_obj.correo_gmail = obj.correo_gmail
        db_obj.password_gmail = obj.password_gmail
        db_obj.correo_verificacion = obj.correo_verificacion
        db_obj.numero_asociado = obj.numero_asociado
        db_obj.ultimo_ingreso = obj.ultimo_ingreso
        db_obj.pide_validacion = obj.pide_validacion
        db_obj.nota = obj.nota
        db_obj.notas_pago_netflix = obj.notas_pago_netflix
        db_obj.nombre_correo = obj.nombre_correo
        db_obj.fecha_nacimiento = obj.fecha_nacimiento
        db_obj.sexo = obj.sexo
        
        stmt_cred = select(Credencial).where(Credencial.email == old_email)
        res_cred = await db.execute(stmt_cred)
        db_cred = res_cred.scalar_one_or_none()
        if db_cred:
            db_cred.email = obj.correo_gmail
            db_cred.password = obj.password_gmail
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e


async def delete_correo_propio(db: AsyncSession, id: int):
    db_obj = await get_correo_propio(db, id)
    try:
        await db.delete(db_obj)
        await db.commit()
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e

