from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from db.models import CuentaMadre, Credencial, Proveedor, GarantiaProveedor, EstadoCuenta
from schemas.garantias_prov_schemas import GarantiaProveedorCreate

async def get_garantias_proveedor(db: AsyncSession):
    result = await db.execute(select(GarantiaProveedor).order_by(GarantiaProveedor.id.desc()))
    return result.scalars().all()

async def registrar_garantia_proveedor(db: AsyncSession, garantia: GarantiaProveedorCreate):
    # 1. Cargar Cuenta Madre con credenciales y proveedor
    stmt = (
        select(CuentaMadre)
        .options(selectinload(CuentaMadre.credencial), selectinload(CuentaMadre.proveedor))
        .where(CuentaMadre.id == garantia.cuenta_madre_id)
    )
    res = await db.execute(stmt)
    db_cm = res.scalar_one_or_none()
    
    if not db_cm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cuenta Madre con id {garantia.cuenta_madre_id} no encontrada"
        )

    tipo = garantia.tipo_garantia.upper()

    try:
        if tipo == 'CAMBIO_CLAVE':
            if not garantia.nueva_clave:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Se requiere la 'nueva_clave' para aplicar el cambio de clave."
                )
            db_cm.credencial.password = garantia.nueva_clave
            db_cm.estado = EstadoCuenta.ACTIVA

        elif tipo == 'CAMBIO_CUENTA':
            if not garantia.nueva_clave:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Se requiere la 'nueva_clave' para aplicar el cambio de cuenta."
                )
            if garantia.nuevo_email:
                db_cm.credencial.email = garantia.nuevo_email
            db_cm.credencial.password = garantia.nueva_clave
            db_cm.estado = EstadoCuenta.ACTIVA

        elif tipo == 'SALDO_A_FAVOR':
            if not garantia.monto_saldo_a_favor:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Se requiere el 'monto_saldo_a_favor' para la garantía de saldo a favor."
                )
            db_cm.proveedor.saldo_a_favor = db_cm.proveedor.saldo_a_favor + garantia.monto_saldo_a_favor
            # La cuenta madre se da de baja
            db_cm.estado = EstadoCuenta.CAIDA

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tipo de garantía de proveedor '{garantia.tipo_garantia}' no reconocido."
            )

        # 2. Registrar log
        db_gar = GarantiaProveedor(
            cuenta_madre_id=db_cm.id,
            tipo_garantia=tipo,
            monto_saldo_a_favor=garantia.monto_saldo_a_favor if tipo == 'SALDO_A_FAVOR' else None,
            resuelto=True
        )
        db.add(db_gar)
        await db.commit()
        await db.refresh(db_gar)
        return db_gar
    except Exception as e:
        await db.rollback()
        raise e
