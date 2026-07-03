from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date
from db.models import EstadoCuenta, EntidadFinanciera

# --- Credencial Schemas ---

class CredencialBase(BaseModel):
    email: str = Field(..., max_length=150, description="Correo electrónico asociado a la credencial")
    password: str = Field(..., max_length=150, description="Contraseña de la credencial")

class CredencialCreate(CredencialBase):
    pass

class CredencialUpdate(CredencialBase):
    pass

class CredencialResponse(CredencialBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Perfil Schemas ---

class PerfilBase(BaseModel):
    nombre_perfil: str = Field(..., max_length=50, description="Nombre del perfil en la plataforma")
    pin: Optional[str] = Field(None, max_length=10, description="PIN opcional de seguridad del perfil")
    asignado: bool = Field(default=False, description="Indica si el perfil ya fue vendido o asignado")

class PerfilUpdate(BaseModel):
    nombre_perfil: Optional[str] = Field(None, max_length=50)
    pin: Optional[str] = Field(None, max_length=10)
    asignado: Optional[bool] = None

class PerfilResponse(PerfilBase):
    id: int
    cuenta_madre_id: int

    model_config = ConfigDict(from_attributes=True)


# --- CuentaMadre Schemas ---

class CuentaMadreBase(BaseModel):
    proveedor_id: int = Field(..., description="ID del proveedor al que se le compra la cuenta")
    credencial_id: int = Field(..., description="ID de la credencial asociada")
    plataforma_id: int = Field(..., description="ID de la plataforma de streaming")
    max_perfiles: int = Field(..., ge=1, description="Cantidad máxima de perfiles configurados para esta cuenta")
    precio_compra: float = Field(..., ge=0.0, description="Costo de la cuenta en pesos COP")
    fecha_compra: date = Field(..., description="Fecha de compra de la cuenta madre")
    fecha_vencimiento: date = Field(..., description="Fecha de vencimiento de la cuenta madre")
    estado: EstadoCuenta = Field(default=EstadoCuenta.ACTIVA, description="Estado actual de la cuenta")

class CuentaMadreCreate(CuentaMadreBase):
    entidad_pago: EntidadFinanciera = Field(..., description="Entidad financiera utilizada para pagar la cuenta al proveedor")

class CuentaMadreUpdate(CuentaMadreBase):
    pass

class CuentaMadreResponse(CuentaMadreBase):
    id: int
    perfiles: List[PerfilResponse] = []

    model_config = ConfigDict(from_attributes=True)
