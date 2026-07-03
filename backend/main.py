from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import settings
from db.database import get_db
from api.rutas.catalogos import plataformas_router, combos_router, plantillas_router
from api.rutas.actores import clientes_router, proveedores_router
from api.rutas.inventario import credenciales_router, cuentas_madre_router, perfiles_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configuración de CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Registrar routers de catálogos
app.include_router(plataformas_router, prefix=settings.API_V1_STR)
app.include_router(combos_router, prefix=settings.API_V1_STR)
app.include_router(plantillas_router, prefix=settings.API_V1_STR)

# Registrar routers de actores
app.include_router(clientes_router, prefix=settings.API_V1_STR)
app.include_router(proveedores_router, prefix=settings.API_V1_STR)

# Registrar routers de inventario
app.include_router(credenciales_router, prefix=settings.API_V1_STR)
app.include_router(cuentas_madre_router, prefix=settings.API_V1_STR)
app.include_router(perfiles_router, prefix=settings.API_V1_STR)



@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    error_detail = None
    try:
        # Ejecuta consulta simple para verificar conexión
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        error_detail = str(e)
    
    return {
        "status": "ok",
        "database": db_status,
        "database_error": error_detail
    }

