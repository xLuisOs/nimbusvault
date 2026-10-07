import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


def obtener_cliente_s3():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
    )


def crear_bucket_si_no_existe() -> None:
    cliente = obtener_cliente_s3()

    try:
        cliente.head_bucket(Bucket=settings.s3_bucket)
    except ClientError as error:
        codigo = error.response.get("Error", {}).get("Code")

        if codigo in ("404", "NoSuchBucket"):
            cliente.create_bucket(Bucket=settings.s3_bucket)
        else:
            raise