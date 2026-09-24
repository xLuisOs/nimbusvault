"""Carga los datos base: roles, catálogo de planes y un administrador.

Se puede correr varias veces sin duplicar nada:
    python -m scripts.seed
"""

from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.core.security import ahora, hash_password
from app.db.session import SessionLocal
from app.modules.auth.models import ESTADO_ACTIVO, ROL_ADMIN, ROL_CLIENTE, ROL_SOPORTE, Rol, Usuario
from app.modules.planes.models import Plan, PlanCaracteristica

ROLES = [
    (1, ROL_ADMIN, "Administra usuarios, planes e infraestructura"),
    (2, ROL_CLIENTE, "Contrata planes y administra sus archivos"),
    (3, ROL_SOPORTE, "Atiende consultas de clientes (opcional)"),
]

# Catálogo único para landing, página de planes y panel admin.
# Precios en dólares (USD); los cobros son simulados, no se procesa dinero real.
PLANES = [
    {
        "codigo": "gratis", "nombre": "Gratis", "precio_mensual": Decimal("0"), "almacenamiento_gb": 5,
        "descripcion": "Para probar la plataforma y respaldar tus archivos personales.",
        "destacado": False, "orden": 1, "color": "#64748B",
        "caracteristicas": ["5 GB de almacenamiento", "Carpetas ilimitadas", "Archivos de hasta 50 MB",
                            "Soporte por correo"],
    },
    {
        "codigo": "personal", "nombre": "Personal", "precio_mensual": Decimal("5"), "almacenamiento_gb": 25,
        "descripcion": "Para profesionales independientes que respaldan su trabajo.",
        "destacado": False, "orden": 2, "color": "#4DB8FF",
        "caracteristicas": ["25 GB de almacenamiento", "Carpetas ilimitadas", "Archivos de hasta 500 MB",
                            "Historial de pagos", "Soporte por correo"],
    },
    {
        "codigo": "pro", "nombre": "Pro", "precio_mensual": Decimal("9"), "almacenamiento_gb": 100,
        "descripcion": "Para freelancers y equipos pequeños que manejan muchos archivos.",
        "destacado": True, "orden": 3, "color": "#2E9BFF",
        "caracteristicas": ["100 GB de almacenamiento", "Archivos de hasta 2 GB", "Enlaces para compartir",
                            "Panel de consumo detallado", "Soporte prioritario"],
    },
    {
        "codigo": "business", "nombre": "Business", "precio_mensual": Decimal("29"), "almacenamiento_gb": 500,
        "descripcion": "Para empresas que centralizan los archivos de su equipo.",
        "destacado": False, "orden": 4, "color": "#00D1C1",
        "caracteristicas": ["500 GB de almacenamiento", "Archivos de hasta 5 GB", "Enlaces para compartir",
                            "Panel de consumo detallado", "Soporte prioritario 24/7"],
    },
]


def run() -> None:
    db = SessionLocal()
    try:
        for id_rol, nombre, desc in ROLES:
            if db.get(Rol, id_rol) is None:
                db.add(Rol(id_rol=id_rol, nombre=nombre, descripcion=desc))
        db.flush()

        for datos in PLANES:
            datos = dict(datos)
            caracteristicas = datos.pop("caracteristicas")
            if db.scalar(select(Plan).where(Plan.codigo == datos["codigo"])):
                continue
            plan = Plan(**datos, vigencia_dias=30, descuento_anual_pct=20, activo=True)
            plan.caracteristicas = [PlanCaracteristica(descripcion=c, orden=i) for i, c in enumerate(caracteristicas)]
            db.add(plan)

        correo = settings.admin_correo.lower()
        if db.scalar(select(Usuario).where(Usuario.correo == correo)) is None:
            db.add(Usuario(
                id_rol=1, nombre="Administrador NimbusVault", correo=correo,
                password_hash=hash_password(settings.admin_password),
                estado=ESTADO_ACTIVO, correo_verificado_en=ahora(),
            ))

        db.commit()
        print("Seed listo: roles, planes y administrador.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
