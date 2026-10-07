from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.models import Usuario
from app.modules.almacenamiento.models import Archivo
from app.modules.almacenamiento.storage import obtener_cliente_s3


def obtener_archivo(
    db: Session,
    id_archivo: UUID,
    usuario: Usuario,
) -> Archivo:
    """Obtiene un archivo verificando que pertenezca al usuario."""

    archivo = db.scalar(
        select(Archivo).where(
            Archivo.id_archivo == id_archivo,
            Archivo.id_usuario == usuario.id_usuario,
            Archivo.eliminado_en.is_(None),
        )
    )

    if archivo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo no encontrado",
        )

    return archivo


def descargar_archivo(
    db: Session,
    id_archivo: UUID,
    usuario: Usuario,
):
    """Obtiene el contenido del archivo desde RustFS."""

    archivo = obtener_archivo(db, id_archivo, usuario)

    cliente_s3 = obtener_cliente_s3()

    try:
        respuesta = cliente_s3.get_object(
            Bucket=archivo.bucket,
            Key=archivo.clave_objeto,
        )

        return archivo, respuesta["Body"]

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo encontrar el archivo en el almacenamiento",
        )


def eliminar_archivo(
    db: Session,
    id_archivo: UUID,
    usuario: Usuario,
) -> Archivo:
    """Elimina físicamente el objeto y marca el archivo como eliminado."""

    archivo = obtener_archivo(db, id_archivo, usuario)

    cliente_s3 = obtener_cliente_s3()

    try:
        cliente_s3.delete_object(
            Bucket=archivo.bucket,
            Key=archivo.clave_objeto,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo eliminar el archivo del almacenamiento",
        )

    archivo.eliminado_en = __import__("datetime").datetime.now(
        __import__("datetime").timezone.utc
    )

    usuario.almacenamiento_usado_bytes = max(
        0,
        usuario.almacenamiento_usado_bytes - archivo.tamaño_bytes,
    )

    db.commit()
    db.refresh(archivo)

    return archivo