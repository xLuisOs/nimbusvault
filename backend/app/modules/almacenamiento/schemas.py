from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CarpetaNombre(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)

    @field_validator("nombre")
    @classmethod
    def limpiar(cls, v: str) -> str:
        v = v.strip()
        if not v or "/" in v or "\\" in v:
            raise ValueError("Nombre de carpeta inválido")
        return v


class CarpetaCrear(CarpetaNombre):
    id_carpeta_padre: UUID | None = None


class CarpetaActualizar(CarpetaNombre):
    pass


class ArchivoActualizar(BaseModel):
    """Renombrar y/o mover. Mandar `id_carpeta: null` explícitamente lo mueve a la raíz;
    si `id_carpeta` no viene en el cuerpo, el archivo se queda donde está."""

    nombre_original: str | None = Field(default=None, min_length=1, max_length=255)
    id_carpeta: UUID | None = None


class RutaItem(BaseModel):
    """Un eslabón del breadcrumb, de la raíz hacia la carpeta pedida."""

    model_config = ConfigDict(from_attributes=True)

    id_carpeta: UUID
    nombre: str


class CarpetaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_carpeta: UUID
    id_carpeta_padre: UUID | None
    nombre: str
    creado_en: datetime


class ArchivoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_archivo: UUID
    id_carpeta: UUID | None
    nombre_original: str
    tipo_mime: str
    tamano_bytes: int
    creado_en: datetime


class UsoOut(BaseModel):
    plan: str
    usado_bytes: int
    cuota_bytes: int
    disponible_bytes: int
    porcentaje: float
