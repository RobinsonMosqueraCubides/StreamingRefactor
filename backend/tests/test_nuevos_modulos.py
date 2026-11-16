import time
from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import delete, select

from db.database import SessionLocal
from db.models import (
    Plataforma, Proveedor, Credencial, CuentaMadre, Perfil,
    Cliente, Venta, DetalleVenta, PlantillaMensaje, Transaccion,
    EstadoCuenta, EstadoPago, TipoTransaccion, EntidadFinanciera,
    EnlaceProveedor,
)
from schemas.actor_schemas import ProveedorCreate, ProveedorUpdate, ProveedorEnlaceItem
from schemas.ventas_schemas import VentaCreate, VentaItemCreate
from services.actor_service import create_proveedor, update_proveedor, get_proveedor
from services.catalogo_service import get_plantillas
from services.finanzas_service import obtener_resumen_mensual
from services.ventas_service import create_venta, generate_whatsapp_consolidated, renovar_venta


@pytest.mark.asyncio
async def test_plantillas_automaticas_y_compra_personalizada():
    async with SessionLocal() as db:
        await db.rollback()
        plantillas = await get_plantillas(db)
        nombres = {p.nombre for p in plantillas}
        assert {"compra", "cambio_credenciales", "cobro", "corte"}.issubset(nombres)

        # Verify generate_whatsapp_consolidated uses the 'compra' template
        stmt_compra = select(PlantillaMensaje).where(PlantillaMensaje.nombre == "compra")
        compra_tpl = (await db.execute(stmt_compra)).scalar_one()
        original_msg = compra_tpl.mensaje

        plataforma_id = proveedor_id = credencial_id = cliente_id = cuenta_madre_id = venta_id = None
        unique = str(int(time.time())) + "_tpl"
        try:
            compra_tpl.mensaje = "CUSTOM_COMPRA {cliente} | {detalle_accesos} | {fecha_corte} | {monto}"
            await db.commit()

            plat = Plataforma(nombre=f"Plat_{unique}")
            prov = Proveedor(nombre=f"Prov_{unique}", telefono="315" + unique[:7])
            cred = Credencial(email=f"tpl_{unique}@correo.com", password="secret")
            cli = Cliente(nombre=f"Carlos_{unique}", telefono="+57300" + unique[:7], tipo="FINAL")
            db.add_all([plat, prov, cred, cli])
            await db.flush()
            plataforma_id, proveedor_id, credencial_id, cliente_id = plat.id, prov.id, cred.id, cli.id

            cm = CuentaMadre(
                proveedor_id=prov.id, credencial_id=cred.id, plataforma_id=plat.id,
                max_perfiles=1, precio_compra=Decimal("10000.00"),
                fecha_compra=date.today(), fecha_vencimiento=date.today() + timedelta(days=30),
                estado=EstadoCuenta.ACTIVA,
            )
            db.add(cm)
            await db.flush()
            cuenta_madre_id = cm.id
            db.add(Perfil(cuenta_madre_id=cm.id, nombre_perfil="Perfil 1", pin="1111", asignado=False))
            await db.commit()

            venta = await create_venta(db, VentaCreate(
                cliente_id=cli.id,
                fecha_inicio=date.today(),
                fecha_corte=date.today() + timedelta(days=30),
                monto_total=Decimal("25000.00"),
                items=[VentaItemCreate(plataforma_id=plat.id, precio_aplicado=Decimal("25000.00"), tipo_unidad="PANTALLA", cuenta_madre_id=cm.id)],
            ))
            venta_id = venta.id

            url = await generate_whatsapp_consolidated(db, venta_id)
            assert "CUSTOM_COMPRA" in url
            assert f"Carlos_{unique}" in url
        finally:
            await db.rollback()
            compra_tpl.mensaje = original_msg
            await db.commit()
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
async def test_resumen_mensual_por_fecha_inicio_y_renovacion():
    async with SessionLocal() as db:
        await db.rollback()
        unique = str(int(time.time())) + "_fin"
        plataforma_id = proveedor_id = credencial_id = cliente_id = cuenta_madre_id = venta_id = trans_id = None

        # Use a fixed historical month (e.g. 2024-03) and corte in next month (2024-04)
        inicio_marzo = date(2024, 3, 15)
        corte_abril = date(2024, 4, 15)

        try:
            plat = Plataforma(nombre=f"PlatFin_{unique}")
            prov = Proveedor(nombre=f"ProvFin_{unique}", telefono="316" + unique[:7])
            cred = Credencial(email=f"fin_{unique}@correo.com", password="secret")
            cli = Cliente(nombre=f"Lucia_{unique}", telefono="+57301" + unique[:7], tipo="FINAL")
            db.add_all([plat, prov, cred, cli])
            await db.flush()
            plataforma_id, proveedor_id, credencial_id, cliente_id = plat.id, prov.id, cred.id, cli.id

            cm = CuentaMadre(
                proveedor_id=prov.id, credencial_id=cred.id, plataforma_id=plat.id,
                max_perfiles=1, precio_compra=Decimal("12000.00"),
                fecha_compra=inicio_marzo, fecha_vencimiento=corte_abril,
                estado=EstadoCuenta.ACTIVA,
            )
            db.add(cm)
            await db.flush()
            cuenta_madre_id = cm.id
            db.add(Perfil(cuenta_madre_id=cm.id, nombre_perfil="Perfil 1", pin=None, asignado=False))
            await db.commit()

            venta = await create_venta(db, VentaCreate(
                cliente_id=cli.id,
                fecha_inicio=inicio_marzo,
                fecha_corte=corte_abril,
                monto_total=Decimal("30000.00"),
                items=[VentaItemCreate(plataforma_id=plat.id, precio_aplicado=Decimal("30000.00"), tipo_unidad="PANTALLA", cuenta_madre_id=cm.id)],
            ))
            venta_id = venta.id

            # Resumen de marzo 2024 debe incluir la venta de 30000
            res_marzo = await obtener_resumen_mensual(db, 2024, 3)
            assert res_marzo["total_vendido_mes"] >= Decimal("30000.00")
            assert any(v["id"] == venta_id for v in res_marzo["ventas_detalle"])

            # Resumen de abril 2024 NO debe incluirla porque su fecha_corte no cuenta como venta nueva
            res_abril = await obtener_resumen_mensual(db, 2024, 4)
            assert not any(v["id"] == venta_id and v["origen"] == "ACTIVA" for v in res_abril["ventas_detalle"])

            # Al renovar, fecha_inicio pasa a hoy
            await renovar_venta(db, venta_id, date.today() + timedelta(days=30))
            hoy = date.today()
            res_hoy = await obtener_resumen_mensual(db, hoy.year, hoy.month)
            assert any(v["id"] == venta_id for v in res_hoy["ventas_detalle"])
        finally:
            await db.rollback()
            if trans_id:
                await db.execute(delete(Transaccion).where(Transaccion.id == trans_id))
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
async def test_proveedor_multiples_links():
    async with SessionLocal() as db:
        await db.rollback()
        unique = str(int(time.time())) + "_lnk"
        prov_id = None
        try:
            prov_in = ProveedorCreate(
                nombre=f"ProvLinks_{unique}",
                telefono="317" + unique[:7],
                saldo_a_favor=Decimal("0.00"),
                enlaces=[
                    ProveedorEnlaceItem(nombre="WhatsApp", url="wa.me/573001112233"),
                    ProveedorEnlaceItem(nombre="Telegram", url="https://t.me/canal_prov"),
                    ProveedorEnlaceItem(nombre="Catálogo", url="https://ejemplo.com/lista"),
                ],
            )
            created = await create_proveedor(db, prov_in)
            prov_id = created.id
            assert len(created.enlaces) == 3
            assert created.enlaces[0].url == "https://wa.me/573001112233"

            updated = await update_proveedor(
                db,
                prov_id,
                ProveedorUpdate(
                    nombre=created.nombre,
                    telefono=created.telefono,
                    saldo_a_favor=Decimal("5000.00"),
                    enlaces=[
                        ProveedorEnlaceItem(nombre="Soporte", url="https://soporte.ejemplo.com"),
                        ProveedorEnlaceItem(nombre="Grupo 2", url="https://chat.whatsapp.com/abc"),
                    ],
                ),
            )
            assert len(updated.enlaces) == 2
            assert {e.nombre for e in updated.enlaces} == {"Soporte", "Grupo 2"}
        finally:
            await db.rollback()
            if prov_id:
                await db.execute(delete(EnlaceProveedor).where(EnlaceProveedor.proveedor_id == prov_id))
                await db.execute(delete(Proveedor).where(Proveedor.id == prov_id))
            await db.commit()
