from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import date
import re

class CorreoPropioBase(BaseModel):
    correo_gmail: str = Field(..., max_length=150, description="Correo electrónico de Gmail propio")
    password_gmail: str = Field(..., max_length=255, description="Contraseña del correo de Gmail")
    correo_verificacion: Optional[str] = Field(None, max_length=150, description="Correo alternativo de verificación")
    numero_asociado: Optional[str] = Field(None, max_length=50, description="Número de teléfono asociado")
    ultimo_ingreso: Optional[date] = Field(None, description="Fecha del último ingreso al correo")
    pide_validacion: bool = Field(default=False, description="Indica si pide validación de seguridad")
    nota: Optional[str] = Field(None, description="Notas generales")
    notas_pago_netflix: Optional[str] = Field(None, description="Notas del medio de pago Netflix")
    nombre_correo: Optional[str] = Field(None, max_length=150, description="Nombre descriptivo del correo")
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de nacimiento del correo")
    sexo: Optional[str] = Field(None, max_length=20, description="Sexo registrado en la cuenta")

    @field_validator("correo_gmail")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise ValueError("El correo electrónico debe ser válido (ej: usuario@dominio.com)")
        return v

class CorreoPropioCreate(CorreoPropioBase):
    pass

class CorreoPropioUpdate(CorreoPropioBase):
    pass

class CorreoPropioResponse(CorreoPropioBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
