"""Registro de actividad: un evento por cada acción del usuario sobre su espacio.

Los archivos se borran de verdad, así que sin este registro no habría forma de saber qué se
descargó o eliminó ni cómo creció el almacenamiento. El dashboard, el panel de consumo y el
panel administrativo salen de aquí.
"""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base

TIPO_SUBIDA = "subida"
TIPO_DESCARGA = "descarga"
TIPO_ELIMINACION = "eliminacion"
TIPO_CARPETA = "carpeta"
TIPO_PAGO = "pago"
TIPOS = (TIPO_SUBIDA, TIPO_DESCARGA, TIPO_ELIMINACION, TIPO_CARPETA, TIPO_PAGO)


class Actividad(Base):
    __tablename__ = "actividad"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('subida','descarga','eliminacion','carpeta','pago')", name="ck_actividad_tipo"
        ),
        CheckConstraint("tamano_bytes >= 0", name="ck_actividad_tamano"),
        # Todas las consultas son "lo de este usuario, lo más reciente primero"
        Index("ix_actividad_usuario_fecha", "id_usuario", "creado_en"),
    )

    id_actividad: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(20))
    # Copia del nombre: el archivo o la carpeta pueden ya no existir
    descripcion: Mapped[str] = mapped_column(String(255))
    tamano_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    tipo_mime: Mapped[str | None] = mapped_column(String(120))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
