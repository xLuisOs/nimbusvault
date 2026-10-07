from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.models import Usuario
from app.modules.almacenamiento.models import Archivo, Carpeta
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

def obtener_carpeta(
    db: Session,
    id_carpeta: UUID,
    usuario: Usuario,
) -> Carpeta:
    """Obtiene una carpeta verificando que pertenezca al usuario."""

    carpeta = db.scalar(
        select(Carpeta).where(
            Carpeta.id_carpeta == id_carpeta,
            Carpeta.id_usuario == usuario.id_usuario,
        )
    )

    if carpeta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Carpeta no encontrada",
        )

    return carpeta


def validar_carpeta_padre(
    db: Session,
    id_carpeta_padre: UUID | None,
    usuario: Usuario,
) -> Carpeta | None:
    """Verifica que la carpeta padre pertenezca al usuario."""

    if id_carpeta_padre is None:
        return None

    carpeta_padre = db.scalar(
        select(Carpeta).where(
            Carpeta.id_carpeta == id_carpeta_padre,
            Carpeta.id_usuario == usuario.id_usuario,
        )
    )

    if carpeta_padre is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La carpeta padre no existe",
        )

    return carpeta_padre


def crear_carpeta(
    db: Session,
    nombre: str,
    id_carpeta_padre: UUID | None,
    usuario: Usuario,
) -> Carpeta:
    """Crea una carpeta para el usuario autenticado."""

    nombre = nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la carpeta no puede estar vacío",
        )

    validar_carpeta_padre(
        db,
        id_carpeta_padre,
        usuario,
    )

    carpeta = Carpeta(
        id_usuario=usuario.id_usuario,
        id_carpeta_padre=id_carpeta_padre,
        nombre=nombre,
    )

    db.add(carpeta)
    db.commit()
    db.refresh(carpeta)

    return carpeta


def renombrar_carpeta(
    db: Session,
    id_carpeta: UUID,
    nombre: str,
    usuario: Usuario,
) -> Carpeta:
    """Cambia el nombre de una carpeta."""

    carpeta = obtener_carpeta(
        db,
        id_carpeta,
        usuario,
    )

    nombre = nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de la carpeta no puede estar vacío",
        )

    carpeta.nombre = nombre

    db.commit()
    db.refresh(carpeta)

    return carpeta


def mover_carpeta(
    db: Session,
    id_carpeta: UUID,
    id_carpeta_padre: UUID | None,
    usuario: Usuario,
) -> Carpeta:
    """Mueve una carpeta a otra carpeta o a la raíz."""

    carpeta = obtener_carpeta(
        db,
        id_carpeta,
        usuario,
    )

    # No puede ser su propia carpeta padre.
    if id_carpeta_padre == id_carpeta:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Una carpeta no puede ser su propia carpeta padre",
        )

    validar_carpeta_padre(
        db,
        id_carpeta_padre,
        usuario,
    )

    # Comprobar que no se mueva dentro de uno de sus descendientes.
    padre_actual = id_carpeta_padre

    while padre_actual is not None:
        if padre_actual == id_carpeta:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede mover una carpeta dentro de uno de sus descendientes",
            )

        padre = db.scalar(
            select(Carpeta).where(
                Carpeta.id_carpeta == padre_actual,
                Carpeta.id_usuario == usuario.id_usuario,
            )
        )

        if padre is None:
            break

        padre_actual = padre.id_carpeta_padre

    carpeta.id_carpeta_padre = id_carpeta_padre

    db.commit()
    db.refresh(carpeta)

    return carpeta


def eliminar_carpeta(
    db: Session,
    id_carpeta: UUID,
    usuario: Usuario,
) -> Carpeta:
    """Elimina una carpeta del usuario."""

    carpeta = obtener_carpeta(
        db,
        id_carpeta,
        usuario,
    )

    db.delete(carpeta)
    db.commit()

    return carpeta
