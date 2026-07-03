from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.models import Credencial, CuentaMadre, Perfil, Transaccion, EstadoCuenta
from schemas.inventario_schemas import (
    CredencialCreate, CredencialUpdate,
    CuentaMadreCreate, CuentaMadreUpdate,
    PerfilUpdate
)
from fastapi import HTTPException, status

# --- Credenciales Services ---

async def get_credenciales(db: AsyncSession):
    result = await db.execute(select(Credencial))
    return result.scalars().all()

async def get_credencial(db: AsyncSession, credencial_id: int):
    result = await db.execute(select(Credencial).where(Credencial.id == credencial_id))
    db_cred = result.scalar_one_or_none()
    if not db_cred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Credencial con id {credencial_id} no encontrada"
        )
    return db_cred

async def create_credencial(db: AsyncSession, credencial: CredencialCreate):
    # Validar email único
    existing = await db.execute(select(Credencial).where(Credencial.email == credencial.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una credencial registrada con este correo electrónico"
        )
    db_cred = Credencial(email=credencial.email, password=credencial.password)
    db.add(db_cred)
    await db.commit()
    await db.refresh(db_cred)
    return db_cred

async def update_credencial(db: AsyncSession, credencial_id: int, credencial: CredencialUpdate):
    db_cred = await get_credencial(db, credencial_id)
    if db_cred.email != credencial.email:
        existing = await db.execute(select(Credencial).where(Credencial.email == credencial.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra credencial registrada con este correo electrónico"
            )
    db_cred.email = credencial.email
    db_cred.password = credencial.password
    await db.commit()
    await db.refresh(db_cred)
    return db_cred

async def delete_credencial(db: AsyncSession, credencial_id: int):
    db_cred = await get_credencial(db, credencial_id)
    await db.delete(db_cred)
    await db.commit()
    return db_cred


# --- Cuentas Madre Services ---

async def get_cuentas_madre(db: AsyncSession):
    result = await db.execute(
        select(CuentaMadre).options(selectinload(CuentaMadre.perfiles))
    )
    return result.scalars().all()

async def get_cuenta_madre(db: AsyncSession, cuenta_id: int):
    result = await db.execute(
        select(CuentaMadre)
        .options(selectinload(CuentaMadre.perfiles))
        .where(CuentaMadre.id == cuenta_id)
    )
    db_cuenta = result.scalar_one_or_none()
    if not db_cuenta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta Madre con id {cuenta_id} no encontrada"
        )
    return db_cuenta

async def create_cuenta_madre(db: AsyncSession, cuenta: CuentaMadreCreate):
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
        tipo="EGRESO",
        categoria="COMPRA_CUENTA",
        monto=cuenta.precio_compra,
        entidad=cuenta.entidad_pago,
        referencia_id=db_cuenta.id
    )
    db.add(db_transaccion)

    await db.commit()
    return await get_cuenta_madre(db, db_cuenta.id)

async def update_cuenta_madre(db: AsyncSession, cuenta_id: int, cuenta: CuentaMadreUpdate):
    db_cuenta = await get_cuenta_madre(db, cuenta_id)
    
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

async def delete_cuenta_madre(db: AsyncSession, cuenta_id: int):
    db_cuenta = await get_cuenta_madre(db, cuenta_id)
    await db.delete(db_cuenta)
    await db.commit()
    return db_cuenta


# --- Perfil Services ---

async def get_perfiles(db: AsyncSession):
    result = await db.execute(select(Perfil))
    return result.scalars().all()

async def get_perfil(db: AsyncSession, perfil_id: int):
    result = await db.execute(select(Perfil).where(Perfil.id == perfil_id))
    db_perfil = result.scalar_one_or_none()
    if not db_perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil con id {perfil_id} no encontrado"
        )
    return db_perfil

async def update_perfil(db: AsyncSession, perfil_id: int, perfil: PerfilUpdate):
    db_perfil = await get_perfil(db, perfil_id)
    
    if perfil.nombre_perfil is not None:
        db_perfil.nombre_perfil = perfil.nombre_perfil
    if perfil.pin is not None:
        db_perfil.pin = perfil.pin
    if perfil.asignado is not None:
        db_perfil.asignado = perfil.asignado
        
    await db.commit()
    await db.refresh(db_perfil)
    return db_perfil
