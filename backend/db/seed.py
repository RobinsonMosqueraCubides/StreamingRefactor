import os
import sys
import asyncio

# Configurar el path de Python para encontrar los módulos locales del backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from db.database import SessionLocal
from db.models import Plataforma, PlantillaMensaje

async def seed_data():
    print("Iniciando la siembra de datos semilla...")
    async with SessionLocal() as session:
        async with session.begin():
            # Sembrar Plataformas iniciales
            plataformas_nombres = ["Netflix", "Disney+", "Prime Video", "Max", "Crunchyroll", "Spotify"]
            for nombre in plataformas_nombres:
                stmt = select(Plataforma).where(Plataforma.nombre == nombre)
                result = await session.execute(stmt)
                if not result.scalar_one_or_none():
                    session.add(Plataforma(nombre=nombre))
                    print(f"Plataforma '{nombre}' agregada.")
                else:
                    print(f"Plataforma '{nombre}' ya existe.")
            
            # Sembrar Plantillas de WhatsApp (Opción A)
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
                stmt = select(PlantillaMensaje).where(PlantillaMensaje.nombre == p["nombre"])
                result = await session.execute(stmt)
                if not result.scalar_one_or_none():
                    session.add(PlantillaMensaje(nombre=p["nombre"], mensaje=p["mensaje"]))
                    print(f"Plantilla '{p['nombre']}' agregada.")
                else:
                    print(f"Plantilla '{p['nombre']}' ya existe.")
                    
        print("Datos semilla sembrados con éxito.")

if __name__ == "__main__":
    asyncio.run(seed_data())
