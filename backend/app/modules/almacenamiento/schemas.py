from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


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