import re
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.security import ahora


class TarjetaIn(BaseModel):
    """Tarjeta simulada: se valida el formato, pero solo se conservan la marca y los últimos 4 dígitos."""

    numero: str = Field(max_length=30)
    titular: str = Field(min_length=2, max_length=120)
    vencimiento: str = Field(max_length=7)  # MM/AA
    cvv: str = Field(max_length=4)

    @field_validator("numero")
    @classmethod
    def solo_digitos(cls, v: str) -> str:
        digitos = re.sub(r"[\s-]", "", v)
        if not re.fullmatch(r"\d{13,19}", digitos):
            raise ValueError("Número de tarjeta inválido")
        return digitos

    @field_validator("titular")
    @classmethod
    def limpiar_titular(cls, v: str) -> str:
        return " ".join(v.split())

    @field_validator("vencimiento")
    @classmethod
    def no_vencida(cls, v: str) -> str:
        m = re.fullmatch(r"(\d{2})\s*/\s*(\d{2})", v.strip())
        if not m or not 1 <= int(m.group(1)) <= 12:
            raise ValueError("La fecha de vencimiento debe tener el formato MM/AA")
        mes, anio = int(m.group(1)), 2000 + int(m.group(2))
        hoy = ahora()
        if (anio, mes) < (hoy.year, hoy.month):
            raise ValueError("La tarjeta está vencida")
        return f"{mes:02d}/{anio % 100:02d}"

    @field_validator("cvv")
    @classmethod
    def cvv_valido(cls, v: str) -> str:
        if not re.fullmatch(r"\d{3,4}", v):
            raise ValueError("CVV inválido")
        return v


class ContratarIn(BaseModel):
    id_plan: UUID
    periodicidad: Literal["mensual", "anual"] = "mensual"
    tarjeta: TarjetaIn


class PagoOut(BaseModel):
    id_pago: UUID
    numero_comprobante: str
    tipo: str
    monto: Decimal  # USD, simulado
    estado: str
    fecha_pago: datetime | None
    plan_codigo: str
    plan_nombre: str
    periodicidad: str
    vigencia_inicio: datetime
    vigencia_fin: datetime
    marca_tarjeta: str | None
    ultimos_4: str | None
