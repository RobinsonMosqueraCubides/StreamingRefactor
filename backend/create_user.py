import asyncio
import os
import getpass
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select

# Ajustar path para importar localmente
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.models import Usuario
from core.security import get_password_hash
from core.config import settings

async def create_user():
    print("--- Creación de Usuario Nuevo ---")
    
    # Permitir al usuario ingresar una DATABASE_URL directamente si no está en el .env
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        db_url = input("Ingresa la DATABASE_URL (External Connection String de Render): ").strip()
        if not db_url:
            print("Error: Se requiere una DATABASE_URL.")
            return

    # Adaptar para asyncpg si es postgresql
    if (db_url.startswith("postgres://") or db_url.startswith("postgresql://")) and "+asyncpg" not in db_url:
        db_url = db_url.replace("://", "+asyncpg://", 1)

    engine = create_async_engine(db_url, echo=False)
    SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

    username = input("Nombre de usuario deseado: ").strip()
    if not username:
        print("Error: El nombre de usuario no puede estar vacío.")
        return

    password = getpass.getpass("Contraseña: ")
    confirm_password = getpass.getpass("Confirma la contraseña: ")

    if password != confirm_password:
        print("Error: Las contraseñas no coinciden.")
        return

    if len(password) < 6:
        print("Error: La contraseña debe tener al menos 6 caracteres.")
        return

    async with SessionLocal() as session:
        # Verificar si ya existe
        result = await session.execute(select(Usuario).where(Usuario.username == username))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            print(f"Error: El usuario '{username}' ya existe en la base de datos.")
            return

        hashed_password = get_password_hash(password)
        new_user = Usuario(
            username=username,
            password_hash=hashed_password,
            role="admin"
        )
        session.add(new_user)
        await session.commit()
        print(f"¡Usuario '{username}' creado exitosamente en la base de datos!")

if __name__ == "__main__":
    asyncio.run(create_user())
