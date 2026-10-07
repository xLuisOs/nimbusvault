from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ArchivoRespuesta(BaseModel):
    id_archivo: UUID
    nombre: str
    nombre_original: str
    tamaño_bytes: int
    mime_type: str
    id_carpeta: UUID | None
    creado_en: datetime

    model_config = {
        "from_attributes": True
    }


class ArchivoEliminadoRespuesta(BaseModel):
    mensaje: str
    id_archivo: UUID


class CarpetaCrear(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)
    id_carpeta_padre: UUID | None = None


class CarpetaRenombrar(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)


class CarpetaMover(BaseModel):
    id_carpeta_padre: UUID | None = None


class CarpetaRespuesta(BaseModel):
    id_carpeta: UUID
    id_usuario: UUID
    id_carpeta_padre: UUID | None
    nombre: str
    creado_en: datetime
    actualizado_en: datetime

    model_config = {
        "from_attributes": True
    }


class CarpetaEliminadaRespuesta(BaseModel):
    mensaje: str
    id_carpeta: UUID