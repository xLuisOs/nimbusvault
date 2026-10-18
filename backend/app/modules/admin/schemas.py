from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

# Mismos valores que ROL_ADMIN, ROL_CLIENTE y ROL_SOPORTE de auth/models.py
RolNombre = Literal["ADMINISTRADOR", "CLIENTE", "SOPORTE"]


def _limpiar_nombre(v: str) -> str:
    return " ".join(v.split())


# ── Dashboard ────────────────────────────────────────────────────────────────

class Kpis(BaseModel):
    clientes_activos: int
    clientes_nuevos_mes: int
    clientes_nuevos_mes_anterior: int
    almacenamiento_usado_bytes: int
    cuota_contratada_bytes: int
    ingresos_mes: Decimal
    ingresos_mes_anterior: Decimal
    suscripciones_pagadas: int
    suscripciones_activas: int


class PuntoCrecimiento(BaseModel):
    mes: str  # AAAA-MM
    clientes: int  # acumulado al cierre del mes


class PlanDistribucion(BaseModel):
    plan: str
    color: str
    suscripciones: int


class SuscripcionReciente(BaseModel):
    nombre: str
    correo: str
    plan: str
    color: str
    periodicidad: str
    precio_contratado: Decimal
    fecha_inicio: datetime
    estado_usuario: str


class ResumenAdminOut(BaseModel):
    kpis: Kpis
    crecimiento: list[PuntoCrecimiento]
    distribucion: list[PlanDistribucion]
    ultimas_suscripciones: list[SuscripcionReciente]


# ── Usuarios ─────────────────────────────────────────────────────────────────

class UsuarioAdminOut(BaseModel):
    id_usuario: UUID
    nombre: str
    correo: str
    rol: str
    estado: str
    plan: str | None
    almacenamiento_usado_bytes: int
    cuota_bytes: int
    creado_en: datetime
    ultimo_acceso: datetime | None


class InvitarIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    rol: RolNombre = "CLIENTE"

    @field_validator("nombre")
    @classmethod
    def limpiar(cls, v: str) -> str:
        return _limpiar_nombre(v)


class UsuarioActualizar(BaseModel):
    """Solo cambia lo que viene en el cuerpo."""

    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    rol: RolNombre | None = None
    estado: Literal["activo", "suspendido"] | None = None

    @field_validator("nombre")
    @classmethod
    def limpiar(cls, v: str | None) -> str | None:
        return _limpiar_nombre(v) if v else v


# ── Infraestructura ──────────────────────────────────────────────────────────

class Componente(BaseModel):
    id: str
    nombre: str
    estado: Literal["operativo", "advertencia", "error"]
    metrica: str
    metrica_etiqueta: str
    detalle: str


class Alerta(BaseModel):
    severidad: Literal["alta", "media", "baja"]
    titulo: str
    componente: str


class PuntoAlmacenamiento(BaseModel):
    dia: str  # AAAA-MM-DD
    bytes: int


class Actividad24h(BaseModel):
    subidas: int
    descargas: int
    bytes_subidos: int
    sesiones_activas: int
    usuarios_con_acceso_hoy: int
    archivos_almacenados: int


class InfraOut(BaseModel):
    componentes: list[Componente]
    alertas: list[Alerta]
    historial_almacenamiento: list[PuntoAlmacenamiento]
    cuota_contratada_bytes: int
    actividad: Actividad24h
    en_linea_desde: datetime
    entorno: str
    version: str
