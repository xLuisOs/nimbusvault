"""Tests para el endpoint POST /api/admin/planes/recalculo-cuota."""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.modules.almacenamiento.models import Archivo
from app.modules.auth.models import Usuario
from tests.conftest import ADMIN, auth, login, registrar_y_verificar


def _usuario(correo: str) -> Usuario:
    db = SessionLocal()
    try:
        return db.scalar(select(Usuario).where(Usuario.correo == correo))
    finally:
        db.close()


def _insertar_archivo(id_usuario, tamano: int, eliminado: bool = False) -> None:
    """Inserta un archivo ficticio directamente en la BD."""
    import uuid
    from app.core.security import ahora

    db = SessionLocal()
    try:
        archivo = Archivo(
            id_archivo=uuid.uuid4(),
            id_usuario=id_usuario,
            id_carpeta=None,
            nombre_original=f"test-{uuid.uuid4().hex[:8]}.txt",
            clave_objeto=f"test/{uuid.uuid4().hex}",
            tipo_mime="text/plain",
            tamano_bytes=tamano,
            eliminado_en=ahora() if eliminado else None,
        )
        db.add(archivo)
        db.commit()
    finally:
        db.close()


def test_recalculo_cuota_requiere_admin(client):
    """Un cliente normal no puede ejecutar el recálculo."""
    registrar_y_verificar(client)
    token = login(client, "ana@test.com", "Segura123")
    r = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r.status_code == 403


def test_recalculo_cuota_sin_archivos(client):
    """Sin archivos subidos, el uso debe ser 0 y no hay nada que actualizar."""
    token = login(client, **ADMIN)
    r = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r.status_code == 200
    assert r.json()["actualizados"] == 0


def test_recalculo_cuota_corrige_uso(client):
    """Simula un desajuste: el usuario tiene archivos pero su contador es 0.
    El recálculo lo debe corregir."""
    registrar_y_verificar(client)
    usuario = _usuario("ana@test.com")
    assert usuario.almacenamiento_usado_bytes == 0

    # Insertar archivos directamente (simulando desajuste)
    _insertar_archivo(usuario.id_usuario, 1000)
    _insertar_archivo(usuario.id_usuario, 2000)

    token = login(client, **ADMIN)
    r = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r.status_code == 200
    assert r.json()["actualizados"] >= 1

    # Verificar que se actualizó correctamente
    usuario = _usuario("ana@test.com")
    assert usuario.almacenamiento_usado_bytes == 3000


def test_recalculo_cuota_excluye_papelera(client):
    """Los archivos en papelera (eliminado_en != NULL) no deben contar."""
    registrar_y_verificar(client)
    usuario = _usuario("ana@test.com")

    _insertar_archivo(usuario.id_usuario, 5000, eliminado=False)
    _insertar_archivo(usuario.id_usuario, 3000, eliminado=True)  # en papelera

    token = login(client, **ADMIN)
    r = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r.status_code == 200

    usuario = _usuario("ana@test.com")
    assert usuario.almacenamiento_usado_bytes == 5000  # solo el activo


def test_recalculo_cuota_no_modifica_precio_contratado(client):
    """El recálculo NO debe tocar `precio_contratado` de las suscripciones."""
    from app.modules.suscripciones.models import Suscripcion

    registrar_y_verificar(client)
    usuario = _usuario("ana@test.com")

    db = SessionLocal()
    try:
        sus = db.scalar(
            select(Suscripcion).where(Suscripcion.id_usuario == usuario.id_usuario)
        )
        precio_original = sus.precio_contratado if sus else None
    finally:
        db.close()

    token = login(client, **ADMIN)
    client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))

    db = SessionLocal()
    try:
        sus = db.scalar(
            select(Suscripcion).where(Suscripcion.id_usuario == usuario.id_usuario)
        )
        assert sus.precio_contratado == precio_original
    finally:
        db.close()


def test_recalculo_idempotente(client):
    """Ejecutar el recálculo dos veces seguidas: la segunda no debe actualizar nada."""
    registrar_y_verificar(client)
    usuario = _usuario("ana@test.com")
    _insertar_archivo(usuario.id_usuario, 4000)

    token = login(client, **ADMIN)

    r1 = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r1.status_code == 200
    assert r1.json()["actualizados"] >= 1

    r2 = client.post("/api/admin/planes/recalculo-cuota", headers=auth(token))
    assert r2.status_code == 200
    assert r2.json()["actualizados"] == 0

