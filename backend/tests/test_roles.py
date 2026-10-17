"""2.10: control de acceso por rol (RNF-03 / RN-05)."""
import pytest

from app.modules.auth.models import ROL_SOPORTE
from tests.conftest import ADMIN, auth, crear_usuario_con_rol, login, registrar_y_verificar

SOPORTE = {"correo": "soporte@test.com", "password": "Segura123"}

# Endpoints exclusivos del cliente (los GET no tocan el bucket)
RUTAS_CLIENTE = ["/api/almacenamiento/uso", "/api/carpetas", "/api/archivos"]


@pytest.fixture
def token_cliente(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


@pytest.fixture
def token_soporte(client):
    crear_usuario_con_rol(ROL_SOPORTE, SOPORTE["correo"], SOPORTE["password"])
    return login(client, **SOPORTE)


@pytest.mark.parametrize("ruta", RUTAS_CLIENTE)
def test_sin_token_es_401(client, ruta):
    assert client.get(ruta).status_code == 401


@pytest.mark.parametrize("ruta", RUTAS_CLIENTE)
def test_cliente_accede_a_sus_funciones(client, token_cliente, ruta):
    assert client.get(ruta, headers=auth(token_cliente)).status_code == 200


@pytest.mark.parametrize("ruta", RUTAS_CLIENTE)
def test_admin_no_usa_funciones_de_cliente(client, ruta):
    r = client.get(ruta, headers=auth(login(client, **ADMIN)))
    assert r.status_code == 403
    assert r.json()["detail"] == "Esta función es solo para clientes"


@pytest.mark.parametrize("ruta", RUTAS_CLIENTE)
def test_soporte_no_usa_funciones_de_cliente(client, token_soporte, ruta):
    assert client.get(ruta, headers=auth(token_soporte)).status_code == 403


def test_admin_no_puede_crear_carpetas(client):
    r = client.post("/api/carpetas", json={"nombre": "Docs"}, headers=auth(login(client, **ADMIN)))
    assert r.status_code == 403


def test_admin_no_puede_subir_archivos(client, almacen):
    r = client.post(
        "/api/archivos", files={"archivo": ("a.txt", b"hola", "text/plain")}, headers=auth(login(client, **ADMIN))
    )
    assert r.status_code == 403
    assert almacen.objetos == {}  # se rechaza antes de tocar el bucket


def test_solo_admin_administra_planes(client, token_cliente, token_soporte):
    assert client.get("/api/admin/planes", headers=auth(token_cliente)).status_code == 403
    assert client.get("/api/admin/planes", headers=auth(token_soporte)).status_code == 403
    assert client.get("/api/admin/planes", headers=auth(login(client, **ADMIN))).status_code == 200


def test_me_informa_el_rol(client, token_cliente, token_soporte):
    assert client.get("/api/auth/me", headers=auth(token_cliente)).json()["rol"] == "CLIENTE"
    assert client.get("/api/auth/me", headers=auth(token_soporte)).json()["rol"] == "SOPORTE"


def test_token_invalido_es_401(client):
    assert client.get("/api/carpetas", headers=auth("no-es-un-jwt")).status_code == 401
