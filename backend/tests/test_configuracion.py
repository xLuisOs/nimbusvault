"""Configuración de la cuenta: perfil, contraseña, sesiones abiertas y eliminar la cuenta."""
import pytest

from tests.conftest import ADMIN, auth, login, registrar_y_verificar


@pytest.fixture
def token(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


def test_editar_nombre(client, token):
    r = client.patch("/api/auth/me", json={"nombre": "  Ana   María Torres "}, headers=auth(token))
    assert r.status_code == 200
    assert r.json()["nombre"] == "Ana María Torres"
    assert client.get("/api/auth/me", headers=auth(token)).json()["nombre"] == "Ana María Torres"


def test_cambiar_contrasena(client, token):
    malo = client.post("/api/auth/cambiar-contrasena", json={"actual": "Incorrecta1", "nueva": "Nueva1234"}, headers=auth(token))
    assert malo.status_code == 400
    igual = client.post("/api/auth/cambiar-contrasena", json={"actual": "Segura123", "nueva": "Segura123"}, headers=auth(token))
    assert igual.status_code == 400
    debil = client.post("/api/auth/cambiar-contrasena", json={"actual": "Segura123", "nueva": "corta"}, headers=auth(token))
    assert debil.status_code == 422

    r = client.post("/api/auth/cambiar-contrasena", json={"actual": "Segura123", "nueva": "Nueva1234"}, headers=auth(token))
    assert r.status_code == 200
    assert client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"}).status_code == 401
    assert login(client, "ana@test.com", "Nueva1234")


def test_cambiar_contrasena_cierra_las_otras_sesiones(client):
    registrar_y_verificar(client)
    with type(client)(client.app) as otro_navegador:
        login(otro_navegador, "ana@test.com", "Segura123")
        token = login(client, "ana@test.com", "Segura123")
        client.post("/api/auth/cambiar-contrasena", json={"actual": "Segura123", "nueva": "Nueva1234"}, headers=auth(token))
        assert otro_navegador.post("/api/auth/refresh").status_code == 401  # el otro quedó fuera
        assert client.post("/api/auth/refresh").status_code == 200  # este sigue dentro


def test_sesiones_abiertas_y_cerrar_otras(client):
    registrar_y_verificar(client)
    with type(client)(client.app) as otro_navegador:
        login(otro_navegador, "ana@test.com", "Segura123")
        token = login(client, "ana@test.com", "Segura123")

        sesiones = client.get("/api/auth/sesiones", headers=auth(token)).json()
        assert len(sesiones) == 2
        assert [s["actual"] for s in sesiones].count(True) == 1

        r = client.post("/api/auth/sesiones/cerrar-otras", headers=auth(token))
        assert r.status_code == 200
        assert len(client.get("/api/auth/sesiones", headers=auth(token)).json()) == 1
        assert otro_navegador.post("/api/auth/refresh").status_code == 401


def test_cerrar_una_sesion(client):
    registrar_y_verificar(client)
    with type(client)(client.app) as otro_navegador:
        login(otro_navegador, "ana@test.com", "Segura123")
        token = login(client, "ana@test.com", "Segura123")
        ajena = next(s for s in client.get("/api/auth/sesiones", headers=auth(token)).json() if not s["actual"])
        assert client.delete(f"/api/auth/sesiones/{ajena['id_sesion']}", headers=auth(token)).status_code == 200
        assert otro_navegador.post("/api/auth/refresh").status_code == 401


def test_no_cierra_sesiones_de_otra_persona(client, token):
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")
    beto = login(client, "beto@test.com", "Segura123")
    sesion_beto = client.get("/api/auth/sesiones", headers=auth(beto)).json()[0]
    assert client.delete(f"/api/auth/sesiones/{sesion_beto['id_sesion']}", headers=auth(token)).status_code == 404


def test_eliminar_mi_cuenta(client, almacen, token):
    client.post("/api/archivos", files={"archivo": ("a.txt", b"hola", "text/plain")}, headers=auth(token))
    assert len(almacen.objetos) == 1

    mal = client.request("DELETE", "/api/auth/me", json={"password": "Incorrecta1"}, headers=auth(token))
    assert mal.status_code == 400
    r = client.request("DELETE", "/api/auth/me", json={"password": "Segura123"}, headers=auth(token))
    assert r.status_code == 204
    assert almacen.objetos == {}
    assert client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"}).status_code == 401


def test_admin_no_se_elimina_a_si_mismo(client):
    admin = login(client, **ADMIN)
    r = client.request("DELETE", "/api/auth/me", json={"password": ADMIN["password"]}, headers=auth(admin))
    assert r.status_code == 400
