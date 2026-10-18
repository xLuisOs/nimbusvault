"""Panel administrativo: métricas de la plataforma, gestión de usuarios e infraestructura (RF-17, RF-19, CU-05)."""
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.core import email
from app.core.config import settings
from app.core.security import ahora, generar_token, hash_password
from app.core.storage import AlmacenS3
from app.modules.actividad.models import TIPO_DESCARGA, TIPO_ELIMINACION, TIPO_SUBIDA, Actividad
from app.modules.admin.schemas import InvitarIn, UsuarioActualizar
from app.modules.almacenamiento.models import Archivo
from app.modules.auth.models import (
    ESTADO_ACTIVO, ESTADO_PENDIENTE, ESTADO_SUSPENDIDO, ROL_CLIENTE, TOKEN_RECUPERACION, Rol, Sesion, Usuario,
)
from app.modules.auth.cuenta import borrar_cuenta
from app.modules.auth.service import _crear_token, buscar_por_correo
from app.modules.pagos.models import ESTADO_APROBADO, Pago
from app.modules.planes.models import Plan
from app.modules.suscripciones.models import ESTADO_ACTIVA, ESTADO_VENCIDA, Suscripcion

GIB = 1024**3
ARRANQUE = ahora()  # para mostrar desde cuándo está en línea la API


def _con_zona(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _local(dt: datetime, desfase: timedelta) -> datetime:
    return (_con_zona(dt) + desfase).replace(tzinfo=None)


def _meses_hasta(hoy: datetime, n: int) -> list[tuple[int, int]]:
    """Los últimos n meses, del más antiguo al actual."""
    anio, mes, salida = hoy.year, hoy.month, []
    for _ in range(n):
        salida.insert(0, (anio, mes))
        anio, mes = (anio - 1, 12) if mes == 1 else (anio, mes - 1)
    return salida


def _cuota_contratada(db: Session) -> int:
    gb = db.scalar(
        select(func.coalesce(func.sum(Plan.almacenamiento_gb), 0))
        .select_from(Suscripcion).join(Plan, Suscripcion.id_plan == Plan.id_plan)
        .where(Suscripcion.estado == ESTADO_ACTIVA)
    )
    return int(gb or 0) * GIB


# ── Dashboard ────────────────────────────────────────────────────────────────

def resumen(db: Session, desfase_min: int = 0) -> dict:
    desfase = timedelta(minutes=desfase_min)
    hoy = _local(ahora(), desfase)
    meses = _meses_hasta(hoy, 8)
    este, anterior = meses[-1], meses[-2]

    clientes = list(db.execute(
        select(Usuario.creado_en, Usuario.estado).join(Rol).where(Rol.nombre == ROL_CLIENTE)
    ))
    alta = [(_local(c, desfase).year, _local(c, desfase).month) for c, _ in clientes]

    pagos = list(db.execute(
        select(Pago.monto, Pago.fecha_pago).where(Pago.estado == ESTADO_APROBADO, Pago.fecha_pago.is_not(None))
    ))

    def ingresos(anio_mes: tuple[int, int]) -> Decimal:
        return sum(
            (m for m, f in pagos if (_local(f, desfase).year, _local(f, desfase).month) == anio_mes), Decimal("0")
        )

    activas = list(db.execute(
        select(Suscripcion.precio_contratado, Plan.nombre, Plan.color, Plan.orden)
        .join(Plan, Suscripcion.id_plan == Plan.id_plan)
        .where(Suscripcion.estado == ESTADO_ACTIVA)
    ))
    por_plan: Counter = Counter()
    colores, orden = {}, {}
    for _, nombre, color, o in activas:
        por_plan[nombre] += 1
        colores[nombre], orden[nombre] = color, o

    recientes = db.execute(
        select(Usuario.nombre, Usuario.correo, Usuario.estado, Plan.nombre, Plan.color,
               Suscripcion.periodicidad, Suscripcion.precio_contratado, Suscripcion.fecha_inicio, Suscripcion.estado)
        .join(Usuario, Suscripcion.id_usuario == Usuario.id_usuario)
        .join(Plan, Suscripcion.id_plan == Plan.id_plan)
        .order_by(Suscripcion.fecha_inicio.desc())
        .limit(8)
    )

    return {
        "kpis": {
            "clientes_activos": sum(1 for _, e in clientes if e == ESTADO_ACTIVO),
            "clientes_nuevos_mes": alta.count(este),
            "clientes_nuevos_mes_anterior": alta.count(anterior),
            "almacenamiento_usado_bytes": int(
                db.scalar(select(func.coalesce(func.sum(Usuario.almacenamiento_usado_bytes), 0))) or 0
            ),
            "cuota_contratada_bytes": _cuota_contratada(db),
            "ingresos_mes": ingresos(este),
            "ingresos_mes_anterior": ingresos(anterior),
            "suscripciones_pagadas": sum(1 for p, *_ in activas if p > 0),
            "suscripciones_activas": len(activas),
        },
        "crecimiento": [
            {"mes": f"{a:04d}-{m:02d}", "clientes": sum(1 for x in alta if x <= (a, m))} for a, m in meses
        ],
        "distribucion": [
            {"plan": n, "color": colores[n], "suscripciones": c}
            for n, c in sorted(por_plan.items(), key=lambda x: orden[x[0]])
        ],
        "ultimas_suscripciones": [
            {"nombre": n, "correo": c, "estado_usuario": e, "plan": p, "color": col,
             "periodicidad": per, "precio_contratado": precio, "fecha_inicio": f, "estado": est}
            for n, c, e, p, col, per, precio, f, est in recientes
        ],
    }


# ── Usuarios ─────────────────────────────────────────────────────────────────

def listar_usuarios(db: Session) -> list[dict]:
    planes = {
        id_u: (nombre, gb) for id_u, nombre, gb in db.execute(
            select(Suscripcion.id_usuario, Plan.nombre, Plan.almacenamiento_gb)
            .join(Plan, Suscripcion.id_plan == Plan.id_plan)
            .where(Suscripcion.estado == ESTADO_ACTIVA)
        )
    }
    usuarios = db.scalars(select(Usuario).order_by(Usuario.creado_en.desc()))
    return [
        {
            "id_usuario": u.id_usuario, "nombre": u.nombre, "correo": u.correo, "rol": u.rol.nombre,
            "estado": u.estado, "plan": planes.get(u.id_usuario, (None, 0))[0],
            "almacenamiento_usado_bytes": u.almacenamiento_usado_bytes or 0,
            "cuota_bytes": planes.get(u.id_usuario, (None, 0))[1] * GIB,
            "creado_en": u.creado_en, "ultimo_acceso": u.ultimo_acceso,
        }
        for u in usuarios
    ]


def _usuario_o_404(db: Session, id_usuario: UUID) -> Usuario:
    usuario = db.get(Usuario, id_usuario)
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    return usuario


def _no_a_si_mismo(admin: Usuario, objetivo: Usuario) -> None:
    # Evita que el admin se suspenda, se quite el rol o se borre y deje la plataforma sin administrador
    if admin.id_usuario == objetivo.id_usuario:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes modificar ni eliminar tu propia cuenta desde aquí")


def _revocar_sesiones(db: Session, id_usuario: UUID) -> None:
    db.execute(
        update(Sesion).where(Sesion.id_usuario == id_usuario, Sesion.revocada_en.is_(None)).values(revocada_en=ahora())
    )


def invitar(db: Session, datos: InvitarIn) -> Usuario:
    """El admin crea la cuenta; el usuario recibe un enlace para elegir su contraseña (y con eso queda activo)."""
    if buscar_por_correo(db, datos.correo):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo")
    rol = db.scalar(select(Rol).where(Rol.nombre == datos.rol))
    usuario = Usuario(
        id_rol=rol.id_rol, nombre=datos.nombre, correo=datos.correo.strip().lower(),
        # Contraseña imposible de adivinar: nadie entra hasta que el invitado elija la suya
        password_hash=hash_password(generar_token()), estado=ESTADO_PENDIENTE, acepto_terminos_en=ahora(),
    )
    db.add(usuario)
    db.flush()
    token = _crear_token(db, usuario, TOKEN_RECUPERACION, timedelta(hours=settings.verificacion_horas))
    db.commit()
    email.enviar_invitacion(usuario.correo, usuario.nombre, token)
    return usuario


def actualizar_usuario(db: Session, admin: Usuario, id_usuario: UUID, datos: UsuarioActualizar) -> Usuario:
    usuario = _usuario_o_404(db, id_usuario)
    _no_a_si_mismo(admin, usuario)

    if datos.nombre is not None:
        usuario.nombre = datos.nombre
    if datos.rol is not None:
        usuario.id_rol = db.scalar(select(Rol.id_rol).where(Rol.nombre == datos.rol))
        _revocar_sesiones(db, usuario.id_usuario)  # el rol viaja en el JWT: que vuelva a entrar con el nuevo
    if datos.estado is not None and datos.estado != usuario.estado:
        if usuario.estado == ESTADO_PENDIENTE:
            raise HTTPException(status.HTTP_409_CONFLICT, "El usuario aún no confirma su correo")
        usuario.estado = datos.estado
        if datos.estado == ESTADO_SUSPENDIDO:
            _revocar_sesiones(db, usuario.id_usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def eliminar_usuario(db: Session, almacen: AlmacenS3 | None, admin: Usuario, id_usuario: UUID) -> None:
    usuario = _usuario_o_404(db, id_usuario)
    _no_a_si_mismo(admin, usuario)
    borrar_cuenta(db, almacen, usuario)


# ── Infraestructura ──────────────────────────────────────────────────────────

def _medir(funcion) -> tuple[float | None, str | None]:
    inicio = time.perf_counter()
    try:
        funcion()
    except Exception as e:  # noqa: BLE001 — el panel debe mostrar el error, no caerse
        return None, str(e)[:200]
    return (time.perf_counter() - inicio) * 1000, None


def _estado_por_latencia(ms: float | None, umbral: float) -> str:
    if ms is None:
        return "error"
    return "advertencia" if ms > umbral else "operativo"


def infraestructura(db: Session, almacen: AlmacenS3 | None, version: str, desfase_min: int = 0) -> dict:
    desfase = timedelta(minutes=desfase_min)
    momento = ahora()
    hoy = _local(momento, desfase)
    motor = db.get_bind().dialect.name

    ms_db, error_db = _medir(lambda: db.execute(text("SELECT 1")))
    detalle_db = "SQLite" if motor == "sqlite" else "PostgreSQL"
    if motor == "postgresql" and error_db is None:
        tam = db.scalar(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))
        detalle_db = f"PostgreSQL · {tam} en disco"

    if almacen is None:
        ms_s3, error_s3 = None, "Almacenamiento no configurado (variables S3_*)"
    else:
        ms_s3, error_s3 = _medir(almacen.verificar)

    usado = int(db.scalar(select(func.coalesce(func.sum(Usuario.almacenamiento_usado_bytes), 0))) or 0)
    archivos = db.scalar(select(func.count()).select_from(Archivo).where(Archivo.eliminado_en.is_(None))) or 0
    sesiones = db.scalar(
        select(func.count()).select_from(Sesion).where(Sesion.revocada_en.is_(None), Sesion.expira_en > momento)
    ) or 0
    hace_24h = momento - timedelta(hours=24)
    eventos_24h = list(db.execute(
        select(Actividad.tipo, Actividad.tamano_bytes).where(Actividad.creado_en >= hace_24h)
    ))
    inicio_dia = (hoy.replace(hour=0, minute=0, second=0, microsecond=0) - desfase).replace(tzinfo=timezone.utc)
    con_acceso_hoy = db.scalar(
        select(func.count()).select_from(Usuario).where(Usuario.ultimo_acceso >= inicio_dia)
    ) or 0

    correo_ok = settings.email_backend != "brevo" or bool(settings.brevo_api_key)
    proveedor_s3 = "Supabase Storage" if "supabase.co" in settings.s3_endpoint_url else "S3 compatible"
    componentes = [
        {
            "id": "api", "nombre": "API Backend", "estado": "operativo",
            "metrica": f"v{version}", "metrica_etiqueta": "Versión",
            "detalle": f"FastAPI · entorno {settings.entorno}",
        },
        {
            "id": "db", "nombre": "Base de datos", "estado": _estado_por_latencia(ms_db, 300),
            "metrica": f"{ms_db:.0f} ms" if ms_db is not None else "Sin conexión",
            "metrica_etiqueta": "Latencia de consulta", "detalle": error_db or detalle_db,
        },
        {
            "id": "storage", "nombre": "Almacenamiento de archivos", "estado": _estado_por_latencia(ms_s3, 1500),
            "metrica": f"{ms_s3:.0f} ms" if ms_s3 is not None else "Sin respuesta",
            "metrica_etiqueta": "Latencia del bucket",
            "detalle": error_s3 or f"{proveedor_s3} · bucket {settings.s3_bucket}",
        },
        {
            "id": "auth", "nombre": "Autenticación y correo", "estado": "operativo" if correo_ok else "advertencia",
            "metrica": str(sesiones), "metrica_etiqueta": "Sesiones activas",
            "detalle": f"JWT + refresh token · correo por {settings.email_backend}",
        },
    ]

    alertas = []
    if error_db:
        alertas.append({"severidad": "alta", "titulo": "La base de datos no responde", "componente": "Base de datos"})
    elif ms_db is not None and ms_db > 300:
        alertas.append({"severidad": "media", "titulo": f"Consultas lentas ({ms_db:.0f} ms)", "componente": "Base de datos"})
    if error_s3:
        alertas.append({"severidad": "alta", "titulo": error_s3, "componente": "Almacenamiento de archivos"})
    if not correo_ok:
        alertas.append({"severidad": "media", "titulo": "Falta BREVO_API_KEY: no se envían correos", "componente": "Correo"})
    if settings.entorno == "produccion" and settings.email_backend == "consola":
        alertas.append({"severidad": "media", "titulo": "Los correos solo se imprimen en el log", "componente": "Correo"})
    for nombre, uso, gb in db.execute(
        select(Usuario.nombre, Usuario.almacenamiento_usado_bytes, Plan.almacenamiento_gb)
        .join(Suscripcion, Suscripcion.id_usuario == Usuario.id_usuario)
        .join(Plan, Suscripcion.id_plan == Plan.id_plan)
        .where(Suscripcion.estado == ESTADO_ACTIVA)
    ):
        if gb and uso >= 0.9 * gb * GIB:
            alertas.append({"severidad": "baja", "titulo": f"{nombre} usa el {uso / (gb * GIB):.0%} de su cuota",
                            "componente": "Cuotas"})
    vencidas = db.scalar(
        select(func.count()).select_from(Suscripcion)
        .where(Suscripcion.estado == ESTADO_VENCIDA, Suscripcion.fecha_fin >= momento - timedelta(days=7))
    ) or 0
    if vencidas:
        alertas.append({"severidad": "baja", "titulo": f"{vencidas} suscripción(es) vencida(s) esta semana",
                        "componente": "Suscripciones"})

    # Espacio total al cierre de cada uno de los últimos 14 días (subido − eliminado)
    neto = list(db.execute(
        select(Actividad.tipo, Actividad.tamano_bytes, Actividad.creado_en)
        .where(Actividad.tipo.in_((TIPO_SUBIDA, TIPO_ELIMINACION)))
    ))
    dias = [(hoy - timedelta(days=i)).date() for i in range(13, -1, -1)]
    historial = [
        {"dia": d.isoformat(), "bytes": max(sum(
            t if tipo == TIPO_SUBIDA else -t for tipo, t, f in neto if _local(f, desfase).date() <= d
        ), 0)}
        for d in dias
    ]
    historial[-1]["bytes"] = usado

    return {
        "componentes": componentes,
        "alertas": alertas,
        "historial_almacenamiento": historial,
        "cuota_contratada_bytes": _cuota_contratada(db),
        "actividad": {
            "subidas": sum(1 for tipo, _ in eventos_24h if tipo == TIPO_SUBIDA),
            "descargas": sum(1 for tipo, _ in eventos_24h if tipo == TIPO_DESCARGA),
            "bytes_subidos": sum(t for tipo, t in eventos_24h if tipo == TIPO_SUBIDA),
            "sesiones_activas": sesiones,
            "usuarios_con_acceso_hoy": con_acceso_hoy,
            "archivos_almacenados": archivos,
        },
        "en_linea_desde": ARRANQUE,
        "entorno": settings.entorno,
        "version": version,
    }
