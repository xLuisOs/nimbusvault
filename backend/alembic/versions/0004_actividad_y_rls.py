"""avance 3: registro de actividad y RLS en Supabase

- Tabla `actividad` (subidas, descargas, eliminaciones, carpetas y pagos).
- Se rellena con lo que ya existía: archivos subidos, carpetas y pagos aprobados.
- En PostgreSQL activa Row Level Security en todas las tablas: Supabase publica el esquema
  `public` en su API REST con una llave pública (anon); sin RLS cualquiera podría leer las tablas.
  La API se conecta como dueña de las tablas, así que a ella no le afecta.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-18 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

TABLAS = [
    'alembic_version', 'roles', 'usuarios', 'tokens_usuario', 'sesiones', 'planes', 'plan_caracteristicas',
    'suscripciones', 'carpetas', 'archivos', 'pagos', 'actividad',
]


def upgrade() -> None:
    op.create_table('actividad',
    sa.Column('id_actividad', sa.Uuid(), nullable=False),
    sa.Column('id_usuario', sa.Uuid(), nullable=False),
    sa.Column('tipo', sa.String(length=20), nullable=False),
    sa.Column('descripcion', sa.String(length=255), nullable=False),
    sa.Column('tamano_bytes', sa.BigInteger(), nullable=False),
    sa.Column('tipo_mime', sa.String(length=120), nullable=True),
    sa.Column('creado_en', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("tipo IN ('subida','descarga','eliminacion','carpeta','pago')", name='ck_actividad_tipo'),
    sa.CheckConstraint('tamano_bytes >= 0', name='ck_actividad_tamano'),
    sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id_actividad')
    )
    op.create_index('ix_actividad_usuario_fecha', 'actividad', ['id_usuario', 'creado_en'], unique=False)
    op.create_index(op.f('ix_actividad_creado_en'), 'actividad', ['creado_en'], unique=False)

    if op.get_bind().dialect.name != 'postgresql':
        return

    # Lo que pasó antes de que existiera el registro (gen_random_uuid viene incluido desde PostgreSQL 13)
    op.execute("""
        INSERT INTO actividad (id_actividad, id_usuario, tipo, descripcion, tamano_bytes, tipo_mime, creado_en)
        SELECT gen_random_uuid(), id_usuario, 'subida', nombre_original, tamano_bytes, tipo_mime, creado_en
        FROM archivos WHERE eliminado_en IS NULL
    """)
    op.execute("""
        INSERT INTO actividad (id_actividad, id_usuario, tipo, descripcion, tamano_bytes, creado_en)
        SELECT gen_random_uuid(), id_usuario, 'carpeta', nombre, 0, creado_en FROM carpetas
    """)
    op.execute("""
        INSERT INTO actividad (id_actividad, id_usuario, tipo, descripcion, tamano_bytes, creado_en)
        SELECT gen_random_uuid(), s.id_usuario, 'pago', 'Plan ' || pl.nombre || ' (' || s.periodicidad || ')', 0,
               p.fecha_pago
        FROM pagos p
        JOIN suscripciones s ON s.id_suscripcion = p.id_suscripcion
        JOIN planes pl ON pl.id_plan = s.id_plan
        WHERE p.estado = 'aprobado' AND p.fecha_pago IS NOT NULL
    """)

    for tabla in TABLAS:
        op.execute(f'ALTER TABLE public.{tabla} ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    if op.get_bind().dialect.name == 'postgresql':
        for tabla in TABLAS:
            if tabla != 'actividad':
                op.execute(f'ALTER TABLE public.{tabla} DISABLE ROW LEVEL SECURITY')
    op.drop_index(op.f('ix_actividad_creado_en'), table_name='actividad')
    op.drop_index('ix_actividad_usuario_fecha', table_name='actividad')
    op.drop_table('actividad')
