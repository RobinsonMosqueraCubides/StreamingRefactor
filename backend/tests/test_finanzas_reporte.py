from datetime import date, datetime
from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from db.database import Base, get_db
from db.models import (
    Plataforma, Proveedor, Credencial, CuentaMadre, Cliente, Venta,
    DetalleVenta, PagoVenta, Transaccion, TipoTransaccion, EntidadFinanciera,
    EstadoPago, EstadoCuenta,
)
from api.deps import get_current_user
from main import app


@pytest.fixture
async def seeded_client():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as db:
        plat = Plataforma(nombre="Netflix")
        prov = Proveedor(nombre="Proveedor Alpha", telefono="3001112233")
        cred = Credencial(email="cuenta@netflix.test", password="secret")
        cli = Cliente(nombre="Juan Pérez", telefono="3119998877")
        db.add_all([plat, prov, cred, cli])
        await db.flush()

        cm = CuentaMadre(
            proveedor_id=prov.id,
            credencial_id=cred.id,
            plataforma_id=plat.id,
            max_perfiles=5,
            precio_compra=Decimal("30000.00"),
            fecha_compra=date(2026, 3, 5),
            fecha_vencimiento=date(2026, 4, 5),
            estado=EstadoCuenta.ACTIVA,
        )
        db.add(cm)
        await db.flush()

        # Venta 1 (Marzo): PAGO_PARCIAL de 20.000 (abonado 8.000, pendiente 12.000)
        v1 = Venta(
            cliente_id=cli.id,
            fecha_inicio=date(2026, 3, 10),
            fecha_corte=date(2026, 4, 10),
            monto_total=Decimal("20000.00"),
            estado_pago=EstadoPago.PAGO_PARCIAL,
            tipo_venta="PANTALLA",
        )
        # Venta 2 (Abril): PENDIENTE de 15.000
        v2 = Venta(
            cliente_id=cli.id,
            fecha_inicio=date(2026, 4, 2),
            fecha_corte=date(2026, 5, 2),
            monto_total=Decimal("15000.00"),
            estado_pago=EstadoPago.PENDIENTE,
            tipo_venta="PANTALLA",
        )
        # Venta 3 (Abril): PAGADO de 18.000 (no suma a Por Cobrar)
        v3 = Venta(
            cliente_id=cli.id,
            fecha_inicio=date(2026, 4, 15),
            fecha_corte=date(2026, 5, 15),
            monto_total=Decimal("18000.00"),
            estado_pago=EstadoPago.PAGADO,
            tipo_venta="PANTALLA",
        )
        db.add_all([v1, v2, v3])
        await db.flush()

        db.add_all([
            DetalleVenta(venta_id=v1.id, cuenta_madre_id=cm.id, precio_aplicado=Decimal("20000.00")),
            DetalleVenta(venta_id=v2.id, cuenta_madre_id=cm.id, precio_aplicado=Decimal("15000.00")),
            DetalleVenta(venta_id=v3.id, cuenta_madre_id=cm.id, precio_aplicado=Decimal("18000.00")),
            PagoVenta(venta_id=v1.id, monto=Decimal("8000.00"), entidad=EntidadFinanciera.NEQUI, fecha=datetime(2026, 3, 10, 12, 0)),
            PagoVenta(venta_id=v3.id, monto=Decimal("18000.00"), entidad=EntidadFinanciera.BANCOLOMBIA, fecha=datetime(2026, 4, 15, 15, 0)),
        ])

        db.add_all([
            # Compra inicial en Marzo
            Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("30000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=cm.id,
                fecha=datetime(2026, 3, 5, 10, 0),
            ),
            # Gasto manual en Marzo
            Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="Internet",
                monto=Decimal("5000.00"),
                entidad=EntidadFinanciera.NEQUI,
                referencia_id=None,
                fecha=datetime(2026, 3, 12, 14, 0),
            ),
            # Ingreso parcial venta 1 en Marzo
            Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="PAGO_VENTA",
                monto=Decimal("8000.00"),
                entidad=EntidadFinanciera.NEQUI,
                referencia_id=v1.id,
                fecha=datetime(2026, 3, 10, 12, 0),
            ),
            # Renovación misma cuenta en Abril
            Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("30000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=cm.id,
                fecha=datetime(2026, 4, 5, 9, 0),
            ),
            # Ingreso venta 3 en Abril
            Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="PAGO_VENTA",
                monto=Decimal("18000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=v3.id,
                fecha=datetime(2026, 4, 15, 15, 0),
            ),
        ])
        await db.commit()

    async def override_get_db():
        async with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "username": "admin"}

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


@pytest.mark.asyncio
async def test_reporte_anual_y_mensual(seeded_client: AsyncClient):
    # 1. Vista Anual 2026
    res_anio = await seeded_client.get("/api/v1/finanzas/reporte?anio=2026")
    assert res_anio.status_code == 200
    data = res_anio.json()

    assert data["modo"] == "ANIO"
    assert Decimal(data["ingresos_totales"]) == Decimal("26000.00")
    assert Decimal(data["egresos_cuentas_madre"]) == Decimal("60000.00")
    assert Decimal(data["egresos_otros"]) == Decimal("5000.00")
    assert Decimal(data["egresos_totales"]) == Decimal("65000.00")
    assert Decimal(data["balance_neto"]) == Decimal("-39000.00")
    assert Decimal(data["por_cobrar_periodo"]) == Decimal("27000.00")
    assert Decimal(data["por_cobrar_global"]) == Decimal("27000.00")
    assert len(data["resumen_anual"]) == 12

    marzo = data["resumen_anual"][2]
    assert marzo["etiqueta"] == "Marzo"
    assert Decimal(marzo["ingresos"]) == Decimal("8000.00")
    assert Decimal(marzo["egresos_compras"]) == Decimal("30000.00")
    assert Decimal(marzo["egresos_otros"]) == Decimal("5000.00")
    assert Decimal(marzo["por_cobrar"]) == Decimal("12000.00")

    abril = data["resumen_anual"][3]
    assert abril["etiqueta"] == "Abril"
    assert Decimal(abril["ingresos"]) == Decimal("18000.00")
    assert Decimal(abril["egresos_compras"]) == Decimal("30000.00")
    assert Decimal(abril["por_cobrar"]) == Decimal("15000.00")

    # 2. Vista Mes Específico (Abril 2026) -> debe distinguir Renovación y filtrar detalle
    res_mes = await seeded_client.get("/api/v1/finanzas/reporte?anio=2026&mes=4")
    assert res_mes.status_code == 200
    data_abr = res_mes.json()

    assert data_abr["modo"] == "MES"
    assert Decimal(data_abr["ingresos_totales"]) == Decimal("18000.00")
    assert Decimal(data_abr["egresos_totales"]) == Decimal("30000.00")
    assert Decimal(data_abr["por_cobrar_periodo"]) == Decimal("15000.00")
    assert Decimal(data_abr["por_cobrar_global"]) == Decimal("27000.00")
    assert len(data_abr["compras_detalle"]) == 1
    assert data_abr["compras_detalle"][0]["plataforma"] == "Netflix"
    assert data_abr["compras_detalle"][0]["correo"] == "cuenta@netflix.test"
    assert data_abr["compras_detalle"][0]["proveedor"] == "Proveedor Alpha"
    assert data_abr["compras_detalle"][0]["tipo_movimiento"] == "Renovación"
    assert len(data_abr["otros_egresos_detalle"]) == 0
    assert len(data_abr["ingresos_detalle"]) == 1
    assert "Juan Pérez" in data_abr["ingresos_detalle"][0]["detalle"]


@pytest.mark.asyncio
async def test_reporte_rango_fechas(seeded_client: AsyncClient):
    res_rango = await seeded_client.get(
        "/api/v1/finanzas/reporte?anio=2026&fecha_inicio=2026-03-01&fecha_fin=2026-03-31"
    )
    assert res_rango.status_code == 200
    data = res_rango.json()

    assert data["modo"] == "RANGO"
    assert Decimal(data["ingresos_totales"]) == Decimal("8000.00")
    assert Decimal(data["egresos_cuentas_madre"]) == Decimal("30000.00")
    assert Decimal(data["egresos_otros"]) == Decimal("5000.00")
    assert Decimal(data["por_cobrar_periodo"]) == Decimal("12000.00")
    assert Decimal(data["por_cobrar_global"]) == Decimal("27000.00")
    assert data["compras_detalle"][0]["tipo_movimiento"] == "Compra"
    assert data["otros_egresos_detalle"][0]["categoria"] == "Internet"

    # Rango inválido debe devolver 400
    res_bad = await seeded_client.get(
        "/api/v1/finanzas/reporte?anio=2026&fecha_inicio=2026-04-10&fecha_fin=2026-03-01"
    )
    assert res_bad.status_code == 400
