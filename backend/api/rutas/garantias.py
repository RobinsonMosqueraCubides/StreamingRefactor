from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.garantias_schemas import GarantiaCreate, GarantiaResponse
import services.garantias_service as service

garantias_router = APIRouter(prefix="/garantias", tags=["Garantías de Clientes"])

@garantias_router.get(
    "/",
    response_model=List[GarantiaResponse],
    summary="Listar garantías de clientes",
    description="Retorna el historial completo de garantías solicitadas por clientes."
)
async def list_garantias(db: AsyncSession = Depends(get_db)):
    """Obtener todas las garantías de clientes registradas."""
    return await service.get_garantias(db)

@garantias_router.post(
    "/",
    response_model=GarantiaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar garantía de cliente",
    responses={
        400: {"description": "Datos de garantía inválidos"},
        404: {"description": "Detalle de venta asociado no encontrado"}
    }
)
async def registrar_garantia(garantia: GarantiaCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un reclamo de garantía para un perfil de cuenta de streaming vendido."""
    return await service.registrar_garantia(db, garantia)

