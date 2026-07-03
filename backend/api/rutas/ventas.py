from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.ventas_schemas import VentaCreate, VentaResponse, VentaRenovacion
import services.ventas_service as service
from api.deps import get_current_user

ventas_router = APIRouter(prefix="/ventas", tags=["Ventas"])

@ventas_router.get("/", response_model=List[VentaResponse])
async def list_ventas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_ventas(db, skip, limit)

@ventas_router.get("/{id}", response_model=VentaResponse)
async def get_venta(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_venta(db, id)

@ventas_router.post("/", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
async def create_venta(venta: VentaCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_venta(db, venta)

@ventas_router.put("/{id}/renovar", response_model=VentaResponse)
async def renovar_venta(id: int, renovacion: VentaRenovacion, db: AsyncSession = Depends(get_db)):
    return await service.renovar_venta(db, id, renovacion.nueva_fecha_corte)

@ventas_router.get("/{id}/whatsapp-link")
async def get_whatsapp_link(
    id: int,
    detail_id: int,
    template_type: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    url = await service.generate_whatsapp_link(db, id, detail_id, template_type)
    return {"url": url}

@ventas_router.get("/{id}/whatsapp-consolidated")
async def get_whatsapp_consolidated(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    url = await service.generate_whatsapp_consolidated(db, id)
    return {"url": url}
