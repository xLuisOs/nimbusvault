import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
import jwt

from app.core.config import settings


def ahora() -> datetime:
    return datetime.now(timezone.utc)


# ── Contraseñas (RNF-01) ──────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


# ── JWT de acceso (RNF-02) ────────────────────────────────────────────────────

def crear_access_token(id_usuario: UUID, rol: str) -> str:
    exp = ahora() + timedelta(minutes=settings.access_token_minutos)
    payload = {"sub": str(id_usuario), "rol": rol, "tipo": "access", "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algoritmo)


def decodificar_access_token(token: str) -> dict:
    """Lanza jwt.PyJWTError si el token no es válido o ya expiró."""
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algoritmo])
    if payload.get("tipo") != "access":
        raise jwt.InvalidTokenError("Tipo de token incorrecto")
    return payload


# ── Tokens opacos (verificación, recuperación, refresh) ───────────────────────
# Al usuario se le entrega el token en claro; en la BD solo se guarda su hash,
# así una filtración de la tabla no permite usar los enlaces.

def generar_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
