from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
from datetime import date
import re
from db.models import EstadoCuenta, EntidadFinanciera

# --- Credencial Schemas ---

class CredencialBase(BaseModel):
    email: str = Field(..., max_length=150, description="Correo electrónico asociado a la credencial")
    password: str = Field(..., max_length=150, description="Contraseña de la credencial")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("El correo electrónico debe ser válido (ej: usuario@dominio.com)")
        return v

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
    precio_compra: Decimal = Field(..., ge=Decimal("0.0"), description="Costo de la cuenta en pesos COP")
    fecha_compra: date = Field(..., description="Fecha de compra de la cuenta madre")
    fecha_vencimiento: date = Field(..., description="Fecha de vencimiento de la cuenta madre")
    estado: EstadoCuenta = Field(default=EstadoCuenta.ACTIVA, description="Estado actual de la cuenta")

    @model_validator(mode="after")
    def validate_dates(self) -> 'CuentaMadreBase':
        if self.fecha_vencimiento < self.fecha_compra:
            raise ValueError("La fecha de vencimiento debe ser posterior o igual a la fecha de compra")
        return self

class CuentaMadreCreate(CuentaMadreBase):
    entidad_pago: EntidadFinanciera = Field(..., description="Entidad financiera utilizada para pagar la cuenta al proveedor")
    clave_plataforma: Optional[str] = Field(None, description="Clave específica de la plataforma para correos propios")

class CuentaMadreUpdate(CuentaMadreBase):
    clave_plataforma: Optional[str] = Field(None, description="Clave específica de la plataforma para correos propios")

from schemas.actor_schemas import ProveedorResponse

class CuentaMadreResponse(CuentaMadreBase):
    id: int
    clave_plataforma: Optional[str] = None
    perfiles: List[PerfilResponse] = []
    proveedor: Optional[ProveedorResponse] = None

    model_config = ConfigDict(from_attributes=True)


class CuentaMadreRenovar(BaseModel):
    nueva_fecha_vencimiento: date


from enum import Enum
from datetime import datetime

class TipoDevolucion(str, Enum):
    CAJA = "CAJA"
    SALDO_PROVEEDOR = "SALDO_PROVEEDOR"
    NINGUNA = "NINGUNA"

class CuentaMadreCancelar(BaseModel):
    motivo_cancelacion: Optional[str] = Field(None, description="Motivo de la cancelación")
    devolucion_tipo: TipoDevolucion = Field(..., description="Tipo de devolución a realizar")
    monto_devolucion: Decimal = Field(default=Decimal("0.0"), ge=Decimal("0.0"), description="Monto a devolver")
    entidad_pago: Optional[EntidadFinanciera] = Field(None, description="Entidad financiera si se devuelve a caja")

    @model_validator(mode="after")
    def validate_caja_entidad(self) -> 'CuentaMadreCancelar':
        if self.devolucion_tipo == TipoDevolucion.CAJA and self.entidad_pago is None:
            raise ValueError("Debe especificar la entidad financiera para la devolución a caja.")
        return self

class CuentaMadreCanceladaResponse(BaseModel):
    id: int
    cuenta_madre_id: int
    plataforma_nombre: str
    correo: str
    clave: str
    max_perfiles: int
    proveedor_nombre: str
    precio_compra: Decimal
    fecha_compra: date
    fecha_vencimiento: date
    fecha_cancelacion: datetime
    motivo_cancelacion: Optional[str] = None
    devolucion_caja: Decimal
    devolucion_proveedor: Decimal

    model_config = ConfigDict(from_attributes=True)

