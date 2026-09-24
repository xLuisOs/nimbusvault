import re
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


def _validar_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
        raise ValueError("La contraseña debe incluir letras y números")
    return v


class RegistroIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    password: str = Field(max_length=72)  # bcrypt solo usa los primeros 72 bytes
    acepto_terminos: bool

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, v: str) -> str:
        return " ".join(v.split())

    @field_validator("password")
    @classmethod
    def password_segura(cls, v: str) -> str:
        return _validar_password(v)

    @field_validator("acepto_terminos")
    @classmethod
    def debe_aceptar(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debes aceptar los términos de servicio")
        return v


class LoginIn(BaseModel):
    correo: str = Field(max_length=255)  # sin validar formato: si no existe, simplemente falla el login
    password: str = Field(max_length=72)


class CorreoIn(BaseModel):
    correo: EmailStr


class TokenIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class RestablecerIn(TokenIn):
    password: str = Field(max_length=72)

    @field_validator("password")
    @classmethod
    def password_segura(cls, v: str) -> str:
        return _validar_password(v)


class MensajeOut(BaseModel):
    mensaje: str


class SuscripcionResumen(BaseModel):
    id_suscripcion: UUID
    plan_codigo: str
    plan_nombre: str
    almacenamiento_gb: int
    precio_contratado: Decimal
    fecha_inicio: datetime
    fecha_fin: datetime
    estado: str


class UsuarioOut(BaseModel):
    id_usuario: UUID
    nombre: str
    correo: str
    rol: str
    estado: str
    creado_en: datetime
    almacenamiento_usado_bytes: int
    suscripcion: SuscripcionResumen | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expira_en_segundos: int
    usuario: UsuarioOut
