"""3.7: carpetas y archivos del explorador (con un almacén falso en lugar de S3)."""
import pytest
from sqlalchemy import update

from app.db.session import SessionLocal
from app.modules.auth.models import Usuario
from tests.conftest import auth, login, registrar_y_verificar

GIB = 1024**3


@pytest.fixture
def token(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


@pytest.fixture
def token_otro(client):
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")
    return login(client, "beto@test.com", "Segura123")


def crear_carpeta(client, token, nombre, padre=None) -> dict:
    r = client.post("/api/carpetas", json={"nombre": nombre, "id_carpeta_padre": padre}, headers=auth(token))
    assert r.status_code == 201, r.text
    return r.json()


def subir(client, token, nombre="nota.txt", contenido=b"hola mundo", carpeta=None):
    data = {"id_carpeta": carpeta} if carpeta else {}
    return client.post(
        "/api/archivos", files={"archivo": (nombre, contenido, "text/plain")}, data=data, headers=auth(token)
    )


# ── Subida, listado, descarga y cuota ────────────────────────────────────────

def test_subir_listar_y_descargar(client, almacen, token):
    carpeta = crear_carpeta(client, token, "Docs")
    r = subir(client, token, carpeta=carpeta["id_carpeta"])
    assert r.status_code == 201, r.text
    archivo = r.json()
    assert archivo["tamano_bytes"] == 10
    assert len(almacen.objetos) == 1

    listado = client.get("/api/archivos", params={"id_carpeta": carpeta["id_carpeta"]}, headers=auth(token)).json()
    assert [a["nombre_original"] for a in listado] == ["nota.txt"]
    assert client.get("/api/archivos", headers=auth(token)).json() == []  # la raíz sigue vacía

    r = client.get(f"/api/archivos/{archivo['id_archivo']}/descarga", headers=auth(token))
    assert r.status_code == 200
    assert r.content == b"hola mundo"
    assert "nota.txt" in r.headers["content-disposition"]

    uso = client.get("/api/almacenamiento/uso", headers=auth(token)).json()
    assert uso["usado_bytes"] == 10
    assert uso["cuota_bytes"] == 5 * GIB  # plan gratis


def test_cuota_excedida(client, almacen, token):
    with SessionLocal() as db:
        db.execute(update(Usuario).where(Usuario.correo == "ana@test.com").values(almacenamiento_usado_bytes=5 * GIB - 5))
        db.commit()
    r = subir(client, token)
    assert r.status_code == 413
    assert almacen.objetos == {}


def test_eliminar_archivo_libera_espacio(client, almacen, token):
    archivo = subir(client, token).json()
    assert client.delete(f"/api/archivos/{archivo['id_archivo']}", headers=auth(token)).status_code == 204
    assert almacen.objetos == {}
    assert client.get("/api/almacenamiento/uso", headers=auth(token)).json()["usado_bytes"] == 0


# ── Carpetas: renombrar, ruta, duplicados y borrado ──────────────────────────

def test_renombrar_carpeta(client, token):
    carpeta = crear_carpeta(client, token, "Fotos")
    r = client.patch(f"/api/carpetas/{carpeta['id_carpeta']}", json={"nombre": "  Fotos 2026 "}, headers=auth(token))
    assert r.status_code == 200
    assert r.json()["nombre"] == "Fotos 2026"


def test_nombre_de_carpeta_duplicado(client, token):
    a = crear_carpeta(client, token, "Proyectos")
    b = crear_carpeta(client, token, "Facturas")
    r = client.post("/api/carpetas", json={"nombre": "proyectos"}, headers=auth(token))
    assert r.status_code == 409  # mismo nombre sin importar mayúsculas
    r = client.patch(f"/api/carpetas/{b['id_carpeta']}", json={"nombre": "PROYECTOS"}, headers=auth(token))
    assert r.status_code == 409
    # Renombrarse a sí misma (otra capitalización) sí se permite
    r = client.patch(f"/api/carpetas/{a['id_carpeta']}", json={"nombre": "PROYECTOS"}, headers=auth(token))
    assert r.status_code == 200
    # En otra carpeta padre el nombre sí se puede repetir
    crear_carpeta(client, token, "Proyectos", padre=b["id_carpeta"])


def test_nombre_de_carpeta_invalido(client, token):
    carpeta = crear_carpeta(client, token, "Docs")
    r = client.patch(f"/api/carpetas/{carpeta['id_carpeta']}", json={"nombre": "a/b"}, headers=auth(token))
    assert r.status_code == 422


def test_ruta_de_carpeta(client, token):
    a = crear_carpeta(client, token, "A")
    b = crear_carpeta(client, token, "B", padre=a["id_carpeta"])
    c = crear_carpeta(client, token, "C", padre=b["id_carpeta"])
    r = client.get(f"/api/carpetas/{c['id_carpeta']}/ruta", headers=auth(token))
    assert r.status_code == 200
    assert [x["nombre"] for x in r.json()] == ["A", "B", "C"]
    assert r.json()[0]["id_carpeta"] == a["id_carpeta"]


def test_no_se_elimina_carpeta_con_contenido(client, almacen, token):
    carpeta = crear_carpeta(client, token, "Docs")
    subir(client, token, carpeta=carpeta["id_carpeta"])
    assert client.delete(f"/api/carpetas/{carpeta['id_carpeta']}", headers=auth(token)).status_code == 409


# ── Archivos: renombrar y mover ──────────────────────────────────────────────

def test_renombrar_archivo(client, almacen, token):
    archivo = subir(client, token).json()
    r = client.patch(f"/api/archivos/{archivo['id_archivo']}", json={"nombre_original": "informe.txt"}, headers=auth(token))
    assert r.status_code == 200
    assert r.json()["nombre_original"] == "informe.txt"
    assert r.json()["id_carpeta"] is None  # no se movió


def test_renombrar_quita_rutas_del_nombre(client, almacen, token):
    archivo = subir(client, token).json()
    r = client.patch(
        f"/api/archivos/{archivo['id_archivo']}", json={"nombre_original": "../../etc/passwd"}, headers=auth(token)
    )
    assert r.json()["nombre_original"] == "passwd"


def test_mover_archivo_entre_carpetas_y_a_la_raiz(client, almacen, token):
    destino = crear_carpeta(client, token, "Destino")
    archivo = subir(client, token).json()

    r = client.patch(f"/api/archivos/{archivo['id_archivo']}", json={"id_carpeta": destino["id_carpeta"]}, headers=auth(token))
    assert r.status_code == 200
    assert r.json()["id_carpeta"] == destino["id_carpeta"]
    assert r.json()["nombre_original"] == "nota.txt"  # no se renombró
    assert client.get("/api/archivos", headers=auth(token)).json() == []

    r = client.patch(f"/api/archivos/{archivo['id_archivo']}", json={"id_carpeta": None}, headers=auth(token))
    assert r.json()["id_carpeta"] is None
    assert len(client.get("/api/archivos", headers=auth(token)).json()) == 1


def test_actualizar_archivo_sin_cambios(client, almacen, token):
    archivo = subir(client, token).json()
    assert client.patch(f"/api/archivos/{archivo['id_archivo']}", json={}, headers=auth(token)).status_code == 400


# ── Aislamiento entre usuarios ───────────────────────────────────────────────

def test_no_se_accede_a_lo_ajeno(client, almacen, token, token_otro):
    carpeta = crear_carpeta(client, token, "Privada")
    archivo = subir(client, token, carpeta=carpeta["id_carpeta"]).json()
    id_c, id_a = carpeta["id_carpeta"], archivo["id_archivo"]
    otro = auth(token_otro)

    # 404 y no 403: no se revela que el recurso existe
    assert client.get(f"/api/carpetas/{id_c}/ruta", headers=otro).status_code == 404
    assert client.patch(f"/api/carpetas/{id_c}", json={"nombre": "X"}, headers=otro).status_code == 404
    assert client.get("/api/archivos", params={"id_carpeta": id_c}, headers=otro).status_code == 404
    assert client.get(f"/api/archivos/{id_a}/descarga", headers=otro).status_code == 404
    assert client.patch(f"/api/archivos/{id_a}", json={"nombre_original": "x"}, headers=otro).status_code == 404
    assert client.delete(f"/api/archivos/{id_a}", headers=otro).status_code == 404


def test_no_se_mueve_a_carpeta_ajena(client, almacen, token, token_otro):
    ajena = crear_carpeta(client, token_otro, "De Beto")
    archivo = subir(client, token).json()
    r = client.patch(f"/api/archivos/{archivo['id_archivo']}", json={"id_carpeta": ajena["id_carpeta"]}, headers=auth(token))
    assert r.status_code == 404
