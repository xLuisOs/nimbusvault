# Módulo de Almacenamiento (Avance 2)

Aquí va la carga/descarga de archivos, carpetas y el control de cuota.

Archivos a crear, siguiendo el mismo patrón de `auth/` y `planes/`:

- `models.py`   → `Carpeta`, `Archivo` (con `clave_objeto`, `bucket`, `eliminado_en`)
- `schemas.py`  → entrada/salida de la API
- `storage.py`  → cliente de MinIO (boto3 o `minio`), único lugar que habla con S3
- `service.py`  → reglas: validar cuota (RN-03), actualizar `usuarios.almacenamiento_usado_bytes` en la misma transacción
- `router.py`   → `/api/archivos`, `/api/carpetas`

Después de crear los modelos: importarlos en `app/db/models.py` y correr
`alembic revision --autogenerate -m "archivos y carpetas"`.
