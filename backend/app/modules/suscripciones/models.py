import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, ConFechas
from app.modules.planes.models import Plan

from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import update
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.modules.suscripciones.models import Suscripcion, ESTADO_ACTIVA, ESTADO_VENCIDA

def expirar_suscripciones_vencidas(db: Session) -> int:
    """
    Busca todas las suscripciones activas cuya fecha_fin ya pasó 
    y las pasa a estado 'vencida'. Retorna la cantidad actualizada.
    """
    ahora = datetime.now(timezone.utc)
    
    stmt = (
        update(Suscripcion)
        .where(Suscripcion.estado == ESTADO_ACTIVA)
        .where(Suscripcion.fecha_fin < ahora)
        .values(estado=ESTADO_VENCIDA)
    )
    
    resultado = db.execute(stmt)
    db.commit()
    return resultado.rowcount

def renovar_suscripcion(db: Session, id_usuario: UUID) -> Suscripcion:
    """
    Renueva la suscripción del usuario (mensual o anual).
    Si estaba activa, suma tiempo a la fecha de fin. 
    Si estaba vencida, arranca un nuevo periodo desde HOY.
    """
    # Buscamos la suscripción del usuario (activa o vencida)
    suscripcion = db.query(Suscripcion).filter(
        Suscripcion.id_usuario == id_usuario,
        Suscripcion.estado.in_([ESTADO_ACTIVA, ESTADO_VENCIDA])
    ).first()

    if not suscripcion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una suscripción para renovar."
        )

    ahora = datetime.now(timezone.utc)
    
    # Si renueva ANTES de vencer, le sumamos el tiempo a su fecha actual.
    # Si renueva DESPUÉS de vencer, el nuevo mes/año empieza HOY.
    fecha_base = suscripcion.fecha_fin if suscripcion.fecha_fin > ahora else ahora

    # Sumamos 30 o 365 días según periodicidad
    dias_extra = 30 if suscripcion.periodicidad == "mensual" else 365
    nueva_fecha_fin = fecha_base + timedelta(days=dias_extra)

    suscripcion.fecha_fin = nueva_fecha_fin
    suscripcion.estado = ESTADO_ACTIVA
    
    db.commit()
    db.refresh(suscripcion)
    
    return suscripcion

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
