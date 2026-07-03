from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date
from db.models import EstadoPago

# --- DetalleVenta Schemas ---

class VentaItemCreate(BaseModel):
    plataforma_id: int = Field(..., description="ID de la plataforma del perfil a comprar")
    combo_id: Optional[int] = Field(None, description="ID del combo asociado si aplica")
    precio_aplicado: float = Field(..., ge=0.0, description="Precio unitario aplicado para esta plataforma/perfil")
    tipo_unidad: str = Field(default="PANTALLA", description="Tipo de unidad: PANTALLA o CUENTA")

class DetalleVentaResponse(BaseModel):
    id: int
    venta_id: int
    combo_id: Optional[int] = None
    cuenta_madre_id: Optional[int] = None
    perfil_id: Optional[int] = None
    precio_aplicado: float

    model_config = ConfigDict(from_attributes=True)


# --- Venta Schemas ---

class VentaCreate(BaseModel):
    cliente_id: int = Field(..., description="ID del cliente que realiza la compra")
    fecha_corte: date = Field(..., description="Fecha de corte unificada calculada para la suscripción")
    monto_total: float = Field(..., ge=0.0, description="Costo total de la venta en pesos COP")
    items: List[VentaItemCreate] = Field(..., min_items=1, description="Lista de perfiles a adquirir y asignar")

class VentaResponse(BaseModel):
    id: int
    cliente_id: int
    fecha_corte: date
    monto_total: float
    estado_pago: EstadoPago
    detalles: List[DetalleVentaResponse] = []

    model_config = ConfigDict(from_attributes=True)
