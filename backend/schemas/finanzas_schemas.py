from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from db.models import EntidadFinanciera

# --- PagoVenta Schemas ---

class PagoVentaCreate(BaseModel):
    monto: float = Field(..., ge=0.01, description="Monto del abono en pesos COP")
    entidad: EntidadFinanciera = Field(..., description="Entidad financiera utilizada para el abono")

class PagoVentaResponse(BaseModel):
    id: int
    venta_id: int
    monto: float
    entidad: EntidadFinanciera
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# --- GastoManual Schemas ---

class GastoManualCreate(BaseModel):
    categoria: str = Field(..., max_length=50, description="Categoría o motivo del gasto")
    monto: float = Field(..., ge=0.01, description="Monto del egreso en pesos COP")
    entidad: EntidadFinanciera = Field(..., description="Medio de pago financiero utilizado")


# --- Transaccion Schemas ---

class TransaccionResponse(BaseModel):
    id: int
    tipo: str  # 'INGRESO' or 'EGRESO'
    categoria: str
    monto: float
    entidad: EntidadFinanciera
    referencia_id: int | None = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)
