from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_actual
from app.db.session import get_db
from app.modules.almacenamiento import service
from app.modules.almacenamiento.schemas import ArchivoEliminadoRespuesta
from app.modules.auth.models import Usuario


router = APIRouter(prefix="/archivos", tags=["Archivos"])


@router.get("/{id_archivo}/descargar")
def descargar_archivo(
    id_archivo: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    archivo, contenido = service.descargar_archivo(
        db,
        id_archivo,
        usuario,
    )

    return StreamingResponse(
        contenido,
        media_type=archivo.mime_type,
        headers={
            "Content-Disposition": (
                f'attachment; filename="{archivo.nombre_original}"'
            )
        },
    )


@router.delete(
    "/{id_archivo}",
    response_model=ArchivoEliminadoRespuesta,
)
def eliminar_archivo(
    id_archivo: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    archivo = service.eliminar_archivo(
        db,
        id_archivo,
        usuario,
    )

    return ArchivoEliminadoRespuesta(
        mensaje="Archivo eliminado correctamente",
        id_archivo=archivo.id_archivo,
    )