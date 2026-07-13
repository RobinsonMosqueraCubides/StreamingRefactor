from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.ventas_schemas import VentaCreate, VentaResponse, VentaRenovacion, VentaUpdate, VentaVencidaResponse
import services.ventas_service as service
from api.deps import get_current_user

ventas_router = APIRouter(prefix="/ventas", tags=["Ventas"])

@ventas_router.get(
    "/",
    response_model=List[VentaResponse],
    summary="Listar ventas",
    description="Retorna una lista paginada de todas las ventas registradas."
)
async def list_ventas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de ventas."""
    return await service.get_ventas(db, skip, limit)

@ventas_router.get(
    "/vencidas",
    response_model=List[VentaVencidaResponse],
    summary="Listar ventas vencidas",
    description="Retorna una lista de todas las ventas cut/vencidas históricas."
)
async def list_ventas_vencidas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de ventas vencidas/cortadas."""
    return await service.get_ventas_vencidas(db, skip, limit)

@ventas_router.get(
    "/{id}",
    response_model=VentaResponse,
    summary="Obtener venta por ID",
    responses={404: {"description": "Venta no encontrada"}}
)
async def get_venta(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de una venta por su ID."""
    return await service.get_venta(db, id)

@ventas_router.post(
    "/",
    response_model=VentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear venta",
    responses={
        400: {"description": "Datos de venta inválidos (ej. sin saldo, perfiles agotados)"},
        404: {"description": "Cliente o Combo no encontrado"}
    }
)
async def create_venta(venta: VentaCreate, db: AsyncSession = Depends(get_db)):
    """Crear un nuevo registro de venta, reservando y asignando los perfiles de streaming correspondientes."""
    return await service.create_venta(db, venta)

@ventas_router.put(
    "/{id}/renovar",
    response_model=VentaResponse,
    summary="Renovar venta",
    responses={
        400: {"description": "Fecha de renovación inválida"},
        404: {"description": "Venta no encontrada"}
    }
)
async def renovar_venta(id: int, renovacion: VentaRenovacion, db: AsyncSession = Depends(get_db)):
    """Renovar el período de corte/vencimiento para una venta existente."""
    return await service.renovar_venta(db, id, renovacion.nueva_fecha_corte)

@ventas_router.put(
    "/{id}/confirmar-pago",
    response_model=VentaResponse,
    summary="Confirmar pago completo de venta",
    responses={404: {"description": "Venta no encontrada"}}
)
async def confirmar_pago_venta(id: int, db: AsyncSession = Depends(get_db)):
    """Confirmar manualmente que el pago de la venta ha sido completado al 100%."""
    return await service.confirmar_pago_completo(db, id)

@ventas_router.get(
    "/{id}/whatsapp-link",
    summary="Generar enlace de WhatsApp para enviar credenciales de un perfil",
    responses={404: {"description": "Venta o detalle no encontrado"}}
)
async def get_whatsapp_link(
    id: int,
    detail_id: int,
    template_type: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generar un enlace `wa.me` pre-poblado con el mensaje según plantilla para un perfil específico."""
    url = await service.generate_whatsapp_link(db, id, detail_id, template_type)
    return {"url": url}

@ventas_router.get(
    "/{id}/whatsapp-consolidated",
    summary="Generar enlace de WhatsApp consolidado para toda la venta",
    responses={404: {"description": "Venta no encontrada"}}
)
async def get_whatsapp_consolidated(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generar un enlace `wa.me` con el mensaje consolidado que contiene las credenciales de todos los perfiles de la venta."""
    url = await service.generate_whatsapp_consolidated(db, id)
    return {"url": url}


@ventas_router.put(
    "/{id}",
    response_model=VentaResponse,
    summary="Actualizar venta",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Venta no encontrada"}
    }
)
async def update_venta(id: int, update_data: VentaUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar datos generales de una venta (cliente, fecha de corte, monto total, estado de pago)."""
    return await service.update_venta(db, id, update_data)


@ventas_router.delete(
    "/{id}",
    summary="Eliminar venta",
    responses={404: {"description": "Venta no encontrada"}}
)
async def delete_venta(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente una venta, liberando perfiles y eliminando sus transacciones de caja asociadas."""
    await service.delete_venta(db, id)
    return {"message": "Venta eliminada exitosamente"}


@ventas_router.post(
    "/{id}/detalles/{detail_id}/confirmar-corte",
    summary="Confirmar corte de un servicio",
    description="Libera los perfiles/cuenta en inventario, archiva en ventas_vencidas y actualiza la venta."
)
async def confirmar_corte_venta(id: int, detail_id: int, db: AsyncSession = Depends(get_db)):
    await service.confirmar_corte(db, id, detail_id)
    return {"message": "Corte confirmado y pantalla liberada"}


from pydantic import BaseModel

class VentaNotaUpdate(BaseModel):
    nota: str

@ventas_router.put(
    "/{id}/nota",
    response_model=VentaResponse,
    summary="Actualizar la nota de una venta",
    description="Modifica la nota u observación asociada a una venta."
)
async def update_nota(id: int, obj: VentaNotaUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_venta_nota(db, id, obj.nota)



