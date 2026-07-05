from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.actor_schemas import (
    ClienteCreate, ClienteUpdate, ClienteResponse,
    ProveedorCreate, ProveedorUpdate, ProveedorResponse
)
import services.actor_service as service

# --- Clientes Router ---
clientes_router = APIRouter(prefix="/clientes", tags=["Clientes"])

@clientes_router.get(
    "/",
    response_model=List[ClienteResponse],
    summary="Listar clientes",
    description="Retorna una lista paginada de clientes registrados en el sistema."
)
async def list_clientes(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de clientes."""
    return await service.get_clientes(db, skip, limit)

@clientes_router.get(
    "/{id}",
    response_model=ClienteResponse,
    summary="Obtener cliente por ID",
    responses={404: {"description": "Cliente no encontrado"}}
)
async def get_cliente(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de un cliente específico por su ID."""
    return await service.get_cliente(db, id)

@clientes_router.post(
    "/",
    response_model=ClienteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear cliente",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_cliente(cliente: ClienteCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo cliente en el sistema."""
    return await service.create_cliente(db, cliente)

@clientes_router.put(
    "/{id}",
    response_model=ClienteResponse,
    summary="Actualizar cliente",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Cliente no encontrado"}
    }
)
async def update_cliente(id: int, cliente: ClienteUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de un cliente por su ID."""
    return await service.update_cliente(db, id, cliente)

@clientes_router.put(
    "/{id}/ban",
    response_model=ClienteResponse,
    summary="Banear/Suspender cliente",
    responses={404: {"description": "Cliente no encontrado"}}
)
async def banear_cliente(id: int, db: AsyncSession = Depends(get_db)):
    """Marcar un cliente como suspendido o baneado, impidiendo nuevas compras."""
    return await service.banear_cliente(db, id)

@clientes_router.delete(
    "/{id}",
    response_model=ClienteResponse,
    summary="Eliminar cliente",
    responses={404: {"description": "Cliente no encontrado"}}
)
async def delete_cliente(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente un cliente del sistema."""
    return await service.delete_cliente(db, id)


# --- Proveedores Router ---
proveedores_router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

@proveedores_router.get(
    "/",
    response_model=List[ProveedorResponse],
    summary="Listar proveedores",
    description="Retorna una lista paginada de todos los proveedores registrados."
)
async def list_proveedores(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de proveedores."""
    return await service.get_proveedores(db, skip, limit)

@proveedores_router.get(
    "/{id}",
    response_model=ProveedorResponse,
    summary="Obtener proveedor por ID",
    responses={404: {"description": "Proveedor no encontrado"}}
)
async def get_proveedor(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de un proveedor específico por su ID."""
    return await service.get_proveedor(db, id)

@proveedores_router.post(
    "/",
    response_model=ProveedorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear proveedor",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_proveedor(proveedor: ProveedorCreate, db: AsyncSession = Depends(get_db)):
    """Registrar un nuevo proveedor en el sistema."""
    return await service.create_proveedor(db, proveedor)

@proveedores_router.put(
    "/{id}",
    response_model=ProveedorResponse,
    summary="Actualizar proveedor",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Proveedor no encontrado"}
    }
)
async def update_proveedor(id: int, proveedor: ProveedorUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de un proveedor por su ID."""
    return await service.update_proveedor(db, id, proveedor)

@proveedores_router.delete(
    "/{id}",
    response_model=ProveedorResponse,
    summary="Eliminar proveedor",
    responses={404: {"description": "Proveedor no encontrado"}}
)
async def delete_proveedor(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente un proveedor del sistema."""
    return await service.delete_proveedor(db, id)

