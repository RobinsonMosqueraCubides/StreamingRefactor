import pytest
import time
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import SessionLocal
from db.models import CuentaMadre, Perfil, Transaccion, TipoTransaccion, Plataforma, Proveedor, Credencial, EstadoCuenta, CuentaMadreCancelada
from services.inventario_service import cancelar_cuenta_madre, get_cuentas_canceladas
from schemas.inventario_schemas import CuentaMadreCancelar, TipoDevolucion
from decimal import Decimal
from datetime import date

@pytest.mark.asyncio
async def test_cancelar_cuenta_madre_caja():
    async with SessionLocal() as db:
        await db.rollback()
        
        unique_suffix = str(int(time.time())) + "_caja"
        
        # 1. Create dependencies
        plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
        db.add(plataforma)
        proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="300" + unique_suffix[:8])
        db.add(proveedor)
        credencial = Credencial(email=f"test_{unique_suffix}@correo.com", password="password")
        db.add(credencial)
        await db.flush()
        
        # 2. Create CuentaMadre and Profile
        cuenta_madre = CuentaMadre(
            proveedor_id=proveedor.id,
            credencial_id=credencial.id,
            plataforma_id=plataforma.id,
            max_perfiles=1,
            precio_compra=Decimal("30000.0"),
            fecha_compra=date.today(),
            fecha_vencimiento=date.today(),
            estado=EstadoCuenta.ACTIVA
        )
        db.add(cuenta_madre)
        await db.flush()
        
        perfil = Perfil(
            nombre_perfil="Perfil 1",
            cuenta_madre_id=cuenta_madre.id,
            asignado=True
        )
        db.add(perfil)
        await db.commit()
        
        # 3. Perform cancellation with CAJA refund
        cancel_data = CuentaMadreCancelar(
            motivo_cancelacion="Cuenta de prueba caida definitivamente",
            devolucion_tipo=TipoDevolucion.CAJA,
            monto_devolucion=Decimal("15000.0"),
            entidad_pago="NEQUI"
        )
        
        result = await cancelar_cuenta_madre(db, cuenta_madre.id, cancel_data)
        
        # 4. Verify outcomes
        assert result.estado == EstadoCuenta.CANCELADA
        
        # Perfiles should be released
        stmt_perfiles = select(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre.id)
        res_perfiles = await db.execute(stmt_perfiles)
        perfiles = res_perfiles.scalars().all()
        assert len(perfiles) == 1
        assert perfiles[0].asignado is False
        
        # A new record in CuentaMadreCancelada must exist
        stmt_cancel = select(CuentaMadreCancelada).where(CuentaMadreCancelada.cuenta_madre_id == cuenta_madre.id)
        res_cancel = await db.execute(stmt_cancel)
        archived = res_cancel.scalar_one_or_none()
        assert archived is not None
        assert archived.plataforma_nombre == plataforma.nombre
        assert archived.correo == credencial.email
        assert archived.clave == credencial.password
        assert archived.motivo_cancelacion == "Cuenta de prueba caida definitivamente"
        assert archived.devolucion_caja == Decimal("15000.0")
        assert archived.devolucion_proveedor == Decimal("0.0")
        
        # A new transaction of type INGRESO and category REEMBOLSO_CUENTA should be created
        stmt_trans = select(Transaccion).where(Transaccion.referencia_id == cuenta_madre.id)
        res_trans = await db.execute(stmt_trans)
        trans = res_trans.scalar_one_or_none()
        assert trans is not None
        assert trans.tipo == TipoTransaccion.INGRESO
        assert trans.categoria == "REEMBOLSO_CUENTA"
        assert trans.monto == Decimal("15000.0")
        assert trans.entidad.value == "NEQUI"
        
        # Clean up
        await db.execute(delete(Perfil).where(Perfil.id == perfil.id))
        await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre.id))
        await db.execute(delete(CuentaMadreCancelada).where(CuentaMadreCancelada.id == archived.id))
        await db.execute(delete(Transaccion).where(Transaccion.id == trans.id))
        await db.execute(delete(Credencial).where(Credencial.id == credencial.id))
        await db.execute(delete(Proveedor).where(Proveedor.id == proveedor.id))
        await db.execute(delete(Plataforma).where(Plataforma.id == plataforma.id))
        await db.commit()

@pytest.mark.asyncio
async def test_cancelar_cuenta_madre_saldo_proveedor():
    async with SessionLocal() as db:
        await db.rollback()
        
        unique_suffix = str(int(time.time())) + "_prov"
        
        # 1. Create dependencies
        plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
        db.add(plataforma)
        proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="301" + unique_suffix[:8], saldo_a_favor=Decimal("1000.0"))
        db.add(proveedor)
        credencial = Credencial(email=f"test_{unique_suffix}@correo.com", password="password")
        db.add(credencial)
        await db.flush()
        
        # 2. Create CuentaMadre
        cuenta_madre = CuentaMadre(
            proveedor_id=proveedor.id,
            credencial_id=credencial.id,
            plataforma_id=plataforma.id,
            max_perfiles=1,
            precio_compra=Decimal("30000.0"),
            fecha_compra=date.today(),
            fecha_vencimiento=date.today(),
            estado=EstadoCuenta.ACTIVA
        )
        db.add(cuenta_madre)
        await db.commit()
        
        # 3. Perform cancellation with SALDO_PROVEEDOR refund
        cancel_data = CuentaMadreCancelar(
            motivo_cancelacion="Reembolso de proveedor",
            devolucion_tipo=TipoDevolucion.SALDO_PROVEEDOR,
            monto_devolucion=Decimal("20000.0"),
            entidad_pago=None
        )
        
        result = await cancelar_cuenta_madre(db, cuenta_madre.id, cancel_data)
        
        # 4. Verify outcomes
        assert result.estado == EstadoCuenta.CANCELADA
        
        # Verify provider's saldo_a_favor increased
        await db.refresh(proveedor)
        assert proveedor.saldo_a_favor == Decimal("21000.0")
        
        # A new record in CuentaMadreCancelada must exist
        stmt_cancel = select(CuentaMadreCancelada).where(CuentaMadreCancelada.cuenta_madre_id == cuenta_madre.id)
        res_cancel = await db.execute(stmt_cancel)
        archived = res_cancel.scalar_one_or_none()
        assert archived is not None
        assert archived.devolucion_caja == Decimal("0.0")
        assert archived.devolucion_proveedor == Decimal("20000.0")
        
        # Clean up
        await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre.id))
        await db.execute(delete(CuentaMadreCancelada).where(CuentaMadreCancelada.id == archived.id))
        await db.execute(delete(Credencial).where(Credencial.id == credencial.id))
        await db.execute(delete(Proveedor).where(Proveedor.id == proveedor.id))
        await db.execute(delete(Plataforma).where(Plataforma.id == plataforma.id))
        await db.commit()
