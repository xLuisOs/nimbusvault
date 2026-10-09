from datetime import datetime, timedelta
from decimal import Decimal

from app.db.session import SessionLocal
from app.modules.auth.models import Usuario
from app.modules.planes.models import Plan
from app.modules.suscripciones.models import Suscripcion
from app.core.config import settings


def run():
    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.correo == settings.admin_correo.lower()).one_or_none()
        if not admin:
            print('Admin user not found')
            return
        plan = db.query(Plan).filter(Plan.codigo == 'personal').one_or_none()
        if not plan:
            plan = db.query(Plan).filter(Plan.codigo == 'gratis').one_or_none()
        if not plan:
            print('No suitable plan found')
            return
        now = datetime.utcnow()
        sub = Suscripcion(
            id_usuario=admin.id_usuario,
            id_plan=plan.id_plan,
            fecha_inicio=now,
            fecha_fin=now + timedelta(days=30),
            estado='activa',
            periodicidad='mensual',
            precio_contratado=plan.precio_mensual,
        )
        db.add(sub)
        db.commit()
        print('Subscription created for', admin.correo)
    finally:
        db.close()


if __name__ == '__main__':
    run()
