import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, SmallInteger, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas


class Plan(ConFechas, Base):
    __tablename__ = "planes"
    __table_args__ = (
        CheckConstraint("precio_mensual >= 0", name="ck_planes_precio"),
        CheckConstraint("almacenamiento_gb > 0", name="ck_planes_almacenamiento"),
        CheckConstraint("vigencia_dias > 0", name="ck_planes_vigencia"),
        CheckConstraint("descuento_anual_pct BETWEEN 0 AND 100", name="ck_planes_descuento"),
    )

    id_plan: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)  # "gratis", "pro"... útil para URLs y seed
    nombre: Mapped[str] = mapped_column(String(60))
    descripcion: Mapped[str] = mapped_column(String(300))
    # Todos los montos del sistema están en dólares (USD). Los pagos son simulados.
    precio_mensual: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    descuento_anual_pct: Mapped[int] = mapped_column(SmallInteger, default=20)
    almacenamiento_gb: Mapped[int] = mapped_column(Integer)
    vigencia_dias: Mapped[int] = mapped_column(Integer, default=30)
    destacado: Mapped[bool] = mapped_column(Boolean, default=False)
    orden: Mapped[int] = mapped_column(SmallInteger, default=0)
    color: Mapped[str] = mapped_column(String(7), default="#2E9BFF")
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    caracteristicas: Mapped[list["PlanCaracteristica"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan", order_by="PlanCaracteristica.orden", lazy="selectin"
    )


class PlanCaracteristica(Base):
    """Cada línea con check que aparece en la tarjeta del plan (landing y catálogo)."""

    __tablename__ = "plan_caracteristicas"

    id_caracteristica: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    id_plan: Mapped[uuid.UUID] = mapped_column(ForeignKey("planes.id_plan", ondelete="CASCADE"), index=True)
    descripcion: Mapped[str] = mapped_column(String(120))
    orden: Mapped[int] = mapped_column(SmallInteger, default=0)

    plan: Mapped[Plan] = relationship(back_populates="caracteristicas")
