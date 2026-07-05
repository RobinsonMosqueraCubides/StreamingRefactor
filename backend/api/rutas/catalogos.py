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

@plataformas_router.get(
    "/",
    response_model=List[PlataformaResponse],
    summary="Listar plataformas",
    description="Retorna una lista paginada de plataformas (Netflix, Spotify, etc.)."
)
async def list_plataformas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de plataformas."""
    return await service.get_plataformas(db, skip, limit)

@plataformas_router.get(
    "/{id}",
    response_model=PlataformaResponse,
    summary="Obtener plataforma por ID",
    responses={404: {"description": "Plataforma no encontrada"}}
)
async def get_plataforma(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de una plataforma por su ID."""
    return await service.get_plataforma(db, id)

@plataformas_router.post(
    "/",
    response_model=PlataformaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear plataforma",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_plataforma(plataforma: PlataformaCreate, db: AsyncSession = Depends(get_db)):
    """Registrar una nueva plataforma en el sistema."""
    return await service.create_plataforma(db, plataforma)

@plataformas_router.put(
    "/{id}",
    response_model=PlataformaResponse,
    summary="Actualizar plataforma",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Plataforma no encontrada"}
    }
)
async def update_plataforma(id: int, plataforma: PlataformaUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de una plataforma por su ID."""
    return await service.update_plataforma(db, id, plataforma)

@plataformas_router.delete(
    "/{id}",
    response_model=PlataformaResponse,
    summary="Eliminar plataforma",
    responses={404: {"description": "Plataforma no encontrada"}}
)
async def delete_plataforma(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente una plataforma del sistema."""
    return await service.delete_plataforma(db, id)


# --- Combos Router ---
combos_router = APIRouter(prefix="/combos", tags=["Combos"])

@combos_router.get(
    "/",
    response_model=List[ComboResponse],
    summary="Listar combos",
    description="Retorna una lista paginada de combos/planes de suscripciones configurados."
)
async def list_combos(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de combos."""
    return await service.get_combos(db, skip, limit)

@combos_router.get(
    "/{id}",
    response_model=ComboResponse,
    summary="Obtener combo por ID",
    responses={404: {"description": "Combo no encontrado"}}
)
async def get_combo(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de un combo por su ID."""
    return await service.get_combo(db, id)

@combos_router.post(
    "/",
    response_model=ComboResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear combo",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_combo(combo: ComboCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo combo en el sistema."""
    return await service.create_combo(db, combo)

@combos_router.put(
    "/{id}",
    response_model=ComboResponse,
    summary="Actualizar combo",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Combo no encontrado"}
    }
)
async def update_combo(id: int, combo: ComboUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de un combo por su ID."""
    return await service.update_combo(db, id, combo)

@combos_router.delete(
    "/{id}",
    response_model=ComboResponse,
    summary="Eliminar combo",
    responses={404: {"description": "Combo no encontrado"}}
)
async def delete_combo(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente un combo del sistema."""
    return await service.delete_combo(db, id)


# --- Plantillas WhatsApp Router ---
plantillas_router = APIRouter(prefix="/plantillas", tags=["Plantillas WhatsApp"])

@plantillas_router.get(
    "/",
    response_model=List[PlantillaMensajeResponse],
    summary="Listar plantillas de mensaje",
    description="Retorna una lista paginada de plantillas preconfiguradas para WhatsApp."
)
async def list_plantillas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de plantillas de mensaje."""
    return await service.get_plantillas(db, skip, limit)

@plantillas_router.get(
    "/{id}",
    response_model=PlantillaMensajeResponse,
    summary="Obtener plantilla por ID",
    responses={404: {"description": "Plantilla no encontrada"}}
)
async def get_plantilla(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de una plantilla por su ID."""
    return await service.get_plantilla(db, id)

@plantillas_router.post(
    "/",
    response_model=PlantillaMensajeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear plantilla",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_plantilla(plantilla: PlantillaMensajeCreate, db: AsyncSession = Depends(get_db)):
    """Registrar una nueva plantilla de mensaje en el sistema."""
    return await service.create_plantilla(db, plantilla)

@plantillas_router.put(
    "/{id}",
    response_model=PlantillaMensajeResponse,
    summary="Actualizar plantilla",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Plantilla no encontrada"}
    }
)
async def update_plantilla(id: int, plantilla: PlantillaMensajeUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de una plantilla por su ID."""
    return await service.update_plantilla(db, id, plantilla)

@plantillas_router.delete(
    "/{id}",
    response_model=PlantillaMensajeResponse,
    summary="Eliminar plantilla",
    responses={404: {"description": "Plantilla no encontrada"}}
)
async def delete_plantilla(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente una plantilla de mensaje del sistema."""
    return await service.delete_plantilla(db, id)

