from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
<<<<<<< HEAD
from decimal import Decimal
=======
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
from db.models import EntidadFinanciera

# --- PagoVenta Schemas ---

class PagoVentaCreate(BaseModel):
<<<<<<< HEAD
    monto: Decimal = Field(..., ge=Decimal("0.01"), description="Monto del abono en pesos COP")
=======
    monto: float = Field(..., ge=0.01, description="Monto del abono en pesos COP")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    entidad: EntidadFinanciera = Field(..., description="Entidad financiera utilizada para el abono")

class PagoVentaResponse(BaseModel):
    id: int
    venta_id: int
<<<<<<< HEAD
    monto: Decimal
=======
    monto: float
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    entidad: EntidadFinanciera
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# --- GastoManual Schemas ---

class GastoManualCreate(BaseModel):
    categoria: str = Field(..., max_length=50, description="Categoría o motivo del gasto")
<<<<<<< HEAD
    monto: Decimal = Field(..., ge=Decimal("0.01"), description="Monto del egreso en pesos COP")
=======
    monto: float = Field(..., ge=0.01, description="Monto del egreso en pesos COP")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    entidad: EntidadFinanciera = Field(..., description="Medio de pago financiero utilizado")


# --- Transaccion Schemas ---

class TransaccionResponse(BaseModel):
    id: int
    tipo: str  # 'INGRESO' or 'EGRESO'
    categoria: str
<<<<<<< HEAD
    monto: Decimal
=======
    monto: float
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    entidad: EntidadFinanciera
    referencia_id: int | None = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)
