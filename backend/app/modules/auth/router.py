from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_usuario_actual
from app.db.session import get_db
from app.modules.auth import service
from app.modules.auth.models import Usuario
from app.modules.auth.schemas import (
    CorreoIn, LoginIn, MensajeOut, RegistroIn, RestablecerIn, TokenIn, TokenOut, UsuarioOut,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

COOKIE_REFRESH = "nv_refresh"


def _poner_cookie(response: Response, refresh: str) -> None:
    # httpOnly: JavaScript no puede leerla, así un XSS no roba la sesión
    response.set_cookie(
        COOKIE_REFRESH, refresh,
        max_age=settings.refresh_token_dias * 24 * 3600,
        httponly=True, secure=settings.cookie_secure, samesite="lax", path="/api/auth",
    )


def _token_out(db: Session, usuario: Usuario, access: str) -> TokenOut:
    return TokenOut(
        access_token=access,
        expira_en_segundos=settings.access_token_minutos * 60,
        usuario=service.usuario_a_schema(db, usuario),
    )


@router.post("/registro", response_model=MensajeOut, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroIn, db: Session = Depends(get_db)):
    service.registrar(db, datos)
    return MensajeOut(mensaje="Cuenta creada. Revisa tu correo para activarla.")


@router.post("/verificar-correo", response_model=MensajeOut)
def verificar_correo(datos: TokenIn, db: Session = Depends(get_db)):
    service.verificar_correo(db, datos.token)
    return MensajeOut(mensaje="Correo verificado. Ya puedes iniciar sesión.")


@router.post("/reenviar-verificacion", response_model=MensajeOut)
def reenviar_verificacion(datos: CorreoIn, db: Session = Depends(get_db)):
    service.reenviar_verificacion(db, datos.correo)
    return MensajeOut(mensaje="Si la cuenta existe y está pendiente, te enviamos un nuevo enlace.")


@router.post("/login", response_model=TokenOut)
def login(datos: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    usuario = service.autenticar(db, datos.correo, datos.password)
    ip = request.client.host if request.client else None
    access, refresh = service.abrir_sesion(db, usuario, ip, request.headers.get("user-agent"))
    _poner_cookie(response, refresh)
    return _token_out(db, usuario, access)


@router.post("/refresh", response_model=TokenOut)
def refresh(
    request: Request, response: Response, db: Session = Depends(get_db),
    nv_refresh: str | None = Cookie(default=None),
):
    if not nv_refresh:
        response.delete_cookie(COOKIE_REFRESH, path="/api/auth")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No hay sesión activa")
    ip = request.client.host if request.client else None
    usuario, access, nuevo = service.renovar_sesion(db, nv_refresh, ip, request.headers.get("user-agent"))
    _poner_cookie(response, nuevo)
    return _token_out(db, usuario, access)


@router.post("/logout", response_model=MensajeOut)
def logout(response: Response, db: Session = Depends(get_db), nv_refresh: str | None = Cookie(default=None)):
    service.cerrar_sesion(db, nv_refresh)
    response.delete_cookie(COOKIE_REFRESH, path="/api/auth")
    return MensajeOut(mensaje="Sesión cerrada")


@router.post("/olvide-contrasena", response_model=MensajeOut)
def olvide_contrasena(datos: CorreoIn, db: Session = Depends(get_db)):
    service.solicitar_recuperacion(db, datos.correo)
    return MensajeOut(mensaje="Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.")


@router.post("/restablecer-contrasena", response_model=MensajeOut)
def restablecer_contrasena(datos: RestablecerIn, db: Session = Depends(get_db)):
    service.restablecer_password(db, datos.token, datos.password)
    return MensajeOut(mensaje="Contraseña actualizada. Ya puedes iniciar sesión.")


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_usuario_actual), db: Session = Depends(get_db)):
    return service.usuario_a_schema(db, usuario)
