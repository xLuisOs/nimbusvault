"""avance 2: marca y últimos 4 dígitos de la tarjeta en pagos

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-08 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('pagos', sa.Column('marca_tarjeta', sa.String(length=20), nullable=True))
    op.add_column('pagos', sa.Column('ultimos_4', sa.String(length=4), nullable=True))
    op.create_check_constraint('ck_pagos_tipo', 'pagos', "tipo IN ('contratacion','renovacion')")


def downgrade() -> None:
    op.drop_constraint('ck_pagos_tipo', 'pagos', type_='check')
    op.drop_column('pagos', 'ultimos_4')
    op.drop_column('pagos', 'marca_tarjeta')
