"""3.10: pruebas de integración. Recorren los casos de uso de punta a punta, como lo haría un cliente
desde el navegador, en lugar de probar cada endpoint por separado.

CU-01 registrarse → CU-02 contratar un plan → CU-03 cargar archivos, con la cuota aplicada en cada paso.
"""
from sqlalchemy import update

from app.db.session import SessionLocal
from app.modules.auth.models import Usuario
from tests.conftest import auth, login, registrar_y_verificar

GIB = 1024**3
TARJETA = {"numero": "4242 4242 4242 4242", "titular": "Ana Torres", "vencimiento": "12/30", "cvv": "123"}


def _subir(client, token, nombre, contenido, carpeta=None):
    data = {"id_carpeta": carpeta} if carpeta else {}
    return client.post(
        "/api/archivos", files={"archivo": (nombre, contenido, "application/pdf")}, data=data, headers=auth(token)
    )


def _uso(client, token) -> dict:
    return client.get("/api/almacenamiento/uso", headers=auth(token)).json()


def _fijar_uso(correo: str, bytes_: int) -> None:
    """Simula que el usuario ya tiene archivos guardados (subir GB de verdad en una prueba no tiene sentido)."""
    with SessionLocal() as db:
        db.execute(update(Usuario).where(Usuario.correo == correo).values(almacenamiento_usado_bytes=bytes_))
        db.commit()


def test_cliente_de_punta_a_punta(client, almacen):
    # CU-01: registro y verificación → arranca con el plan Gratis
    registrar_y_verificar(client)
    token = login(client, "ana@test.com", "Segura123")
    me = client.get("/api/auth/me", headers=auth(token)).json()
    assert me["suscripcion"]["plan_codigo"] == "gratis"
    assert _uso(client, token)["cuota_bytes"] == 5 * GIB

    # CU-03: organiza y sube un archivo dentro de una carpeta
    carpeta = client.post("/api/carpetas", json={"nombre": "Facturas"}, headers=auth(token)).json()
    archivo = _subir(client, token, "enero.pdf", b"%PDF-1.4 contenido", carpeta["id_carpeta"]).json()
    assert _uso(client, token)["usado_bytes"] == len(b"%PDF-1.4 contenido")

    # El plan Gratis se llena: la siguiente carga se rechaza y no deja nada en el bucket
    _fijar_uso("ana@test.com", 5 * GIB - 10)
    r = _subir(client, token, "grande.pdf", b"x" * 100)
    assert r.status_code == 413
    assert len(almacen.objetos) == 1

    # CU-02: contrata Personal (25 GB) con pago simulado → ahora sí cabe
    plan = next(p for p in client.get("/api/planes").json() if p["codigo"] == "personal")
    r = client.post(
        "/api/suscripciones/contratar",
        json={"id_plan": plan["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA},
        headers=auth(token),
    )
    assert r.status_code == 201, r.text
    pago = r.json()
    assert _uso(client, token)["cuota_bytes"] == 25 * GIB
    assert _subir(client, token, "grande.pdf", b"x" * 100).status_code == 201

    # El pago queda en el historial con su comprobante, sin el número completo de la tarjeta
    historial = client.get("/api/pagos", headers=auth(token)).json()
    assert [p["numero_comprobante"] for p in historial] == [pago["numero_comprobante"]]
    assert historial[0]["ultimos_4"] == "4242"
    pdf = client.get(f"/api/pagos/{pago['id_pago']}/comprobante", headers=auth(token))
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    # Descarga el archivo original intacto y luego lo borra: el espacio se libera
    r = client.get(f"/api/archivos/{archivo['id_archivo']}/descarga", headers=auth(token))
    assert r.content == b"%PDF-1.4 contenido"
    usado_antes = _uso(client, token)["usado_bytes"]
    assert client.delete(f"/api/archivos/{archivo['id_archivo']}", headers=auth(token)).status_code == 204
    assert _uso(client, token)["usado_bytes"] == usado_antes - len(b"%PDF-1.4 contenido")


def test_no_puede_bajar_de_plan_si_sus_archivos_no_caben(client, almacen):
    registrar_y_verificar(client)
    token = login(client, "ana@test.com", "Segura123")
    planes = {p["codigo"]: p for p in client.get("/api/planes").json()}

    def contratar(codigo):
        return client.post(
            "/api/suscripciones/contratar",
            json={"id_plan": planes[codigo]["id_plan"], "periodicidad": "mensual", "tarjeta": TARJETA},
            headers=auth(token),
        )

    assert contratar("pro").status_code == 201        # 100 GB
    _fijar_uso("ana@test.com", 30 * GIB)              # ya usa 30 GB
    assert contratar("personal").status_code == 409   # Personal ofrece 25 GB: no caben
    assert client.get("/api/auth/me", headers=auth(token)).json()["suscripcion"]["plan_codigo"] == "pro"
    assert len(client.get("/api/pagos", headers=auth(token)).json()) == 1  # el intento fallido no cobra


def test_los_datos_de_cada_cliente_estan_aislados(client, almacen):
    registrar_y_verificar(client)
    registrar_y_verificar(client, correo="beto@test.com", nombre="Beto Paz")
    ana = login(client, "ana@test.com", "Segura123")
    beto = login(client, "beto@test.com", "Segura123")

    carpeta = client.post("/api/carpetas", json={"nombre": "Privado"}, headers=auth(ana)).json()
    archivo = _subir(client, ana, "secreto.pdf", b"solo de ana", carpeta["id_carpeta"]).json()

    # Beto no ve, no descarga, no mueve ni borra lo de Ana (404: ni siquiera sabe que existe)
    assert client.get("/api/archivos", headers=auth(beto)).json() == []
    assert client.get(f"/api/archivos/{archivo['id_archivo']}/descarga", headers=auth(beto)).status_code == 404
    assert client.patch(f"/api/archivos/{archivo['id_archivo']}", json={"nombre_original": "x.pdf"},
                        headers=auth(beto)).status_code == 404
    assert client.delete(f"/api/archivos/{archivo['id_archivo']}", headers=auth(beto)).status_code == 404
    assert client.get("/api/archivos", params={"id_carpeta": carpeta["id_carpeta"]},
                      headers=auth(beto)).status_code == 404
    # Ni puede meter archivos en la carpeta de Ana
    assert _subir(client, beto, "intruso.pdf", b"x", carpeta["id_carpeta"]).status_code == 404

    # Lo de Ana sigue intacto
    assert client.get(f"/api/archivos/{archivo['id_archivo']}/descarga", headers=auth(ana)).content == b"solo de ana"


def test_sesion_sobrevive_recarga_y_cierra_de_verdad(client):
    """La cookie httpOnly renueva la sesión (como al recargar la página) y el logout la invalida."""
    registrar_y_verificar(client)
    login(client, "ana@test.com", "Segura123")

    r = client.post("/api/auth/refresh")
    assert r.status_code == 200
    nuevo = r.json()["access_token"]
    assert client.get("/api/auth/me", headers=auth(nuevo)).status_code == 200

    assert client.post("/api/auth/logout").status_code == 200
    assert client.post("/api/auth/refresh").status_code == 401
