from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.garantias_prov_schemas import GarantiaProveedorCreate, GarantiaProveedorResponse
import services.garantias_prov_service as service

garantias_prov_router = APIRouter(prefix="/garantias-proveedores", tags=["Garantías de Proveedores"])

@garantias_prov_router.get("/", response_model=List[GarantiaProveedorResponse])
async def list_garantias_proveedor(db: AsyncSession = Depends(get_db)):
    return await service.get_garantias_proveedor(db)

@garantias_prov_router.post("/", response_model=GarantiaProveedorResponse, status_code=status.HTTP_201_CREATED)
async def registrar_garantia_proveedor(garantia: GarantiaProveedorCreate, db: AsyncSession = Depends(get_db)):
    return await service.registrar_garantia_proveedor(db, garantia)
