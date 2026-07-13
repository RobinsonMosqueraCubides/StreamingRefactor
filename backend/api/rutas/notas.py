from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.notas_schemas import (
    NotaVentaCreate, NotaVentaResponse,
    EnlaceProveedorCreate, EnlaceProveedorResponse,
    ProveedorObservacionesUpdate, ProveedorNotasResponse
)
import services.notas_service as service

notas_router = APIRouter(prefix="/notas", tags=["Notas y Observaciones"])

# --- Rutas Notas Ventas ---

@notas_router.get(
    "/ventas",
    response_model=List[NotaVentaResponse],
    summary="Listar notas de ventas",
    description="Retorna una lista con las notas u observaciones generales del POS."
)
async def list_notas_ventas(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_notas_ventas(db, skip, limit)

@notas_router.post(
    "/ventas",
    response_model=NotaVentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nota de venta",
    description="Registra una nueva nota u observación de venta."
)
async def create_nota_venta(obj: NotaVentaCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_nota_venta(db, obj)

@notas_router.put(
    "/ventas/{id}",
    response_model=NotaVentaResponse,
    summary="Actualizar nota de venta",
    description="Modifica el contenido de una nota de venta existente."
)
async def update_nota_venta(id: int, obj: NotaVentaCreate, db: AsyncSession = Depends(get_db)):
    return await service.update_nota_venta(db, id, obj)

@notas_router.delete(
    "/ventas/{id}",
    response_model=NotaVentaResponse,
    summary="Eliminar nota de venta",
    description="Remueve una nota de venta por su ID."
)
async def delete_nota_venta(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_nota_venta(db, id)


# --- Rutas Proveedores (Observaciones y Enlaces) ---

@notas_router.get(
    "/proveedores/{prov_id}",
    response_model=ProveedorNotasResponse,
    summary="Obtener notas y enlaces de un proveedor",
    description="Obtiene los detalles del proveedor junto con sus observaciones y enlaces."
)
async def get_proveedor_notas(prov_id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_proveedor_con_enlaces(db, prov_id)

@notas_router.put(
    "/proveedores/{prov_id}/observaciones",
    response_model=ProveedorNotasResponse,
    summary="Actualizar observaciones de un proveedor",
    description="Modifica o guarda las observaciones del proveedor especificado."
)
async def update_prov_observaciones(prov_id: int, obj: ProveedorObservacionesUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_proveedor_observaciones(db, prov_id, obj.observaciones or "")

@notas_router.post(
    "/proveedores/{prov_id}/enlaces",
    response_model=EnlaceProveedorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar enlace a un proveedor",
    description="Agrega un enlace (máximo 2 por proveedor) para accesos rápidos."
)
async def create_prov_enlace(prov_id: int, obj: EnlaceProveedorCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_enlace_proveedor(db, prov_id, obj)

@notas_router.delete(
    "/proveedores/enlaces/{enlace_id}",
    response_model=EnlaceProveedorResponse,
    summary="Eliminar enlace de un proveedor",
    description="Remueve un enlace registrado de un proveedor."
)
async def delete_prov_enlace(enlace_id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_enlace_proveedor(db, enlace_id)
