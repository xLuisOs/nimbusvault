from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import requiere_admin
from app.core.storage import AlmacenS3, get_almacen_opcional
from app.db.session import get_db
from app.modules.admin import service
from app.modules.admin.schemas import (
    InfraOut, InvitarIn, ResumenAdminOut, UsuarioActualizar, UsuarioAdminOut,
)
from app.modules.auth.models import Usuario

# Todo el router exige rol Administrador (RN-05)
router = APIRouter(prefix="/admin", tags=["Admin · Plataforma"], dependencies=[Depends(requiere_admin)])

DESFASE = Query(0, ge=-840, le=840, description="Minutos respecto a UTC del navegador (Guatemala: -360)")


@router.get("/resumen", response_model=ResumenAdminOut)
def resumen(desfase_min: int = DESFASE, db: Session = Depends(get_db)):
    """CU-05: métricas del dashboard administrativo."""
    return service.resumen(db, desfase_min)


@router.get("/usuarios", response_model=list[UsuarioAdminOut])
def listar_usuarios(db: Session = Depends(get_db)):
    """RF-17: todos los usuarios con su plan y consumo (el filtrado lo hace el frontend)."""
    return service.listar_usuarios(db)


@router.post("/usuarios", response_model=UsuarioAdminOut, status_code=status.HTTP_201_CREATED)
def invitar(datos: InvitarIn, db: Session = Depends(get_db)):
    usuario = service.invitar(db, datos)
    return next(u for u in service.listar_usuarios(db) if u["id_usuario"] == usuario.id_usuario)


@router.patch("/usuarios/{id_usuario}", response_model=UsuarioAdminOut)
def actualizar(
    id_usuario: UUID, datos: UsuarioActualizar,
    admin: Usuario = Depends(requiere_admin), db: Session = Depends(get_db),
):
    """Cambiar nombre, rol o estado (activo / suspendido). Suspender cierra sus sesiones."""
    service.actualizar_usuario(db, admin, id_usuario, datos)
    return next(u for u in service.listar_usuarios(db) if u["id_usuario"] == id_usuario)


@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(
    id_usuario: UUID,
    admin: Usuario = Depends(requiere_admin), db: Session = Depends(get_db),
    almacen: AlmacenS3 | None = Depends(get_almacen_opcional),
):
    """Borra la cuenta con sus archivos (también del bucket), suscripciones y pagos."""
    service.eliminar_usuario(db, almacen, admin, id_usuario)


@router.get("/infra", response_model=InfraOut)
def infraestructura(
    request: Request, desfase_min: int = DESFASE, db: Session = Depends(get_db),
    almacen: AlmacenS3 | None = Depends(get_almacen_opcional),
):
    """Chequeos en vivo de base de datos y almacenamiento, alertas y crecimiento del espacio."""
    return service.infraestructura(db, almacen, request.app.version, desfase_min)
