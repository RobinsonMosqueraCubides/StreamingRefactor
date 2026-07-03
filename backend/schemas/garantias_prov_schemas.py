from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
<<<<<<< HEAD
from decimal import Decimal
=======
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
from datetime import datetime

class GarantiaProveedorCreate(BaseModel):
    cuenta_madre_id: int = Field(..., description="ID de la Cuenta Madre sobre la cual reclamar garantía")
    tipo_garantia: str = Field(..., description="Tipo de garantía: CAMBIO_CLAVE, CAMBIO_CUENTA, SALDO_A_FAVOR")
    nueva_clave: Optional[str] = Field(None, description="Nueva clave de la cuenta (obligatoria si es CAMBIO_CLAVE o CAMBIO_CUENTA)")
    nuevo_email: Optional[str] = Field(None, description="Nuevo email/usuario (opcional para CAMBIO_CUENTA)")
<<<<<<< HEAD
    monto_saldo_a_favor: Optional[Decimal] = Field(None, ge=Decimal("0.0"), description="Monto a sumar como saldo a favor del proveedor (obligatorio si es SALDO_A_FAVOR)")
=======
    monto_saldo_a_favor: Optional[float] = Field(None, ge=0.0, description="Monto a sumar como saldo a favor del proveedor (obligatorio si es SALDO_A_FAVOR)")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864

class GarantiaProveedorResponse(BaseModel):
    id: int
    cuenta_madre_id: int
    tipo_garantia: str
<<<<<<< HEAD
    monto_saldo_a_favor: Optional[Decimal] = None
=======
    monto_saldo_a_favor: Optional[float] = None
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    fecha: datetime
    resuelto: bool

    model_config = ConfigDict(from_attributes=True)
