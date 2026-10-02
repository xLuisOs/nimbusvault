"""Modelo de pagos (simulados) asociados a una suscripción."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint("monto >= 0", name="ck_pagos_monto"),
        # AJUSTA estos valores a lo que digan sus requisitos
        CheckConstraint("estado IN ('pendiente','aprobado','rechazado')", name="ck_pagos_estado"),
    )

    id_pago: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_suscripcion: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("suscripciones.id_suscripcion"), index=True
    )
    numero_comprobante: Mapped[str] = mapped_column(String(40), unique=True)
    tipo: Mapped[str] = mapped_column(String(20))
    monto: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    metodo_simulado: Mapped[str] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(String(20))
    fecha_pago: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
