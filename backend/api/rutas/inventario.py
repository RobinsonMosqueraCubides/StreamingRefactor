from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.inventario_schemas import (
    CredencialCreate, CredencialUpdate, CredencialResponse,
    CuentaMadreCreate, CuentaMadreUpdate, CuentaMadreResponse,
    PerfilUpdate, PerfilResponse
)
import services.inventario_service as service

# --- Credenciales Router ---
credenciales_router = APIRouter(prefix="/credenciales", tags=["Credenciales"])

@credenciales_router.get("/", response_model=List[CredencialResponse])
async def list_credenciales(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_credenciales(db, skip, limit)

@credenciales_router.get("/{id}", response_model=CredencialResponse)
async def get_credencial(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_credencial(db, id)

@credenciales_router.post("/", response_model=CredencialResponse, status_code=status.HTTP_201_CREATED)
async def create_credencial(credencial: CredencialCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_credencial(db, credencial)

@credenciales_router.put("/{id}", response_model=CredencialResponse)
async def update_credencial(id: int, credencial: CredencialUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_credencial(db, id, credencial)

@credenciales_router.delete("/{id}", response_model=CredencialResponse)
async def delete_credencial(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_credencial(db, id)


# --- Cuentas Madre Router ---
cuentas_madre_router = APIRouter(prefix="/cuentas_madre", tags=["Cuentas Madre"])

@cuentas_madre_router.get("/", response_model=List[CuentaMadreResponse])
async def list_cuentas_madre(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_cuentas_madre(db, skip, limit)

@cuentas_madre_router.get("/{id}", response_model=CuentaMadreResponse)
async def get_cuenta_madre(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_cuenta_madre(db, id)

@cuentas_madre_router.post("/", response_model=CuentaMadreResponse, status_code=status.HTTP_201_CREATED)
async def create_cuenta_madre(cuenta: CuentaMadreCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_cuenta_madre(db, cuenta)

@cuentas_madre_router.put("/{id}", response_model=CuentaMadreResponse)
async def update_cuenta_madre(id: int, cuenta: CuentaMadreUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_cuenta_madre(db, id, cuenta)

@cuentas_madre_router.delete("/{id}", response_model=CuentaMadreResponse)
async def delete_cuenta_madre(id: int, db: AsyncSession = Depends(get_db)):
    return await service.delete_cuenta_madre(db, id)


# --- Perfiles Router ---
perfiles_router = APIRouter(prefix="/perfiles", tags=["Perfiles"])

@perfiles_router.get("/", response_model=List[PerfilResponse])
async def list_perfiles(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await service.get_perfiles(db, skip, limit)

@perfiles_router.get("/{id}", response_model=PerfilResponse)
async def get_perfil(id: int, db: AsyncSession = Depends(get_db)):
    return await service.get_perfil(db, id)

@perfiles_router.put("/{id}", response_model=PerfilResponse)
async def update_perfil(id: int, perfil: PerfilUpdate, db: AsyncSession = Depends(get_db)):
    return await service.update_perfil(db, id, perfil)
