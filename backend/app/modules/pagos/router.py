from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.core.deps import get_usuario_actual
from app.modules.auth.models import Usuario
from app.modules.pagos.schemas import (
    ContratarPlanRequest,
    ContratarPlanResponse,
    PagoHistorialResponse,
    RenovarSuscripcionRequest,
    RenovarSuscripcionResponse,
)
from app.modules.pagos.service import (
    contratar_plan,
    renovar_suscripcion,
)
from app.modules.pagos.models import Pago


router = APIRouter(
    prefix="/suscripciones",
    tags=["Suscripciones"],
)
pagos_router = APIRouter(
    prefix="/pagos",
    tags=["Pagos"],
)

@router.post(
    "/contratar",
    response_model=ContratarPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def contratar(
    datos: ContratarPlanRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    try:
        suscripcion, pago = contratar_plan(db, usuario, datos)

        return ContratarPlanResponse(
            mensaje="Plan contratado correctamente",
            id_suscripcion=suscripcion.id_suscripcion,
            id_pago=pago.id_pago,
            numero_comprobante=pago.numero_comprobante,
            plan=suscripcion.plan.nombre,
            periodicidad=suscripcion.periodicidad,
            monto=pago.monto,
            fecha_inicio=suscripcion.fecha_inicio.isoformat(),
            fecha_fin=suscripcion.fecha_fin.isoformat(),
            estado_pago=pago.estado,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    
@router.post(
    "/renovar",
    response_model=RenovarSuscripcionResponse,
    status_code=status.HTTP_200_OK,
)
def renovar(
    datos: RenovarSuscripcionRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    try:
        suscripcion, pago = renovar_suscripcion(
            db,
            usuario,
            datos,
        )

        return RenovarSuscripcionResponse(
            mensaje="Suscripción renovada correctamente",
            id_suscripcion=suscripcion.id_suscripcion,
            id_pago=pago.id_pago,
            numero_comprobante=pago.numero_comprobante,
            plan=suscripcion.plan.nombre,
            periodicidad=suscripcion.periodicidad,
            monto=pago.monto,
            fecha_inicio=suscripcion.fecha_inicio.isoformat(),
            fecha_fin=suscripcion.fecha_fin.isoformat(),
            estado_pago=pago.estado,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
@pagos_router.get(
    "",
    response_model=list[PagoHistorialResponse],
)

def historial_pagos(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    pagos = db.scalars(
        select(Pago)
        .where(Pago.id_usuario == usuario.id_usuario)
        .order_by(Pago.creado_en.desc())
    ).all()

    return [
        PagoHistorialResponse(
            id_pago=pago.id_pago,
            numero_comprobante=pago.numero_comprobante,
            plan=pago.plan.nombre,
            tipo=pago.tipo,
            estado=pago.estado,
            monto=pago.monto,
            marca=pago.metodo_pago.marca,
            ultimos_4=pago.metodo_pago.ultimos_4,
            fecha=pago.creado_en.isoformat(),
        )
        for pago in pagos
    ]