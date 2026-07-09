import enum
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    String, Numeric, Date, DateTime, ForeignKey, Enum, UniqueConstraint, CheckConstraint, Text, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base

# --- Enums ---

class TipoCliente(enum.Enum):
    FINAL = "FINAL"
    REVENDEDOR = "REVENDEDOR"

class EstadoCliente(enum.Enum):
    ACTIVO = "ACTIVO"
    BANEADO = "BANEADO"

class EstadoCuenta(enum.Enum):
    ACTIVA = "ACTIVA"
    CAIDA = "CAIDA"
    VENCIDA = "VENCIDA"
    RENOVADA = "RENOVADA"

class EstadoPago(enum.Enum):
    PAGADO = "PAGADO"
    PENDIENTE = "PENDIENTE"
    DIAS_ESPERA = "DIAS_ESPERA"
    PAGO_PARCIAL = "PAGO_PARCIAL"

class EntidadFinanciera(enum.Enum):
    NEQUI = "NEQUI"
    BANCOLOMBIA = "BANCOLOMBIA"
    DAVIPLATA = "DAVIPLATA"
    NU_BANK = "NU_BANK"
    EFECTIVO = "EFECTIVO"

class TipoGarantiaProveedor(enum.Enum):
    CAMBIO_CLAVE = "CAMBIO_CLAVE"
    CAMBIO_CUENTA = "CAMBIO_CUENTA"
    SALDO_A_FAVOR = "SALDO_A_FAVOR"

class TipoTransaccion(enum.Enum):
    INGRESO = "INGRESO"
    EGRESO = "EGRESO"

# --- Models ---

class Plataforma(Base):
    __tablename__ = "plataformas"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    
    # Relationships
    cuentas_madre: Mapped[List["CuentaMadre"]] = relationship(back_populates="plataforma")


class Cliente(Base):
    __tablename__ = "clientes"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    tipo: Mapped[TipoCliente] = mapped_column(Enum(TipoCliente, name="tipo_cliente"), default=TipoCliente.FINAL)
    estado: Mapped[EstadoCliente] = mapped_column(Enum(EstadoCliente, name="estado_cliente"), default=EstadoCliente.ACTIVO)
    dias_gracia_max: Mapped[int] = mapped_column(default=3)
    
    # Relationships
    ventas: Mapped[List["Venta"]] = relationship(back_populates="cliente")


class Proveedor(Base):
    __tablename__ = "proveedores"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    telefono: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    saldo_a_favor: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    
    # Relationships
    cuentas_madre: Mapped[List["CuentaMadre"]] = relationship(back_populates="proveedor")

    __table_args__ = (
        CheckConstraint("saldo_a_favor >= 0", name="check_saldo_positivo"),
    )


class Credencial(Base):
    __tablename__ = "credenciales"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    _password: Mapped[str] = mapped_column("password", String(255), nullable=False)
    
    # Relationships
    cuentas_madre: Mapped[List["CuentaMadre"]] = relationship(back_populates="credencial")

    @property
    def password(self) -> str:
        from core.encryption import decrypt_password
        return decrypt_password(self._password)

    @password.setter
    def password(self, val: str) -> None:
        from core.encryption import encrypt_password
        self._password = encrypt_password(val)


class CuentaMadre(Base):
    __tablename__ = "cuentas_madre"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    proveedor_id: Mapped[int] = mapped_column(ForeignKey("proveedores.id"))
    credencial_id: Mapped[int] = mapped_column(ForeignKey("credenciales.id"))
    plataforma_id: Mapped[int] = mapped_column(ForeignKey("plataformas.id"))
    max_perfiles: Mapped[int] = mapped_column(nullable=False)
    precio_compra: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fecha_compra: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[EstadoCuenta] = mapped_column(Enum(EstadoCuenta, name="estado_cuenta"), default=EstadoCuenta.ACTIVA)
    
    # Relationships
    proveedor: Mapped["Proveedor"] = relationship(back_populates="cuentas_madre")
    credencial: Mapped["Credencial"] = relationship(back_populates="cuentas_madre")
    plataforma: Mapped["Plataforma"] = relationship(back_populates="cuentas_madre")
    perfiles: Mapped[List["Perfil"]] = relationship(back_populates="cuenta_madre", cascade="all, delete-orphan")
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="cuenta_madre")
    garantias: Mapped[List["GarantiaProveedor"]] = relationship(back_populates="cuenta_madre", cascade="all, delete-orphan")


class Perfil(Base):
    __tablename__ = "perfiles"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_madre_id: Mapped[int] = mapped_column(ForeignKey("cuentas_madre.id", ondelete="CASCADE"))
    nombre_perfil: Mapped[str] = mapped_column(String(50), nullable=False)
    pin: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    asignado: Mapped[bool] = mapped_column(default=False)
    reportado: Mapped[bool] = mapped_column(default=False)
    
    # Relationships
    cuenta_madre: Mapped["CuentaMadre"] = relationship(back_populates="perfiles")
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="perfil")
    
    __table_args__ = (
        UniqueConstraint("cuenta_madre_id", "nombre_perfil", name="uq_cuenta_madre_perfil"),
    )


class Combo(Base):
    __tablename__ = "combos"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    precio_combo: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    
    # Relationships
    detalles_venta: Mapped[List["DetalleVenta"]] = relationship(back_populates="combo")


class Venta(Base):
    __tablename__ = "ventas"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    fecha_corte: Mapped[date] = mapped_column(Date, nullable=False)
    monto_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estado_pago: Mapped[EstadoPago] = mapped_column(Enum(EstadoPago, name="estado_pago"), default=EstadoPago.PENDIENTE)
    
    # Relationships
    cliente: Mapped["Cliente"] = relationship(back_populates="ventas")
    detalles: Mapped[List["DetalleVenta"]] = relationship(back_populates="venta", cascade="all, delete-orphan")
    pagos: Mapped[List["PagoVenta"]] = relationship(back_populates="venta", cascade="all, delete-orphan")


class DetalleVenta(Base):
    __tablename__ = "detalles_venta"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id", ondelete="CASCADE"))
    combo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("combos.id"), nullable=True)
    cuenta_madre_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cuentas_madre.id"), nullable=True)
    perfil_id: Mapped[Optional[int]] = mapped_column(ForeignKey("perfiles.id"), nullable=True)
    precio_aplicado: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    
    # Relationships
    venta: Mapped["Venta"] = relationship(back_populates="detalles")
    combo: Mapped[Optional["Combo"]] = relationship(back_populates="detalles_venta")
    cuenta_madre: Mapped[Optional["CuentaMadre"]] = relationship(back_populates="detalles_venta")
    perfil: Mapped[Optional["Perfil"]] = relationship(back_populates="detalles_venta")
    garantias: Mapped[List["GarantiaCliente"]] = relationship(back_populates="detalle_venta", cascade="all, delete-orphan")


class PagoVenta(Base):
    __tablename__ = "pagos_venta"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(ForeignKey("ventas.id", ondelete="CASCADE"))
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    entidad: Mapped[EntidadFinanciera] = mapped_column(Enum(EntidadFinanciera, name="entidad_financiera"), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, server_default=func.now())
    
    # Relationships
    venta: Mapped["Venta"] = relationship(back_populates="pagos")


class Transaccion(Base):
    __tablename__ = "transacciones"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[TipoTransaccion] = mapped_column(Enum(TipoTransaccion, name="tipo_transaccion"), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    entidad: Mapped[EntidadFinanciera] = mapped_column(Enum(EntidadFinanciera, name="entidad_financiera"), nullable=False)
    referencia_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("tipo IN ('INGRESO', 'EGRESO')", name="check_tipo_transaccion"),
    )


class GarantiaCliente(Base):
    __tablename__ = "garantias_clientes"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    detalle_venta_id: Mapped[int] = mapped_column(ForeignKey("detalles_venta.id"))
    perfil_anterior_id: Mapped[int] = mapped_column(ForeignKey("perfiles.id"))
    perfil_nuevo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("perfiles.id"), nullable=True)
    dias_extendidos: Mapped[int] = mapped_column(default=0)
    resuelto: Mapped[bool] = mapped_column(default=False)
    
    # Relationships
    detalle_venta: Mapped["DetalleVenta"] = relationship(back_populates="garantias")
    perfil_anterior: Mapped["Perfil"] = relationship(foreign_keys=[perfil_anterior_id])
    perfil_nuevo: Mapped[Optional["Perfil"]] = relationship(foreign_keys=[perfil_nuevo_id])


class GarantiaProveedor(Base):
    __tablename__ = "garantias_proveedores"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    cuenta_madre_id: Mapped[int] = mapped_column(ForeignKey("cuentas_madre.id", ondelete="CASCADE"))
    tipo_garantia: Mapped[TipoGarantiaProveedor] = mapped_column(Enum(TipoGarantiaProveedor, name="tipo_garantia_proveedor"), nullable=False)
    monto_saldo_a_favor: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, server_default=func.now())
    resuelto: Mapped[bool] = mapped_column(default=False)
    
    # Relationships
    cuenta_madre: Mapped["CuentaMadre"] = relationship(back_populates="garantias")
class PlantillaMensaje(Base):
    __tablename__ = "plantillas_mensajes"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="admin")

