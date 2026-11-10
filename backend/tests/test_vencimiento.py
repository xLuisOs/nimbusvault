"""RN-02: al vencer un plan nadie se queda sin plan; el Gratis se renueva y uno de pago vuelve al Gratis."""
from datetime import timedelta

from sqlalchemy import select, update

from app.core.security import ahora
from app.db.session import SessionLocal
from app.modules.auth.models import Usuario
from app.modules.suscripciones.models import ESTADO_ACTIVA, ESTADO_VENCIDA, Suscripcion
from tests.conftest import auth, login, registrar_y_verificar
from tests.test_pagos import contratar

GIB = 1024**3


def _cliente(client) -> tuple[str, Usuario]:
    registrar_y_verificar(client)
    token = login(client, "ana@test.com", "Segura123")
    with SessionLocal() as db:
        return token, db.scalar(select(Usuario).where(Usuario.correo == "ana@test.com"))


def _vencer_suscripcion_activa(id_usuario) -> None:
    with SessionLocal() as db:
        db.execute(
            update(Suscripcion)
            .where(Suscripcion.id_usuario == id_usuario, Suscripcion.estado == ESTADO_ACTIVA)
            .values(fecha_inicio=ahora() - timedelta(days=31), fecha_fin=ahora() - timedelta(days=1))
        )
        db.commit()


def _suscripciones(id_usuario) -> list[tuple[str, str]]:
    with SessionLocal() as db:
        filas = db.scalars(select(Suscripcion).where(Suscripcion.id_usuario == id_usuario)).all()
        return sorted((s.plan.codigo, s.estado) for s in filas)


def test_plan_gratis_vencido_se_renueva_solo(client):
    token, usuario = _cliente(client)
    _vencer_suscripcion_activa(usuario.id_usuario)

    r = client.get("/api/almacenamiento/uso", headers=auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["plan"] == "Gratis"
    assert _suscripciones(usuario.id_usuario) == [("gratis", ESTADO_ACTIVA)]


def test_plan_de_pago_vencido_vuelve_al_gratis(client):
    token, usuario = _cliente(client)
    planes = {p["codigo"]: p for p in client.get("/api/planes").json()}
    assert contratar(client, token, planes["pro"]).status_code == 201
    _vencer_suscripcion_activa(usuario.id_usuario)

    r = client.get("/api/almacenamiento/uso", headers=auth(token))
    assert r.status_code == 200, r.text  # antes: 403 "Necesitas una suscripción activa"
    assert r.json()["plan"] == "Gratis"
    assert ("pro", ESTADO_VENCIDA) in _suscripciones(usuario.id_usuario)
    assert ("gratis", ESTADO_ACTIVA) in _suscripciones(usuario.id_usuario)

    # Puede volver a contratar un plan de pago
    assert contratar(client, token, planes["pro"]).status_code == 201


def test_si_los_archivos_no_caben_en_el_gratis_solo_se_bloquean_las_subidas(client, almacen):
    token, usuario = _cliente(client)
    planes = {p["codigo"]: p for p in client.get("/api/planes").json()}
    assert contratar(client, token, planes["pro"]).status_code == 201
    with SessionLocal() as db:  # usa más de lo que da el Gratis (5 GB)
        db.execute(update(Usuario).where(Usuario.id_usuario == usuario.id_usuario)
                   .values(almacenamiento_usado_bytes=8 * GIB))
        db.commit()
    _vencer_suscripcion_activa(usuario.id_usuario)

    uso = client.get("/api/almacenamiento/uso", headers=auth(token)).json()
    assert uso["plan"] == "Gratis" and uso["disponible_bytes"] == 0

    # Sigue viendo sus archivos, pero no puede subir más
    assert client.get("/api/archivos", headers=auth(token)).status_code == 200
    r = client.post("/api/archivos", headers=auth(token), files={"archivo": ("a.txt", b"hola", "text/plain")})
    assert r.status_code == 413, r.text
