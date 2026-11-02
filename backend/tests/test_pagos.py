"""3.8: contratación simulada, historial de pagos y comprobante PDF."""
from datetime import datetime

import pytest
from sqlalchemy import select, update

from app.db.session import SessionLocal
from app.modules.auth.models import Usuario
from app.modules.pagos.models import Pago
from app.modules.suscripciones.models import Suscripcion
from tests.conftest import ADMIN, auth, login, registrar_y_verificar

GIB = 1024**3
TARJETA = {"numero": "4242 4242 4242 4242", "titular": "Ana Torres", "vencimiento": "12/30", "cvv": "123"}


@pytest.fixture
def token(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


@pytest.fixture
def planes(client) -> dict[str, dict]:
    return {p["codigo"]: p for p in client.get("/api/planes").json()}


def contratar(client, token, plan, periodicidad="mensual", tarjeta=TARJETA):
    return client.post(
        "/api/suscripciones/contratar",
        json={"id_plan": plan["id_plan"], "periodicidad": periodicidad, "tarjeta": tarjeta},
        headers=auth(token),
    )


# ── Contratación ─────────────────────────────────────────────────────────────

def test_contratar_plan_mensual(client, token, planes):
    r = contratar(client, token, planes["pro"])
    assert r.status_code == 201, r.text
    pago = r.json()
    assert pago["monto"] == "9.00"
    assert pago["estado"] == "aprobado"
    assert pago["tipo"] == "contratacion"
    assert pago["plan_codigo"] == "pro"
    assert pago["marca_tarjeta"] == "visa"
    assert pago["ultimos_4"] == "4242"
    assert pago["numero_comprobante"].startswith("NV-")

    me = client.get("/api/auth/me", headers=auth(token)).json()
    assert me["suscripcion"]["plan_codigo"] == "pro"
    assert me["suscripcion"]["almacenamiento_gb"] == 100

    # La suscripción gratis anterior quedó cancelada: solo una activa
    with SessionLocal() as db:
        estados = sorted(s.estado for s in db.scalars(select(Suscripcion)))
    assert estados == ["activa", "cancelada"]


def test_contratar_plan_anual(client, token, planes):
    pago = contratar(client, token, planes["pro"], "anual").json()
    assert pago["monto"] == "86.40"  # 7.20 × 12 (20 % de descuento)
    assert pago["periodicidad"] == "anual"
    dias = (datetime.fromisoformat(pago["vigencia_fin"]) - datetime.fromisoformat(pago["vigencia_inicio"])).days
    assert dias == 365


def test_no_se_contrata_el_mismo_plan_dos_veces(client, token, planes):
    assert contratar(client, token, planes["pro"]).status_code == 201
    assert contratar(client, token, planes["pro"]).status_code == 409
    # Cambiar de mensual a anual del mismo plan sí se permite
    assert contratar(client, token, planes["pro"], "anual").status_code == 201


def test_no_se_baja_a_un_plan_donde_no_caben_los_archivos(client, token, planes):
    assert contratar(client, token, planes["business"]).status_code == 201
    with SessionLocal() as db:
        db.execute(update(Usuario).where(Usuario.correo == "ana@test.com").values(almacenamiento_usado_bytes=30 * GIB))
        db.commit()
    r = contratar(client, token, planes["personal"])  # 25 GB
    assert r.status_code == 409
    assert "libera espacio" in r.json()["detail"]
    assert contratar(client, token, planes["pro"]).status_code == 201  # 100 GB sí alcanza


def test_plan_gratis_o_inexistente(client, token, planes):
    assert contratar(client, token, planes["gratis"]).status_code == 400
    r = contratar(client, token, {"id_plan": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 404


@pytest.mark.parametrize("cambio", [
    {"numero": "1234"},
    {"vencimiento": "01/20"},  # vencida
    {"vencimiento": "13/30"},
    {"cvv": "12a"},
])
def test_tarjeta_invalida(client, token, planes, cambio):
    assert contratar(client, token, planes["pro"], tarjeta={**TARJETA, **cambio}).status_code == 422


def test_nunca_se_guarda_el_numero_completo(client, token, planes):
    contratar(client, token, planes["pro"])
    with SessionLocal() as db:
        pago = db.scalar(select(Pago))
        valores = [str(getattr(pago, c.key)) for c in Pago.__table__.columns]
    assert not any("4242424242424242" in v or "123" == v for v in valores)


def test_solo_clientes_contratan(client, planes):
    r = contratar(client, login(client, **ADMIN), planes["pro"])
    assert r.status_code == 403


# ── Historial y comprobante ──────────────────────────────────────────────────

def test_historial_propio_y_ordenado(client, token, planes):
    assert client.get("/api/pagos", headers=auth(token)).json() == []  # el plan gratis no genera pagos
    contratar(client, token, planes["pro"])
    contratar(client, token, planes["business"], tarjeta={**TARJETA, "numero": "5555 5555 5555 4444"})

    pagos = client.get("/api/pagos", headers=auth(token)).json()
    assert [p["plan_codigo"] for p in pagos] == ["business", "pro"]  # más reciente primero
    assert pagos[0]["marca_tarjeta"] == "mastercard"
    assert pagos[0]["ultimos_4"] == "4444"


def test_historial_aislado_entre_usuarios(client, token, planes):
    pago = contratar(client, token, planes["pro"]).json()
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")
    otro = login(client, "beto@test.com", "Segura123")
    assert client.get("/api/pagos", headers=auth(otro)).json() == []
    assert client.get(f"/api/pagos/{pago['id_pago']}/comprobante", headers=auth(otro)).status_code == 404


def test_comprobante_pdf(client, token, planes):
    pago = contratar(client, token, planes["pro"]).json()
    r = client.get(f"/api/pagos/{pago['id_pago']}/comprobante", headers=auth(token))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert pago["numero_comprobante"] in r.headers["content-disposition"]
    assert r.content.startswith(b"%PDF")
