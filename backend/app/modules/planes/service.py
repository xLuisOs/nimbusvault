from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.planes.models import Plan, PlanCaracteristica
from app.modules.planes.schemas import PlanActualizar, PlanAdminOut, PlanCrear, PlanOut
from app.modules.suscripciones.models import ESTADO_ACTIVA, Suscripcion


def a_schema(plan: Plan) -> PlanOut:
    anual = (plan.precio_mensual * (100 - plan.descuento_anual_pct) / 100).quantize(Decimal("0.01"), ROUND_HALF_UP)
    return PlanOut(
        **{c: getattr(plan, c) for c in (
            "id_plan", "codigo", "nombre", "descripcion", "precio_mensual", "descuento_anual_pct",
            "almacenamiento_gb", "vigencia_dias", "destacado", "orden", "color", "activo",
        )},
        precio_anual_mensualizado=anual,
        caracteristicas=[c.descripcion for c in plan.caracteristicas],
    )


def listar_publicos(db: Session) -> list[PlanOut]:
    planes = db.scalars(select(Plan).where(Plan.activo.is_(True)).order_by(Plan.orden, Plan.precio_mensual))
    return [a_schema(p) for p in planes]


def listar_admin(db: Session) -> list[PlanAdminOut]:
    conteo = dict(db.execute(
        select(Suscripcion.id_plan, func.count())
        .where(Suscripcion.estado == ESTADO_ACTIVA)
        .group_by(Suscripcion.id_plan)
    ).all())
    planes = db.scalars(select(Plan).order_by(Plan.orden, Plan.precio_mensual))
    return [PlanAdminOut(**a_schema(p).model_dump(), suscriptores_activos=conteo.get(p.id_plan, 0)) for p in planes]


def _obtener(db: Session, id_plan: UUID) -> Plan:
    plan = db.get(Plan, id_plan)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan no encontrado")
    return plan


def _aplicar(plan: Plan, datos: PlanActualizar) -> None:
    for campo in ("nombre", "descripcion", "precio_mensual", "almacenamiento_gb", "vigencia_dias",
                  "descuento_anual_pct", "destacado", "orden", "color"):
        setattr(plan, campo, getattr(datos, campo))
    plan.caracteristicas = [PlanCaracteristica(descripcion=d, orden=i) for i, d in enumerate(datos.caracteristicas)]


def crear(db: Session, datos: PlanCrear) -> PlanOut:
    """CU-04 / RF-18."""
    if db.scalar(select(Plan).where(Plan.codigo == datos.codigo)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un plan con ese código")
    plan = Plan(codigo=datos.codigo, activo=True)
    _aplicar(plan, datos)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return a_schema(plan)


def actualizar(db: Session, id_plan: UUID, datos: PlanActualizar) -> PlanOut:
    plan = _obtener(db, id_plan)
    _aplicar(plan, datos)
    db.commit()
    db.refresh(plan)
    return a_schema(plan)


def cambiar_estado(db: Session, id_plan: UUID, activo: bool) -> PlanOut:
    plan = _obtener(db, id_plan)
    plan.activo = activo
    db.commit()
    return a_schema(plan)


def eliminar(db: Session, id_plan: UUID) -> None:
    plan = _obtener(db, id_plan)
    tiene_historial = db.scalar(select(func.count()).select_from(Suscripcion).where(Suscripcion.id_plan == id_plan))
    if tiene_historial:
        # No se borra: rompería el historial de suscripciones y pagos. Se desactiva.
        raise HTTPException(status.HTTP_409_CONFLICT, "El plan tiene suscripciones; desactívalo en lugar de eliminarlo")
    db.delete(plan)
    db.commit()
