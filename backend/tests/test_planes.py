from tests.conftest import ADMIN, login, registrar_y_verificar

NUEVO = {
    "codigo": "estudiante", "nombre": "Estudiante", "descripcion": "Plan para estudiantes",
    "precio_mensual": "2.50", "almacenamiento_gb": 15, "caracteristicas": ["15 GB", "Soporte por correo"],
}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_catalogo_publico_sin_login(client):
    r = client.get("/api/planes")
    assert r.status_code == 200
    planes = r.json()
    assert [p["codigo"] for p in planes] == ["gratis", "personal", "pro", "business"]
    pro = planes[2]
    assert pro["destacado"] is True
    assert "moneda" not in pro  # todo el sistema maneja USD
    assert pro["precio_mensual"] == "9.00"
    assert pro["precio_anual_mensualizado"] == "7.20"  # 20 % de descuento
    assert pro["caracteristicas"][0] == "100 GB de almacenamiento"


def test_cliente_no_puede_administrar_planes(client):
    registrar_y_verificar(client)
    token = login(client, "ana@test.com", "Segura123")
    assert client.get("/api/admin/planes", headers=auth(token)).status_code == 403
    assert client.post("/api/admin/planes", json=NUEVO, headers=auth(token)).status_code == 403


def test_admin_crea_edita_y_desactiva_plan(client):
    token = login(client, **ADMIN)
    r = client.post("/api/admin/planes", json=NUEVO, headers=auth(token))
    assert r.status_code == 201, r.text
    plan = r.json()

    r = client.put(f"/api/admin/planes/{plan['id_plan']}", headers=auth(token),
                   json={**NUEVO, "precio_mensual": "3.99", "caracteristicas": ["20 GB"]})
    assert r.json()["precio_mensual"] == "3.99"
    assert r.json()["caracteristicas"] == ["20 GB"]

    client.patch(f"/api/admin/planes/{plan['id_plan']}/estado", json={"activo": False}, headers=auth(token))
    codigos = [p["codigo"] for p in client.get("/api/planes").json()]
    assert "estudiante" not in codigos  # desactivado ya no sale en el catálogo público


def test_no_se_elimina_plan_con_suscripciones(client):
    registrar_y_verificar(client)  # queda suscrito al plan gratis
    token = login(client, **ADMIN)
    planes = client.get("/api/admin/planes", headers=auth(token)).json()
    gratis = next(p for p in planes if p["codigo"] == "gratis")
    assert gratis["suscriptores_activos"] == 1
    assert client.delete(f"/api/admin/planes/{gratis['id_plan']}", headers=auth(token)).status_code == 409
