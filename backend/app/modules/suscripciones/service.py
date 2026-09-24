from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.auth.models import Usuario
from app.modules.planes.models import Plan
from app.modules.suscripciones.models import ESTADO_ACTIVA, ESTADO_VENCIDA, Suscripcion

CODIGO_PLAN_GRATIS = "gratis"


def _con_zona(dt: datetime) -> datetime:
    # SQLite (pruebas) devuelve fechas sin zona horaria; Postgres sí la trae.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def asignar_plan_gratis(db: Session, usuario: Usuario) -> Suscripcion | None:
    """RN-02: todo usuario necesita un plan. Al activar la cuenta se le asigna el gratuito."""
    plan = db.scalar(select(Plan).where(Plan.codigo == CODIGO_PLAN_GRATIS, Plan.activo.is_(True)))
    if plan is None:
        return None
    inicio = ahora()
    sus = Suscripcion(
        id_usuario=usuario.id_usuario,
        id_plan=plan.id_plan,
        fecha_inicio=inicio,
        fecha_fin=inicio + timedelta(days=plan.vigencia_dias),
        precio_contratado=plan.precio_mensual,
        periodicidad="mensual",
    )
    db.add(sus)
    return sus


def suscripcion_activa(db: Session, id_usuario: UUID) -> Suscripcion | None:
    sus = db.scalar(
        select(Suscripcion).where(Suscripcion.id_usuario == id_usuario, Suscripcion.estado == ESTADO_ACTIVA)
    )
    if sus is None:
        return None

    if _con_zona(sus.fecha_fin) <= ahora():
        if sus.precio_contratado == 0:
            # El plan gratuito se renueva solo
            sus.fecha_inicio = ahora()
            sus.fecha_fin = sus.fecha_inicio + timedelta(days=sus.plan.vigencia_dias)
        else:
            # TODO Avance 2: renovación (RF-08) y definir qué pasa con los archivos
            sus.estado = ESTADO_VENCIDA
        db.commit()
        if sus.estado != ESTADO_ACTIVA:
            return None
    return sus
