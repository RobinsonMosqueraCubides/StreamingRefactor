from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db
from schemas.inventario_schemas import (
    CredencialCreate, CredencialUpdate, CredencialResponse,
    CuentaMadreCreate, CuentaMadreUpdate, CuentaMadreResponse, CuentaMadreRenovar,
    PerfilUpdate, PerfilResponse, CuentaMadreCancelar, CuentaMadreCanceladaResponse
)
import services.inventario_service as service

# --- Credenciales Router ---
credenciales_router = APIRouter(prefix="/credenciales", tags=["Credenciales"])

@credenciales_router.get(
    "/",
    response_model=List[CredencialResponse],
    summary="Listar credenciales",
    description="Retorna una lista paginada de credenciales (correos y contraseñas de streaming)."
)
async def list_credenciales(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de credenciales."""
    return await service.get_credenciales(db, skip, limit)

@credenciales_router.get(
    "/{id}",
    response_model=CredencialResponse,
    summary="Obtener credencial por ID",
    responses={404: {"description": "Credencial no encontrada"}}
)
async def get_credencial(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de una credencial específica por su ID."""
    return await service.get_credencial(db, id)

@credenciales_router.post(
    "/",
    response_model=CredencialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear credencial",
    responses={400: {"description": "Datos de entrada inválidos"}}
)
async def create_credencial(credencial: CredencialCreate, db: AsyncSession = Depends(get_db)):
    """Crear un nuevo registro de credenciales en el sistema."""
    return await service.create_credencial(db, credencial)

@credenciales_router.put(
    "/{id}",
    response_model=CredencialResponse,
    summary="Actualizar credencial",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Credencial no encontrada"}
    }
)
async def update_credencial(id: int, credencial: CredencialUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información de acceso de una credencial por su ID."""
    return await service.update_credencial(db, id, credencial)

@credenciales_router.delete(
    "/{id}",
    response_model=CredencialResponse,
    summary="Eliminar credencial",
    responses={404: {"description": "Credencial no encontrada"}}
)
async def delete_credencial(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente una credencial del sistema."""
    return await service.delete_credencial(db, id)


# --- Cuentas Madre Router ---
cuentas_madre_router = APIRouter(prefix="/cuentas_madre", tags=["Cuentas Madre"])

@cuentas_madre_router.get(
    "/",
    response_model=List[CuentaMadreResponse],
    summary="Listar cuentas madre",
    description="Retorna una lista paginada de cuentas madre (las cuentas principales de streaming)."
)
async def list_cuentas_madre(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de cuentas madre."""
    return await service.get_cuentas_madre(db, skip, limit)

@cuentas_madre_router.get(
    "/{id}",
    response_model=CuentaMadreResponse,
    summary="Obtener cuenta madre por ID",
    responses={404: {"description": "Cuenta madre no encontrada"}}
)
async def get_cuenta_madre(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles completos de una cuenta madre por su ID."""
    return await service.get_cuenta_madre(db, id)

@cuentas_madre_router.post(
    "/",
    response_model=CuentaMadreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear cuenta madre",
    responses={400: {"description": "Datos de entrada inválidos o relaciones no encontradas"}}
)
async def create_cuenta_madre(cuenta: CuentaMadreCreate, db: AsyncSession = Depends(get_db)):
    """Crear una nueva cuenta madre y generar sus perfiles automáticamente según su capacidad."""
    return await service.create_cuenta_madre(db, cuenta)

@cuentas_madre_router.put(
    "/{id}",
    response_model=CuentaMadreResponse,
    summary="Actualizar cuenta madre",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Cuenta madre no encontrada"}
    }
)
async def update_cuenta_madre(id: int, cuenta: CuentaMadreUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de una cuenta madre por su ID."""
    return await service.update_cuenta_madre(db, id, cuenta)

@cuentas_madre_router.put(
    "/{id}/renovar",
    response_model=CuentaMadreResponse,
    summary="Renovar cuenta madre",
    responses={
        400: {"description": "Fecha de renovación inválida"},
        404: {"description": "Cuenta madre no encontrada"}
    }
)
async def renovar_cuenta_madre(id: int, renovacion: CuentaMadreRenovar, db: AsyncSession = Depends(get_db)):
    """Extender la fecha de vencimiento de una cuenta madre."""
    return await service.renovar_cuenta_madre(db, id, renovacion.nueva_fecha_vencimiento)

@cuentas_madre_router.delete(
    "/{id}",
    response_model=CuentaMadreResponse,
    summary="Eliminar cuenta madre",
    responses={404: {"description": "Cuenta madre no encontrada"}}
)
async def delete_cuenta_madre(id: int, db: AsyncSession = Depends(get_db)):
    """Eliminar físicamente una cuenta madre y sus perfiles asociados."""
    return await service.delete_cuenta_madre(db, id)

@cuentas_madre_router.post(
    "/{id}/cancelar",
    response_model=CuentaMadreResponse,
    summary="Cancelar cuenta madre",
    responses={
        400: {"description": "Error en los datos o regla de negocio"},
        404: {"description": "Cuenta madre no encontrada"}
    }
)
async def cancelar_cuenta_madre(id: int, data: CuentaMadreCancelar, db: AsyncSession = Depends(get_db)):
    """Cancelar cuenta madre registrando copia en histórico y procesando reembolsos."""
    return await service.cancelar_cuenta_madre(db, id, data)

@cuentas_madre_router.get(
    "/canceladas/list",
    response_model=List[CuentaMadreCanceladaResponse],
    summary="Listar cuentas madres canceladas"
)
async def get_cuentas_canceladas(db: AsyncSession = Depends(get_db)):
    """Obtener el listado histórico de cuentas madres canceladas."""
    return await service.get_cuentas_canceladas(db)


# --- Perfiles Router ---
perfiles_router = APIRouter(prefix="/perfiles", tags=["Perfiles"])

@perfiles_router.get(
    "/",
    response_model=List[PerfilResponse],
    summary="Listar perfiles de streaming",
    description="Retorna una lista paginada de todos los perfiles de streaming individuales."
)
async def list_perfiles(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Obtener lista paginada de perfiles."""
    return await service.get_perfiles(db, skip, limit)

@perfiles_router.get(
    "/{id}",
    response_model=PerfilResponse,
    summary="Obtener perfil por ID",
    responses={404: {"description": "Perfil no encontrado"}}
)
async def get_perfil(id: int, db: AsyncSession = Depends(get_db)):
    """Obtener detalles de un perfil específico por su ID."""
    return await service.get_perfil(db, id)

@perfiles_router.put(
    "/{id}",
    response_model=PerfilResponse,
    summary="Actualizar perfil",
    responses={
        400: {"description": "Datos de actualización inválidos"},
        404: {"description": "Perfil no encontrado"}
    }
)
async def update_perfil(id: int, perfil: PerfilUpdate, db: AsyncSession = Depends(get_db)):
    """Actualizar la información básica de un perfil de streaming (nombre, PIN, etc.) por su ID."""
    return await service.update_perfil(db, id, perfil)

