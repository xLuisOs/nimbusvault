"""Las pruebas corren con SQLite en un archivo temporal: no necesitan Postgres ni Docker."""

import os
import re
import tempfile

_db = os.path.join(tempfile.mkdtemp(), "pruebas.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["ENTORNO"] = "pruebas"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core import email  # noqa: E402
from app.db import models  # noqa: E402,F401
from app.db.session import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from scripts import seed  # noqa: E402

ADMIN = {"correo": "admin@nimbusvault.local", "password": "Admin12345!"}


@pytest.fixture(autouse=True)
def base_limpia():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed.run()
    email.bandeja_pruebas.clear()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def token_del_ultimo_correo() -> str:
    texto = email.bandeja_pruebas[-1]["texto"]
    return re.search(r"token=([\w-]+)", texto).group(1)


def registrar_y_verificar(client, correo="ana@test.com", password="Segura123", nombre="Ana Torres"):
    r = client.post("/api/auth/registro", json={
        "nombre": nombre, "correo": correo, "password": password, "acepto_terminos": True,
    })
    assert r.status_code == 201, r.text
    r = client.post("/api/auth/verificar-correo", json={"token": token_del_ultimo_correo()})
    assert r.status_code == 200, r.text


def login(client, correo, password) -> str:
    r = client.post("/api/auth/login", json={"correo": correo, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]
