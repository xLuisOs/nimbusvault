"""Contratación de planes, historial de pagos y comprobantes (RF-07, RF-09). Todos los pagos son simulados."""
import secrets
from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO
from uuid import UUID

from fastapi import HTTPException, status
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.almacenamiento.service import GIB
from app.modules.auth.models import Usuario
from app.modules.pagos.models import ESTADO_APROBADO, TIPO_CONTRATACION, Pago
from app.modules.pagos.schemas import ContratarIn, PagoOut
from app.modules.planes.models import Plan
from app.modules.planes.service import precio_anual_mensualizado
from app.modules.suscripciones.models import ESTADO_CANCELADA, Suscripcion
from app.modules.suscripciones.service import suscripcion_activa

DIAS_ANUAL = 365


# ── Helpers ───────────────────────────────────────────────────────────────────

def _marca(numero: str) -> str:
    if numero.startswith("4"):
        return "visa"
    if numero[:2] in {"34", "37"}:
        return "amex"
    if 51 <= int(numero[:2]) <= 55 or 2221 <= int(numero[:4]) <= 2720:
        return "mastercard"
    return "otra"


def _numero_comprobante() -> str:
    # NV-2026-1A2B3C4D: aleatorio para no revelar cuántas ventas hay (la columna es única)
    return f"NV-{ahora().year}-{secrets.token_hex(4).upper()}"


def _a_schema(pago: Pago, sus: Suscripcion, plan: Plan) -> PagoOut:
    return PagoOut(
        id_pago=pago.id_pago,
        numero_comprobante=pago.numero_comprobante,
        tipo=pago.tipo,
        monto=pago.monto,
        estado=pago.estado,
        fecha_pago=pago.fecha_pago,
        plan_codigo=plan.codigo,
        plan_nombre=plan.nombre,
        periodicidad=sus.periodicidad,
        vigencia_inicio=sus.fecha_inicio,
        vigencia_fin=sus.fecha_fin,
        marca_tarjeta=pago.marca_tarjeta,
        ultimos_4=pago.ultimos_4,
    )


def _gb(bytes_: int) -> str:
    return f"{bytes_ / GIB:.1f} GB"


# ── Contratación ──────────────────────────────────────────────────────────────

def contratar_plan(db: Session, usuario: Usuario, datos: ContratarIn) -> PagoOut:
    """CU de contratación: cancela la suscripción activa, crea la nueva y registra el pago en UNA transacción."""
    plan = db.get(Plan, datos.id_plan)
    if plan is None or not plan.activo:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan no encontrado")
    if plan.precio_mensual == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El plan gratuito se asigna automáticamente, no se contrata")

    actual = suscripcion_activa(db, usuario.id_usuario)
    if actual and actual.id_plan == plan.id_plan and actual.periodicidad == datos.periodicidad:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Ya tienes el plan {plan.nombre} ({datos.periodicidad}) activo")

    # No se puede bajar a un plan donde los archivos actuales no caben (RN-03)
    cuota = plan.almacenamiento_gb * GIB
    usado = usuario.almacenamiento_usado_bytes or 0
    if usado > cuota:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Usas {_gb(usado)} y el plan {plan.nombre} ofrece {plan.almacenamiento_gb} GB: libera espacio antes de cambiar",
        )

    anual = datos.periodicidad == "anual"
    monto = (precio_anual_mensualizado(plan) * 12) if anual else plan.precio_mensual
    inicio = ahora()

    try:
        if actual:
            actual.estado = ESTADO_CANCELADA
            actual.cancelada_en = inicio
            db.flush()  # libera el índice «una activa por usuario» antes de insertar la nueva

        nueva = Suscripcion(
            id_usuario=usuario.id_usuario,
            id_plan=plan.id_plan,
            fecha_inicio=inicio,
            fecha_fin=inicio + timedelta(days=DIAS_ANUAL if anual else plan.vigencia_dias),
            periodicidad=datos.periodicidad,
            precio_contratado=monto,  # copia: si el admin cambia el precio, lo pagado no cambia
        )
        db.add(nueva)
        db.flush()

        pago = Pago(
            id_suscripcion=nueva.id_suscripcion,
            numero_comprobante=_numero_comprobante(),
            tipo=TIPO_CONTRATACION,
            monto=monto,
            metodo_simulado="tarjeta",
            estado=ESTADO_APROBADO,  # simulado: siempre se aprueba
            fecha_pago=inicio,
            marca_tarjeta=_marca(datos.tarjeta.numero),
            ultimos_4=datos.tarjeta.numero[-4:],
        )
        db.add(pago)
        db.commit()
    except IntegrityError:
        # Dos contrataciones simultáneas: el índice único deja pasar solo una
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya hay una contratación en curso, intenta de nuevo")

    return _a_schema(pago, nueva, plan)


# ── Historial ─────────────────────────────────────────────────────────────────

def _consulta_pagos(usuario: Usuario):
    return (
        select(Pago, Suscripcion, Plan)
        .join(Suscripcion, Pago.id_suscripcion == Suscripcion.id_suscripcion)
        .join(Plan, Suscripcion.id_plan == Plan.id_plan)
        .where(Suscripcion.id_usuario == usuario.id_usuario)
    )


def listar_pagos(db: Session, usuario: Usuario) -> list[PagoOut]:
    filas = db.execute(_consulta_pagos(usuario).order_by(Pago.fecha_pago.desc()))
    return [_a_schema(p, s, pl) for p, s, pl in filas]


def obtener_pago(db: Session, usuario: Usuario, id_pago: UUID) -> PagoOut:
    fila = db.execute(_consulta_pagos(usuario).where(Pago.id_pago == id_pago)).first()
    # 404 también si es de otra persona: no revelamos que existe
    if fila is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pago no encontrado")
    return _a_schema(*fila)


# ── Comprobante PDF ───────────────────────────────────────────────────────────

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]
MARCAS = {"visa": "Visa", "mastercard": "Mastercard", "amex": "American Express", "otra": "Tarjeta"}


def _fecha(dt: datetime | None) -> str:
    return f"{dt.day} de {MESES[dt.month - 1]} de {dt.year}" if dt else "—"


def _dolares(monto: Decimal) -> str:
    return f"${monto:,.2f} USD"


def comprobante_pdf(db: Session, usuario: Usuario, id_pago: UUID) -> tuple[str, bytes]:
    """Devuelve (nombre_de_archivo, contenido) del comprobante en PDF."""
    pago = obtener_pago(db, usuario, id_pago)
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle(f"Comprobante {pago.numero_comprobante}")
    ancho, alto = letter
    x, y = 60, alto - 70

    # Encabezado
    pdf.setFillColorRGB(0.18, 0.61, 1)  # #2E9BFF
    pdf.rect(0, alto - 8, ancho, 8, stroke=0, fill=1)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(x, y, "NimbusVault")
    pdf.setFillColorRGB(0.06, 0.09, 0.16)
    pdf.setFont("Helvetica", 11)
    pdf.drawRightString(ancho - x, y + 4, "Comprobante de pago")
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(ancho - x, y - 12, pago.numero_comprobante)

    # Detalle
    metodo = "—"
    if pago.marca_tarjeta:
        metodo = f"{MARCAS.get(pago.marca_tarjeta, 'Tarjeta')} terminada en {pago.ultimos_4}"
    filas = [
        ("Cliente", f"{usuario.nombre} <{usuario.correo}>"),
        ("Fecha de pago", _fecha(pago.fecha_pago)),
        ("Concepto", f"Plan {pago.plan_nombre} ({pago.periodicidad})"),
        ("Vigencia", f"{_fecha(pago.vigencia_inicio)} al {_fecha(pago.vigencia_fin)}"),
        ("Método de pago", metodo),
        ("Estado", pago.estado.capitalize()),
    ]
    y -= 60
    for etiqueta, valor in filas:
        pdf.setFont("Helvetica", 10)
        pdf.setFillColorRGB(0.39, 0.45, 0.55)
        pdf.drawString(x, y, etiqueta)
        pdf.setFont("Helvetica", 11)
        pdf.setFillColorRGB(0.06, 0.09, 0.16)
        pdf.drawString(x + 130, y, valor)
        y -= 24

    # Total
    y -= 10
    pdf.setStrokeColorRGB(0.89, 0.91, 0.94)
    pdf.line(x, y + 12, ancho - x, y + 12)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(x, y - 10, "Total")
    pdf.drawRightString(ancho - x, y - 10, _dolares(pago.monto))

    # Pie
    pdf.setFont("Helvetica-Oblique", 9)
    pdf.setFillColorRGB(0.58, 0.64, 0.72)
    pdf.drawString(x, 60, "Pago simulado con fines académicos: no se realizó ningún cobro real.")
    pdf.showPage()
    pdf.save()
    return f"comprobante-{pago.numero_comprobante}.pdf", buffer.getvalue()
