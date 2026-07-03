from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
<<<<<<< HEAD
from decimal import Decimal
=======
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
from db.models import EntidadFinanciera

class GarantiaCreate(BaseModel):
    detalle_venta_id: int = Field(..., description="ID del detalle de venta sobre el cual reclamar garantía")
    tipo_garantia: str = Field(..., description="Tipo de garantía: CAMBIO_RECURSO, CAMBIO_CLAVE, AGREGAR_DIAS, REEMBOLSO")
    dias_extendidos: int = Field(0, ge=0, description="Días adicionales para extender la fecha de corte")
    liberar_recurso_anterior: bool = Field(False, description="Si es True, el perfil/cuenta anterior se libera para venta; si es False, se marca como reportado y sale de circulación")
<<<<<<< HEAD
    monto_reembolso: Optional[Decimal] = Field(None, ge=Decimal("0.0"), description="Monto a reembolsar (obligatorio si es REEMBOLSO)")
=======
    monto_reembolso: Optional[float] = Field(None, ge=0.0, description="Monto a reembolsar (obligatorio si es REEMBOLSO)")
>>>>>>> 8e66d8f83503523ac0b29353ba50e6453d8d4864
    entidad_reembolso: Optional[EntidadFinanciera] = Field(None, description="Entidad financiera para el egreso del reembolso (obligatorio si es REEMBOLSO)")

class GarantiaResponse(BaseModel):
    id: int
    detalle_venta_id: int
    perfil_anterior_id: int
    perfil_nuevo_id: Optional[int] = None
    dias_extendidos: int
    resuelto: bool

    model_config = ConfigDict(from_attributes=True)
