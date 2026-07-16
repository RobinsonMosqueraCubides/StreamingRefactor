import pytest
import time
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import SessionLocal
from db.models import CuentaMadre, Perfil, Venta, DetalleVenta, Plataforma, Proveedor, Credencial, Cliente, EstadoCuenta
from services.inventario_service import update_cuenta_madre
from schemas.inventario_schemas import CuentaMadreUpdate
from decimal import Decimal
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_update_cuenta_madre_profiles_sync():
    async with SessionLocal() as db:
        # Start fresh
        await db.rollback()
        
        # Keep track of created entity IDs for cleanup
        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None
        
        unique_suffix = str(int(time.time()))
        
        try:
            # 1. Create dependencies with unique names/phones to avoid constraints
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="302" + unique_suffix[:8])
            db.add(proveedor)
            credencial = Credencial(email=f"test_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Client_{unique_suffix}", telefono="303" + unique_suffix[:8], tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            # 2. Create CuentaMadre with 4 profiles
            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=4,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            # Generate 4 initial profiles
            perfiles = []
            for i in range(1, 5):
                p = Perfil(
                    cuenta_madre_id=cuenta_madre.id,
                    nombre_perfil=f"Perfil {i}",
                    pin=None,
                    asignado=True
                )
                perfiles.append(p)
                db.add(p)
            await db.flush()

            # 3. Create a whole-account sale (tipo_venta = CUENTA)
            venta = Venta(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("40.00"),
                tipo_venta="CUENTA"
            )
            db.add(venta)
            await db.flush()
            venta_id = venta.id

            # Assign all 4 profiles to DetalleVenta
            for p in perfiles:
                d = DetalleVenta(
                    venta_id=venta.id,
                    cuenta_madre_id=cuenta_madre.id,
                    perfil_id=p.id,
                    precio_aplicado=Decimal("10.00")
                )
                db.add(d)
            await db.flush()

            # 4. Test Aumentar Perfiles: increase to 5 profiles
            cuenta_update = CuentaMadreUpdate(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=5,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )

            updated = await update_cuenta_madre(db, cuenta_madre.id, cuenta_update)
            assert updated.max_perfiles == 5

            # Verify that a fifth profile was created and assigned
            res_p = await db.execute(select(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre.id))
            all_perfiles = res_p.scalars().all()
            assert len(all_perfiles) == 5
            
            p5 = next(p for p in all_perfiles if p.nombre_perfil == "Perfil 5")
            assert p5.asignado is True

            # Verify DetalleVenta contains 5 items and prices are redistributed (40 / 5 = 8.00)
            res_d = await db.execute(select(DetalleVenta).where(DetalleVenta.venta_id == venta.id))
            all_details = res_d.scalars().all()
            assert len(all_details) == 5
            for d in all_details:
                assert d.precio_aplicado == Decimal("8.00")

            # 5. Test Disminuir Perfiles: decrease to 3 profiles
            cuenta_update_desc = CuentaMadreUpdate(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=3,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )

            updated_desc = await update_cuenta_madre(db, cuenta_madre.id, cuenta_update_desc)
            assert updated_desc.max_perfiles == 3

            # Verify that we now have exactly 3 profiles
            res_p_desc = await db.execute(select(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre.id))
            all_perfiles_desc = res_p_desc.scalars().all()
            assert len(all_perfiles_desc) == 3

            # Verify DetalleVenta contains 3 items and prices are redistributed (40 / 3 = 13.33 approx)
            res_d_desc = await db.execute(select(DetalleVenta).where(DetalleVenta.venta_id == venta.id))
            all_details_desc = res_d_desc.scalars().all()
            assert len(all_details_desc) == 3
            total_sum = sum(d.precio_aplicado for d in all_details_desc)
            assert abs(total_sum - Decimal("40.00")) < Decimal("0.02")

        except Exception as e:
            await db.rollback()
            raise e

        finally:
            # Clean up all created test entities manually since update_cuenta_madre commits
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                # Delete any generated Transactions for COMPRA_CUENTA referencing this account
                from db.models import Transaccion
                await db.execute(delete(Transaccion).where(Transaccion.referencia_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))

            await db.commit()


@pytest.mark.asyncio
async def test_update_cuenta_madre_profiles_screen_sale():
    async with SessionLocal() as db:
        await db.rollback()
        
        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None
        
        unique_suffix = str(int(time.time())) + "_screen"
        
        try:
            # 1. Create dependencies
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="304" + unique_suffix[:8])
            db.add(proveedor)
            credencial = Credencial(email=f"test_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Client_{unique_suffix}", telefono="305" + unique_suffix[:8], tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            # 2. Create CuentaMadre with 1 profile
            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=1,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            # Generate 1 profile
            p1 = Perfil(
                cuenta_madre_id=cuenta_madre.id,
                nombre_perfil="Perfil 1",
                pin=None,
                asignado=True
            )
            db.add(p1)
            await db.flush()

            # 3. Create a screen sale (tipo_venta = PANTALLA)
            venta = Venta(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("10.00"),
                tipo_venta="PANTALLA"
            )
            db.add(venta)
            await db.flush()
            venta_id = venta.id

            # Assign profile to DetalleVenta
            d = DetalleVenta(
                venta_id=venta.id,
                cuenta_madre_id=cuenta_madre.id,
                perfil_id=p1.id,
                precio_aplicado=Decimal("10.00")
            )
            db.add(d)
            await db.flush()

            # 4. Test Aumentar Perfiles: increase to 2 profiles
            cuenta_update = CuentaMadreUpdate(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=2,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )

            updated = await update_cuenta_madre(db, cuenta_madre.id, cuenta_update)
            assert updated.max_perfiles == 2

            # Verify that a second profile was created
            res_p = await db.execute(select(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre.id))
            all_perfiles = res_p.scalars().all()
            assert len(all_perfiles) == 2
            
            # Since the sale was PANTALLA, the new profile should NOT be assigned!
            p2 = next(p for p in all_perfiles if p.nombre_perfil == "Perfil 2")
            assert p2.asignado is False

            # Verify DetalleVenta still contains only 1 item and its price is unchanged
            res_d = await db.execute(select(DetalleVenta).where(DetalleVenta.venta_id == venta.id))
            all_details = res_d.scalars().all()
            assert len(all_details) == 1
            assert all_details[0].precio_aplicado == Decimal("10.00")

        except Exception as e:
            await db.rollback()
            raise e

        finally:
            # Clean up
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                from db.models import Transaccion
                await db.execute(delete(Transaccion).where(Transaccion.referencia_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))
            await db.commit()

