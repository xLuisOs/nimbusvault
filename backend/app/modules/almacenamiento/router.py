from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import requiere_cliente
from app.core.storage import AlmacenS3, ErrorAlmacen, ObjetoNoEncontrado, get_almacen
from app.db.session import get_db
from app.modules.almacenamiento import service
from app.modules.almacenamiento.schemas import (
    ArchivoActualizar, ArchivoOut, CarpetaActualizar, CarpetaCrear, CarpetaOut, RutaItem, UsoOut,
)
from app.modules.auth.models import Usuario

router = APIRouter(tags=["Almacenamiento"])


@router.get("/almacenamiento/uso", response_model=UsoOut)
def uso(usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)):
    return service.resumen_uso(db, usuario)


# ── Carpetas ──────────────────────────────────────────────────────────────────

@router.post("/carpetas", response_model=CarpetaOut, status_code=status.HTTP_201_CREATED)
def crear_carpeta(
    datos: CarpetaCrear, usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)
):
    return service.crear_carpeta(db, usuario, datos)


@router.get("/carpetas", response_model=list[CarpetaOut])
def listar_carpetas(
    id_carpeta_padre: UUID | None = None,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
):
    """Sin parámetro lista las carpetas de la raíz."""
    return service.listar_carpetas(db, usuario, id_carpeta_padre)


@router.patch("/carpetas/{id_carpeta}", response_model=CarpetaOut)
def renombrar_carpeta(
    id_carpeta: UUID,
    datos: CarpetaActualizar,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
):
    return service.renombrar_carpeta(db, usuario, id_carpeta, datos)


@router.get("/carpetas/{id_carpeta}/ruta", response_model=list[RutaItem])
def ruta_carpeta(
    id_carpeta: UUID, usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)
):
    """Breadcrumb: de la raíz hasta la carpeta indicada (incluida)."""
    return service.ruta_carpeta(db, usuario, id_carpeta)


@router.delete("/carpetas/{id_carpeta}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_carpeta(
    id_carpeta: UUID, usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)
):
    service.eliminar_carpeta(db, usuario, id_carpeta)


# ── Archivos ──────────────────────────────────────────────────────────────────

@router.post("/archivos", response_model=ArchivoOut, status_code=status.HTTP_201_CREATED)
def subir(
    archivo: UploadFile = File(...),
    id_carpeta: UUID | None = Form(None),
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
    almacen: AlmacenS3 = Depends(get_almacen),
):
    return service.subir_archivo(db, almacen, usuario, archivo, id_carpeta)


@router.get("/archivos", response_model=list[ArchivoOut])
def listar(
    id_carpeta: UUID | None = None,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
):
    """Sin parámetro lista los archivos de la raíz."""
    return service.listar_archivos(db, usuario, id_carpeta)


@router.get("/archivos/{id_archivo}/descarga")
def descargar(
    id_archivo: UUID,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
    almacen: AlmacenS3 = Depends(get_almacen),
):
    archivo = service.obtener_archivo(db, usuario, id_archivo)
    try:
        cuerpo = almacen.descargar(archivo.clave_objeto)
    except ObjetoNoEncontrado:
        raise HTTPException(404, "El archivo ya no está disponible en el almacenamiento")
    except ErrorAlmacen as e:
        raise HTTPException(502, str(e))
    return StreamingResponse(
        cuerpo,
        media_type=archivo.tipo_mime,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(archivo.nombre_original)}",
            "Content-Length": str(archivo.tamano_bytes),
        },
    )


@router.patch("/archivos/{id_archivo}", response_model=ArchivoOut)
def actualizar(
    id_archivo: UUID,
    datos: ArchivoActualizar,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
):
    """Renombrar (`nombre_original`) y/o mover (`id_carpeta`; `null` = raíz)."""
    return service.actualizar_archivo(db, usuario, id_archivo, datos)


@router.delete("/archivos/{id_archivo}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    id_archivo: UUID,
    usuario: Usuario = Depends(requiere_cliente),
    db: Session = Depends(get_db),
    almacen: AlmacenS3 = Depends(get_almacen),
):
    service.eliminar_archivo(db, almacen, usuario, id_archivo)
