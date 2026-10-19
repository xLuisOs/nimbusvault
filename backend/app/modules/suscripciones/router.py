from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_actual
from app.db.session import get_db
from app.modules.auth.models import Usuario
from app.modules.suscripciones import service
from app.modules.suscripciones.models import ESTADO_ACTIVA, ESTADO_VENCIDA, Suscripcion

router = APIRouter(prefix="/suscripciones", tags=["Suscripciones"])


class CambiarPlanIn(BaseModel):
    id_plan: UUID = Field(..., description="ID del plan al que cambiar")
    periodicidad: str = Field(default="mensual", min_length=5, max_length=10)


def _formatear_respuesta_suscripcion(sus: Suscripcion) -> dict:
    return {
        "id_suscripcion": str(sus.id_suscripcion),
        "id_plan": str(sus.id_plan),
        "estado": sus.estado,
        "periodicidad": sus.periodicidad,
        "fecha_inicio": sus.fecha_inicio.isoformat(),
        "fecha_fin": sus.fecha_fin.isoformat(),
        "almacenamiento_gb": sus.plan.almacenamiento_gb if sus.plan else None,
    }


@router.post("/cambiar-plan", status_code=status.HTTP_200_OK)
def cambiar_plan(
    datos: CambiarPlanIn,
    usuario: Usuario = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    sus = service.cambiar_plan(db, usuario, datos.id_plan, datos.periodicidad)
    return {
        "mensaje": "Plan actualizado correctamente",
        "suscripcion": _formatear_respuesta_suscripcion(sus),
    }


@router.post("/renovar", status_code=status.HTTP_200_OK)
def renovar_suscripcion(
    usuario: Usuario = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    # Buscamos la suscripción actual del usuario (ya sea activa o vencida)
    sus = db.scalar(
        select(Suscripcion).where(
            Suscripcion.id_usuario == usuario.id_usuario,
            Suscripcion.estado.in_([ESTADO_ACTIVA, ESTADO_VENCIDA]),
        )
    )

    if not sus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una suscripción válida para renovar",
        )

    sus_renovada = service.renovar_suscripcion(db, sus)

    return {
        "mensaje": "Suscripción renovada exitosamente",
        "suscripcion": _formatear_respuesta_suscripcion(sus_renovada),
    }
