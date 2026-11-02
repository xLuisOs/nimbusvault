"""El cliente de almacenamiento: la descarga pide el objeto de inmediato y devuelve su contenido completo."""
import inspect
import io

import pytest

from app.core import storage
from app.core.storage import AlmacenS3, ObjetoNoEncontrado


def test_descargar_no_es_generador():
    # Si `descargar` tuviera `yield`, el `return` de la rama boto entregaría un archivo vacío
    assert not inspect.isgeneratorfunction(AlmacenS3.descargar)


class _RespuestaFalsa:
    def __init__(self, status: int, cuerpo: bytes = b"", texto: str = ""):
        self.status_code, self._cuerpo, self.text = status, cuerpo, texto

    def iter_content(self, chunk_size):
        for i in range(0, len(self._cuerpo), chunk_size):
            yield self._cuerpo[i:i + chunk_size]


def _almacen_supabase() -> AlmacenS3:
    a = AlmacenS3.__new__(AlmacenS3)  # sin __init__: no queremos red en las pruebas
    a._use_supabase_rest, a._supabase_rest_base, a.bucket = True, "https://x.supabase.co/storage/v1", "nimbusvault"
    return a


def test_descarga_supabase_completa(monkeypatch):
    contenido = b"a" * 200_000
    monkeypatch.setattr(storage.requests, "get", lambda *a, **k: _RespuestaFalsa(200, contenido))
    assert b"".join(_almacen_supabase().descargar("u/1")) == contenido


def test_subida_supabase_envia_el_archivo_crudo_sin_multipart(monkeypatch):
    # Multipart obligaba a armar en memoria una copia completa del archivo antes de enviarlo
    enviado = {}

    def post_falso(url, **kwargs):
        enviado.update(kwargs, url=url, cuerpo=kwargs["data"].read())
        return _RespuestaFalsa(200)

    monkeypatch.setattr(storage.requests, "post", post_falso)
    archivo = io.BytesIO(b"x" * 300_000)
    archivo.read(10)  # aunque alguien lo haya leído antes, se envía desde el inicio
    _almacen_supabase().subir(archivo, "u/1", "application/pdf", 300_000)

    assert "files" not in enviado
    assert enviado["url"] == "https://x.supabase.co/storage/v1/object/nimbusvault/u/1"
    assert enviado["headers"]["Content-Type"] == "application/pdf"
    assert enviado["cuerpo"] == b"x" * 300_000


@pytest.mark.parametrize("status,texto", [(404, ""), (400, '{"error":"not_found","message":"Object not found"}')])
def test_descarga_supabase_inexistente_falla_antes_de_transmitir(monkeypatch, status, texto):
    monkeypatch.setattr(storage.requests, "get", lambda *a, **k: _RespuestaFalsa(status, texto=texto))
    with pytest.raises(ObjetoNoEncontrado):
        _almacen_supabase().descargar("u/no-existe")
