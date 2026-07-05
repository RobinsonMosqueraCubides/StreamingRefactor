from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.database import get_db
from db.models import Usuario
from core.security import verify_password, create_access_token
from schemas.usuario_schemas import Token, UsuarioResponse
from api.deps import get_current_user

auth_router = APIRouter(prefix="/auth", tags=["Autenticación"])

@auth_router.post(
    "/login",
    response_model=Token,
    summary="Iniciar sesión",
    responses={401: {"description": "Credenciales inválidas"}}
)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Autenticar usuario y obtener token JWT de acceso."""
    result = await db.execute(select(Usuario).where(Usuario.username == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@auth_router.get(
    "/me",
    response_model=UsuarioResponse,
    summary="Obtener perfil de usuario autenticado",
    responses={401: {"description": "Token JWT ausente o inválido"}}
)
async def read_users_me(current_user: Usuario = Depends(get_current_user)):
    """Retornar la información del usuario autenticado en la sesión actual."""
    return current_user

