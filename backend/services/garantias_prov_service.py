from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.models import CuentaMadre, Credencial, Proveedor, GarantiaProveedor, EstadoCuenta, TipoGarantiaProveedor
from db.database import get_or_404
from schemas.garantias_prov_schemas import GarantiaProveedorCreate
from core.exceptions import BusinessRuleError

async def get_garantias_proveedor(db: AsyncSession):
    result = await db.execute(select(GarantiaProveedor).order_by(GarantiaProveedor.id.desc()))
    return result.scalars().all()

async def registrar_garantia_proveedor(db: AsyncSession, garantia: GarantiaProveedorCreate):
    # 1. Cargar Cuenta Madre con credenciales y proveedor
    db_cm = await get_or_404(
        db,
        CuentaMadre,
        garantia.cuenta_madre_id,
        options=[selectinload(CuentaMadre.credencial), selectinload(CuentaMadre.proveedor)]
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
            if garantia.nuevo_email:
                db_cm.credencial.email = garantia.nuevo_email
            db_cm.credencial.password = garantia.nueva_clave
            db_cm.estado = EstadoCuenta.ACTIVA

        elif tipo == TipoGarantiaProveedor.SALDO_A_FAVOR:
            if not garantia.monto_saldo_a_favor:
                raise BusinessRuleError("Se requiere el 'monto_saldo_a_favor' para la garantía de saldo a favor.")
            db_cm.proveedor.saldo_a_favor = db_cm.proveedor.saldo_a_favor + garantia.monto_saldo_a_favor
            # La cuenta madre se da de baja
            db_cm.estado = EstadoCuenta.CAIDA

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
