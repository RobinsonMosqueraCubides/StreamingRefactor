from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import settings

class Base(DeclarativeBase):
    pass

# Determinar argumentos de conexión especiales para SQLite
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Crear motor asíncrono
engine = create_async_engine(
    settings.DATABASE_URL, 
    connect_args=connect_args,
    echo=False
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

from sqlalchemy import select
from core.exceptions import NotFoundError

async def get_or_404(db: AsyncSession, model, ident: int, options=None):
    stmt = select(model).where(model.id == ident)
    if options:
        for opt in options:
            stmt = stmt.options(opt)
    result = await db.execute(stmt)
    entity = result.scalar_one_or_none()
    if not entity:
        raise NotFoundError(f"{model.__name__} con id {ident} no encontrado/a")
    return entity

