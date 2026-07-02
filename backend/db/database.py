from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from core.config import settings

# Determinar argumentos de conexión especiales para SQLite
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Crear motor asíncrono
engine = create_async_engine(
    settings.DATABASE_URL, 
    connect_args=connect_args,
    echo=True
)

# Crear fábrica de sesiones asíncronas
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Dependencia para obtener la sesión de BD
async def get_db():
    async with SessionLocal() as session:
        yield session
