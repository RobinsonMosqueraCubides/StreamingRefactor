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

@clientes_router.get("/", response_model=List[ClienteResponse])
async def list_clientes(db: AsyncSession = Depends(get_db)):
    return await service.get_clientes(db)

@clientes_router.get("/{id}", response_model=ClienteResponse)
async def get_cliente(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_cliente(db, id)

@clientes_router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
async def create_cliente(cliente: ClienteCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_cliente(db, cliente)

@clientes_router.put("/{id}", response_model=ClienteResponse)
async def update_cliente(id: int, cliente: ClienteUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_cliente(db, id, cliente)

@clientes_router.put("/{id}/ban", response_model=ClienteResponse)
async def banear_cliente(id: int, db: AsyncSession = Depends(get_db)):
    return await service.banear_cliente(db, id)

@clientes_router.delete("/{id}", response_model=ClienteResponse)
async def delete_cliente(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_cliente(db, id)


# --- Proveedores Router ---
proveedores_router = APIRouter(prefix="/proveedores", tags=["Proveedores"])

@proveedores_router.get("/", response_model=List[ProveedorResponse])
async def list_proveedores(db: AsyncSession = Depends(get_db)):
    return await service.get_proveedores(db)

@proveedores_router.get("/{id}", response_model=ProveedorResponse)
async def get_proveedor(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_proveedor(db, id)

@proveedores_router.post("/", response_model=ProveedorResponse, status_code=status.HTTP_201_CREATED)
async def create_proveedor(proveedor: ProveedorCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_proveedor(db, proveedor)

@proveedores_router.put("/{id}", response_model=ProveedorResponse)
async def update_proveedor(id: int, proveedor: ProveedorUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_proveedor(db, id, proveedor)

@proveedores_router.delete("/{id}", response_model=ProveedorResponse)
async def delete_proveedor(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_proveedor(db, id)
