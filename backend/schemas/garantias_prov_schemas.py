from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime

class GarantiaProveedorCreate(BaseModel):
    cuenta_madre_id: int = Field(..., description="ID de la Cuenta Madre sobre la cual reclamar garantía")
    tipo_garantia: str = Field(..., description="Tipo de garantía: CAMBIO_CLAVE, CAMBIO_CUENTA, SALDO_A_FAVOR")
    nueva_clave: Optional[str] = Field(None, description="Nueva clave de la cuenta (obligatoria si es CAMBIO_CLAVE o CAMBIO_CUENTA)")
    nuevo_email: Optional[str] = Field(None, description="Nuevo email/usuario (opcional para CAMBIO_CUENTA)")
    monto_saldo_a_favor: Optional[Decimal] = Field(None, ge=Decimal("0.0"), description="Monto a sumar como saldo a favor del proveedor (obligatorio si es SALDO_A_FAVOR)")

class GarantiaProveedorResponse(BaseModel):
    id: int
    cuenta_madre_id: int
    tipo_garantia: str
    monto_saldo_a_favor: Optional[Decimal] = None
    fecha: datetime
    resuelto: bool

    model_config = ConfigDict(from_attributes=True)
