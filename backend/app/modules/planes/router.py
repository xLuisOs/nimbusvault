from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import requiere_admin
from app.db.session import get_db
from app.modules.almacenamiento.models import Archivo
from app.modules.auth.models import Usuario
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


@admin_router.post("/recalculo-cuota", response_model=dict)
def recalcular_cuota(db: Session = Depends(get_db)):
    """Recalcula `almacenamiento_usado_bytes` de cada usuario sumando el
    `tamano_bytes` de sus archivos activos (excluye los de la papelera).

    No modifica `precio_contratado` de suscripciones.
    """
    # Uso real por usuario: solo archivos no eliminados
    subq = (
        select(
            Archivo.id_usuario,
            func.coalesce(func.sum(Archivo.tamano_bytes), 0).label("uso"),
        )
        .where(Archivo.eliminado_en.is_(None))
        .group_by(Archivo.id_usuario)
        .subquery()
    )

    usuarios = db.scalars(select(Usuario)).all()
    actualizados = 0
    for usuario in usuarios:
        uso = (
            db.scalar(
                select(subq.c.uso).where(subq.c.id_usuario == usuario.id_usuario)
            )
            or 0
        )
        if usuario.almacenamiento_usado_bytes != uso:
            usuario.almacenamiento_usado_bytes = uso
            actualizados += 1

    if actualizados:
        db.commit()

    return {"actualizados": actualizados}
