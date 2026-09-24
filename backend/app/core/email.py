import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("nimbusvault.email")

# En pruebas guardamos aquí los correos "enviados" para poder leer los enlaces.
bandeja_pruebas: list[dict] = []


def enviar_correo(destino: str, asunto: str, texto: str, html: str | None = None) -> None:
    if settings.entorno == "pruebas":
        bandeja_pruebas.append({"para": destino, "asunto": asunto, "texto": texto})
        return

    if settings.email_backend == "consola":
        log.warning("\n──── CORREO ────\nPara: %s\nAsunto: %s\n\n%s\n────────────────", destino, asunto, texto)
        return

    msg = EmailMessage()
    msg["From"] = settings.email_remitente
    msg["To"] = destino
    msg["Subject"] = asunto
    msg.set_content(texto)
    if html:
        msg.add_alternative(html, subtype="html")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_tls:
            smtp.starttls()
        if settings.smtp_usuario:
            smtp.login(settings.smtp_usuario, settings.smtp_password)
        smtp.send_message(msg)


def _plantilla(titulo: str, parrafo: str, boton: str, enlace: str) -> str:
    return f"""
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0F172A">
  <h2 style="margin:0 0 12px">{titulo}</h2>
  <p style="color:#334155;line-height:1.5">{parrafo}</p>
  <p style="margin:28px 0">
    <a href="{enlace}" style="background:#2E9BFF;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">{boton}</a>
  </p>
  <p style="color:#94A3B8;font-size:12px">Si no fuiste tú, puedes ignorar este correo.</p>
</div>"""


def enviar_verificacion(destino: str, nombre: str, token: str) -> None:
    enlace = f"{settings.frontend_url}/verificar-correo?token={token}"
    enviar_correo(
        destino,
        "Confirma tu correo en NimbusVault",
        f"Hola {nombre},\n\nConfirma tu correo entrando a este enlace:\n{enlace}\n\n"
        f"El enlace vence en {settings.verificacion_horas} horas.",
        _plantilla("Confirma tu correo", f"Hola {nombre}, solo falta confirmar tu correo para activar tu cuenta.",
                   "Confirmar correo", enlace),
    )


def enviar_recuperacion(destino: str, nombre: str, token: str) -> None:
    enlace = f"{settings.frontend_url}/restablecer-contrasena?token={token}"
    enviar_correo(
        destino,
        "Restablece tu contraseña de NimbusVault",
        f"Hola {nombre},\n\nPara crear una contraseña nueva entra a:\n{enlace}\n\n"
        f"El enlace vence en {settings.recuperacion_minutos} minutos.",
        _plantilla("Restablece tu contraseña", f"Hola {nombre}, recibimos una solicitud para cambiar tu contraseña.",
                   "Crear nueva contraseña", enlace),
    )
