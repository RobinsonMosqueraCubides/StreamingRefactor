from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import settings
from db.database import get_db

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
