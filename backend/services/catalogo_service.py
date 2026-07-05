from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Plataforma, Combo, PlantillaMensaje
from db.database import get_or_404
from schemas.catalogo_schemas import (
    PlataformaCreate, PlataformaUpdate,
    ComboCreate, ComboUpdate,
    PlantillaMensajeCreate, PlantillaMensajeUpdate
)
from core.exceptions import BusinessRuleError

# --- Plataforma Services ---

async def get_plataformas(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Plataforma).offset(skip).limit(limit))
    return result.scalars().all()

async def get_plataforma(db: AsyncSession, plataforma_id: int):
    return await get_or_404(db, Plataforma, plataforma_id)

async def create_plataforma(db: AsyncSession, plataforma: PlataformaCreate):
    # Validar si ya existe
    existing = await db.execute(select(Plataforma).where(Plataforma.nombre == plataforma.nombre))
    if existing.scalar_one_or_none():
        raise BusinessRuleError("Ya existe una plataforma con este nombre")
    
    try:
        db_plataforma = Plataforma(nombre=plataforma.nombre)
        db.add(db_plataforma)
        await db.commit()
        await db.refresh(db_plataforma)
        return db_plataforma
    except Exception as e:
        await db.rollback()
        raise e

async def update_plataforma(db: AsyncSession, plataforma_id: int, plataforma: PlataformaUpdate):
    db_plataforma = await get_plataforma(db, plataforma_id)
    
    # Validar nombre único si está cambiando
    if db_plataforma.nombre != plataforma.nombre:
        existing = await db.execute(select(Plataforma).where(Plataforma.nombre == plataforma.nombre))
        if existing.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otra plataforma con este nombre")
            
    try:
        db_plataforma.nombre = plataforma.nombre
        await db.commit()
        await db.refresh(db_plataforma)
        return db_plataforma
    except Exception as e:
        await db.rollback()
        raise e

async def delete_plataforma(db: AsyncSession, plataforma_id: int):
    db_plataforma = await get_plataforma(db, plataforma_id)
    try:
        await db.delete(db_plataforma)
        await db.commit()
        return db_plataforma
    except Exception as e:
        await db.rollback()
        raise e


# --- Combo Services ---

async def get_combos(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Combo).offset(skip).limit(limit))
    return result.scalars().all()

async def get_combo(db: AsyncSession, combo_id: int):
    return await get_or_404(db, Combo, combo_id)

async def create_combo(db: AsyncSession, combo: ComboCreate):
    try:
        db_combo = Combo(nombre=combo.nombre, precio_combo=combo.precio_combo)
        db.add(db_combo)
        await db.commit()
        await db.refresh(db_combo)
        return db_combo
    except Exception as e:
        await db.rollback()
        raise e

async def update_combo(db: AsyncSession, combo_id: int, combo: ComboUpdate):
    db_combo = await get_combo(db, combo_id)
    try:
        db_combo.nombre = combo.nombre
        db_combo.precio_combo = combo.precio_combo
        await db.commit()
        await db.refresh(db_combo)
        return db_combo
    except Exception as e:
        await db.rollback()
        raise e

async def delete_combo(db: AsyncSession, combo_id: int):
    db_combo = await get_combo(db, combo_id)
    try:
        await db.delete(db_combo)
        await db.commit()
        return db_combo
    except Exception as e:
        await db.rollback()
        raise e


# --- PlantillaMensaje Services ---

async def get_plantillas(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(PlantillaMensaje).offset(skip).limit(limit))
    return result.scalars().all()

async def get_plantilla(db: AsyncSession, plantilla_id: int):
    return await get_or_404(db, PlantillaMensaje, plantilla_id)

async def create_plantilla(db: AsyncSession, plantilla: PlantillaMensajeCreate):
    # Validar si ya existe
    existing = await db.execute(select(PlantillaMensaje).where(PlantillaMensaje.nombre == plantilla.nombre))
    if existing.scalar_one_or_none():
        raise BusinessRuleError("Ya existe una plantilla con este nombre")
        
    try:
        db_plantilla = PlantillaMensaje(nombre=plantilla.nombre, mensaje=plantilla.mensaje)
        db.add(db_plantilla)
        await db.commit()
        await db.refresh(db_plantilla)
        return db_plantilla
    except Exception as e:
        await db.rollback()
        raise e

async def update_plantilla(db: AsyncSession, plantilla_id: int, plantilla: PlantillaMensajeUpdate):
    db_plantilla = await get_plantilla(db, plantilla_id)
    
    # Validar nombre único si está cambiando
    if db_plantilla.nombre != plantilla.nombre:
        existing = await db.execute(select(PlantillaMensaje).where(PlantillaMensaje.nombre == plantilla.nombre))
        if existing.scalar_one_or_none():
            raise BusinessRuleError("Ya existe otra plantilla con este nombre")
            
    try:
        db_plantilla.nombre = plantilla.nombre
        db_plantilla.mensaje = plantilla.mensaje
        await db.commit()
        await db.refresh(db_plantilla)
        return db_plantilla
    except Exception as e:
        await db.rollback()
        raise e

async def delete_plantilla(db: AsyncSession, plantilla_id: int):
    db_plantilla = await get_plantilla(db, plantilla_id)
    try:
        await db.delete(db_plantilla)
        await db.commit()
        return db_plantilla
    except Exception as e:
        await db.rollback()
        raise e
