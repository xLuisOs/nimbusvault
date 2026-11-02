"""3.9: configuración que solo se usa en producción (Render)."""
import pytest

from app.core import email
from app.core.config import Settings, settings


@pytest.mark.parametrize("url", [
    "postgres://nimbus:clave@dpg-abc/nimbusvault",
    "postgresql://nimbus:clave@dpg-abc/nimbusvault",
    "postgresql+psycopg://nimbus:clave@dpg-abc/nimbusvault",
])
def test_url_de_render_usa_psycopg(url):
    assert Settings(database_url=url).database_url == "postgresql+psycopg://nimbus:clave@dpg-abc/nimbusvault"


def test_correo_por_brevo(monkeypatch):
    enviado = {}

    class Respuesta:
        status_code = 201

    def post_falso(url, headers, json, timeout):
        enviado.update(url=url, headers=headers, json=json)
        return Respuesta()

    monkeypatch.setattr(settings, "entorno", "produccion")
    monkeypatch.setattr(settings, "email_backend", "brevo")
    monkeypatch.setattr(settings, "brevo_api_key", "llave-de-prueba")
    monkeypatch.setattr(settings, "email_remitente", "NimbusVault <equipo@gmail.com>")
    monkeypatch.setattr(email.requests, "post", post_falso)

    email.enviar_verificacion("ana@test.com", "Ana", "tok123")

    assert enviado["url"] == "https://api.brevo.com/v3/smtp/email"
    assert enviado["headers"]["api-key"] == "llave-de-prueba"
    assert enviado["json"]["sender"] == {"name": "NimbusVault", "email": "equipo@gmail.com"}
    assert enviado["json"]["to"] == [{"email": "ana@test.com"}]
    assert "verificar-correo?token=tok123" in enviado["json"]["textContent"]
