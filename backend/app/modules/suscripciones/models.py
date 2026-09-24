import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas
from app.modules.planes.models import Plan

ESTADO_ACTIVA = "activa"
ESTADO_VENCIDA = "vencida"
ESTADO_CANCELADA = "cancelada"


class Suscripcion(ConFechas, Base):
    __tablename__ = "suscripciones"
    __table_args__ = (
        CheckConstraint("estado IN ('activa','vencida','cancelada')", name="ck_suscripciones_estado"),
        CheckConstraint("periodicidad IN ('mensual','anual')", name="ck_suscripciones_periodicidad"),
        CheckConstraint("fecha_fin > fecha_inicio", name="ck_suscripciones_fechas"),
        # Regla: un usuario solo puede tener UNA suscripción activa a la vez
        Index(
            "ux_suscripciones_una_activa", "id_usuario", unique=True,
            postgresql_where=text("estado = 'activa'"), sqlite_where=text("estado = 'activa'"),
        ),
    )

    id_suscripcion: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_usuario: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), index=True)
    id_plan: Mapped[uuid.UUID] = mapped_column(ForeignKey("planes.id_plan"), index=True)
    fecha_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fecha_fin: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    estado: Mapped[str] = mapped_column(String(20), default=ESTADO_ACTIVA)
    periodicidad: Mapped[str] = mapped_column(String(10), default="mensual")
    # Copia del precio al momento de contratar: si el admin cambia el plan, lo pagado no cambia
    precio_contratado: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    renovacion_automatica: Mapped[bool] = mapped_column(Boolean, default=True)
    cancelada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    plan: Mapped[Plan] = relationship(lazy="joined")
