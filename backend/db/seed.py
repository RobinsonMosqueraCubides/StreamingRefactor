import os
import sys
import asyncio
import logging
from datetime import date, timedelta, datetime
from decimal import Decimal

# Configurar el path de Python para encontrar los módulos locales del backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("seed")

from sqlalchemy import select, delete
from db.database import SessionLocal
from db.models import (
    Plataforma, PlantillaMensaje, Usuario, Proveedor, Credencial, CuentaMadre, Perfil, 
    Cliente, Combo, Venta, DetalleVenta, PagoVenta, Transaccion, GarantiaCliente, GarantiaProveedor,
    TipoCliente, EstadoCliente, EstadoCuenta, EstadoPago, EntidadFinanciera, TipoTransaccion, TipoGarantiaProveedor
)
from core.security import get_password_hash
from core.encryption import encrypt_password

async def seed_data():
    logger.info("Iniciando la siembra de datos semilla realistas y completos...")
    async with SessionLocal() as session:
        async with session.begin():
            # 1. Limpiar tablas existentes en orden de dependencia para evitar conflictos de datos anteriores
            # (Útil para pruebas limpias)
            await session.execute(delete(GarantiaProveedor))
            await session.execute(delete(GarantiaCliente))
            await session.execute(delete(Transaccion))
            await session.execute(delete(PagoVenta))
            await session.execute(delete(DetalleVenta))
            await session.execute(delete(Venta))
            await session.execute(delete(Combo))
            await session.execute(delete(Perfil))
            await session.execute(delete(CuentaMadre))
            await session.execute(delete(Credencial))
            await session.execute(delete(Proveedor))
            await session.execute(delete(Cliente))
            await session.execute(delete(Plataforma))
            await session.execute(delete(PlantillaMensaje))
            await session.execute(delete(Usuario))
            logger.info("Tablas limpiadas con éxito.")

            # 2. Sembrar Usuario Administrador
            admin_user = Usuario(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            session.add(admin_user)
            logger.info("Usuario 'admin' agregado.")

            # 3. Sembrar Plataformas
            plataforma_map = {}
            plataformas_nombres = ["Netflix", "Spotify", "Disney+", "Max", "Prime Video", "Crunchyroll"]
            for nombre in plataformas_nombres:
                plat = Plataforma(nombre=nombre)
                session.add(plat)
                plataforma_map[nombre] = plat
            logger.info("Plataformas agregadas.")

            # 4. Sembrar Proveedores Reales (ETB, Claro, Movistar, etc.)
            proveedor_map = {}
            proveedores_data = [
                {"nombre": "Claro Mayorista", "telefono": "+573102223344", "saldo_a_favor": Decimal("0.00")},
                {"nombre": "Movistar Cuentas", "telefono": "+573167778899", "saldo_a_favor": Decimal("15000.00")},
                {"nombre": "ETB Distribuciones", "telefono": "+573005556677", "saldo_a_favor": Decimal("0.00")},
                {"nombre": "Red Externa Premium", "telefono": "+573159990011", "saldo_a_favor": Decimal("50000.00")},
            ]
            for prov_data in proveedores_data:
                prov = Proveedor(
                    nombre=prov_data["nombre"],
                    telefono=prov_data["telefono"],
                    saldo_a_favor=prov_data["saldo_a_favor"]
                )
                session.add(prov)
                proveedor_map[prov_data["nombre"]] = prov
            logger.info("Proveedores agregados.")

            # 5. Sembrar Credenciales de Cuentas (correos reales de inventario)
            credenciales_data = [
                {"email": "netflix.premium.claro1@gmail.com", "pass": "ClaroNet2026*"},
                {"email": "netflix.familiar.etb2@hotmail.com", "pass": "EtbNetPass99!"},
                {"email": "spotify.premium.movi@gmail.com", "pass": "MoviSpoti2026"},
                {"email": "disney.familiar.claro@gmail.com", "pass": "DisneyClaro88"},
                {"email": "max.premium.red@outlook.com", "pass": "MaxRedPass777"},
            ]
            credencial_map = {}
            for cred_d in credenciales_data:
                cred = Credencial(
                    email=cred_d["email"],
                    # La propiedad password llama internamente a la encriptación
                    _password=encrypt_password(cred_d["pass"])
                )
                session.add(cred)
                credencial_map[cred_d["email"]] = cred
            logger.info("Credenciales agregadas.")

            # 6. Sembrar Cuentas Madre
            hoy = date.today()
            cuenta_madre_map = {}
            
            # Cuenta Netflix Claro (Activa, 5 perfiles)
            cm_netflix1 = CuentaMadre(
                proveedor=proveedor_map["Claro Mayorista"],
                credencial=credencial_map["netflix.premium.claro1@gmail.com"],
                plataforma=plataforma_map["Netflix"],
                max_perfiles=5,
                precio_compra=Decimal("28000.00"),
                fecha_compra=hoy - timedelta(days=15),
                fecha_vencimiento=hoy + timedelta(days=15),
                estado=EstadoCuenta.ACTIVA
            )
            session.add(cm_netflix1)
            cuenta_madre_map["netflix1"] = cm_netflix1

            # Cuenta Netflix ETB (Vencida, para pruebas de corte/renovación)
            cm_netflix2 = CuentaMadre(
                proveedor=proveedor_map["ETB Distribuciones"],
                credencial=credencial_map["netflix.familiar.etb2@hotmail.com"],
                plataforma=plataforma_map["Netflix"],
                max_perfiles=5,
                precio_compra=Decimal("28000.00"),
                fecha_compra=hoy - timedelta(days=35),
                fecha_vencimiento=hoy - timedelta(days=5),
                estado=EstadoCuenta.VENCIDA
            )
            session.add(cm_netflix2)
            cuenta_madre_map["netflix2"] = cm_netflix2

            # Cuenta Spotify Movistar (Activa, 6 perfiles)
            cm_spotify = CuentaMadre(
                proveedor=proveedor_map["Movistar Cuentas"],
                credencial=credencial_map["spotify.premium.movi@gmail.com"],
                plataforma=plataforma_map["Spotify"],
                max_perfiles=6,
                precio_compra=Decimal("15000.00"),
                fecha_compra=hoy - timedelta(days=10),
                fecha_vencimiento=hoy + timedelta(days=20),
                estado=EstadoCuenta.ACTIVA
            )
            session.add(cm_spotify)
            cuenta_madre_map["spotify"] = cm_spotify

            # Cuenta Disney+ Claro (Caída / Soporte en proceso)
            cm_disney = CuentaMadre(
                proveedor=proveedor_map["Claro Mayorista"],
                credencial=credencial_map["disney.familiar.claro@gmail.com"],
                plataforma=plataforma_map["Disney+"],
                max_perfiles=4,
                precio_compra=Decimal("20000.00"),
                fecha_compra=hoy - timedelta(days=5),
                fecha_vencimiento=hoy + timedelta(days=25),
                estado=EstadoCuenta.CAIDA
            )
            session.add(cm_disney)
            cuenta_madre_map["disney"] = cm_disney

            # Cuenta Max Red Externa (Activa, 5 perfiles)
            cm_max = CuentaMadre(
                proveedor=proveedor_map["Red Externa Premium"],
                credencial=credencial_map["max.premium.red@outlook.com"],
                plataforma=plataforma_map["Max"],
                max_perfiles=5,
                precio_compra=Decimal("22000.00"),
                fecha_compra=hoy - timedelta(days=2),
                fecha_vencimiento=hoy + timedelta(days=28),
                estado=EstadoCuenta.ACTIVA
            )
            session.add(cm_max)
            cuenta_madre_map["max"] = cm_max
            
            logger.info("Cuentas Madre agregadas.")

            # 7. Sembrar Perfiles para las Cuentas Madre
            perfiles_map = {}
            
            # Perfiles Netflix 1 (Activa)
            for i in range(1, 6):
                p = Perfil(
                    cuenta_madre=cm_netflix1,
                    nombre_perfil=f"Perfil {i}",
                    pin=f"100{i}",
                    asignado=False,
                    reportado=False
                )
                session.add(p)
                perfiles_map[f"netflix1_p{i}"] = p

            # Perfiles Netflix 2 (Vencida)
            for i in range(1, 6):
                p = Perfil(
                    cuenta_madre=cm_netflix2,
                    nombre_perfil=f"Perfil {i}",
                    pin=f"200{i}",
                    asignado=True, # Ya asignados en su momento
                    reportado=False
                )
                session.add(p)
                perfiles_map[f"netflix2_p{i}"] = p

            # Perfiles Spotify (Activa)
            for i in range(1, 7):
                p = Perfil(
                    cuenta_madre=cm_spotify,
                    nombre_perfil=f"Miembro {i}",
                    pin=None,
                    asignado=False,
                    reportado=False
                )
                session.add(p)
                perfiles_map[f"spotify_p{i}"] = p

            # Perfiles Disney+ (Caída)
            for i in range(1, 5):
                p = Perfil(
                    cuenta_madre=cm_disney,
                    nombre_perfil=f"Familia {i}",
                    pin=f"300{i}",
                    asignado=True,
                    reportado=True # Uno reportado
                )
                session.add(p)
                perfiles_map[f"disney_p{i}"] = p

            # Perfiles Max (Activa)
            for i in range(1, 6):
                p = Perfil(
                    cuenta_madre=cm_max,
                    nombre_perfil=f"Cine {i}",
                    pin=f"400{i}",
                    asignado=False,
                    reportado=False
                )
                session.add(p)
                perfiles_map[f"max_p{i}"] = p

            logger.info("Perfiles privados y compartidos agregados.")

            # 8. Sembrar Clientes Reales
            cliente_map = {}
            clientes_data = [
                {"nombre": "Carlos Gómez", "telefono": "+573001112222", "tipo": TipoCliente.FINAL, "estado": EstadoCliente.ACTIVO},
                {"nombre": "Laura Rodríguez", "telefono": "+573123334444", "tipo": TipoCliente.FINAL, "estado": EstadoCliente.ACTIVO},
                {"nombre": "Andrés Felipe (Revendedor)", "telefono": "+573215556666", "tipo": TipoCliente.REVENDEDOR, "estado": EstadoCliente.ACTIVO},
                {"nombre": "Diana Marcela (Baneada)", "telefono": "+573109998888", "tipo": TipoCliente.FINAL, "estado": EstadoCliente.BANEADO},
            ]
            for cl_d in clientes_data:
                cli = Cliente(
                    nombre=cl_d["nombre"],
                    telefono=cl_d["telefono"],
                    tipo=cl_d["tipo"],
                    estado=cl_d["estado"],
                    dias_gracia_max=3
                )
                session.add(cli)
                cliente_map[cl_d["nombre"]] = cli
            logger.info("Clientes agregados.")

            # 9. Sembrar Combos (Ej: Combo Netflix + Spotify)
            combo_duo = Combo(
                nombre="Dúo Entretenimiento (Netflix + Spotify)",
                precio_combo=Decimal("18000.00")
            )
            session.add(combo_duo)
            logger.info("Combos agregados.")

            # 10. Marcar algunos perfiles como asignados para las ventas a sembrar
            perfiles_map["netflix1_p1"].asignado = True
            perfiles_map["netflix1_p2"].asignado = True
            perfiles_map["spotify_p1"].asignado = True
            perfiles_map["spotify_p2"].asignado = True
            perfiles_map["max_p1"].asignado = True

            # 11. Sembrar Ventas, Detalles de Ventas y Pagos
            # Venta 1: Carlos Gómez compra 1 perfil de Netflix 1 (Activo y Pagado)
            v1 = Venta(
                cliente=cliente_map["Carlos Gómez"],
                fecha_corte=hoy + timedelta(days=15),
                monto_total=Decimal("12000.00"),
                estado_pago=EstadoPago.PAGADO
            )
            session.add(v1)
            dv1 = DetalleVenta(
                venta=v1,
                cuenta_madre=cm_netflix1,
                perfil=perfiles_map["netflix1_p1"],
                precio_aplicado=Decimal("12000.00")
            )
            session.add(dv1)
            p1 = PagoVenta(
                venta=v1,
                monto=Decimal("12000.00"),
                entidad=EntidadFinanciera.NEQUI,
                fecha=datetime.now() - timedelta(days=15)
            )
            session.add(p1)

            # Venta 2: Laura Rodríguez compra Combo Dúo (Pago Parcial)
            v2 = Venta(
                cliente=cliente_map["Laura Rodríguez"],
                fecha_corte=hoy + timedelta(days=20),
                monto_total=Decimal("18000.00"),
                estado_pago=EstadoPago.PAGO_PARCIAL
            )
            session.add(v2)
            dv2_1 = DetalleVenta(
                venta=v2,
                combo=combo_duo,
                cuenta_madre=cm_netflix1,
                perfil=perfiles_map["netflix1_p2"],
                precio_aplicado=Decimal("10000.00")
            )
            dv2_2 = DetalleVenta(
                venta=v2,
                combo=combo_duo,
                cuenta_madre=cm_spotify,
                perfil=perfiles_map["spotify_p1"],
                precio_aplicado=Decimal("8000.00")
            )
            session.add(dv2_1)
            session.add(dv2_2)
            p2 = PagoVenta(
                venta=v2,
                monto=Decimal("10000.00"),
                entidad=EntidadFinanciera.DAVIPLATA,
                fecha=datetime.now() - timedelta(days=10)
            )
            session.add(p2)

            # Venta 3: Andrés Felipe (Revendedor) compra 1 perfil de Spotify y 1 de Max (Pendiente de pago)
            v3 = Venta(
                cliente=cliente_map["Andrés Felipe (Revendedor)"],
                fecha_corte=hoy + timedelta(days=28),
                monto_total=Decimal("15000.00"),
                estado_pago=EstadoPago.PENDIENTE
            )
            session.add(v3)
            dv3_1 = DetalleVenta(
                venta=v3,
                cuenta_madre=cm_spotify,
                perfil=perfiles_map["spotify_p2"],
                precio_aplicado=Decimal("7000.00")
            )
            dv3_2 = DetalleVenta(
                venta=v3,
                cuenta_madre=cm_max,
                perfil=perfiles_map["max_p1"],
                precio_aplicado=Decimal("8000.00")
            )
            session.add(dv3_1)
            session.add(dv3_2)

            logger.info("Ventas, detalles y pagos sembrados.")

            # 12. Sembrar Transacciones de Caja (Ingresos y Egresos)
            # Primero hacemos un flush para que SQLAlchemy asigne los IDs autoincrementales a las ventas y cuentas
            await session.flush()

            t1 = Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="PAGO_VENTA",
                monto=Decimal("12000.00"),
                entidad=EntidadFinanciera.NEQUI,
                referencia_id=v1.id,
                fecha=datetime.now() - timedelta(days=15)
            )
            t2 = Transaccion(
                tipo=TipoTransaccion.INGRESO,
                categoria="PAGO_VENTA",
                monto=Decimal("10000.00"),
                entidad=EntidadFinanciera.DAVIPLATA,
                referencia_id=v2.id,
                fecha=datetime.now() - timedelta(days=10)
            )
            t3 = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("28000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=cm_netflix1.id,
                fecha=datetime.now() - timedelta(days=15)
            )
            t4 = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("28000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=cm_netflix2.id,
                fecha=datetime.now() - timedelta(days=35)
            )
            t5 = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("15000.00"),
                entidad=EntidadFinanciera.NEQUI,
                referencia_id=cm_spotify.id,
                fecha=datetime.now() - timedelta(days=10)
            )
            t6 = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("20000.00"),
                entidad=EntidadFinanciera.BANCOLOMBIA,
                referencia_id=cm_disney.id,
                fecha=datetime.now() - timedelta(days=5)
            )
            t7 = Transaccion(
                tipo=TipoTransaccion.EGRESO,
                categoria="COMPRA_CUENTA",
                monto=Decimal("22000.00"),
                entidad=EntidadFinanciera.DAVIPLATA,
                referencia_id=cm_max.id,
                fecha=datetime.now() - timedelta(days=2)
            )
            session.add_all([t1, t2, t3, t4, t5, t6, t7])
            logger.info("Transacciones de caja agregadas de forma coherente para todo el inventario.")

            # 13. Garantías de Cliente y de Proveedor
            # Garantía de Cliente: Disney+ cayó, por lo tanto reportamos garantía
            g_cliente = GarantiaCliente(
                detalle_venta=dv1, # Relacionada a Carlos Gómez
                perfil_anterior=perfiles_map["netflix1_p1"],
                resuelto=False
            )
            session.add(g_cliente)

            # Garantía de Proveedor: La cuenta Disney+ del Claro Mayorista cayó
            g_prov = GarantiaProveedor(
                cuenta_madre=cm_disney,
                tipo_garantia=TipoGarantiaProveedor.CAMBIO_CUENTA,
                resuelto=False
            )
            session.add(g_prov)
            logger.info("Garantías agregadas.")

            # 14. Plantillas de Mensaje para Notificaciones
            plantillas = [
                {
                    "nombre": "cobro",
                    "mensaje": "Hola [Nombre Cliente], te recordamos que tu suscripción de {plataforma} vence pronto. Puedes renovarla realizando el pago de {monto} COP."
                },
                {
                    "nombre": "corte",
                    "mensaje": "Hola [Nombre Cliente], tu suscripción de {plataforma} ha vencido y los perfiles asociados han sido suspendidos. Realiza tu pago para reactivarlos."
                },
                {
                    "nombre": "cambio_credenciales",
                    "mensaje": "Hola [Nombre Cliente], las credenciales de acceso a tu pantalla de {plataforma} han sido actualizadas.\nUsuario: {email}\nContraseña: {password}\nPIN: {pin}"
                }
            ]
            for p in plantillas:
                session.add(PlantillaMensaje(nombre=p["nombre"], mensaje=p["mensaje"]))
            logger.info("Plantillas de mensaje agregadas.")

        logger.info("¡Datos semilla sembrados con éxito de manera realista y estructurada!")

if __name__ == "__main__":
    asyncio.run(seed_data())
