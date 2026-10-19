from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.auth.models import Usuario
from app.modules.planes.models import Plan
from app.modules.suscripciones.models import ESTADO_ACTIVA, ESTADO_CANCELADA, ESTADO_VENCIDA, Suscripcion

CODIGO_PLAN_GRATIS = "gratis"


def _con_zona(dt: datetime) -> datetime:
    # SQLite (pruebas) devuelve fechas sin zona horaria; Postgres sí la trae.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _extender_suscripcion(sus: Suscripcion, inicio: datetime | None = None) -> Suscripcion:
    """Renovación del ciclo actual de la suscripción."""
    inicio_dt = inicio or ahora()
    dias = sus.plan.vigencia_dias if sus.plan else (30 if sus.periodicidad == "mensual" else 365)
    
    # Si renueva antes de vencer, sumamos a la fecha fin actual; si ya venció, arrancamos desde HOY.
    fecha_base = sus.fecha_fin if sus.fecha_fin and sus.fecha_fin > inicio_dt else inicio_dt
    
    sus.fecha_inicio = inicio_dt
    sus.fecha_fin = fecha_base + timedelta(days=dias)
    sus.estado = ESTADO_ACTIVA
    return sus


def expirar_suscripciones_vencidas(db: Session) -> int:
    """Pasa a estado 'vencida' todas las suscripciones activas cuya fecha_fin ya pasó."""
    momento_actual = ahora()
    stmt = (
        update(Suscripcion)
        .where(Suscripcion.estado == ESTADO_ACTIVA)
        .where(Suscripcion.fecha_fin <= momento_actual)
        .values(estado=ESTADO_VENCIDA)
    )
    res = db.execute(stmt)
    db.commit()
    return res.rowcount


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
        renovacion_automatica=True,
    )
    db.add(sus)
    return sus


def cambiar_plan(db: Session, usuario: Usuario, id_plan: UUID, periodicidad: str = "mensual") -> Suscripcion:
    """Actualiza o reactiva la suscripción del usuario al plan solicitado."""
    if periodicidad not in {"mensual", "anual"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La periodicidad debe ser 'mensual' o 'anual'")

    plan = db.get(Plan, id_plan)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan no encontrado")
    if not plan.activo:
        raise HTTPException(status.HTTP_409_CONFLICT, "El plan está desactivado")

    inicio = ahora()
    # Buscamos si el usuario ya tiene una suscripción (activa o vencida)
    sus = db.scalar(
        select(Suscripcion).where(
            Suscripcion.id_usuario == usuario.id_usuario,
            Suscripcion.estado.in_([ESTADO_ACTIVA, ESTADO_VENCIDA]),
        )
    )

    if sus is None:
        sus = Suscripcion(
            id_usuario=usuario.id_usuario,
            id_plan=plan.id_plan,
            fecha_inicio=inicio,
            fecha_fin=inicio + timedelta(days=plan.vigencia_dias),
            estado=ESTADO_ACTIVA,
            periodicidad=periodicidad,
            precio_contratado=plan.precio_mensual,
            renovacion_automatica=True,
        )
        db.add(sus)
        db.commit()
        db.refresh(sus)
        return sus

    # Si ya existe registro, lo actualizamos y lo re-activamos
    sus.id_plan = plan.id_plan
    sus.periodicidad = periodicidad
    sus.precio_contratado = plan.precio_mensual
    sus.fecha_inicio = inicio
    sus.fecha_fin = inicio + timedelta(days=plan.vigencia_dias)
    sus.estado = ESTADO_ACTIVA
    sus.renovacion_automatica = True
    sus.cancelada_en = None
    db.add(sus)
    db.commit()
    db.refresh(sus)
    return sus


def renovar_suscripcion(db: Session, sus: Suscripcion) -> Suscripcion:
    """Renueva una suscripción vencida o expirada."""
    if sus.estado == ESTADO_CANCELADA:
        return sus
    _extender_suscripcion(sus)
    sus.renovacion_automatica = True
    db.add(sus)
    db.commit()
    db.refresh(sus)
    return sus


def suscripcion_activa(db: Session, id_usuario: UUID) -> Suscripcion | None:
    sus = db.scalar(
        select(Suscripcion).where(Suscripcion.id_usuario == id_usuario, Suscripcion.estado == ESTADO_ACTIVA)
    )
    if sus is None:
        return None

    if _con_zona(sus.fecha_fin) <= ahora():
        if sus.renovacion_automatica:
            _extender_suscripcion(sus)
            db.commit()
            db.refresh(sus)
            return sus

        sus.estado = ESTADO_VENCIDA
        db.commit()
        return None
    return sus
