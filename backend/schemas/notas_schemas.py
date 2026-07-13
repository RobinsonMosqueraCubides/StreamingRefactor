from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class NotaVentaBase(BaseModel):
    contenido: str = Field(..., description="Contenido de la nota u observación de ventas")

class NotaVentaCreate(NotaVentaBase):
    pass

class NotaVentaResponse(NotaVentaBase):
    id: int
    fecha_creacion: datetime

    model_config = ConfigDict(from_attributes=True)


class EnlaceProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre descriptivo del enlace")
    url: str = Field(..., max_length=255, description="Dirección URL del enlace")

class EnlaceProveedorCreate(EnlaceProveedorBase):
    pass

class EnlaceProveedorResponse(EnlaceProveedorBase):
    id: int
    proveedor_id: int

    model_config = ConfigDict(from_attributes=True)


class ProveedorObservacionesUpdate(BaseModel):
    observaciones: Optional[str] = Field(None, description="Observaciones/notas del proveedor")


class ProveedorNotasResponse(BaseModel):
    id: int
    nombre: str
    telefono: str
    saldo_a_favor: float
    observaciones: Optional[str] = None
    enlaces: List[EnlaceProveedorResponse] = []

    model_config = ConfigDict(from_attributes=True)
