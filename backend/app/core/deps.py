from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decodificar_access_token
from app.db.session import get_db
from app.modules.auth.models import ESTADO_ACTIVO, ROL_ADMIN, ROL_CLIENTE, Usuario

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


def requiere_rol(*roles: str, mensaje: str = "No tienes permisos para esta función"):
    """Fábrica de dependencias: deja pasar solo a los roles indicados y devuelve el usuario.

    Uso: `usuario: Usuario = Depends(requiere_rol(ROL_CLIENTE))` o en `dependencies=[...]`.
    """

    def dependencia(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
        if usuario.rol.nombre not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, mensaje)
        return usuario

    return dependencia


# RNF-03 / RN-05: solo el rol Administrador entra a las funciones administrativas
requiere_admin = requiere_rol(ROL_ADMIN, mensaje="No tienes permisos de administrador")

# Archivos, consumo y pagos son del cliente: el admin y soporte no tienen almacenamiento propio
requiere_cliente = requiere_rol(ROL_CLIENTE, mensaje="Esta función es solo para clientes")
