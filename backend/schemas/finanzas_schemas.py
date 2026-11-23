from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from decimal import Decimal
from db.models import EntidadFinanciera

# --- PagoVenta Schemas ---

class PagoVentaCreate(BaseModel):
    monto: Decimal = Field(..., ge=Decimal("0.01"), description="Monto del abono en pesos COP")
    entidad: EntidadFinanciera = Field(..., description="Entidad financiera utilizada para el abono")

class PagoVentaResponse(BaseModel):
    id: int
    venta_id: int
    monto: Decimal
    entidad: EntidadFinanciera
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# --- GastoManual Schemas ---

class GastoManualCreate(BaseModel):
    categoria: str = Field(..., max_length=50, description="Categoría o motivo del gasto")
    monto: Decimal = Field(..., ge=Decimal("0.01"), description="Monto del egreso en pesos COP")
    entidad: EntidadFinanciera = Field(..., description="Medio de pago financiero utilizado")


# --- Transaccion Schemas ---

class TransaccionResponse(BaseModel):
    id: int
    tipo: str  # 'INGRESO' or 'EGRESO'
    categoria: str
    monto: Decimal
    entidad: EntidadFinanciera
    referencia_id: int | None = None
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Balance Periodos Schemas ---

class BalancePeriodoResponse(BaseModel):
    periodo: str  # 'MES_ACTUAL', 'TRES_MESES', 'ANIO_ACTUAL'
    etiqueta: str
    ingresos_reales: Decimal
    costo_cuentas_madre: Decimal
    gastos_manuales: Decimal
    costo_total: Decimal
    balance_neto: Decimal

    model_config = ConfigDict(from_attributes=True)


class ResumenBalanceResponse(BaseModel):
    periodos: list[BalancePeriodoResponse]

    model_config = ConfigDict(from_attributes=True)


# --- Resumen Mensual Detallado Schemas ---

class PlataformaVentaStats(BaseModel):
    plataforma_id: int | None = None
    plataforma: str
    pantallas_vendidas: int
    cuentas_completas_vendidas: int
    total_vendido: Decimal
    costo_cuentas_madre: Decimal
    utilidad_estimada: Decimal


class VentaMensualItem(BaseModel):
    id: int
    cliente_nombre: str
    plataformas: str
    tipo_venta: str
    fecha_inicio: date
    fecha_corte: date
    monto_total: Decimal
    estado_pago: str
    origen: str  # 'ACTIVA' o 'CORTADA'


class MesAnualComparativo(BaseModel):
    mes: int
    etiqueta: str
    ventas_mes: Decimal
    egresos_mes: Decimal
    balance_neto: Decimal
    cantidad_ventas: int


class ResumenMensualResponse(BaseModel):
    anio: int
    mes: int
    etiqueta_mes: str
    total_vendido_mes: Decimal
    total_cobrado_mes: Decimal
    total_pendiente_mes: Decimal
    ingresos_caja_mes: Decimal
    egresos_cuentas_madre_mes: Decimal
    egresos_gastos_manuales_mes: Decimal
    total_egresos_mes: Decimal
    balance_ventas_vs_egresos: Decimal
    balance_caja_real: Decimal
    cantidad_ventas: int
    pantallas_vendidas: int
    cuentas_completas_vendidas: int
    por_plataforma: list[PlataformaVentaStats]
    ventas_detalle: list[VentaMensualItem]
    comparativa_anual: list[MesAnualComparativo]


# --- Reporte Financiero de Caja (Anual / Mensual / Rango) ---

class MesFinancieroResumen(BaseModel):
    mes: int
    etiqueta: str
    ingresos: Decimal
    egresos_compras: Decimal
    egresos_otros: Decimal
    egresos_totales: Decimal
    balance_neto: Decimal
    por_cobrar: Decimal
    cantidad_compras: int
    cantidad_otros_egresos: int
    cantidad_ingresos: int


class EntidadResumenItem(BaseModel):
    entidad: str
    ingresos: Decimal
    egresos: Decimal
    balance: Decimal


class CompraCuentaDetalleItem(BaseModel):
    id: int
    cuenta_madre_id: int | None = None
    plataforma: str
    correo: str
    proveedor: str
    estado_cuenta: str | None = None
    tipo_movimiento: str
    monto: Decimal
    entidad: str
    fecha: datetime


class EgresoDetalleItem(BaseModel):
    id: int
    categoria: str
    monto: Decimal
    entidad: str
    referencia_id: int | None = None
    detalle: str | None = None
    fecha: datetime


class IngresoDetalleItem(BaseModel):
    id: int
    categoria: str
    monto: Decimal
    entidad: str
    referencia_id: int | None = None
    detalle: str | None = None
    fecha: datetime


class PendienteDetalleItem(BaseModel):
    venta_id: int
    cliente_nombre: str
    plataformas: str
    fecha_inicio: date
    fecha_corte: date
    estado_pago: str
    monto_total: Decimal
    abonado: Decimal
    saldo_pendiente: Decimal


class ReporteFinancieroResponse(BaseModel):
    anio: int
    mes: int | None = None
    fecha_inicio: date
    fecha_fin: date
    modo: str  # 'ANIO', 'MES', 'RANGO'
    etiqueta_periodo: str
    ingresos_totales: Decimal
    ingresos_ventas: Decimal
    ingresos_otros: Decimal
    egresos_totales: Decimal
    egresos_cuentas_madre: Decimal
    egresos_otros: Decimal
    balance_neto: Decimal
    por_cobrar_periodo: Decimal
    por_cobrar_global: Decimal
    resumen_anual: list[MesFinancieroResumen]
    por_entidad: list[EntidadResumenItem]
    compras_detalle: list[CompraCuentaDetalleItem]
    otros_egresos_detalle: list[EgresoDetalleItem]
    ingresos_detalle: list[IngresoDetalleItem]
    pendientes_detalle: list[PendienteDetalleItem]

