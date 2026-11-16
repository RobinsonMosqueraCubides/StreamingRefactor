import pytest
import time
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import SessionLocal
from db.models import CuentaMadre, Perfil, Venta, DetalleVenta, Plataforma, Proveedor, Credencial, Cliente, EstadoCuenta
from services.ventas_service import update_venta, get_venta, create_venta, generate_whatsapp_link, generate_whatsapp_consolidated
from schemas.ventas_schemas import VentaUpdate, VentaDetalleUpdate, VentaCreate, VentaItemCreate
from schemas.actor_schemas import ClienteCreate
from decimal import Decimal
from datetime import date, timedelta

@pytest.mark.asyncio
async def test_update_venta_sync_details():
    async with SessionLocal() as db:
        await db.rollback()
        
        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None
        
        unique_suffix = str(int(time.time())) + "_edit"
        
        try:
            # 1. Create Platform, Proveedor, Credencial, Cliente
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="304" + unique_suffix[-7:])
            db.add(proveedor)
            credencial = Credencial(email=f"test_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Client_{unique_suffix}", telefono="305" + unique_suffix[-7:], tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            # 2. Create CuentaMadre with 2 profiles
            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=2,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            # Add two profiles: one initially assigned, one unassigned
            p1 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 1", pin=None, asignado=True)
            p2 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 2", pin=None, asignado=False)
            db.add(p1)
            db.add(p2)
            await db.flush()

            # 3. Create a Venta with 1 item (assigned to p1)
            venta = Venta(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("15000.00"),
                tipo_venta="PANTALLA",
                estado_pago="PAGADO"
            )
            db.add(venta)
            await db.flush()
            venta_id = venta.id

            detalle = DetalleVenta(
                venta_id=venta.id,
                cuenta_madre_id=cuenta_madre.id,
                perfil_id=p1.id,
                precio_aplicado=Decimal("15000.00")
            )
            db.add(detalle)
            await db.flush()
            await db.commit()

            # --- VERIFICATION A: Modify existing detail price & custom fields ---
            # We want to change p1 name/PIN and change the price to 18000
            venta_update_data = VentaUpdate(
                detalles=[
                    VentaDetalleUpdate(
                        id=detalle.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=p1.id,
                        precio_aplicado=Decimal("18000.00"),
                        nombre_perfil="Perfil Editado 1",
                        pin="1234"
                    )
                ],
                monto_total=Decimal("18000.00")
            )
            
            updated_venta = await update_venta(db, venta.id, venta_update_data)
            
            # Check db updates
            assert len(updated_venta.detalles) == 1
            assert updated_venta.detalles[0].precio_aplicado == Decimal("18000.00")
            assert updated_venta.monto_total == Decimal("18000.00")
            
            # Verify Profile Custom Fields
            db_p1 = await db.get(Perfil, p1.id)
            assert db_p1.nombre_perfil == "Perfil Editado 1"
            assert db_p1.pin == "1234"
            assert db_p1.asignado is True

            # --- VERIFICATION B: Add a new detail to the sale ---
            # We add p2 as a second item to the sale
            venta_update_data_add = VentaUpdate(
                detalles=[
                    # Keep existing detail
                    VentaDetalleUpdate(
                        id=detalle.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=p1.id,
                        precio_aplicado=Decimal("18000.00")
                    ),
                    # Add new detail (no id)
                    VentaDetalleUpdate(
                        id=None,
                        plataforma_id=plataforma.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=p2.id,
                        precio_aplicado=Decimal("12000.00"),
                        nombre_perfil="Perfil 2 Mod",
                        pin="5678",
                        tipo_unidad="PANTALLA"
                    )
                ],
                monto_total=Decimal("30000.00")
            )
            
            updated_venta_2 = await update_venta(db, venta.id, venta_update_data_add)
            
            assert len(updated_venta_2.detalles) == 2
            # Check profiles are both assigned
            db_p1 = await db.get(Perfil, p1.id)
            db_p2 = await db.get(Perfil, p2.id)
            assert db_p1.asignado is True
            assert db_p2.asignado is True
            assert db_p2.nombre_perfil == "Perfil 2 Mod"
            assert db_p2.pin == "5678"

            # --- VERIFICATION C: Delete a detail from the sale ---
            # Omit the first detail from the list (which should delete it and free p1)
            venta_update_data_del = VentaUpdate(
                detalles=[
                    # Keep only the second detail (find its new ID first)
                    VentaDetalleUpdate(
                        id=[d.id for d in updated_venta_2.detalles if d.perfil_id == p2.id][0],
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=p2.id,
                        precio_aplicado=Decimal("12000.00")
                    )
                ],
                monto_total=Decimal("12000.00")
            )
            
            updated_venta_3 = await update_venta(db, venta.id, venta_update_data_del)
            
            assert len(updated_venta_3.detalles) == 1
            # Check p1 is freed, p2 is still assigned
            db_p1 = await db.get(Perfil, p1.id)
            db_p2 = await db.get(Perfil, p2.id)
            assert db_p1.asignado is False
            assert db_p2.asignado is True

        finally:
            # Cleanup
            await db.rollback()
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            await db.commit()



@pytest.mark.asyncio
async def test_create_venta_two_screens_same_account():
    async with SessionLocal() as db:
        await db.rollback()

        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None

        unique_suffix = str(int(time.time())) + "_two_screens"

        try:
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="310" + unique_suffix[:7])
            db.add(proveedor)
            credencial = Credencial(email=f"two_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Client_{unique_suffix}", telefono="311" + unique_suffix[:7], tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=2,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            p1 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 1", pin=None, asignado=False)
            p2 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 2", pin=None, asignado=False)
            db.add_all([p1, p2])
            await db.commit()

            venta_in = VentaCreate(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("30000.00"),
                items=[
                    VentaItemCreate(
                        plataforma_id=plataforma.id,
                        precio_aplicado=Decimal("15000.00"),
                        tipo_unidad="PANTALLA",
                        cuenta_madre_id=cuenta_madre.id,
                    ),
                    VentaItemCreate(
                        plataforma_id=plataforma.id,
                        precio_aplicado=Decimal("15000.00"),
                        tipo_unidad="PANTALLA",
                        cuenta_madre_id=cuenta_madre.id,
                    ),
                ],
            )

            created = await create_venta(db, venta_in)
            venta_id = created.id

            assert len(created.detalles) == 2
            assert created.tipo_venta == "COMBO"
            assert created.detalles[0].perfil_id is not None
            assert created.detalles[1].perfil_id is not None
            assert created.detalles[0].perfil_id != created.detalles[1].perfil_id
            assert created.detalles[0].tipo_unidad == "PANTALLA"
            assert created.detalles[1].tipo_unidad == "PANTALLA"

            db_p1 = await db.get(Perfil, p1.id)
            db_p2 = await db.get(Perfil, p2.id)
            assert db_p1.asignado is True
            assert db_p2.asignado is True
        finally:
            await db.rollback()
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            await db.commit()


@pytest.mark.asyncio
async def test_update_venta_two_screens_same_account():
    async with SessionLocal() as db:
        await db.rollback()

        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None

        unique_suffix = str(int(time.time())) + "_upd_two"

        try:
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="312" + unique_suffix[:7])
            db.add(proveedor)
            credencial = Credencial(email=f"upd_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Client_{unique_suffix}", telefono="313" + unique_suffix[:7], tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=2,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            p1 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Cliente", pin="1111", asignado=True)
            p2 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 2", pin=None, asignado=False)
            db.add_all([p1, p2])
            await db.flush()

            venta = Venta(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("15000.00"),
                tipo_venta="PANTALLA",
                estado_pago="PAGADO"
            )
            db.add(venta)
            await db.flush()
            venta_id = venta.id

            det1 = DetalleVenta(
                venta_id=venta.id,
                cuenta_madre_id=cuenta_madre.id,
                perfil_id=p1.id,
                tipo_unidad="PANTALLA",
                precio_aplicado=Decimal("15000.00")
            )
            db.add(det1)
            await db.commit()

            # Add second screen on the same account without specifying perfil_id and with colliding nombre_perfil
            venta_update = VentaUpdate(
                detalles=[
                    VentaDetalleUpdate(
                        id=det1.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=p1.id,
                        tipo_unidad="PANTALLA",
                        precio_aplicado=Decimal("15000.00"),
                    ),
                    VentaDetalleUpdate(
                        id=None,
                        plataforma_id=plataforma.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=0,
                        tipo_unidad="PANTALLA",
                        precio_aplicado=Decimal("15000.00"),
                        nombre_perfil="Cliente",
                        pin="2222",
                    ),
                ],
                monto_total=Decimal("30000.00"),
            )

            updated = await update_venta(db, venta.id, venta_update)
            assert len(updated.detalles) == 2
            assert updated.tipo_venta == "COMBO"
            assert updated.detalles[0].perfil_id != updated.detalles[1].perfil_id
            assert updated.detalles[1].perfil_id == p2.id

            db_p1 = await db.get(Perfil, p1.id)
            db_p2 = await db.get(Perfil, p2.id)
            assert db_p1.asignado is True
            assert db_p2.asignado is True
            assert db_p2.nombre_perfil == "Cliente 2"
            assert db_p2.pin == "2222"
        finally:
            await db.rollback()
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            await db.commit()



@pytest.mark.asyncio
async def test_cliente_whatsapp_username_and_link():
    c_at = ClienteCreate(nombre="Andres Garay", telefono="@agaraystreaming")
    assert c_at.telefono == "agaraystreaming"

    c_url = ClienteCreate(nombre="Andres Garay", telefono="https://wa.me/agaraystreaming")
    assert c_url.telefono == "agaraystreaming"

    async with SessionLocal() as db:
        await db.rollback()
        plataforma_id = None
        proveedor_id = None
        credencial_id = None
        cliente_id = None
        cuenta_madre_id = None
        venta_id = None
        unique_suffix = str(int(time.time())) + "_wa_user"

        try:
            plataforma = Plataforma(nombre=f"Plat_{unique_suffix}")
            db.add(plataforma)
            proveedor = Proveedor(nombre=f"Prov_{unique_suffix}", telefono="314" + unique_suffix[:7])
            db.add(proveedor)
            credencial = Credencial(email=f"wa_{unique_suffix}@correo.com", password="password")
            db.add(credencial)
            cliente = Cliente(nombre=f"Andres_{unique_suffix}", telefono=f"agaray_{unique_suffix}", tipo="FINAL")
            db.add(cliente)
            await db.flush()

            plataforma_id = plataforma.id
            proveedor_id = proveedor.id
            credencial_id = credencial.id
            cliente_id = cliente.id

            cuenta_madre = CuentaMadre(
                proveedor_id=proveedor.id,
                credencial_id=credencial.id,
                plataforma_id=plataforma.id,
                max_perfiles=2,
                precio_compra=Decimal("100.00"),
                fecha_compra=date.today(),
                fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA
            )
            db.add(cuenta_madre)
            await db.flush()
            cuenta_madre_id = cuenta_madre.id

            p1 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 1", pin=None, asignado=False)
            p2 = Perfil(cuenta_madre_id=cuenta_madre.id, nombre_perfil="Perfil 2", pin=None, asignado=False)
            db.add_all([p1, p2])
            await db.commit()

            venta_in = VentaCreate(
                cliente_id=cliente.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("40000.00"),
                items=[
                    VentaItemCreate(
                        plataforma_id=plataforma.id,
                        precio_aplicado=Decimal("40000.00"),
                        tipo_unidad="CUENTA",
                        cuenta_madre_id=cuenta_madre.id,
                    ),
                ],
            )
            created = await create_venta(db, venta_in)
            venta_id = created.id

            wa_consolidated = await generate_whatsapp_consolidated(db, venta_id)
            assert wa_consolidated.startswith(f"https://wa.me/agaray_{unique_suffix}?text=")

            wa_single = await generate_whatsapp_link(db, venta_id, created.detalles[0].id, "cobro")
            assert wa_single.startswith(f"https://wa.me/agaray_{unique_suffix}?text=")

            # Verify updating Perfil 1 name on CUENTA sale
            upd = VentaUpdate(
                detalles=[
                    VentaDetalleUpdate(
                        id=d.id,
                        cuenta_madre_id=cuenta_madre.id,
                        perfil_id=0,
                        tipo_unidad="CUENTA",
                        precio_aplicado=d.precio_aplicado,
                        nombre_perfil="Andres" if idx == 0 else None,
                    )
                    for idx, d in enumerate(created.detalles)
                ]
            )
            await update_venta(db, venta_id, upd)
            db_p1 = await db.get(Perfil, p1.id)
            assert db_p1.nombre_perfil == "Andres"
        finally:
            await db.rollback()
            if venta_id:
                await db.execute(delete(DetalleVenta).where(DetalleVenta.venta_id == venta_id))
                await db.execute(delete(Venta).where(Venta.id == venta_id))
            if cuenta_madre_id:
                await db.execute(delete(Perfil).where(Perfil.cuenta_madre_id == cuenta_madre_id))
                await db.execute(delete(CuentaMadre).where(CuentaMadre.id == cuenta_madre_id))
            if plataforma_id:
                await db.execute(delete(Plataforma).where(Plataforma.id == plataforma_id))
            if proveedor_id:
                await db.execute(delete(Proveedor).where(Proveedor.id == proveedor_id))
            if credencial_id:
                await db.execute(delete(Credencial).where(Credencial.id == credencial_id))
            if cliente_id:
                await db.execute(delete(Cliente).where(Cliente.id == cliente_id))
            await db.commit()
