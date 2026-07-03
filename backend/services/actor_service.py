from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Cliente, Proveedor, EstadoCliente
from schemas.actor_schemas import (
    ClienteCreate, ClienteUpdate,
    ProveedorCreate, ProveedorUpdate
)
from fastapi import HTTPException, status

# --- Cliente Services ---

async def get_clientes(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Cliente).offset(skip).limit(limit))
    return result.scalars().all()

async def get_cliente(db: AsyncSession, cliente_id: int):
    result = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    db_cliente = result.scalar_one_or_none()
    if not db_cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cliente con id {cliente_id} no encontrado"
        )
    return db_cliente

async def create_cliente(db: AsyncSession, cliente: ClienteCreate):
    # Validar teléfono único
    existing = await db.execute(select(Cliente).where(Cliente.telefono == cliente.telefono))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un cliente registrado con este número de teléfono"
        )
    
    try:
        db_cliente = Cliente(
            nombre=cliente.nombre,
            telefono=cliente.telefono,
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
    if db_cliente.telefono != cliente.telefono:
        existing = await db.execute(select(Cliente).where(Cliente.telefono == cliente.telefono))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otro cliente registrado con este número de teléfono"
            )
            
    try:
        db_cliente.nombre = cliente.nombre
        db_cliente.telefono = cliente.telefono
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
    result = await db.execute(select(Proveedor).offset(skip).limit(limit))
    return result.scalars().all()

async def get_proveedor(db: AsyncSession, proveedor_id: int):
    result = await db.execute(select(Proveedor).where(Proveedor.id == proveedor_id))
    db_proveedor = result.scalar_one_or_none()
    if not db_proveedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proveedor con id {proveedor_id} no encontrado"
        )
    return db_proveedor

async def create_proveedor(db: AsyncSession, proveedor: ProveedorCreate):
    # Validar teléfono único
    existing = await db.execute(select(Proveedor).where(Proveedor.telefono == proveedor.telefono))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un proveedor registrado con este número de teléfono"
        )
        
    try:
        db_proveedor = Proveedor(
            nombre=proveedor.nombre,
            telefono=proveedor.telefono,
            saldo_a_favor=proveedor.saldo_a_favor
        )
        db.add(db_proveedor)
        await db.commit()
        await db.refresh(db_proveedor)
        return db_proveedor
    except Exception as e:
        await db.rollback()
        raise e

async def update_proveedor(db: AsyncSession, proveedor_id: int, proveedor: ProveedorUpdate):
    db_proveedor = await get_proveedor(db, proveedor_id)
    
    # Validar teléfono único si está cambiando
    if db_proveedor.telefono != proveedor.telefono:
        existing = await db.execute(select(Proveedor).where(Proveedor.telefono == proveedor.telefono))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otro proveedor registrado con este número de teléfono"
            )
            
    try:
        db_proveedor.nombre = proveedor.nombre
        db_proveedor.telefono = proveedor.telefono
        db_proveedor.saldo_a_favor = proveedor.saldo_a_favor
        
        await db.commit()
        await db.refresh(db_proveedor)
        return db_proveedor
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
