"""crear tablas de pagos

Revision ID: 6b11160f63ae
Revises: ca3c8c7188b1
Create Date: 2026-10-07
"""

from alembic import op
import sqlalchemy as sa


revision = "6b11160f63ae"
down_revision = "ca3c8c7188b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "metodos_pago",
        sa.Column("id_metodo_pago", sa.Uuid(), nullable=False),
        sa.Column("marca", sa.String(length=20), nullable=False),
        sa.Column("ultimos_4", sa.String(length=4), nullable=False),
        sa.PrimaryKeyConstraint("id_metodo_pago"),
    )

    op.create_table(
        "pagos",
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("id_pago", sa.Uuid(), nullable=False),
        sa.Column("numero_comprobante", sa.String(length=40), nullable=False),
        sa.Column("id_usuario", sa.Uuid(), nullable=False),
        sa.Column("id_suscripcion", sa.Uuid(), nullable=False),
        sa.Column("id_metodo_pago", sa.Uuid(), nullable=False),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("estado", sa.String(length=20), nullable=False),
        sa.Column("monto", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("id_plan", sa.Uuid(), nullable=False),
        sa.CheckConstraint(
            "tipo IN ('contratacion','renovacion')",
            name="ck_pagos_tipo",
        ),
        sa.CheckConstraint(
            "estado IN ('aprobado','rechazado')",
            name="ck_pagos_estado",
        ),
        sa.CheckConstraint(
            "monto >= 0",
            name="ck_pagos_monto",
        ),
        sa.ForeignKeyConstraint(
            ["id_usuario"],
            ["usuarios.id_usuario"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["id_suscripcion"],
            ["suscripciones.id_suscripcion"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["id_metodo_pago"],
            ["metodos_pago.id_metodo_pago"],
        ),
        sa.ForeignKeyConstraint(
            ["id_plan"],
            ["planes.id_plan"],
        ),
        sa.PrimaryKeyConstraint("id_pago"),
        sa.UniqueConstraint("numero_comprobante"),
    )

    op.create_index(
        "ix_pagos_numero_comprobante",
        "pagos",
        ["numero_comprobante"],
        unique=False,
    )
    op.create_index(
        "ix_pagos_id_usuario",
        "pagos",
        ["id_usuario"],
        unique=False,
    )
    op.create_index(
        "ix_pagos_id_suscripcion",
        "pagos",
        ["id_suscripcion"],
        unique=False,
    )
    op.create_index(
        "ix_pagos_id_metodo_pago",
        "pagos",
        ["id_metodo_pago"],
        unique=False,
    )
    op.create_index(
        "ix_pagos_id_plan",
        "pagos",
        ["id_plan"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pagos_id_plan", table_name="pagos")
    op.drop_index("ix_pagos_id_metodo_pago", table_name="pagos")
    op.drop_index("ix_pagos_id_suscripcion", table_name="pagos")
    op.drop_index("ix_pagos_id_usuario", table_name="pagos")
    op.drop_index("ix_pagos_numero_comprobante", table_name="pagos")
    op.drop_table("pagos")
    op.drop_table("metodos_pago")