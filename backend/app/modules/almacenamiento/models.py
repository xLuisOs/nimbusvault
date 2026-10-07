"""Modelos de almacenamiento: carpetas (jerárquicas) y archivos."""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Carpeta(Base):
    __tablename__ = "carpetas"

    id_carpeta: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True
    )
    # Relación recursiva: NULL = carpeta raíz
    id_carpeta_padre: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("carpetas.id_carpeta", ondelete="CASCADE"), index=True
    )
    nombre: Mapped[str] = mapped_column(String(255))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Archivo(Base):
    __tablename__ = "archivos"
    __table_args__ = (CheckConstraint("tamano_bytes >= 0", name="ck_archivos_tamano"),)

    id_archivo: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True
    )
    # NULL = archivo en la raíz del usuario
    id_carpeta: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("carpetas.id_carpeta", ondelete="CASCADE"), index=True
    )
    nombre_original: Mapped[str] = mapped_column(String(255))
    # Llave del objeto en MinIO / Supabase Storage
    clave_objeto: Mapped[str] = mapped_column(String(512), unique=True)
    tipo_mime: Mapped[str] = mapped_column(String(120))
    tamano_bytes: Mapped[int] = mapped_column(BigInteger)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # Borrado lógico: NULL = activo, con fecha = en papelera
    eliminado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
