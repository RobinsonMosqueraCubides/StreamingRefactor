from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from db.models import NotaVenta, EnlaceProveedor, Proveedor
from db.database import get_or_404
from core.exceptions import BusinessRuleError
from typing import List

# --- Notas Ventas CRUD ---

async def get_notas_ventas(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[NotaVenta]:
    result = await db.execute(select(NotaVenta).order_by(NotaVenta.fecha_creacion.desc()).offset(skip).limit(limit))
    return result.scalars().all()

async def create_nota_venta(db: AsyncSession, obj) -> NotaVenta:
    try:
        db_obj = NotaVenta(contenido=obj.contenido)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e

async def update_nota_venta(db: AsyncSession, id: int, obj) -> NotaVenta:
    db_obj = await get_or_404(db, NotaVenta, id)
    try:
        db_obj.contenido = obj.contenido
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e

async def delete_nota_venta(db: AsyncSession, id: int) -> NotaVenta:
    db_obj = await get_or_404(db, NotaVenta, id)
    try:
        await db.delete(db_obj)
        await db.commit()
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e

# --- Proveedor Observaciones & Enlaces ---

async def update_proveedor_observaciones(db: AsyncSession, provider_id: int, observaciones: str) -> Proveedor:
    from sqlalchemy.orm import selectinload
    db_prov = await get_or_404(db, Proveedor, provider_id, options=[selectinload(Proveedor.enlaces)])
    try:
        db_prov.observaciones = observaciones
        await db.commit()
        await db.refresh(db_prov)
        return db_prov
    except Exception as e:
        await db.rollback()
        raise e

async def get_proveedor_con_enlaces(db: AsyncSession, provider_id: int) -> Proveedor:
    from sqlalchemy.orm import selectinload
    return await get_or_404(db, Proveedor, provider_id, options=[selectinload(Proveedor.enlaces)])

async def create_enlace_proveedor(db: AsyncSession, provider_id: int, obj) -> EnlaceProveedor:
    # Validar existencia de proveedor
    await get_or_404(db, Proveedor, provider_id)
    
    # Validar límite de 2 enlaces
    stmt = select(func.count(EnlaceProveedor.id)).where(EnlaceProveedor.proveedor_id == provider_id)
    res = await db.execute(stmt)
    count = res.scalar() or 0
    if count >= 2:
        raise BusinessRuleError("No se pueden agregar más de 2 enlaces por proveedor.")
        
    try:
        db_obj = EnlaceProveedor(
            proveedor_id=provider_id,
            nombre=obj.nombre,
            url=obj.url
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e

async def delete_enlace_proveedor(db: AsyncSession, enlace_id: int) -> EnlaceProveedor:
    db_obj = await get_or_404(db, EnlaceProveedor, enlace_id)
    try:
        await db.delete(db_obj)
        await db.commit()
        return db_obj
    except Exception as e:
        await db.rollback()
        raise e
