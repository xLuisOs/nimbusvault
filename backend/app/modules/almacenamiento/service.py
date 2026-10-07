"""Reglas de negocio de carpetas y archivos, con validación de cuota por plan."""
import mimetypes
import os
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.storage import AlmacenS3, ErrorAlmacen
from app.modules.almacenamiento.models import Archivo, Carpeta
from app.modules.almacenamiento.schemas import CarpetaCrear
from app.modules.auth.models import Usuario
from app.modules.suscripciones.models import Suscripcion
from app.modules.suscripciones.service import suscripcion_activa

GIB = 1024**3


# ── Cuota ─────────────────────────────────────────────────────────────────────

def _suscripcion_o_403(db: Session, usuario: Usuario) -> Suscripcion:
    sus = suscripcion_activa(db, usuario.id_usuario)
    if sus is None:
        raise HTTPException(403, "Necesitas una suscripción activa para usar el almacenamiento")
    return sus


def _cuota(sus: Suscripcion) -> int:
    return sus.plan.almacenamiento_gb * GIB


def _error_cuota(usado: int, tam: int, cuota: int) -> HTTPException:
    libre = max(cuota - usado, 0)
    return HTTPException(
        413,
        f"Cuota de almacenamiento excedida: el archivo pesa {tam} bytes y solo quedan {libre} bytes en tu plan",
    )


def resumen_uso(db: Session, usuario: Usuario) -> dict:
    sus = _suscripcion_o_403(db, usuario)
    cuota = _cuota(sus)
    usado = usuario.almacenamiento_usado_bytes or 0
    return {
        "plan": sus.plan.nombre,
        "usado_bytes": usado,
        "cuota_bytes": cuota,
        "disponible_bytes": max(cuota - usado, 0),
        "porcentaje": round(usado / cuota * 100, 2),
    }


# ── Carpetas ──────────────────────────────────────────────────────────────────

def _carpeta_propia(db: Session, usuario: Usuario, id_carpeta: UUID) -> Carpeta:
    carpeta = db.get(Carpeta, id_carpeta)
    # 404 y no 403: no revelamos si la carpeta existe y es de otra persona
    if carpeta is None or carpeta.id_usuario != usuario.id_usuario:
        raise HTTPException(404, "Carpeta no encontrada")
    return carpeta


def crear_carpeta(db: Session, usuario: Usuario, datos: CarpetaCrear) -> Carpeta:
    if datos.id_carpeta_padre is not None:
        _carpeta_propia(db, usuario, datos.id_carpeta_padre)
    carpeta = Carpeta(
        id_usuario=usuario.id_usuario, id_carpeta_padre=datos.id_carpeta_padre, nombre=datos.nombre
    )
    db.add(carpeta)
    db.commit()
    db.refresh(carpeta)
    return carpeta


def listar_carpetas(db: Session, usuario: Usuario, id_padre: UUID | None) -> list[Carpeta]:
    if id_padre is not None:
        _carpeta_propia(db, usuario, id_padre)
    q = select(Carpeta).where(Carpeta.id_usuario == usuario.id_usuario)
    q = q.where(Carpeta.id_carpeta_padre == id_padre) if id_padre else q.where(Carpeta.id_carpeta_padre.is_(None))
    return list(db.scalars(q.order_by(Carpeta.nombre)))


def eliminar_carpeta(db: Session, usuario: Usuario, id_carpeta: UUID) -> None:
    carpeta = _carpeta_propia(db, usuario, id_carpeta)
    subcarpetas = db.scalar(
        select(func.count()).select_from(Carpeta).where(Carpeta.id_carpeta_padre == id_carpeta)
    )
    archivos = db.scalar(select(func.count()).select_from(Archivo).where(Archivo.id_carpeta == id_carpeta))
    if subcarpetas or archivos:
        raise HTTPException(409, "La carpeta no está vacía: elimina primero su contenido")
    db.delete(carpeta)
    db.commit()


# ── Archivos ──────────────────────────────────────────────────────────────────

def _nombre_seguro(nombre: str | None) -> str:
    limpio = os.path.basename((nombre or "").replace("\\", "/")).strip()
    if not limpio:
        raise HTTPException(400, "El archivo no tiene nombre")
    return limpio[:255]


def _tamano(archivo: UploadFile) -> int:
    archivo.file.seek(0, os.SEEK_END)
    tam = archivo.file.tell()
    archivo.file.seek(0)
    return tam


def subir_archivo(
    db: Session, almacen: AlmacenS3, usuario: Usuario, archivo: UploadFile, id_carpeta: UUID | None
) -> Archivo:
    sus = _suscripcion_o_403(db, usuario)
    nombre = _nombre_seguro(archivo.filename)
    if id_carpeta is not None:
        _carpeta_propia(db, usuario, id_carpeta)

    tam = _tamano(archivo)
    if tam == 0:
        raise HTTPException(400, "El archivo está vacío")
    if tam > settings.archivo_max_mb * 1024 * 1024:
        raise HTTPException(413, f"El archivo supera el máximo permitido de {settings.archivo_max_mb} MB")

    # 1) Validación rápida: evita subir al bucket algo que no cabe
    cuota = _cuota(sus)
    if (usuario.almacenamiento_usado_bytes or 0) + tam > cuota:
        raise _error_cuota(usuario.almacenamiento_usado_bytes or 0, tam, cuota)

    tipo = (archivo.content_type or mimetypes.guess_type(nombre)[0] or "application/octet-stream")[:120]
    clave = f"{usuario.id_usuario}/{uuid4()}"  # nunca usamos el nombre del usuario en la llave

    try:
        almacen.subir(archivo.file, clave, tipo, tam)
    except ErrorAlmacen as e:
        raise HTTPException(502, str(e))

    # 2) Validación definitiva y atómica: reserva el espacio solo si todavía cabe.
    #    Si dos subidas simultáneas compiten por el último espacio, solo una gana.
    try:
        reservado = db.execute(
            update(Usuario)
            .where(
                Usuario.id_usuario == usuario.id_usuario,
                Usuario.almacenamiento_usado_bytes + tam <= cuota,
            )
            .values(almacenamiento_usado_bytes=Usuario.almacenamiento_usado_bytes + tam)
            .execution_options(synchronize_session=False)
        ).rowcount
        if not reservado:
            raise _error_cuota(usuario.almacenamiento_usado_bytes or 0, tam, cuota)

        nuevo = Archivo(
            id_usuario=usuario.id_usuario,
            id_carpeta=id_carpeta,
            nombre_original=nombre,
            clave_objeto=clave,
            tipo_mime=tipo,
            tamano_bytes=tam,
        )
        db.add(nuevo)
        db.commit()  # archivo + espacio usado en la misma transacción
    except Exception:
        db.rollback()
        almacen.borrar(clave)  # compensación: no dejamos objetos huérfanos en el bucket
        raise

    db.refresh(nuevo)
    db.refresh(usuario)
    return nuevo


def listar_archivos(db: Session, usuario: Usuario, id_carpeta: UUID | None) -> list[Archivo]:
    if id_carpeta is not None:
        _carpeta_propia(db, usuario, id_carpeta)
    q = select(Archivo).where(Archivo.id_usuario == usuario.id_usuario, Archivo.eliminado_en.is_(None))
    q = q.where(Archivo.id_carpeta == id_carpeta) if id_carpeta else q.where(Archivo.id_carpeta.is_(None))
    return list(db.scalars(q.order_by(Archivo.creado_en.desc())))


def obtener_archivo(db: Session, usuario: Usuario, id_archivo: UUID) -> Archivo:
    archivo = db.get(Archivo, id_archivo)
    if archivo is None or archivo.id_usuario != usuario.id_usuario or archivo.eliminado_en is not None:
        raise HTTPException(404, "Archivo no encontrado")
    return archivo


def eliminar_archivo(db: Session, almacen: AlmacenS3, usuario: Usuario, id_archivo: UUID) -> None:
    archivo = obtener_archivo(db, usuario, id_archivo)
    clave, tam = archivo.clave_objeto, archivo.tamano_bytes

    db.delete(archivo)
    db.execute(
        update(Usuario)
        .where(Usuario.id_usuario == usuario.id_usuario)
        .values(
            almacenamiento_usado_bytes=case(
                (Usuario.almacenamiento_usado_bytes >= tam, Usuario.almacenamiento_usado_bytes - tam),
                else_=0,
            )
        )
        .execution_options(synchronize_session=False)
    )
    db.commit()
    # Primero la base, después el bucket: si falla el bucket queda un objeto huérfano (basura),
    # pero nunca un registro que apunte a un archivo que ya no existe.
    almacen.borrar(clave)
