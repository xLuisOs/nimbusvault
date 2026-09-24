from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core import email
from app.core.config import settings
from app.core.security import (
    ahora, crear_access_token, generar_token, hash_password, hash_token, verificar_password,
)
from app.modules.auth.models import (
    ESTADO_ACTIVO, ESTADO_PENDIENTE, ESTADO_SUSPENDIDO, ROL_CLIENTE, TOKEN_RECUPERACION, TOKEN_VERIFICACION,
    Rol, Sesion, TokenUsuario, Usuario,
)
from app.modules.auth.schemas import RegistroIn, SuscripcionResumen, UsuarioOut
from app.modules.suscripciones.service import _con_zona, asignar_plan_gratis, suscripcion_activa


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalizar(correo: str) -> str:
    return correo.strip().lower()


def buscar_por_correo(db: Session, correo: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(Usuario.correo == _normalizar(correo)))


def _crear_token(db: Session, usuario: Usuario, tipo: str, duracion: timedelta) -> str:
    # Invalida los tokens anteriores del mismo tipo: solo sirve el último enlace enviado
    db.execute(
        update(TokenUsuario)
        .where(TokenUsuario.id_usuario == usuario.id_usuario, TokenUsuario.tipo == tipo, TokenUsuario.usado_en.is_(None))
        .values(usado_en=ahora())
    )
    token = generar_token()
    db.add(TokenUsuario(
        id_usuario=usuario.id_usuario, tipo=tipo, token_hash=hash_token(token), expira_en=ahora() + duracion,
    ))
    return token


def _consumir_token(db: Session, token: str, tipo: str) -> Usuario:
    registro = db.scalar(select(TokenUsuario).where(TokenUsuario.token_hash == hash_token(token)))
    if (
        registro is None
        or registro.tipo != tipo
        or registro.usado_en is not None
        or _con_zona(registro.expira_en) < ahora()
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El enlace no es válido o ya expiró")
    registro.usado_en = ahora()
    return registro.usuario


def usuario_a_schema(db: Session, usuario: Usuario) -> UsuarioOut:
    sus = suscripcion_activa(db, usuario.id_usuario)
    resumen = None
    if sus:
        resumen = SuscripcionResumen(
            id_suscripcion=sus.id_suscripcion,
            plan_codigo=sus.plan.codigo,
            plan_nombre=sus.plan.nombre,
            almacenamiento_gb=sus.plan.almacenamiento_gb,
            precio_contratado=sus.precio_contratado,
            fecha_inicio=sus.fecha_inicio,
            fecha_fin=sus.fecha_fin,
            estado=sus.estado,
        )
    return UsuarioOut(
        id_usuario=usuario.id_usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        rol=usuario.rol.nombre,
        estado=usuario.estado,
        creado_en=usuario.creado_en,
        almacenamiento_usado_bytes=usuario.almacenamiento_usado_bytes,
        suscripcion=resumen,
    )


# ── Casos de uso ──────────────────────────────────────────────────────────────

def registrar(db: Session, datos: RegistroIn) -> None:
    """CU-01 / RF-01 y RF-02."""
    if buscar_por_correo(db, datos.correo):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo")

    rol_cliente = db.scalar(select(Rol).where(Rol.nombre == ROL_CLIENTE))
    usuario = Usuario(
        id_rol=rol_cliente.id_rol,
        nombre=datos.nombre,
        correo=_normalizar(datos.correo),
        password_hash=hash_password(datos.password),
        estado=ESTADO_PENDIENTE,
        acepto_terminos_en=ahora(),
    )
    db.add(usuario)
    db.flush()
    token = _crear_token(db, usuario, TOKEN_VERIFICACION, timedelta(hours=settings.verificacion_horas))
    db.commit()
    email.enviar_verificacion(usuario.correo, usuario.nombre, token)


def verificar_correo(db: Session, token: str) -> None:
    usuario = _consumir_token(db, token, TOKEN_VERIFICACION)
    if usuario.estado == ESTADO_PENDIENTE:
        usuario.estado = ESTADO_ACTIVO
        usuario.correo_verificado_en = ahora()
        asignar_plan_gratis(db, usuario)
    db.commit()


def reenviar_verificacion(db: Session, correo: str) -> None:
    usuario = buscar_por_correo(db, correo)
    # Misma respuesta exista o no el correo, para no revelar qué cuentas existen
    if usuario and usuario.estado == ESTADO_PENDIENTE:
        token = _crear_token(db, usuario, TOKEN_VERIFICACION, timedelta(hours=settings.verificacion_horas))
        db.commit()
        email.enviar_verificacion(usuario.correo, usuario.nombre, token)


def autenticar(db: Session, correo: str, password: str) -> Usuario:
    usuario = buscar_por_correo(db, correo)
    if usuario is None or not verificar_password(password, usuario.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    if usuario.estado == ESTADO_PENDIENTE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "correo_no_verificado")
    if usuario.estado == ESTADO_SUSPENDIDO:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta está suspendida. Contacta a soporte.")
    return usuario


def abrir_sesion(db: Session, usuario: Usuario, ip: str | None, user_agent: str | None) -> tuple[str, str]:
    """Devuelve (access_token, refresh_token)."""
    refresh = generar_token()
    db.add(Sesion(
        id_usuario=usuario.id_usuario,
        refresh_token_hash=hash_token(refresh),
        ip=ip,
        user_agent=(user_agent or "")[:300],
        expira_en=ahora() + timedelta(days=settings.refresh_token_dias),
    ))
    usuario.ultimo_acceso = ahora()
    db.commit()
    return crear_access_token(usuario.id_usuario, usuario.rol.nombre), refresh


def renovar_sesion(db: Session, refresh: str, ip: str | None, user_agent: str | None) -> tuple[Usuario, str, str]:
    """Rota el refresh token: el viejo se revoca y se entrega uno nuevo."""
    sesion = db.scalar(select(Sesion).where(Sesion.refresh_token_hash == hash_token(refresh)))
    if sesion is None or sesion.revocada_en is not None or _con_zona(sesion.expira_en) < ahora():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión expirada, vuelve a iniciar sesión")
    usuario = sesion.usuario
    if usuario.estado != ESTADO_ACTIVO:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Cuenta no disponible")
    sesion.revocada_en = ahora()
    access, nuevo_refresh = abrir_sesion(db, usuario, ip, user_agent)
    return usuario, access, nuevo_refresh


def cerrar_sesion(db: Session, refresh: str | None) -> None:
    if not refresh:
        return
    sesion = db.scalar(select(Sesion).where(Sesion.refresh_token_hash == hash_token(refresh)))
    if sesion and sesion.revocada_en is None:
        sesion.revocada_en = ahora()
        db.commit()


def solicitar_recuperacion(db: Session, correo: str) -> None:
    """RF-04. Siempre responde igual, exista o no la cuenta."""
    usuario = buscar_por_correo(db, correo)
    if usuario and usuario.estado != ESTADO_SUSPENDIDO:
        token = _crear_token(db, usuario, TOKEN_RECUPERACION, timedelta(minutes=settings.recuperacion_minutos))
        db.commit()
        email.enviar_recuperacion(usuario.correo, usuario.nombre, token)


def restablecer_password(db: Session, token: str, password: str) -> None:
    usuario = _consumir_token(db, token, TOKEN_RECUPERACION)
    usuario.password_hash = hash_password(password)
    # Si alguien más tenía la sesión abierta, se la cerramos
    db.execute(
        update(Sesion)
        .where(Sesion.id_usuario == usuario.id_usuario, Sesion.revocada_en.is_(None))
        .values(revocada_en=ahora())
    )
    # Abrir el enlace del correo también demuestra que el correo es suyo
    if usuario.estado == ESTADO_PENDIENTE:
        usuario.estado = ESTADO_ACTIVO
        usuario.correo_verificado_en = ahora()
        asignar_plan_gratis(db, usuario)
    db.commit()
