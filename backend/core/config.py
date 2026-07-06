import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Streaming ERP API"
    API_V1_STR: str = "/api/v1"
    
    # Base de datos
    DATABASE_URL: str = "sqlite+aiosqlite:///./streaming_erp.db"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://streamingfrontend-vave.onrender.com"
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if not v:
            return "sqlite+aiosqlite:///./streaming_erp.db"
        # Si es una URL de PostgreSQL y no usa asyncpg, la adaptamos para async
        if (v.startswith("postgres://") or v.startswith("postgresql://")) and "+asyncpg" not in v:
            return v.replace("://", "+asyncpg://", 1)
        # Si es una URL de SQLite y no usa aiosqlite, la adaptamos para async
        if v.startswith("sqlite://") and "+aiosqlite" not in v:
            return v.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return v

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
