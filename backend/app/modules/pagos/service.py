import secrets
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.auth.models import Usuario
from app.modules.planes.models import Plan
from app.modules.pagos.models import (
    ESTADO_APROBADO,
    TIPO_CONTRATACION,
    TIPO_RENOVACION,
    MetodoPago,
    Pago,
)
from app.modules.suscripciones.models import (
    ESTADO_ACTIVA,
    ESTADO_CANCELADA,
    Suscripcion,
)
from app.modules.pagos.schemas import (
    ContratarPlanRequest,
    RenovarSuscripcionRequest,
)


def generar_numero_comprobante() -> str:
    """Genera un número único para identificar el pago."""
    return f"NV-{ahora():%Y%m%d}-{secrets.token_hex(4).upper()}"


def calcular_monto(plan: Plan, periodicidad: str) -> Decimal:
    """Calcula el precio final del plan según la periodicidad."""
    precio_mensual = Decimal(plan.precio_mensual)

    if periodicidad == "mensual":
        return precio_mensual

    descuento = Decimal(plan.descuento_anual_pct) / Decimal("100")
    return (precio_mensual * Decimal("12") * (Decimal("1") - descuento)).quantize(
        Decimal("0.01")
    )


def contratar_plan(
    db: Session,
    usuario: Usuario,
    datos: ContratarPlanRequest,
) -> tuple[Suscripcion, Pago]:
    """Contrata un plan y registra el pago en una sola transacción."""

    plan = db.scalar(
        select(Plan).where(
            Plan.id_plan == datos.id_plan,
            Plan.activo.is_(True),
        )
    )

    if plan is None:
        raise ValueError("El plan no existe o no está disponible")

    monto = calcular_monto(plan, datos.periodicidad)

    try:
        # Buscar la suscripción activa actual.
        suscripcion_actual = db.scalar(
            select(Suscripcion).where(
                Suscripcion.id_usuario == usuario.id_usuario,
                Suscripcion.estado == ESTADO_ACTIVA,
            )
        )

        # Si tiene una suscripción activa, se cancela al contratar la nueva.
        if suscripcion_actual is not None:
            suscripcion_actual.estado = ESTADO_CANCELADA
            suscripcion_actual.cancelada_en = ahora()

        inicio = ahora()

        if datos.periodicidad == "anual":
            dias_vigencia = 365
        else:
            dias_vigencia = plan.vigencia_dias

        nueva_suscripcion = Suscripcion(
            id_usuario=usuario.id_usuario,
            id_plan=plan.id_plan,
            fecha_inicio=inicio,
            fecha_fin=inicio + timedelta(days=dias_vigencia),
            estado=ESTADO_ACTIVA,
            periodicidad=datos.periodicidad,
            precio_contratado=monto,
            renovacion_automatica=True,
        )

        db.add(nueva_suscripcion)
        db.flush()

        metodo_pago = MetodoPago(
            marca=datos.marca,
            ultimos_4=datos.ultimos_4,
        )

        db.add(metodo_pago)
        db.flush()

        pago = Pago(
            numero_comprobante=generar_numero_comprobante(),
            id_usuario=usuario.id_usuario,
            id_suscripcion=nueva_suscripcion.id_suscripcion,
            id_metodo_pago=metodo_pago.id_metodo_pago,
            tipo=TIPO_CONTRATACION,
            estado=ESTADO_APROBADO,
            monto=monto,
            id_plan=plan.id_plan,
        )

        db.add(pago)
        db.commit()

        db.refresh(nueva_suscripcion)
        db.refresh(pago)

        return nueva_suscripcion, pago

    except Exception:
        db.rollback()
        raise

def renovar_suscripcion(
    db: Session,
    usuario: Usuario,
    datos: RenovarSuscripcionRequest,
) -> tuple[Suscripcion, Pago]:
    suscripcion = db.scalar(
        select(Suscripcion)
        .where(
            Suscripcion.id_usuario == usuario.id_usuario,
            Suscripcion.estado == ESTADO_ACTIVA,
        )
    )

    if suscripcion is None:
        raise ValueError("No tienes una suscripción activa para renovar")

    plan = suscripcion.plan

    if plan is None or not plan.activo:
        raise ValueError("El plan de la suscripción ya no está disponible")

    if suscripcion.periodicidad == "anual":
        monto = (
            Decimal(plan.precio_mensual)
            * Decimal("12")
            * (
                Decimal("1")
                - Decimal(plan.descuento_anual_pct) / Decimal("100")
            )
        ).quantize(Decimal("0.01"))

        dias_vigencia = 365
    else:
        monto = Decimal(plan.precio_mensual)
        dias_vigencia = plan.vigencia_dias

    try:
        ahora_actual = ahora()

        fecha_base = (
            suscripcion.fecha_fin
            if suscripcion.fecha_fin > ahora_actual
            else ahora_actual
        )

        suscripcion.fecha_inicio = fecha_base
        suscripcion.fecha_fin = fecha_base + timedelta(days=dias_vigencia)
        suscripcion.estado = ESTADO_ACTIVA

        metodo_pago = MetodoPago(
            marca=datos.marca,
            ultimos_4=datos.ultimos_4,
        )

        db.add(metodo_pago)
        db.flush()

        pago = Pago(
            numero_comprobante=generar_numero_comprobante(),
            id_usuario=usuario.id_usuario,
            id_suscripcion=suscripcion.id_suscripcion,
            id_metodo_pago=metodo_pago.id_metodo_pago,
            tipo=TIPO_RENOVACION,
            estado=ESTADO_APROBADO,
            monto=monto,
            id_plan=plan.id_plan,
        )

        db.add(pago)
        db.commit()

        db.refresh(suscripcion)
        db.refresh(pago)

        return suscripcion, pago

    except Exception:
        db.rollback()
        raise