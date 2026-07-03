from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.garantias_schemas import GarantiaCreate, GarantiaResponse
import services.garantias_service as service

garantias_router = APIRouter(prefix="/garantias", tags=["Garantías de Clientes"])

@garantias_router.get("/", response_model=List[GarantiaResponse])
async def list_garantias(db: AsyncSession = Depends(get_db)):
    return await service.get_garantias(db)

@garantias_router.post("/", response_model=GarantiaResponse, status_code=status.HTTP_201_CREATED)
async def registrar_garantia(garantia: GarantiaCreate, db: AsyncSession = Depends(get_db)):
    return await service.registrar_garantia(db, garantia)
