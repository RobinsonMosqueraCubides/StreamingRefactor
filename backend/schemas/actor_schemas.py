from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
<<<<<<< HEAD
from decimal import Decimal
=======
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
from db.models import TipoCliente, EstadoCliente

# --- Cliente Schemas ---

class ClienteBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre completo del cliente")
    telefono: str = Field(..., max_length=20, description="Teléfono celular único del cliente")
    tipo: TipoCliente = Field(default=TipoCliente.FINAL, description="Tipo de cliente (FINAL o REVENDEDOR)")
    estado: EstadoCliente = Field(default=EstadoCliente.ACTIVO, description="Estado del cliente (ACTIVO o BANEADO)")
    dias_gracia_max: int = Field(default=3, ge=0, description="Días de gracia máximos para pagos atrasados")

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Proveedor Schemas ---

class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre del proveedor")
    telefono: str = Field(..., max_length=20, description="Teléfono celular único del proveedor")
<<<<<<< HEAD
    saldo_a_favor: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Saldo a favor en pesos COP")
=======
    saldo_a_favor: float = Field(default=0.00, ge=0.0, description="Saldo a favor en pesos COP")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(ProveedorBase):
    pass

class ProveedorResponse(ProveedorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
