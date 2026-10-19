"""Borrado completo de una cuenta. Lo usan el administrador (Usuarios) y el propio usuario (Configuración)."""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.storage import AlmacenS3
from app.modules.actividad.models import Actividad
from app.modules.almacenamiento.models import Archivo, Carpeta
from app.modules.auth.models import Sesion, TokenUsuario, Usuario
from app.modules.pagos.models import Pago
from app.modules.suscripciones.models import Suscripcion


def borrar_cuenta(db: Session, almacen: AlmacenS3 | None, usuario: Usuario) -> None:
    """Borra la cuenta con sus archivos (también del bucket), suscripciones, pagos y actividad."""
    if usuario.almacenamiento_usado_bytes and almacen is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El almacenamiento no está disponible para borrar los archivos")

    id_usuario: UUID = usuario.id_usuario
    claves = list(db.scalars(select(Archivo.clave_objeto).where(Archivo.id_usuario == id_usuario)))
    suscripciones = select(Suscripcion.id_suscripcion).where(Suscripcion.id_usuario == id_usuario)

    # Borrado explícito en orden (los pagos no tienen ON DELETE CASCADE, y así funciona igual en SQLite)
    db.execute(delete(Pago).where(Pago.id_suscripcion.in_(suscripciones)))
    for modelo in (Actividad, Archivo, Suscripcion, Sesion, TokenUsuario):
        db.execute(delete(modelo).where(modelo.id_usuario == id_usuario))
    # Carpetas: primero se sueltan las hijas (la relación padre-hija se apunta a sí misma)
    db.execute(update(Carpeta).where(Carpeta.id_usuario == id_usuario).values(id_carpeta_padre=None))
    db.execute(delete(Carpeta).where(Carpeta.id_usuario == id_usuario))
    db.execute(delete(Usuario).where(Usuario.id_usuario == id_usuario))
    db.commit()

    # Después de la base, el bucket: si algo falla quedan objetos huérfanos, nunca registros rotos
    for clave in claves:
        almacen.borrar(clave)
