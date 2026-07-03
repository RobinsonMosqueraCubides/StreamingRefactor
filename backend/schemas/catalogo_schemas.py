from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

# --- Plataforma Schemas ---

class PlataformaBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre único de la plataforma de streaming")

class PlataformaCreate(PlataformaBase):
    pass

class PlataformaUpdate(PlataformaBase):
    pass

class PlataformaResponse(PlataformaBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Combo Schemas ---

class ComboBase(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre descriptivo del combo")
    precio_combo: float = Field(..., ge=0, description="Precio total del combo en COP")

class ComboCreate(ComboBase):
    pass

class ComboUpdate(ComboBase):
    pass

class ComboResponse(ComboBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- PlantillaMensaje Schemas ---

class PlantillaMensajeBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre identificador único de la plantilla")
    mensaje: str = Field(..., description="Contenido de la plantilla para enviar por WhatsApp")

class PlantillaMensajeCreate(PlantillaMensajeBase):
    pass

class PlantillaMensajeUpdate(PlantillaMensajeBase):
    pass

class PlantillaMensajeResponse(PlantillaMensajeBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
