from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decodificar_access_token
from app.db.session import get_db
from app.modules.auth.models import ESTADO_ACTIVO, ROL_ADMIN, Usuario

bearer = HTTPBearer(auto_error=False)


def get_usuario_actual(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    no_autorizado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada")
    if cred is None:
        raise no_autorizado
    try:
        payload = decodificar_access_token(cred.credentials)
        id_usuario = UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise no_autorizado

    usuario = db.get(Usuario, id_usuario)
    if usuario is None or usuario.estado != ESTADO_ACTIVO:
        raise no_autorizado
    return usuario


def requiere_admin(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    # RNF-03 / RN-05: solo el rol Administrador entra a las funciones administrativas
    if usuario.rol.nombre != ROL_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos de administrador")
    return usuario
