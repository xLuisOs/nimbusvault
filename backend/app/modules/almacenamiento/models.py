
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas
from app.modules.auth.models import Usuario


class Carpeta(ConFechas, Base):
    __tablename__ = "carpetas"

    id_carpeta: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    id_usuario: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        index=True,
    )
    id_carpeta_padre: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("carpetas.id_carpeta", ondelete="CASCADE"),
        index=True,
        nullable=True,
    )
    nombre: Mapped[str] = mapped_column(String(255))

    usuario: Mapped["Usuario"] = relationship()
    carpeta_padre: Mapped["Carpeta | None"] = relationship(
        remote_side="Carpeta.id_carpeta"
    )


class Archivo(ConFechas, Base):
    __tablename__ = "archivos"

    id_archivo: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    id_usuario: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        index=True,
    )
    id_carpeta: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("carpetas.id_carpeta", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    nombre: Mapped[str] = mapped_column(String(255))
    nombre_original: Mapped[str] = mapped_column(String(255))
    tamaño_bytes: Mapped[int] = mapped_column(BigInteger)
    mime_type: Mapped[str] = mapped_column(String(150))
    clave_objeto: Mapped[str] = mapped_column(String(500), unique=True)
    bucket: Mapped[str] = mapped_column(String(100))
    eliminado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    usuario: Mapped["Usuario"] = relationship()
    carpeta: Mapped["Carpeta | None"] = relationship()

