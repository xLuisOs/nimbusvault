from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import requiere_admin
from app.db.session import get_db
from app.modules.planes import service
from app.modules.planes.schemas import PlanActualizar, PlanAdminOut, PlanCrear, PlanEstado, PlanOut

# Catálogo público (RF-06): lo consumen el landing y la página de planes
router = APIRouter(prefix="/planes", tags=["Planes"])


@router.get("", response_model=list[PlanOut])
def listar(db: Session = Depends(get_db)):
    return service.listar_publicos(db)


@router.get("/{codigo}", response_model=PlanOut)
def obtener(codigo: str, db: Session = Depends(get_db)):
    return service.obtener_publico(db, codigo)


# Administración de planes (RF-18 / CU-04)
admin_router = APIRouter(prefix="/admin/planes", tags=["Admin · Planes"], dependencies=[Depends(requiere_admin)])


@admin_router.get("", response_model=list[PlanAdminOut])
def listar_admin(db: Session = Depends(get_db)):
    return service.listar_admin(db)


@admin_router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
def crear(datos: PlanCrear, db: Session = Depends(get_db)):
    return service.crear(db, datos)


@admin_router.put("/{id_plan}", response_model=PlanOut)
def actualizar(id_plan: UUID, datos: PlanActualizar, db: Session = Depends(get_db)):
    return service.actualizar(db, id_plan, datos)


@admin_router.patch("/{id_plan}/estado", response_model=PlanOut)
def cambiar_estado(id_plan: UUID, datos: PlanEstado, db: Session = Depends(get_db)):
    return service.cambiar_estado(db, id_plan, datos.activo)


@admin_router.delete("/{id_plan}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(id_plan: UUID, db: Session = Depends(get_db)):
    service.eliminar(db, id_plan)
    # Endpoint to recalculate quota for all subscriptions
    @admin_router.post("/recalculo-cuota", response_model=dict)
    def recalculo_cuota(db: Session = Depends(get_db)):
        """Recalcula la cuota de suscripciones sin modificar el esquema.
        Por ahora actualiza `precio_contratado` al precio actual del plan.
        """
        from sqlalchemy import select
        from app.modules.suscripciones.models import Suscripcion
        suscripciones = db.scalars(select(Suscripcion)).all()
        updated = 0
        for sus in suscripciones:
            if sus.precio_contratado != sus.plan.precio_mensual:
                sus.precio_contratado = sus.plan.precio_mensual
                updated += 1
        if updated:
            db.commit()
        return {"updated": updated}
