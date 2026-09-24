import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, SmallInteger, String, Uuid, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas

ROL_ADMIN = "ADMINISTRADOR"
ROL_CLIENTE = "CLIENTE"
ROL_SOPORTE = "SOPORTE"

ESTADO_PENDIENTE = "pendiente"
ESTADO_ACTIVO = "activo"
ESTADO_SUSPENDIDO = "suspendido"

TOKEN_VERIFICACION = "verificacion"
TOKEN_RECUPERACION = "recuperacion"


class Rol(Base):
    __tablename__ = "roles"

    id_rol: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(30), unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(200))


class Usuario(ConFechas, Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint("estado IN ('pendiente','activo','suspendido')", name="ck_usuarios_estado"),
        CheckConstraint("almacenamiento_usado_bytes >= 0", name="ck_usuarios_uso_positivo"),
    )

    id_usuario: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_rol: Mapped[int] = mapped_column(ForeignKey("roles.id_rol"))
    nombre: Mapped[str] = mapped_column(String(120))
    correo: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    estado: Mapped[str] = mapped_column(String(20), default=ESTADO_PENDIENTE)
    correo_verificado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acepto_terminos_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Se actualiza en la misma transacción que sube/borra archivos (Avance 2)
    almacenamiento_usado_bytes: Mapped[int] = mapped_column(BigInteger, default=0)

    rol: Mapped[Rol] = relationship(lazy="joined")


class TokenUsuario(Base):
    """Tokens de un solo uso: verificación de correo y recuperación de contraseña."""

    __tablename__ = "tokens_usuario"
    __table_args__ = (
        CheckConstraint("tipo IN ('verificacion','recuperacion')", name="ck_tokens_tipo"),
    )

    id_token: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    usuario: Mapped[Usuario] = relationship()


class Sesion(Base):
    """Cada inicio de sesión guarda su refresh token (hasheado) para poder cerrarla o revocarla."""

    __tablename__ = "sesiones"

    id_sesion: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(300))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    usuario: Mapped[Usuario] = relationship()
