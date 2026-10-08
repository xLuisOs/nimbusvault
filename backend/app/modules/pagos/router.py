from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.deps import requiere_cliente
from app.db.session import get_db
from app.modules.auth.models import Usuario
from app.modules.pagos import service
from app.modules.pagos.schemas import ContratarIn, PagoOut

router = APIRouter(tags=["Pagos"])


@router.post("/suscripciones/contratar", response_model=PagoOut, status_code=status.HTTP_201_CREATED)
def contratar(datos: ContratarIn, usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)):
    """Contrata o cambia de plan con un pago simulado. Devuelve el comprobante."""
    return service.contratar_plan(db, usuario, datos)


@router.get("/pagos", response_model=list[PagoOut])
def historial(usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)):
    """Historial de pagos del cliente, del más reciente al más antiguo."""
    return service.listar_pagos(db, usuario)


@router.get("/pagos/{id_pago}/comprobante", response_class=Response)
def comprobante(id_pago: UUID, usuario: Usuario = Depends(requiere_cliente), db: Session = Depends(get_db)):
    nombre, contenido = service.comprobante_pdf(db, usuario, id_pago)
    return Response(
        contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
