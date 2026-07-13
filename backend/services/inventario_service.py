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
    return result.scalars().all()

async def get_cuenta_madre(db: AsyncSession, cuenta_id: int):
    return await get_or_404(
        db,
        CuentaMadre,
        cuenta_id,
        options=[
            selectinload(CuentaMadre.perfiles),
            selectinload(CuentaMadre.proveedor),
            selectinload(CuentaMadre.credencial)
        ]
    )

async def create_cuenta_madre(db: AsyncSession, cuenta: CuentaMadreCreate):
    try:
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
        db_cuenta.proveedor_id = cuenta.proveedor_id
        db_cuenta.credencial_id = cuenta.credencial_id
        db_cuenta.plataforma_id = cuenta.plataforma_id
        db_cuenta.max_perfiles = cuenta.max_perfiles
        db_cuenta.precio_compra = cuenta.precio_compra
        db_cuenta.fecha_compra = cuenta.fecha_compra
        db_cuenta.fecha_vencimiento = cuenta.fecha_vencimiento
        db_cuenta.estado = cuenta.estado
        
        await db.commit()
        await db.refresh(db_cuenta)
        return db_cuenta
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

