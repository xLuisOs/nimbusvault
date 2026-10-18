"""Resumen del espacio de un cliente para el dashboard y el panel de consumo.

Los conteos por día y por mes se calculan en Python: por usuario son pocos registros y así
la misma lógica funciona en SQLite (pruebas) y en PostgreSQL (producción).
"""
import os
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import ahora
from app.modules.actividad.models import TIPO_DESCARGA, TIPO_ELIMINACION, TIPO_SUBIDA, Actividad
from app.modules.almacenamiento.models import Archivo, Carpeta
from app.modules.almacenamiento.service import _cuota, _suscripcion_o_403
from app.modules.auth.models import Usuario

CATEGORIAS = {
    "documentos": "Documentos",
    "imagenes": "Imágenes",
    "videos": "Videos",
    "audio": "Audio",
    "comprimidos": "Comprimidos",
    "otros": "Otros",
}
_DOCUMENTOS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp",
               ".txt", ".md", ".csv", ".rtf", ".json", ".xml", ".html"}
_COMPRIMIDOS = {".zip", ".rar", ".7z", ".gz", ".tar", ".tgz", ".bz2"}


def categoria(tipo_mime: str | None, nombre: str = "") -> str:
    mime = (tipo_mime or "").lower()
    ext = os.path.splitext(nombre.lower())[1]
    if mime.startswith("image/"):
        return "imagenes"
    if mime.startswith("video/"):
        return "videos"
    if mime.startswith("audio/"):
        return "audio"
    if ext in _COMPRIMIDOS or any(x in mime for x in ("zip", "rar", "7z", "tar", "gzip", "compressed")):
        return "comprimidos"
    if ext in _DOCUMENTOS or mime.startswith("text/") or any(
        x in mime for x in ("pdf", "word", "excel", "spreadsheet", "presentation", "powerpoint", "opendocument")
    ):
        return "documentos"
    return "otros"


def _local(dt: datetime, desfase: timedelta) -> datetime:
    """Pasa a la hora del navegador para que "hoy" y "este mes" sean los del usuario."""
    dt = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return (dt + desfase).replace(tzinfo=None)


def _mes_anterior(anio: int, mes: int) -> tuple[int, int]:
    return (anio - 1, 12) if mes == 1 else (anio, mes - 1)


def resumen_cliente(db: Session, usuario: Usuario, desfase_min: int = 0) -> dict:
    sus = _suscripcion_o_403(db, usuario)
    desfase = timedelta(minutes=desfase_min)
    hoy = _local(ahora(), desfase)
    uid = usuario.id_usuario

    archivos = list(db.scalars(
        select(Archivo).where(Archivo.id_usuario == uid, Archivo.eliminado_en.is_(None))
    ))
    carpetas = {c.id_carpeta: c.nombre for c in db.scalars(select(Carpeta).where(Carpeta.id_usuario == uid))}

    # Distribución por tipo de archivo
    bytes_cat: Counter = Counter()
    n_cat: Counter = Counter()
    for a in archivos:
        cat = categoria(a.tipo_mime, a.nombre_original)
        bytes_cat[cat] += a.tamano_bytes
        n_cat[cat] += 1
    por_categoria = [
        {"categoria": c, "etiqueta": etiqueta, "bytes": bytes_cat[c], "archivos": n_cat[c]}
        for c, etiqueta in CATEGORIAS.items() if n_cat[c]
    ]

    recientes = sorted(archivos, key=lambda a: a.creado_en, reverse=True)[:6]

    eventos = list(db.scalars(
        select(Actividad).where(Actividad.id_usuario == uid).order_by(Actividad.creado_en.desc())
    ))
    for e in eventos:
        e.local = _local(e.creado_en, desfase)

    # Este mes vs. el anterior
    anio_ant, mes_ant = _mes_anterior(hoy.year, hoy.month)

    def contar(tipo: str, anio: int, mes: int) -> int:
        return sum(1 for e in eventos if e.tipo == tipo and e.local.year == anio and e.local.month == mes)

    este_mes = {
        "subidas": contar(TIPO_SUBIDA, hoy.year, hoy.month),
        "descargas": contar(TIPO_DESCARGA, hoy.year, hoy.month),
        "subidas_mes_anterior": contar(TIPO_SUBIDA, anio_ant, mes_ant),
        "descargas_mes_anterior": contar(TIPO_DESCARGA, anio_ant, mes_ant),
        "bytes_eliminados": sum(
            e.tamano_bytes for e in eventos
            if e.tipo == TIPO_ELIMINACION and e.local.year == hoy.year and e.local.month == hoy.month
        ),
    }

    # Subidas y descargas por día (últimos 8 días, hoy incluido)
    dias = [(hoy - timedelta(days=i)).date() for i in range(7, -1, -1)]
    tendencia = [
        {
            "dia": d.isoformat(),
            "subidas": sum(1 for e in eventos if e.tipo == TIPO_SUBIDA and e.local.date() == d),
            "descargas": sum(1 for e in eventos if e.tipo == TIPO_DESCARGA and e.local.date() == d),
        }
        for d in dias
    ]

    # Espacio usado al cierre de cada mes (últimos 6): lo subido menos lo eliminado hasta esa fecha
    meses = []
    anio, mes = hoy.year, hoy.month
    for _ in range(6):
        meses.insert(0, (anio, mes))
        anio, mes = _mes_anterior(anio, mes)
    crecimiento = []
    for anio, mes in meses:
        neto = sum(
            e.tamano_bytes if e.tipo == TIPO_SUBIDA else -e.tamano_bytes
            for e in eventos
            if e.tipo in (TIPO_SUBIDA, TIPO_ELIMINACION) and (e.local.year, e.local.month) <= (anio, mes)
        )
        crecimiento.append({"mes": f"{anio:04d}-{mes:02d}", "bytes": max(neto, 0)})
    # El mes actual siempre es el uso real (por si hay archivos de antes de que existiera el registro)
    crecimiento[-1]["bytes"] = usuario.almacenamiento_usado_bytes or 0

    return {
        "archivos": len(archivos),
        "carpetas": len(carpetas),
        "usado_bytes": usuario.almacenamiento_usado_bytes or 0,
        "cuota_bytes": _cuota(sus),
        "por_categoria": por_categoria,
        "recientes": [
            {
                "id_archivo": a.id_archivo, "id_carpeta": a.id_carpeta,
                "carpeta": carpetas.get(a.id_carpeta) if a.id_carpeta else None,
                "nombre_original": a.nombre_original, "tipo_mime": a.tipo_mime,
                "tamano_bytes": a.tamano_bytes, "creado_en": a.creado_en,
            }
            for a in recientes
        ],
        "actividad": [
            {"tipo": e.tipo, "descripcion": e.descripcion, "tamano_bytes": e.tamano_bytes, "creado_en": e.creado_en}
            for e in eventos[:20]
        ],
        "este_mes": este_mes,
        "tendencia": tendencia,
        "crecimiento": crecimiento,
    }
