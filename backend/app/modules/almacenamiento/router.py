from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_actual
from app.db.session import get_db
from app.modules.almacenamiento import service
from app.modules.almacenamiento.schemas import (
    ArchivoEliminadoRespuesta,
    CarpetaCrear,
    CarpetaEliminadaRespuesta,
    CarpetaMover,
    CarpetaRenombrar,
    CarpetaRespuesta,
)
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
carpetas_router = APIRouter(
    prefix="/carpetas",
    tags=["Carpetas"],
)


@carpetas_router.post(
    "",
    response_model=CarpetaRespuesta,
    status_code=201,
)
def crear_carpeta(
    datos: CarpetaCrear,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    return service.crear_carpeta(
        db,
        datos.nombre,
        datos.id_carpeta_padre,
        usuario,
    )


@carpetas_router.patch(
    "/{id_carpeta}",
    response_model=CarpetaRespuesta,
)
def renombrar_carpeta(
    id_carpeta: UUID,
    datos: CarpetaRenombrar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    return service.renombrar_carpeta(
        db,
        id_carpeta,
        datos.nombre,
        usuario,
    )


@carpetas_router.patch(
    "/{id_carpeta}/mover",
    response_model=CarpetaRespuesta,
)
def mover_carpeta(
    id_carpeta: UUID,
    datos: CarpetaMover,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    return service.mover_carpeta(
        db,
        id_carpeta,
        datos.id_carpeta_padre,
        usuario,
    )


@carpetas_router.delete(
    "/{id_carpeta}",
    response_model=CarpetaEliminadaRespuesta,
)
def eliminar_carpeta(
    id_carpeta: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    carpeta = service.eliminar_carpeta(
        db,
        id_carpeta,
        usuario,
    )

    return CarpetaEliminadaRespuesta(
        mensaje="Carpeta eliminada correctamente",
        id_carpeta=carpeta.id_carpeta,
    )
