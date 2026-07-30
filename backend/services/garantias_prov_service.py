from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from decimal import Decimal
from db.models import CuentaMadre, Credencial, Proveedor, GarantiaProveedor, EstadoCuenta, TipoGarantiaProveedor, CuentaMadreCancelada
from db.database import get_or_404
from schemas.garantias_prov_schemas import GarantiaProveedorCreate
from core.exceptions import BusinessRuleError

async def get_garantias_proveedor(db: AsyncSession):
    result = await db.execute(select(GarantiaProveedor).order_by(GarantiaProveedor.id.desc()))
    return result.scalars().all()

async def registrar_garantia_proveedor(db: AsyncSession, garantia: GarantiaProveedorCreate):
    # 1. Cargar Cuenta Madre con credenciales, proveedor y plataforma
    db_cm = await get_or_404(
        db,
        CuentaMadre,
        garantia.cuenta_madre_id,
        options=[
            selectinload(CuentaMadre.credencial),
            selectinload(CuentaMadre.proveedor),
            selectinload(CuentaMadre.plataforma)
        ]
    )

    try:
        tipo_str = garantia.tipo_garantia.upper()
        try:
            tipo = TipoGarantiaProveedor[tipo_str]
        except KeyError:
            raise BusinessRuleError(f"Tipo de garantía de proveedor '{garantia.tipo_garantia}' no reconocido.")

        if tipo == TipoGarantiaProveedor.CAMBIO_CLAVE:
            if not garantia.nueva_clave:
                raise BusinessRuleError("Se requiere la 'nueva_clave' para aplicar el cambio de clave.")
            db_cm.credencial.password = garantia.nueva_clave
            db_cm.estado = EstadoCuenta.ACTIVA

        elif tipo == TipoGarantiaProveedor.CAMBIO_CUENTA:
            if not garantia.nueva_clave:
                raise BusinessRuleError("Se requiere la 'nueva_clave' para aplicar el cambio de cuenta.")

            old_email = db_cm.credencial.email if db_cm.credencial else "N/A"
            old_password = db_cm.credencial.password if db_cm.credencial else "N/A"
            plataforma_nombre = db_cm.plataforma.nombre if db_cm.plataforma else "N/A"
            proveedor_nombre = db_cm.proveedor.nombre if db_cm.proveedor else "N/A"

            # Si cambia el correo o la cuenta por garantía, archivamos el correo/cuenta anterior en cuentas_madres_canceladas
            if garantia.nuevo_email and garantia.nuevo_email.strip() != old_email:
                archive = CuentaMadreCancelada(
                    cuenta_madre_id=db_cm.id,
                    plataforma_nombre=plataforma_nombre,
                    correo=old_email,
                    clave=old_password,
                    max_perfiles=db_cm.max_perfiles,
                    proveedor_nombre=proveedor_nombre,
                    precio_compra=db_cm.precio_compra,
                    fecha_compra=db_cm.fecha_compra,
                    fecha_vencimiento=db_cm.fecha_vencimiento,
                    motivo_cancelacion=f"Garantía Proveedor: Cambio de Cuenta (Correo reemplazado por: {garantia.nuevo_email})",
                    devolucion_caja=Decimal("0.0"),
                    devolucion_proveedor=Decimal("0.0")
                )
                db.add(archive)
                db_cm.credencial.email = garantia.nuevo_email

            db_cm.credencial.password = garantia.nueva_clave
            db_cm.estado = EstadoCuenta.ACTIVA

        elif tipo == TipoGarantiaProveedor.SALDO_A_FAVOR:
            if not garantia.monto_saldo_a_favor:
                raise BusinessRuleError("Se requiere el 'monto_saldo_a_favor' para la garantía de saldo a favor.")
            
            if db_cm.proveedor:
                db_cm.proveedor.saldo_a_favor = (db_cm.proveedor.saldo_a_favor or Decimal("0.0")) + garantia.monto_saldo_a_favor

            old_email = db_cm.credencial.email if db_cm.credencial else "N/A"
            old_password = db_cm.credencial.password if db_cm.credencial else "N/A"
            plataforma_nombre = db_cm.plataforma.nombre if db_cm.plataforma else "N/A"
            proveedor_nombre = db_cm.proveedor.nombre if db_cm.proveedor else "N/A"

            archive = CuentaMadreCancelada(
                cuenta_madre_id=db_cm.id,
                plataforma_nombre=plataforma_nombre,
                correo=old_email,
                clave=old_password,
                max_perfiles=db_cm.max_perfiles,
                proveedor_nombre=proveedor_nombre,
                precio_compra=db_cm.precio_compra,
                fecha_compra=db_cm.fecha_compra,
                fecha_vencimiento=db_cm.fecha_vencimiento,
                motivo_cancelacion=f"Garantía Proveedor: Saldo a Favor (${garantia.monto_saldo_a_favor})",
                devolucion_caja=Decimal("0.0"),
                devolucion_proveedor=garantia.monto_saldo_a_favor
            )
            db.add(archive)

            # La cuenta madre se da de baja
            db_cm.estado = EstadoCuenta.CANCELADA

        # 2. Registrar log
        db_gar = GarantiaProveedor(
            cuenta_madre_id=db_cm.id,
            tipo_garantia=tipo,
            monto_saldo_a_favor=garantia.monto_saldo_a_favor if tipo == TipoGarantiaProveedor.SALDO_A_FAVOR else None,
            resuelto=True
        )
        db.add(db_gar)
        await db.commit()
        await db.refresh(db_gar)
        return db_gar
    except Exception as e:
        await db.rollback()
        raise e

