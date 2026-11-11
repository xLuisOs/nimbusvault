from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import requiere_soporte
from app.db.session import get_db
from app.modules.admin.schemas import UsuarioAdminOut
from app.modules.auth.schemas import MensajeOut
from app.modules.pagos.schemas import PagoOut
from app.modules.soporte import service

# Todo el router exige rol Soporte; no da acceso a archivos ni a funciones administrativas
router = APIRouter(prefix="/soporte", tags=["Soporte"], dependencies=[Depends(requiere_soporte)])


@router.get("/clientes", response_model=list[UsuarioAdminOut])
def listar_clientes(db: Session = Depends(get_db)):
    return service.listar_clientes(db)


@router.get("/clientes/{id_usuario}/pagos", response_model=list[PagoOut])
def pagos_del_cliente(id_usuario: UUID, db: Session = Depends(get_db)):
    return service.pagos_del_cliente(db, id_usuario)


@router.post("/clientes/{id_usuario}/reenviar-verificacion", response_model=MensajeOut)
def reenviar_verificacion(id_usuario: UUID, db: Session = Depends(get_db)):
    service.reenviar_verificacion(db, id_usuario)
    return MensajeOut(mensaje="Enviamos un nuevo enlace de verificación al cliente.")


@router.post("/clientes/{id_usuario}/enviar-recuperacion", response_model=MensajeOut)
def enviar_recuperacion(id_usuario: UUID, db: Session = Depends(get_db)):
    service.enviar_recuperacion(db, id_usuario)
    return MensajeOut(mensaje="Enviamos al cliente un enlace para restablecer su contraseña.")
