from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.finanzas_schemas import PagoVentaCreate, PagoVentaResponse, GastoManualCreate, TransaccionResponse
import services.finanzas_service as service

finanzas_router = APIRouter(prefix="/finanzas", tags=["Finanzas"])
pagos_router = APIRouter(prefix="/ventas", tags=["Pagos de Ventas"])

@pagos_router.post(
    "/{id}/pagos",
    response_model=PagoVentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar pago de venta",
    responses={
        400: {"description": "Datos de pago inválidos o monto excede el saldo pendiente"},
        404: {"description": "Venta no encontrada"}
    }
)
async def registrar_pago_venta(id: int, pago: PagoVentaCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo pago asociado a una venta específica por su ID."""
    return await service.registrar_pago_venta(db, id, pago)

@finanzas_router.post(
    "/gastos",
    response_model=TransaccionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar gasto manual",
    responses={400: {"description": "Datos de gasto inválidos"}}
)
async def registrar_gasto_manual(gasto: GastoManualCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un egreso o gasto de caja manualmente."""
    return await service.registrar_gasto_manual(db, gasto)

@finanzas_router.get(
    "/transacciones",
    response_model=List[TransaccionResponse],
    summary="Listar transacciones de caja",
    description="Retorna el historial completo de transacciones de ingresos y egresos de caja."
)
async def list_transacciones(db: AsyncSession = Depends(get_db)):
    """Obtener el historial de todas las transacciones financieras."""
    return await service.get_transacciones(db)

