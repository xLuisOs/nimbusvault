from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_actual
from app.db.session import get_db
from app.modules.auth.models import Usuario
from app.modules.suscripciones import service

router = APIRouter(prefix="/suscripciones", tags=["Suscripciones"])


class CambiarPlanIn(BaseModel):
    id_plan: UUID = Field(..., description="ID del plan al que cambiar")
    periodicidad: str = Field(default="mensual", min_length=7, max_length=10)


@router.post("/cambiar-plan", status_code=status.HTTP_200_OK)
def cambiar_plan(
    datos: CambiarPlanIn,
    usuario: Usuario = Depends(get_usuario_actual),
    db: Session = Depends(get_db),
):
    sus = service.cambiar_plan(db, usuario, datos.id_plan, datos.periodicidad)
    return {
        "mensaje": "Plan actualizado correctamente",
        "suscripcion": {
            "id_suscripcion": str(sus.id_suscripcion),
            "id_plan": str(sus.id_plan),
            "estado": sus.estado,
            "periodicidad": sus.periodicidad,
            "fecha_inicio": sus.fecha_inicio.isoformat(),
            "fecha_fin": sus.fecha_fin.isoformat(),
            "almacenamiento_gb": sus.plan.almacenamiento_gb,
        },
    }
