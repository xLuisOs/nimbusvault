from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PlanBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=60)
    descripcion: str = Field(min_length=2, max_length=300)
    precio_mensual: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    almacenamiento_gb: int = Field(gt=0, le=1_000_000)
    vigencia_dias: int = Field(default=30, gt=0, le=3650)
    descuento_anual_pct: int = Field(default=20, ge=0, le=100)
    destacado: bool = False
    orden: int = 0
    color: str = Field(default="#2E9BFF", pattern=r"^#[0-9A-Fa-f]{6}$")
    caracteristicas: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("caracteristicas")
    @classmethod
    def limpiar(cls, v: list[str]) -> list[str]:
        return [c.strip()[:120] for c in v if c.strip()]


class PlanCrear(PlanBase):
    codigo: str = Field(min_length=2, max_length=40, pattern=r"^[a-z0-9-]+$")


class PlanActualizar(PlanBase):
    pass


class PlanEstado(BaseModel):
    activo: bool


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_plan: UUID
    codigo: str
    nombre: str
    descripcion: str
    precio_mensual: Decimal
    precio_anual_mensualizado: Decimal
    descuento_anual_pct: int
    almacenamiento_gb: int
    vigencia_dias: int
    destacado: bool
    orden: int
    color: str
    activo: bool
    caracteristicas: list[str]


class PlanAdminOut(PlanOut):
    suscriptores_activos: int
