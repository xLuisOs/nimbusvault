"""Consola de soporte: consulta de clientes, sus pagos y ayuda de acceso. Nunca toca sus archivos."""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.admin import service as admin_service
from app.modules.auth import service as auth_service
from app.modules.auth.models import ESTADO_PENDIENTE, ESTADO_SUSPENDIDO, ROL_CLIENTE, Usuario
from app.modules.pagos.schemas import PagoOut
from app.modules.pagos.service import listar_pagos


def listar_clientes(db: Session) -> list[dict]:
    return [u for u in admin_service.listar_usuarios(db) if u["rol"] == ROL_CLIENTE]


def _cliente_o_404(db: Session, id_usuario: UUID) -> Usuario:
    # Soporte solo atiende clientes: un administrador u otro agente "no existe" para esta consola
    usuario = db.get(Usuario, id_usuario)
    if usuario is None or usuario.rol.nombre != ROL_CLIENTE:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cliente no encontrado")
    return usuario


def pagos_del_cliente(db: Session, id_usuario: UUID) -> list[PagoOut]:
    return listar_pagos(db, _cliente_o_404(db, id_usuario))


def reenviar_verificacion(db: Session, id_usuario: UUID) -> None:
    cliente = _cliente_o_404(db, id_usuario)
    if cliente.estado != ESTADO_PENDIENTE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Este cliente ya confirmó su correo")
    auth_service.reenviar_verificacion(db, cliente.correo)


def enviar_recuperacion(db: Session, id_usuario: UUID) -> None:
    cliente = _cliente_o_404(db, id_usuario)
    if cliente.estado == ESTADO_SUSPENDIDO:
        raise HTTPException(status.HTTP_409_CONFLICT, "La cuenta está suspendida; debe reactivarla un administrador")
    auth_service.solicitar_recuperacion(db, cliente.correo)
