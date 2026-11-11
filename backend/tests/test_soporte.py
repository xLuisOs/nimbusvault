"""Consola de soporte: solo consulta clientes y ayuda con el acceso."""
import uuid

import pytest

from app.core import email
from app.modules.auth.models import ROL_SOPORTE
from tests.conftest import ADMIN, auth, crear_usuario_con_rol, login, registrar_y_verificar

SOPORTE = {"correo": "soporte@test.com", "password": "Segura123"}
TARJETA = {"numero": "4242 4242 4242 4242", "titular": "Ana Torres", "vencimiento": "12/30", "cvv": "123"}


@pytest.fixture
def soporte(client):
    crear_usuario_con_rol(ROL_SOPORTE, SOPORTE["correo"], SOPORTE["password"])
    return login(client, **SOPORTE)


@pytest.fixture
def ana(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


def _cliente(client, soporte, correo):
    return next(c for c in client.get("/api/soporte/clientes", headers=auth(soporte)).json() if c["correo"] == correo)


def test_consola_exclusiva_de_soporte(client, ana):
    assert client.get("/api/soporte/clientes").status_code == 401
    assert client.get("/api/soporte/clientes", headers=auth(ana)).status_code == 403
    assert client.get("/api/soporte/clientes", headers=auth(login(client, **ADMIN))).status_code == 403


@pytest.mark.parametrize("ruta", ["/api/admin/usuarios", "/api/admin/resumen", "/api/admin/planes", "/api/archivos"])
def test_soporte_no_entra_a_admin_ni_a_archivos(client, soporte, ruta):
    assert client.get(ruta, headers=auth(soporte)).status_code == 403


def test_lista_solo_clientes(client, soporte, ana):
    clientes = client.get("/api/soporte/clientes", headers=auth(soporte)).json()
    assert [c["correo"] for c in clientes] == ["ana@test.com"]
    assert clientes[0]["plan"] == "Gratis"


def test_consulta_pagos_del_cliente(client, soporte, ana):
    plan = next(p for p in client.get("/api/planes").json() if p["codigo"] == "pro")
    r = client.post("/api/suscripciones/contratar", headers=auth(ana),
                    json={"id_plan": plan["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA})
    assert r.status_code == 201
    cliente = _cliente(client, soporte, "ana@test.com")
    pagos = client.get(f"/api/soporte/clientes/{cliente['id_usuario']}/pagos", headers=auth(soporte)).json()
    assert len(pagos) == 1 and pagos[0]["plan_nombre"] == "Pro"


def test_no_atiende_a_quien_no_es_cliente(client, soporte):
    admin = next(u for u in client.get("/api/admin/usuarios", headers=auth(login(client, **ADMIN))).json()
                 if u["rol"] == "ADMINISTRADOR")
    for id_usuario in (admin["id_usuario"], uuid.uuid4()):
        assert client.get(f"/api/soporte/clientes/{id_usuario}/pagos", headers=auth(soporte)).status_code == 404
        r = client.post(f"/api/soporte/clientes/{id_usuario}/enviar-recuperacion", headers=auth(soporte))
        assert r.status_code == 404


def test_reenvia_verificacion_solo_a_pendientes(client, soporte, ana):
    client.post("/api/auth/registro", json={
        "nombre": "Beto Paz", "correo": "beto@test.com", "password": "Segura123", "acepto_terminos": True,
    })
    beto = _cliente(client, soporte, "beto@test.com")
    antes = len(email.bandeja_pruebas)
    r = client.post(f"/api/soporte/clientes/{beto['id_usuario']}/reenviar-verificacion", headers=auth(soporte))
    assert r.status_code == 200
    assert len(email.bandeja_pruebas) == antes + 1 and email.bandeja_pruebas[-1]["para"] == "beto@test.com"

    activa = _cliente(client, soporte, "ana@test.com")
    r = client.post(f"/api/soporte/clientes/{activa['id_usuario']}/reenviar-verificacion", headers=auth(soporte))
    assert r.status_code == 409


def test_envia_recuperacion_salvo_a_suspendidos(client, soporte, ana):
    cliente = _cliente(client, soporte, "ana@test.com")
    ruta = f"/api/soporte/clientes/{cliente['id_usuario']}/enviar-recuperacion"
    assert client.post(ruta, headers=auth(soporte)).status_code == 200
    assert email.bandeja_pruebas[-1]["para"] == "ana@test.com"

    r = client.patch(f"/api/admin/usuarios/{cliente['id_usuario']}", json={"estado": "suspendido"},
                     headers=auth(login(client, **ADMIN)))
    assert r.status_code == 200
    assert client.post(ruta, headers=auth(soporte)).status_code == 409
