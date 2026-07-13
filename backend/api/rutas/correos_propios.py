from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.correos_propios_schemas import CorreoPropioCreate, CorreoPropioUpdate, CorreoPropioResponse
import services.inventario_service as service

correos_propios_router = APIRouter(prefix="/correos_propios", tags=["Correos Propios"])

@correos_propios_router.get(
    "/",
    response_model=List[CorreoPropioResponse],
    summary="Listar correos propios",
    description="Retorna una lista paginada de correos de Gmail propios."
)
async def list_correos_propios(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_correos_propios(db, skip, limit)

@correos_propios_router.get(
    "/{id}",
    response_model=CorreoPropioResponse,
    summary="Obtener correo propio por ID",
    responses={404: {"description": "Correo propio no encontrado"}}
)
async def get_correo_propio(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_correo_propio(db, id)

@correos_propios_router.post(
    "/",
    response_model=CorreoPropioResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear correo propio",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_correo_propio(obj: CorreoPropioCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_correo_propio(db, obj)

@correos_propios_router.put(
    "/{id}",
    response_model=CorreoPropioResponse,
    summary="Actualizar correo propio",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Correo propio no encontrado"}
    }
)
async def update_correo_propio(id: int, obj: CorreoPropioUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_correo_propio(db, id, obj)

@correos_propios_router.delete(
    "/{id}",
    response_model=CorreoPropioResponse,
    summary="Eliminar correo propio",
    responses={404: {"description": "Correo propio no encontrado"}}
)
async def delete_correo_propio(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_correo_propio(db, id)
