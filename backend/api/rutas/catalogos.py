from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.catalogo_schemas import (
    PlataformaCreate, PlataformaUpdate, PlataformaResponse,
    ComboCreate, ComboUpdate, ComboResponse,
    PlantillaMensajeCreate, PlantillaMensajeUpdate, PlantillaMensajeResponse
)
import services.catalogo_service as service

# --- Plataformas Router ---
plataformas_router = APIRouter(prefix="/plataformas", tags=["Plataformas"])

@plataformas_router.get("/", response_model=List[PlataformaResponse])
async def list_plataformas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_plataformas(db, skip, limit)

@plataformas_router.get("/{id}", response_model=PlataformaResponse)
async def get_plataforma(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_plataforma(db, id)

@plataformas_router.post("/", response_model=PlataformaResponse, status_code=status.HTTP_201_CREATED)
async def create_plataforma(plataforma: PlataformaCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_plataforma(db, plataforma)

@plataformas_router.put("/{id}", response_model=PlataformaResponse)
async def update_plataforma(id: int, plataforma: PlataformaUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_plataforma(db, id, plataforma)

@plataformas_router.delete("/{id}", response_model=PlataformaResponse)
async def delete_plataforma(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_plataforma(db, id)


# --- Combos Router ---
combos_router = APIRouter(prefix="/combos", tags=["Combos"])

@combos_router.get("/", response_model=List[ComboResponse])
async def list_combos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_combos(db, skip, limit)

@combos_router.get("/{id}", response_model=ComboResponse)
async def get_combo(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_combo(db, id)

@combos_router.post("/", response_model=ComboResponse, status_code=status.HTTP_201_CREATED)
async def create_combo(combo: ComboCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_combo(db, combo)

@combos_router.put("/{id}", response_model=ComboResponse)
async def update_combo(id: int, combo: ComboUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_combo(db, id, combo)

@combos_router.delete("/{id}", response_model=ComboResponse)
async def delete_combo(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_combo(db, id)


# --- Plantillas WhatsApp Router ---
plantillas_router = APIRouter(prefix="/plantillas", tags=["Plantillas WhatsApp"])

@plantillas_router.get("/", response_model=List[PlantillaMensajeResponse])
async def list_plantillas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_plantillas(db, skip, limit)

@plantillas_router.get("/{id}", response_model=PlantillaMensajeResponse)
async def get_plantilla(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_plantilla(db, id)

@plantillas_router.post("/", response_model=PlantillaMensajeResponse, status_code=status.HTTP_201_CREATED)
async def create_plantilla(plantilla: PlantillaMensajeCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_plantilla(db, plantilla)

@plantillas_router.put("/{id}", response_model=PlantillaMensajeResponse)
async def update_plantilla(id: int, plantilla: PlantillaMensajeUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_plantilla(db, id, plantilla)

@plantillas_router.delete("/{id}", response_model=PlantillaMensajeResponse)
async def delete_plantilla(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_plantilla(db, id)
