"""Importa todos los modelos para que Alembic y SQLAlchemy los conozcan.

Cuando agreguen un módulo nuevo (archivos, pagos...), importen aquí sus modelos.
"""

from app.db.session import Base  # noqa: F401
from app.modules.auth.models import Rol, Sesion, TokenUsuario, Usuario  # noqa: F401
from app.modules.planes.models import Plan, PlanCaracteristica  # noqa: F401
from app.modules.suscripciones.models import Suscripcion  # noqa: F401
