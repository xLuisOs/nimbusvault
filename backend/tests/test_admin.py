"""4.4 y 4.5: panel administrativo con datos reales (dashboard, usuarios e infraestructura)."""
import pytest

from tests.conftest import ADMIN, auth, crear_usuario_con_rol, login, registrar_y_verificar, token_del_ultimo_correo

GIB = 1024**3
TARJETA = {"numero": "4242 4242 4242 4242", "titular": "Ana Torres", "vencimiento": "12/30", "cvv": "123"}


@pytest.fixture
def admin(client):
    return login(client, **ADMIN)


@pytest.fixture
def ana(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


def _usuario(client, admin, correo):
    return next(u for u in client.get("/api/admin/usuarios", headers=auth(admin)).json() if u["correo"] == correo)


# ── Permisos ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("ruta", ["/api/admin/resumen", "/api/admin/usuarios", "/api/admin/infra"])
def test_solo_administradores(client, ana, ruta):
    assert client.get(ruta).status_code == 401
    assert client.get(ruta, headers=auth(ana)).status_code == 403


# ── Dashboard ────────────────────────────────────────────────────────────────

def test_resumen_de_la_plataforma(client, admin, ana):
    plan = next(p for p in client.get("/api/planes").json() if p["codigo"] == "pro")
    client.post("/api/suscripciones/contratar", headers=auth(ana),
                json={"id_plan": plan["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA})
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")  # se queda en Gratis

    datos = client.get("/api/admin/resumen", headers=auth(admin)).json()
    k = datos["kpis"]
    assert k["clientes_activos"] == 2 and k["clientes_nuevos_mes"] == 2
    assert k["suscripciones_activas"] == 2 and k["suscripciones_pagadas"] == 1
    assert k["ingresos_mes"] == "9.00"
    assert k["cuota_contratada_bytes"] == (100 + 5) * GIB
    assert datos["crecimiento"][-1]["clientes"] == 2 and len(datos["crecimiento"]) == 8
    assert {d["plan"]: d["suscripciones"] for d in datos["distribucion"]} == {"Gratis": 1, "Pro": 1}
    assert datos["ultimas_suscripciones"][0]["correo"] == "beto@test.com"
    # La suscripción Gratis que Ana dejó al pasarse a Pro aparece como cancelada
    ana = [s for s in datos["ultimas_suscripciones"] if s["correo"] == "ana@test.com"]
    assert {(s["plan"], s["estado"]) for s in ana} == {("Pro", "activa"), ("Gratis", "cancelada")}


# ── Usuarios ─────────────────────────────────────────────────────────────────

def test_listado_con_plan_y_consumo(client, admin, ana):
    u = _usuario(client, admin, "ana@test.com")
    assert u["rol"] == "CLIENTE" and u["estado"] == "activo" and u["plan"] == "Gratis"
    assert u["cuota_bytes"] == 5 * GIB
    assert _usuario(client, admin, ADMIN["correo"])["plan"] is None  # el admin no tiene almacenamiento


def test_suspender_cierra_la_sesion_y_reactivar(client, admin, ana):
    u = _usuario(client, admin, "ana@test.com")
    r = client.patch(f"/api/admin/usuarios/{u['id_usuario']}", json={"estado": "suspendido"}, headers=auth(admin))
    assert r.status_code == 200 and r.json()["estado"] == "suspendido"
    assert client.get("/api/auth/me", headers=auth(ana)).status_code == 401
    assert client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"}).status_code == 403

    client.patch(f"/api/admin/usuarios/{u['id_usuario']}", json={"estado": "activo"}, headers=auth(admin))
    assert login(client, "ana@test.com", "Segura123")


def test_cambiar_rol(client, admin, ana):
    u = _usuario(client, admin, "ana@test.com")
    r = client.patch(f"/api/admin/usuarios/{u['id_usuario']}", json={"rol": "SOPORTE", "nombre": "Ana  T."},
                     headers=auth(admin))
    assert r.json()["rol"] == "SOPORTE" and r.json()["nombre"] == "Ana T."


def test_el_admin_no_se_modifica_a_si_mismo(client, admin):
    yo = _usuario(client, admin, ADMIN["correo"])
    assert client.patch(f"/api/admin/usuarios/{yo['id_usuario']}", json={"estado": "suspendido"},
                        headers=auth(admin)).status_code == 400
    assert client.delete(f"/api/admin/usuarios/{yo['id_usuario']}", headers=auth(admin)).status_code == 400


def test_eliminar_usuario_borra_sus_archivos_y_pagos(client, almacen, admin, ana):
    client.post("/api/archivos", files={"archivo": ("a.txt", b"hola", "text/plain")}, headers=auth(ana))
    plan = next(p for p in client.get("/api/planes").json() if p["codigo"] == "personal")
    client.post("/api/suscripciones/contratar", headers=auth(ana),
                json={"id_plan": plan["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA})
    assert len(almacen.objetos) == 1

    u = _usuario(client, admin, "ana@test.com")
    assert client.delete(f"/api/admin/usuarios/{u['id_usuario']}", headers=auth(admin)).status_code == 204
    assert almacen.objetos == {}
    assert all(x["correo"] != "ana@test.com" for x in client.get("/api/admin/usuarios", headers=auth(admin)).json())
    assert client.post("/api/auth/login", json={"correo": "ana@test.com", "password": "Segura123"}).status_code == 401
    # El correo queda libre para volver a registrarse
    registrar_y_verificar(client)


def test_invitar_usuario(client, admin):
    r = client.post("/api/admin/usuarios", json={"nombre": "Carla Ruiz", "correo": "Carla@Test.com", "rol": "SOPORTE"},
                    headers=auth(admin))
    assert r.status_code == 201, r.text
    assert r.json()["estado"] == "pendiente" and r.json()["correo"] == "carla@test.com"

    # Le llega el enlace, elige su contraseña y ya puede entrar con su rol
    r = client.post("/api/auth/restablecer-contrasena", json={"token": token_del_ultimo_correo(), "password": "Nueva1234"})
    assert r.status_code == 200
    token = login(client, "carla@test.com", "Nueva1234")
    assert client.get("/api/auth/me", headers=auth(token)).json()["rol"] == "SOPORTE"

    # Correo repetido
    assert client.post("/api/admin/usuarios", json={"nombre": "Otra", "correo": "carla@test.com"},
                       headers=auth(admin)).status_code == 409


def test_no_se_activa_a_quien_no_confirmo_su_correo(client, admin):
    client.post("/api/auth/registro", json={
        "nombre": "Pendiente", "correo": "pend@test.com", "password": "Segura123", "acepto_terminos": True,
    })
    u = _usuario(client, admin, "pend@test.com")
    assert client.patch(f"/api/admin/usuarios/{u['id_usuario']}", json={"estado": "activo"},
                        headers=auth(admin)).status_code == 409


# ── Infraestructura ──────────────────────────────────────────────────────────

def test_infraestructura(client, almacen, admin, ana):
    client.post("/api/archivos", files={"archivo": ("a.txt", b"hola", "text/plain")}, headers=auth(ana))
    datos = client.get("/api/admin/infra", headers=auth(admin)).json()

    estados = {c["id"]: c["estado"] for c in datos["componentes"]}
    assert estados["db"] == "operativo" and estados["storage"] == "operativo"
    assert datos["actividad"]["subidas"] == 1 and datos["actividad"]["archivos_almacenados"] == 1
    assert datos["actividad"]["sesiones_activas"] >= 2
    assert datos["historial_almacenamiento"][-1]["bytes"] == 4 and len(datos["historial_almacenamiento"]) == 14


def test_infraestructura_avisa_si_el_almacenamiento_falla(client, almacen, admin):
    def caido():
        raise RuntimeError("timeout")
    almacen.verificar = caido
    datos = client.get("/api/admin/infra", headers=auth(admin)).json()
    assert {c["id"]: c["estado"] for c in datos["componentes"]}["storage"] == "error"
    assert any(a["severidad"] == "alta" for a in datos["alertas"])


def test_alerta_de_cuota_casi_llena(client, almacen, admin, ana):
    from sqlalchemy import update
    from app.db.session import SessionLocal
    from app.modules.auth.models import Usuario
    with SessionLocal() as db:
        db.execute(update(Usuario).where(Usuario.correo == "ana@test.com").values(almacenamiento_usado_bytes=int(4.8 * GIB)))
        db.commit()
    alertas = client.get("/api/admin/infra", headers=auth(admin)).json()["alertas"]
    assert any("Ana Torres usa el 96%" in a["titulo"] for a in alertas)


def test_soporte_no_entra_al_panel(client):
    crear_usuario_con_rol("SOPORTE", "sop@test.com")
    token = login(client, "sop@test.com", "Segura123")
    assert client.get("/api/admin/usuarios", headers=auth(token)).status_code == 403
