from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Zona horaria oficial del negocio (Colombia: UTC-5 sin cambio de horario)
try:
    BOGOTA_TZ = ZoneInfo("America/Bogota")
except (ZoneInfoNotFoundError, Exception):
    # Fallback confiable para entornos Windows locales sin el paquete tzdata del sistema
    BOGOTA_TZ = timezone(timedelta(hours=-5), name="America/Bogota")

def get_bogota_now() -> datetime:
    """Retorna la fecha y hora actual en la zona horaria de Colombia (America/Bogota) con tzinfo."""
    return datetime.now(BOGOTA_TZ)

def get_bogota_now_naive() -> datetime:
    """
    Retorna datetime actual de Colombia sin tzinfo.
    Ideal para columnas DateTime naive en SQLAlchemy (guarda exactamente año, mes, día, hora de Colombia).
    """
    return datetime.now(BOGOTA_TZ).replace(tzinfo=None)

def get_bogota_date() -> date:
    """Retorna la fecha actual (solo año, mes, día) en la zona horaria de Colombia."""
    return datetime.now(BOGOTA_TZ).date()
