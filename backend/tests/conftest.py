"""Las pruebas corren con SQLite en un archivo temporal: no necesitan Postgres ni Docker."""

import os
import re
import tempfile

_db = os.path.join(tempfile.mkdtemp(), "pruebas.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["ENTORNO"] = "pruebas"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from sqlalchemy import select  # noqa: E402

from app.core import email  # noqa: E402
from app.core.security import ahora, hash_password  # noqa: E402
from app.core.storage import ObjetoNoEncontrado, get_almacen  # noqa: E402
from app.db import models  # noqa: E402,F401
from app.db.session import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.modules.auth.models import ESTADO_ACTIVO, Rol, Usuario  # noqa: E402
from scripts import seed  # noqa: E402

ADMIN = {"correo": "admin@nimbusvault.local", "password": "Admin12345!"}


class AlmacenFalso:
    """Reemplaza a AlmacenS3 en las pruebas: guarda los objetos en un diccionario."""

    def __init__(self) -> None:
        self.objetos: dict[str, bytes] = {}

    def subir(self, fileobj, clave: str, tipo_mime: str, tamano: int) -> None:
        fileobj.seek(0)
        self.objetos[clave] = fileobj.read()

    def descargar(self, clave: str):
        if clave not in self.objetos:
            raise ObjetoNoEncontrado(clave)
        return iter([self.objetos[clave]])

    def borrar(self, clave: str) -> None:
        self.objetos.pop(clave, None)


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


@pytest.fixture
def almacen():
    falso = AlmacenFalso()
    app.dependency_overrides[get_almacen] = lambda: falso
    yield falso
    app.dependency_overrides.pop(get_almacen, None)


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def crear_usuario_con_rol(rol: str, correo: str, password: str = "Segura123") -> None:
    """Crea un usuario activo con el rol indicado (por ejemplo SOPORTE, que no se registra desde la web)."""
    db = SessionLocal()
    try:
        id_rol = db.scalar(select(Rol.id_rol).where(Rol.nombre == rol))
        db.add(Usuario(
            id_rol=id_rol, nombre=f"Usuario {rol.title()}", correo=correo,
            password_hash=hash_password(password), estado=ESTADO_ACTIVO, correo_verificado_en=ahora(),
        ))
        db.commit()
    finally:
        db.close()


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
