from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
<<<<<<< HEAD
from decimal import Decimal
=======
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
from datetime import date
from db.models import EstadoPago

# --- DetalleVenta Schemas ---

class VentaItemCreate(BaseModel):
    plataforma_id: int = Field(..., description="ID de la plataforma del perfil a comprar")
    combo_id: Optional[int] = Field(None, description="ID del combo asociado si aplica")
<<<<<<< HEAD
    precio_aplicado: Decimal = Field(..., ge=Decimal("0.0"), description="Precio unitario aplicado para esta plataforma/perfil")
=======
    precio_aplicado: float = Field(..., ge=0.0, description="Precio unitario aplicado para esta plataforma/perfil")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    tipo_unidad: str = Field(default="PANTALLA", description="Tipo de unidad: PANTALLA o CUENTA")
    cuenta_madre_id: Optional[int] = Field(None, description="ID de la Cuenta Madre específica a asignar")

class DetalleVentaResponse(BaseModel):
    id: int
    venta_id: int
    combo_id: Optional[int] = None
    cuenta_madre_id: Optional[int] = None
    perfil_id: Optional[int] = None
<<<<<<< HEAD
    precio_aplicado: Decimal
=======
    precio_aplicado: float
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864

    model_config = ConfigDict(from_attributes=True)


# --- Venta Schemas ---

class VentaCreate(BaseModel):
    cliente_id: int = Field(..., description="ID del cliente que realiza la compra")
    fecha_corte: date = Field(..., description="Fecha de corte unificada calculada para la suscripción")
<<<<<<< HEAD
    monto_total: Decimal = Field(..., ge=Decimal("0.0"), description="Costo total de la venta en pesos COP")
=======
    monto_total: float = Field(..., ge=0.0, description="Costo total de la venta en pesos COP")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    items: List[VentaItemCreate] = Field(..., min_items=1, description="Lista de perfiles a adquirir y asignar")

class VentaResponse(BaseModel):
    id: int
    cliente_id: int
    fecha_corte: date
<<<<<<< HEAD
    monto_total: Decimal
=======
    monto_total: float
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    estado_pago: EstadoPago
    detalles: List[DetalleVentaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class VentaRenovacion(BaseModel):
    nueva_fecha_corte: date
