from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import Plataforma, Combo, PlantillaMensaje
from schemas.catalogo_schemas import (
    PlataformaCreate, PlataformaUpdate,
    ComboCreate, ComboUpdate,
    PlantillaMensajeCreate, PlantillaMensajeUpdate
)
from fastapi import HTTPException, status

# --- Plataforma Services ---

async def get_plataformas(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(Plataforma).offset(skip).limit(limit))
    return result.scalars().all()

async def get_plataforma(db: AsyncSession, plataforma_id: int):
    result = await db.execute(select(Plataforma).where(Plataforma.id == plataforma_id))
    db_plataforma = result.scalar_one_or_none()
    if not db_plataforma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plataforma con id {plataforma_id} no encontrada"
        )
    return db_plataforma

async def create_plataforma(db: AsyncSession, plataforma: PlataformaCreate):
    # Validar si ya existe
    existing = await db.execute(select(Plataforma).where(Plataforma.nombre == plataforma.nombre))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una plataforma con este nombre"
        )
    
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra plataforma con este nombre"
            )
            
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
    result = await db.execute(select(Combo).where(Combo.id == combo_id))
    db_combo = result.scalar_one_or_none()
    if not db_combo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Combo con id {combo_id} no encontrado"
        )
    return db_combo

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
    result = await db.execute(select(PlantillaMensaje).where(PlantillaMensaje.id == plantilla_id))
    db_plantilla = result.scalar_one_or_none()
    if not db_plantilla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plantilla de mensaje con id {plantilla_id} no encontrada"
        )
    return db_plantilla

async def create_plantilla(db: AsyncSession, plantilla: PlantillaMensajeCreate):
    # Validar si ya existe
    existing = await db.execute(select(PlantillaMensaje).where(PlantillaMensaje.nombre == plantilla.nombre))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una plantilla con este nombre"
        )
        
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra plantilla con este nombre"
            )
            
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
