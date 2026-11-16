from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.models import Cliente, Proveedor, EnlaceProveedor, EstadoCliente
from db.database import get_or_404
from schemas.actor_schemas import (
    ClienteCreate, ClienteUpdate,
    ProveedorCreate, ProveedorUpdate
)
from core.exceptions import BusinessRuleError

# --- Cliente Services ---

async def get_clientes(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Cliente).offset(skip).limit(limit))
    return result.scalars().all()

async def get_cliente(db: AsyncSession, cliente_id: int):
    return await get_or_404(db, Cliente, cliente_id)

async def create_cliente(db: AsyncSession, cliente: ClienteCreate):
    # Validar teléfono y username únicos cuando están presentes
    if cliente.telefono:
        existing_tel = await db.execute(select(Cliente).where(Cliente.telefono == cliente.telefono))
        if existing_tel.scalar_one_or_none():
            raise BusinessRuleError("Ya existe un cliente registrado con este número de teléfono")

    if cliente.username:
        existing_user = await db.execute(select(Cliente).where(Cliente.username == cliente.username))
        if existing_user.scalar_one_or_none():
            raise BusinessRuleError("Ya existe un cliente registrado con este username de WhatsApp")
    
    try:
        db_cliente = Cliente(
            nombre=cliente.nombre,
            telefono=cliente.telefono,
            username=cliente.username,
            tipo=cliente.tipo,
            estado=cliente.estado,
            dias_gracia_max=cliente.dias_gracia_max
        )
        db.add(db_cliente)
        await db.commit()
        await db.refresh(db_cliente)
        return db_cliente
    except Exception as e:
        await db.rollback()
        raise e

async def update_cliente(db: AsyncSession, cliente_id: int, cliente: ClienteUpdate):
    db_cliente = await get_cliente(db, cliente_id)
    
    # Validar teléfono único si está cambiando
    if cliente.telefono and db_cliente.telefono != cliente.telefono:
        existing_tel = await db.execute(select(Cliente).where(Cliente.telefono == cliente.telefono))
        if existing_tel.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otro cliente registrado con este número de teléfono")

    # Validar username único si está cambiando
    if cliente.username and db_cliente.username != cliente.username:
        existing_user = await db.execute(select(Cliente).where(Cliente.username == cliente.username))
        if existing_user.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otro cliente registrado con este username de WhatsApp")
            
    try:
        db_cliente.nombre = cliente.nombre
        db_cliente.telefono = cliente.telefono
        db_cliente.username = cliente.username
        db_cliente.tipo = cliente.tipo
        db_cliente.estado = cliente.estado
        db_cliente.dias_gracia_max = cliente.dias_gracia_max
        
        await db.commit()
        await db.refresh(db_cliente)
        return db_cliente
    except Exception as e:
        await db.rollback()
        raise e

async def banear_cliente(db: AsyncSession, cliente_id: int):
    db_cliente = await get_cliente(db, cliente_id)
    try:
        db_cliente.estado = EstadoCliente.BANEADO
        await db.commit()
        await db.refresh(db_cliente)
        return db_cliente
    except Exception as e:
        await db.rollback()
        raise e

async def delete_cliente(db: AsyncSession, cliente_id: int):
    db_cliente = await get_cliente(db, cliente_id)
    try:
        await db.delete(db_cliente)
        await db.commit()
        return db_cliente
    except Exception as e:
        await db.rollback()
        raise e


# --- Proveedor Services ---

async def get_proveedores(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(Proveedor)
        .options(selectinload(Proveedor.enlaces))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_proveedor(db: AsyncSession, proveedor_id: int):
    return await get_or_404(db, Proveedor, proveedor_id, options=[selectinload(Proveedor.enlaces)])

async def create_proveedor(db: AsyncSession, proveedor: ProveedorCreate):
    # Validar teléfono único
    existing = await db.execute(select(Proveedor).where(Proveedor.telefono == proveedor.telefono))
    if existing.scalar_one_or_none():
        raise BusinessRuleError("Ya existe un proveedor registrado con este número de teléfono")
        
    try:
        db_proveedor = Proveedor(
            nombre=proveedor.nombre,
            telefono=proveedor.telefono,
            saldo_a_favor=proveedor.saldo_a_favor
        )
        for item in (proveedor.enlaces or []):
            db_proveedor.enlaces.append(
                EnlaceProveedor(nombre=item.nombre or "Link", url=item.url)
            )
        db.add(db_proveedor)
        await db.commit()
        return await get_proveedor(db, db_proveedor.id)
    except Exception as e:
        await db.rollback()
        raise e

async def update_proveedor(db: AsyncSession, proveedor_id: int, proveedor: ProveedorUpdate):
    db_proveedor = await get_proveedor(db, proveedor_id)
    
    # Validar teléfono único si está cambiando
    if db_proveedor.telefono != proveedor.telefono:
        existing = await db.execute(select(Proveedor).where(Proveedor.telefono == proveedor.telefono))
        if existing.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otro proveedor registrado con este número de teléfono")
            
    try:
        db_proveedor.nombre = proveedor.nombre
        db_proveedor.telefono = proveedor.telefono
        db_proveedor.saldo_a_favor = proveedor.saldo_a_favor
        db_proveedor.enlaces = [
            EnlaceProveedor(nombre=item.nombre or "Link", url=item.url)
            for item in (proveedor.enlaces or [])
        ]
        
        await db.commit()
        return await get_proveedor(db, db_proveedor.id)
    except Exception as e:
        await db.rollback()
        raise e

async def delete_proveedor(db: AsyncSession, proveedor_id: int):
    db_proveedor = await get_proveedor(db, proveedor_id)
    try:
        await db.delete(db_proveedor)
        await db.commit()
        return db_proveedor
    except Exception as e:
        await db.rollback()
        raise e
