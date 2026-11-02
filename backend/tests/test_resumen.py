"""4.2: dashboard y panel de consumo con datos reales (registro de actividad)."""
import pytest

from app.modules.almacenamiento.resumen import categoria
from tests.conftest import ADMIN, auth, login, registrar_y_verificar

TARJETA = {"numero": "4242 4242 4242 4242", "titular": "Ana Torres", "vencimiento": "12/30", "cvv": "123"}


@pytest.fixture
def token(client):
    registrar_y_verificar(client)
    return login(client, "ana@test.com", "Segura123")


def subir(client, token, nombre, contenido, mime, carpeta=None):
    data = {"id_carpeta": carpeta} if carpeta else {}
    r = client.post("/api/archivos", files={"archivo": (nombre, contenido, mime)}, data=data, headers=auth(token))
    assert r.status_code == 201, r.text
    return r.json()


def resumen(client, token):
    r = client.get("/api/almacenamiento/resumen", headers=auth(token))
    assert r.status_code == 200, r.text
    return r.json()


def test_cliente_nuevo_sin_actividad(client, token):
    datos = resumen(client, token)
    assert datos["archivos"] == 0 and datos["carpetas"] == 0
    assert datos["por_categoria"] == [] and datos["recientes"] == [] and datos["actividad"] == []
    assert len(datos["tendencia"]) == 8 and len(datos["crecimiento"]) == 6


def test_resumen_refleja_lo_que_hace_el_cliente(client, almacen, token):
    carpeta = client.post("/api/carpetas", json={"nombre": "Fotos"}, headers=auth(token)).json()
    foto = subir(client, token, "playa.jpg", b"x" * 300, "image/jpeg", carpeta["id_carpeta"])
    subir(client, token, "tarea.pdf", b"y" * 200, "application/pdf")
    borrar = subir(client, token, "viejo.zip", b"z" * 50, "application/zip")
    client.get(f"/api/archivos/{foto['id_archivo']}/descarga", headers=auth(token))
    client.delete(f"/api/archivos/{borrar['id_archivo']}", headers=auth(token))

    datos = resumen(client, token)
    assert datos["archivos"] == 2 and datos["carpetas"] == 1
    assert datos["usado_bytes"] == 500
    assert {c["categoria"]: c["bytes"] for c in datos["por_categoria"]} == {"imagenes": 300, "documentos": 200}

    # El más reciente primero, con el nombre de su carpeta
    assert [a["nombre_original"] for a in datos["recientes"]] == ["tarea.pdf", "playa.jpg"]
    assert datos["recientes"][1]["carpeta"] == "Fotos"

    tipos = [e["tipo"] for e in datos["actividad"]]
    assert tipos == ["eliminacion", "descarga", "subida", "subida", "subida", "carpeta"]
    assert datos["actividad"][0]["descripcion"] == "viejo.zip"

    assert datos["este_mes"] == {
        "subidas": 3, "descargas": 1, "subidas_mes_anterior": 0, "descargas_mes_anterior": 0, "bytes_eliminados": 50,
    }
    assert datos["tendencia"][-1]["subidas"] == 3 and datos["tendencia"][-1]["descargas"] == 1
    assert datos["crecimiento"][-1]["bytes"] == 500


def test_pago_aparece_en_la_actividad(client, token):
    plan = next(p for p in client.get("/api/planes").json() if p["codigo"] == "personal")
    r = client.post("/api/suscripciones/contratar", headers=auth(token),
                    json={"id_plan": plan["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA})
    assert r.status_code == 201
    evento = resumen(client, token)["actividad"][0]
    assert evento["tipo"] == "pago" and evento["descripcion"] == "Plan Personal (mensual)"


def test_actividad_aislada_entre_clientes(client, almacen, token):
    subir(client, token, "de-ana.txt", b"hola", "text/plain")
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")
    beto = login(client, "beto@test.com", "Segura123")
    datos = resumen(client, beto)
    assert datos["actividad"] == [] and datos["recientes"] == []


def test_resumen_solo_para_clientes(client):
    admin = login(client, **ADMIN)
    assert client.get("/api/almacenamiento/resumen", headers=auth(admin)).status_code == 403


@pytest.mark.parametrize("mime,nombre,esperada", [
    ("image/png", "logo.png", "imagenes"),
    ("video/mp4", "clip.mp4", "videos"),
    ("audio/mpeg", "song.mp3", "audio"),
    ("application/x-7z-compressed", "respaldo.7z", "comprimidos"),
    ("application/octet-stream", "notas.docx", "documentos"),
    ("text/plain", "leeme.txt", "documentos"),
    ("application/octet-stream", "programa.exe", "otros"),
])
def test_categorias(mime, nombre, esperada):
    assert categoria(mime, nombre) == esperada
