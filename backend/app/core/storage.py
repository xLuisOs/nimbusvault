"""Cliente de almacenamiento de objetos compatible con S3 (Supabase Storage, MinIO, AWS...)."""
import logging
from functools import lru_cache
from typing import BinaryIO, Iterator

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError
import requests
from fastapi import HTTPException

from app.core.config import settings

log = logging.getLogger("nimbusvault.storage")


class ErrorAlmacen(Exception):
    """Falla al hablar con el almacenamiento S3."""


class ObjetoNoEncontrado(ErrorAlmacen):
    """La llave no existe en el bucket."""


def _config() -> Config:
    opciones = dict(
        signature_version="s3v4",
        s3={"addressing_style": "path"},  # Supabase y MinIO exigen path-style
        retries={"max_attempts": 3},
        connect_timeout=5,
        read_timeout=60,
    )
    try:
        # Las versiones recientes de boto3 agregan checksums que varios S3 compatibles rechazan
        return Config(
            **opciones,
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        )
    except TypeError:  # botocore antiguo, no conoce esas opciones
        return Config(**opciones)


class AlmacenS3:
    def __init__(self) -> None:
        if not (settings.s3_endpoint_url and settings.s3_access_key and settings.s3_secret_key):
            raise ErrorAlmacen("Almacenamiento S3 no configurado (revisa las variables S3_* del .env)")

        self.bucket = settings.s3_bucket.strip().strip("/")
        if not self.bucket:
            raise ErrorAlmacen("S3_BUCKET no puede estar vacío")

        # Si el endpoint parece ser Supabase, usaremos la API REST en lugar de
        # boto3 para evitar problemas con las firmas S3 y las claves service_role.
        self._use_supabase_rest = False
        self._supabase_rest_base = None
        if settings.s3_endpoint_url and "supabase.co" in settings.s3_endpoint_url:
            # endpoint puede venir como .../storage/v1/s3 o .../storage/v1
            self._use_supabase_rest = True
            self._supabase_rest_base = settings.s3_endpoint_url
            # Si termina en /s3, quitar para construir rutas REST (/bucket, /object/...)
            if self._supabase_rest_base.endswith("/s3"):
                self._supabase_rest_base = self._supabase_rest_base[: -3]

        if not self._use_supabase_rest:
            self.cliente = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
                use_ssl=settings.s3_use_ssl,
                config=_config(),
            )
            self._asegurar_bucket()
        else:
            # Verificar mediante REST que el bucket exista (esto lanzará ErrorAlmacen si no).
            try:
                headers = {"Authorization": f"Bearer {settings.s3_secret_key}", "apikey": settings.s3_secret_key}
                resp = requests.get(f"{self._supabase_rest_base}/bucket", headers=headers, timeout=10)
                if resp.status_code != 200:
                    # intentar crear el bucket vía REST si no existe
                    if resp.status_code == 404 or resp.status_code == 403:
                        # Crear bucket (requiere service role key)
                        create_payload = {"id": self.bucket, "name": self.bucket, "public": False}
                        c = requests.post(f"{self._supabase_rest_base}/bucket", json=create_payload, headers=headers, timeout=10)
                        if c.status_code not in (200, 201):
                            raise ErrorAlmacen(f"No se pudo crear/validar el bucket {self.bucket}: {c.status_code} {c.text}")
                    else:
                        raise ErrorAlmacen(f"No se pudo validar el bucket {self.bucket}: {resp.status_code} {resp.text}")
            except requests.RequestException as e:
                raise ErrorAlmacen(f"Error de conexión con Supabase Storage: {e}") from e

    def _asegurar_bucket(self) -> None:
        try:
            self.cliente.head_bucket(Bucket=self.bucket)
            return
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code not in {"404", "NoSuchBucket", "NoSuchKey", "404 Not Found"}:
                raise ErrorAlmacen(f"No se pudo validar el bucket {self.bucket}: {e}") from e

        log.info("Bucket %s no existe; se creará automáticamente.", self.bucket)
        try:
            kwargs = {"Bucket": self.bucket}
            if settings.s3_region and settings.s3_region != "us-east-1":
                kwargs["CreateBucketConfiguration"] = {"LocationConstraint": settings.s3_region}
            self.cliente.create_bucket(**kwargs)
        except (ClientError, BotoCoreError) as e:
            if "BucketAlreadyOwnedByYou" not in str(e) and "BucketAlreadyExists" not in str(e):
                raise ErrorAlmacen(f"No se pudo crear el bucket {self.bucket}: {e}") from e

    def subir(self, fileobj: BinaryIO, clave: str, tipo_mime: str, tamano: int) -> None:
        if self._use_supabase_rest:
            try:
                fileobj.seek(0)
                headers = {"Authorization": f"Bearer {settings.s3_secret_key}", "apikey": settings.s3_secret_key}
                files = {"file": (clave, fileobj, tipo_mime)}
                url = f"{self._supabase_rest_base}/object/{self.bucket}/{clave}"
                r = requests.post(url, headers=headers, files=files, timeout=60)
                if r.status_code >= 400:
                    log.error("Falló la subida REST de %s: %s %s", clave, r.status_code, r.text)
                    raise ErrorAlmacen("No se pudo guardar el archivo en el almacenamiento (supabase)")
                return
            except requests.RequestException as e:
                log.error("Falló la subida REST de %s: %s", clave, e)
                raise ErrorAlmacen("No se pudo guardar el archivo en el almacenamiento (supabase)") from e

        try:
            fileobj.seek(0)
            self.cliente.put_object(
                Bucket=self.bucket, Key=clave, Body=fileobj, ContentType=tipo_mime, ContentLength=tamano
            )
        except (ClientError, BotoCoreError) as e:
            log.error("Falló la subida de %s: %s", clave, e)
            raise ErrorAlmacen("No se pudo guardar el archivo en el almacenamiento") from e

    def descargar(self, clave: str) -> Iterator[bytes]:
        if self._use_supabase_rest:
            try:
                headers = {"Authorization": f"Bearer {settings.s3_secret_key}", "apikey": settings.s3_secret_key}
                url = f"{self._supabase_rest_base}/object/{self.bucket}/{clave}"
                r = requests.get(url, headers=headers, stream=True, timeout=60)
                if r.status_code == 404:
                    raise ObjetoNoEncontrado(clave)
                if r.status_code >= 400:
                    log.error("Falló la descarga REST de %s: %s %s", clave, r.status_code, r.text)
                    raise ErrorAlmacen("No se pudo leer el archivo del almacenamiento (supabase)")
                for chunk in r.iter_content(chunk_size=64 * 1024):
                    if chunk:
                        yield chunk
                return
            except requests.RequestException as e:
                log.error("Falló la descarga REST de %s: %s", clave, e)
                raise ErrorAlmacen("No se pudo leer el archivo del almacenamiento (supabase)") from e

        try:
            resp = self.cliente.get_object(Bucket=self.bucket, Key=clave)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                raise ObjetoNoEncontrado(clave) from e
            log.error("Falló la descarga de %s: %s", clave, e)
            raise ErrorAlmacen("No se pudo leer el archivo del almacenamiento") from e
        except BotoCoreError as e:
            log.error("Falló la descarga de %s: %s", clave, e)
            raise ErrorAlmacen("No se pudo leer el archivo del almacenamiento") from e
        return resp["Body"].iter_chunks(chunk_size=64 * 1024)

    def borrar(self, clave: str) -> None:
        """Borrado de mejor esfuerzo: nunca lanza. Un objeto huérfano es basura, no un error del usuario."""
        if self._use_supabase_rest:
            try:
                headers = {"Authorization": f"Bearer {settings.s3_secret_key}", "apikey": settings.s3_secret_key}
                url = f"{self._supabase_rest_base}/object/{self.bucket}/{clave}"
                requests.delete(url, headers=headers, timeout=10)
                return
            except requests.RequestException:
                log.warning("No se pudo borrar %s del bucket (supabase)", clave)
                return

        try:
            self.cliente.delete_object(Bucket=self.bucket, Key=clave)
        except (ClientError, BotoCoreError) as e:
            log.warning("No se pudo borrar %s del bucket: %s", clave, e)


@lru_cache
def _instancia() -> AlmacenS3:
    return AlmacenS3()


def get_almacen() -> AlmacenS3:
    """Dependencia de FastAPI. Las pruebas la reemplazan por un almacén falso."""
    try:
        return _instancia()
    except ErrorAlmacen as e:
        raise HTTPException(503, str(e))
