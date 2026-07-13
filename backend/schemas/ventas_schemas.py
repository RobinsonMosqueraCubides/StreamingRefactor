from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime
from db.models import EstadoPago

# --- DetalleVenta Schemas ---

class VentaItemCreate(BaseModel):
    plataforma_id: int = Field(..., description="ID de la plataforma del perfil a comprar")
    combo_id: Optional[int] = Field(None, description="ID del combo asociado si aplica")
    precio_aplicado: Decimal = Field(..., ge=Decimal("0.0"), description="Precio unitario aplicado para esta plataforma/perfil")
    tipo_unidad: str = Field(default="PANTALLA", description="Tipo de unidad: PANTALLA o CUENTA")
    cuenta_madre_id: Optional[int] = Field(None, description="ID de la Cuenta Madre específica a asignar")

class DetalleVentaResponse(BaseModel):
    id: int
    venta_id: int
    combo_id: Optional[int] = None
    cuenta_madre_id: Optional[int] = None
    perfil_id: Optional[int] = None
    precio_aplicado: Decimal

    model_config = ConfigDict(from_attributes=True)


# --- Venta Schemas ---

class VentaCreate(BaseModel):
    cliente_id: int = Field(..., description="ID del cliente que realiza la compra")
    fecha_inicio: date = Field(..., description="Fecha de inicio calculada/seleccionada para la suscripción")
    fecha_corte: date = Field(..., description="Fecha de corte unificada calculada para la suscripción")
    monto_total: Decimal = Field(..., ge=Decimal("0.0"), description="Costo total de la venta en pesos COP")
    items: List[VentaItemCreate] = Field(..., min_items=1, description="Lista de perfiles a adquirir y asignar")
    nota: Optional[str] = Field(None, description="Observaciones o notas adicionales de la venta")

class VentaResponse(BaseModel):
    id: int
    cliente_id: int
    fecha_inicio: date
    fecha_corte: date
    monto_total: Decimal
    estado_pago: EstadoPago
    tipo_venta: Optional[str] = None
    nota: Optional[str] = None
    detalles: List[DetalleVentaResponse] = []

    model_config = ConfigDict(from_attributes=True)


class VentaRenovacion(BaseModel):
    nueva_fecha_corte: date


class VentaDetalleUpdate(BaseModel):
    id: int
    cuenta_madre_id: Optional[int] = None
    perfil_id: Optional[int] = None
    precio_aplicado: Optional[Decimal] = None


class VentaUpdate(BaseModel):
    cliente_id: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_corte: Optional[date] = None
    monto_total: Optional[Decimal] = None
    estado_pago: Optional[EstadoPago] = None
    nota: Optional[str] = None
    detalles: Optional[List[VentaDetalleUpdate]] = None


class VentaVencidaResponse(BaseModel):
    id: int
    cliente: str
    monto_pagado: Decimal
    fecha_inicio: date
    fecha_fin: date
    plataforma: str
    cuenta_madre: str
    fecha_corte_registro: datetime

    model_config = ConfigDict(from_attributes=True)


