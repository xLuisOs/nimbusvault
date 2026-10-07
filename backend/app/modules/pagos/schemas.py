import re
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ContratarPlanRequest(BaseModel):
    id_plan: UUID
    periodicidad: str = "mensual"
    marca: str = Field(min_length=2, max_length=20)
    ultimos_4: str = Field(min_length=4, max_length=4)

    @field_validator("periodicidad")
    @classmethod
    def validar_periodicidad(cls, v: str) -> str:
        if v not in ("mensual", "anual"):
            raise ValueError("La periodicidad debe ser mensual o anual")
        return v

    @field_validator("marca")
    @classmethod
    def validar_marca(cls, v: str) -> str:
        v = v.strip()

        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñ ]+", v):
            raise ValueError("La marca del método de pago no es válida")

        return v

    @field_validator("ultimos_4")
    @classmethod
    def validar_ultimos_4(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Los últimos 4 dígitos deben ser numéricos")

        return v


class ContratarPlanResponse(BaseModel):
    mensaje: str
    id_suscripcion: UUID
    id_pago: UUID
    numero_comprobante: str
    plan: str
    periodicidad: str
    monto: Decimal
    fecha_inicio: str
    fecha_fin: str
    estado_pago: str

class PagoHistorialResponse(BaseModel):
    id_pago: UUID
    numero_comprobante: str
    plan: str
    tipo: str
    estado: str
    monto: Decimal
    marca: str
    ultimos_4: str
    fecha: str
    
class RenovarSuscripcionRequest(BaseModel):
    marca: str = Field(min_length=2, max_length=20)
    ultimos_4: str = Field(min_length=4, max_length=4)

    @field_validator("marca")
    @classmethod
    def validar_marca(cls, v: str) -> str:
        v = v.strip()

        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñ ]+", v):
            raise ValueError("La marca del método de pago no es válida")

        return v

    @field_validator("ultimos_4")
    @classmethod
    def validar_ultimos_4(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Los últimos 4 dígitos deben ser numéricos")

        return v


class RenovarSuscripcionResponse(BaseModel):
    mensaje: str
    id_suscripcion: UUID
    id_pago: UUID
    numero_comprobante: str
    plan: str
    periodicidad: str
    monto: Decimal
    fecha_inicio: str
    fecha_fin: str
    estado_pago: str