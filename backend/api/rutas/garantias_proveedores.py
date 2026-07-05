from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.garantias_prov_schemas import GarantiaProveedorCreate, GarantiaProveedorResponse
import services.garantias_prov_service as service

garantias_prov_router = APIRouter(prefix="/garantias-proveedores", tags=["Garantías de Proveedores"])

@garantias_prov_router.get(
    "/",
    response_model=List[GarantiaProveedorResponse],
    summary="Listar garantías de proveedores",
    description="Retorna el historial completo de reclamos de garantías a proveedores."
)
async def list_garantias_proveedor(db: AsyncSession = Depends(get_db)):
    """Obtener todas las garantías reclamadas a proveedores."""
    return await service.get_garantias_proveedor(db)

@garantias_prov_router.post(
    "/",
    response_model=GarantiaProveedorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar garantía de proveedor",
    responses={
        400: {"description": "Datos de garantía inválidos"},
        404: {"description": "Cuenta madre asociada no encontrada"}
    }
)
async def registrar_garantia_proveedor(garantia: GarantiaProveedorCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un reclamo de garantía para una cuenta madre provista por un proveedor."""
    return await service.registrar_garantia_proveedor(db, garantia)

