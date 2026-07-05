from fastapi import FastAPI, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from core.exceptions import NotFoundError, BusinessRuleError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import time
import logging

from core.config import settings
from core.logging_config import setup_logging
from db.database import get_db

from api.deps import get_current_user
from api.rutas.auth import auth_router
from api.rutas.catalogos import plataformas_router, combos_router, plantillas_router
from api.rutas.actores import clientes_router, proveedores_router
from api.rutas.inventario import credenciales_router, cuentas_madre_router, perfiles_router
from api.rutas.ventas import ventas_router
from api.rutas.finanzas import finanzas_router, pagos_router
from api.rutas.garantias import garantias_router
from api.rutas.garantias_proveedores import garantias_prov_router

# Inicializar configuración de logging
setup_logging()
logger = logging.getLogger("api")
access_logger = logging.getLogger("api.access")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": exc.message},
    )

@app.exception_handler(BusinessRuleError)
async def business_rule_exception_handler(request: Request, exc: BusinessRuleError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message},
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = f"{process_time:.2f}ms"
    access_logger.info(
        f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Duration: {formatted_process_time}"
    )
    return response


# Configuración de CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Registrar router de autenticación (PÚBLICO)
app.include_router(auth_router, prefix=settings.API_V1_STR)

# Dependencia de seguridad para el resto de endpoints
auth_dep = [Depends(get_current_user)]

# Registrar routers de catálogos
app.include_router(plataformas_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(combos_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(plantillas_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar routers de actores
app.include_router(clientes_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(proveedores_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar routers de inventario
app.include_router(credenciales_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(cuentas_madre_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(perfiles_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar routers de ventas
app.include_router(ventas_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar routers de finanzas y pagos
app.include_router(finanzas_router, prefix=settings.API_V1_STR, dependencies=auth_dep)
app.include_router(pagos_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar router de garantías de clientes
app.include_router(garantias_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

# Registrar router de garantías de proveedores
app.include_router(garantias_prov_router, prefix=settings.API_V1_STR, dependencies=auth_dep)

@app.get("/health")
async def health_check(response: Response, db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    error_detail = None
    try:
        # Ejecuta consulta simple para verificar conexión
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        error_detail = str(e)
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return {
        "status": "ok" if db_status == "connected" else "error",
        "database": db_status,
        "database_error": error_detail
    }
