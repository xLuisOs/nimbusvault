from uuid import UUID

from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.actividad.models import Actividad


def registrar(
    db: Session, id_usuario: UUID, tipo: str, descripcion: str, tamano_bytes: int = 0, tipo_mime: str | None = None
) -> None:
    """Agrega el evento a la transacción en curso: queda guardado con el mismo commit que la acción.

    La fecha se pone aquí (y no con el default de la base) para que eventos de la misma
    transacción queden ordenados y para que funcione igual en SQLite (pruebas) y Postgres.
    """
    db.add(Actividad(
        id_usuario=id_usuario, tipo=tipo, descripcion=descripcion[:255],
        tamano_bytes=tamano_bytes, tipo_mime=tipo_mime, creado_en=ahora(),
    ))
