from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional, List
from decimal import Decimal
import re
from db.models import TipoCliente, EstadoCliente


def _strip_whatsapp_prefix(v: str) -> str:
    cleaned = v.strip()
    cleaned = re.sub(r"^https?://(www\.)?wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^wa\.me/", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("?")[0].strip().strip("/")
    if cleaned.startswith("@"):
        cleaned = cleaned[1:].strip()
    return cleaned


def normalize_phone(v: Optional[str]) -> Optional[str]:
    """Validate and normalize an optional phone number (e.g. +573001234567)."""
    if v is None or not v.strip():
        return None
    cleaned = _strip_whatsapp_prefix(v)
    no_sep = cleaned.replace(" ", "").replace("-", "")
    if re.match(r"^\+?[0-9]{7,15}$", no_sep):
        return no_sep
    raise ValueError("El teléfono debe ser un número válido de 7 a 15 dígitos (ej: +573001234567)")


def normalize_username(v: Optional[str]) -> Optional[str]:
    """Validate and normalize an optional WhatsApp username (e.g. agaraystreaming)."""
    if v is None or not v.strip():
        return None
    cleaned = _strip_whatsapp_prefix(v)
    if re.match(r"^[a-zA-Z0-9._]{3,50}$", cleaned) and any(c.isalpha() for c in cleaned):
        return cleaned
    raise ValueError("El username de WhatsApp debe tener entre 3 y 50 caracteres válidos (ej: agaraystreaming)")


def normalize_and_validate_contact(v: str) -> str:
    """Validate and normalize a phone number or WhatsApp username (e.g. +573001234567 or agaraystreaming)."""
    cleaned = _strip_whatsapp_prefix(v)
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
    telefono: Optional[str] = Field(default=None, max_length=60, description="Teléfono celular único del cliente")
    username: Optional[str] = Field(default=None, max_length=60, description="Username de WhatsApp único del cliente")
    tipo: TipoCliente = Field(default=TipoCliente.FINAL, description="Tipo de cliente (FINAL o REVENDEDOR)")
    estado: EstadoCliente = Field(default=EstadoCliente.ACTIVO, description="Estado del cliente (ACTIVO o BANEADO)")
    dias_gracia_max: int = Field(default=3, ge=0, description="Días de gracia máximos para pagos atrasados")

    @field_validator("telefono")
    @classmethod
    def validate_telefono(cls, v: Optional[str]) -> Optional[str]:
        return normalize_phone(v)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        return normalize_username(v)

    @model_validator(mode="after")
    def validate_at_least_one_contact(self):
        if not self.telefono and not self.username:
            raise ValueError("Debes ingresar al menos un número de teléfono o un username de WhatsApp")
        return self

class ClienteCreate(ClienteBase):
    pass

class ClienteUpdate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Proveedor Schemas ---

class ProveedorEnlaceItem(BaseModel):
    id: Optional[int] = None
    nombre: Optional[str] = Field(default="Link", max_length=100)
    url: str = Field(..., max_length=255)

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if not cleaned:
            raise ValueError("La URL del enlace no puede estar vacía")
        if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
            cleaned = f"https://{cleaned}"
        return cleaned

    @field_validator("nombre")
    @classmethod
    def normalize_nombre(cls, v: Optional[str]) -> str:
        cleaned = (v or "").strip()
        return cleaned or "Link"

    model_config = ConfigDict(from_attributes=True)


class ProveedorBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre del proveedor")
    telefono: str = Field(..., max_length=60, description="Teléfono celular o username de WhatsApp único del proveedor")
    saldo_a_favor: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Saldo a favor en pesos COP")
    enlaces: List[ProveedorEnlaceItem] = Field(default_factory=list, description="Enlaces de acceso o grupos del proveedor")

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
