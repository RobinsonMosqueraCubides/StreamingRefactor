from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from decimal import Decimal
import re
from db.models import TipoCliente, EstadoCliente


def normalize_and_validate_contact(v: str) -> str:
    """Validate and normalize a phone number or WhatsApp username (e.g. +573001234567 or agaraystreaming)."""
    cleaned = v.strip()
    cleaned = re.sub(r"^https?://(www\.)?wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("?")[0].strip().strip("/")
    if cleaned.startswith("@"):
        cleaned = cleaned[1:].strip()

    no_sep = cleaned.replace(" ", "").replace("-", "")
    if re.match(r"^\+?[0-9]{7,15}$", no_sep):
        return no_sep

    if re.match(r"^[a-zA-Z0-9._]{3,50}$", cleaned) and any(c.isalpha() for c in cleaned):
        return cleaned

    raise ValueError(
        "El contacto debe ser un teléfono válido (ej: +573001234567) o un username de WhatsApp válido (ej: agaraystreaming)"
    )


# --- Cliente Schemas ---

class ClienteBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre completo del cliente")
    telefono: str = Field(..., max_length=60, description="Teléfono celular o username de WhatsApp único del cliente")
    tipo: TipoCliente = Field(default=TipoCliente.FINAL, description="Tipo de cliente (FINAL o REVENDEDOR)")
    estado: EstadoCliente = Field(default=EstadoCliente.ACTIVO, description="Estado del cliente (ACTIVO o BANEADO)")
    dias_gracia_max: int = Field(default=3, ge=0, description="Días de gracia máximos para pagos atrasados")

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: str) -> str:
        return normalize_and_validate_contact(v)

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
    telefono: str = Field(..., max_length=60, description="Teléfono celular o username de WhatsApp único del proveedor")
    saldo_a_favor: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Saldo a favor en pesos COP")

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: str) -> str:
        return normalize_and_validate_contact(v)

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorUpdate(ProveedorBase):
    pass

class ProveedorResponse(ProveedorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
