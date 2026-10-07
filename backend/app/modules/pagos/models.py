import uuid
from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, SmallInteger, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas
from app.modules.planes.models import Plan

TIPO_CONTRATACION = "contratacion"
TIPO_RENOVACION = "renovacion"

ESTADO_APROBADO = "aprobado"
ESTADO_RECHAZADO = "rechazado"


class MetodoPago(Base):
    __tablename__ = "metodos_pago"

    id_metodo_pago: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    marca: Mapped[str] = mapped_column(String(20))
    ultimos_4: Mapped[str] = mapped_column(String(4))

    pagos: Mapped[list["Pago"]] = relationship(
        back_populates="metodo_pago"
    )


class Pago(ConFechas, Base):
    __tablename__ = "pagos"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('contratacion','renovacion')",
            name="ck_pagos_tipo",
        ),
        CheckConstraint(
            "estado IN ('aprobado','rechazado')",
            name="ck_pagos_estado",
        ),
        CheckConstraint(
            "monto >= 0",
            name="ck_pagos_monto",
        ),
    )

    id_pago: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    numero_comprobante: Mapped[str] = mapped_column(
        String(40), unique=True, index=True
    )

    id_usuario: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        index=True,
    )

    id_suscripcion: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("suscripciones.id_suscripcion", ondelete="CASCADE"),
        index=True,
    )

    id_metodo_pago: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("metodos_pago.id_metodo_pago"),
        index=True,
    )

    tipo: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(
        String(20),
        default=ESTADO_APROBADO,
    )

    monto: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )

    id_plan: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planes.id_plan"),
        index=True,
    )

    metodo_pago: Mapped[MetodoPago] = relationship(
        back_populates="pagos"
    )

    plan: Mapped[Plan] = relationship(lazy="joined")