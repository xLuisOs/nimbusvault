"""Genera el diagrama ER de NimbusVault con Graphviz.

    python docs/diagramas/er.py      (necesita graphviz: `dot`)

Las tablas marcadas avance=2 todavía no existen en la BD; se crean en el Avance 2.
Si cambian un modelo en backend/app/modules/*/models.py, actualicen también este archivo.
"""
import subprocess
from pathlib import Path

AQUI = Path(__file__).parent

# (nombre, color, avance, [(marca, columna, tipo)])
TABLAS = [
    ("roles", "#7C4DFF", 1, [
        ("PK", "id_rol", "SMALLINT"),
        ("UQ", "nombre", "VARCHAR(30)"),
        ("", "descripcion", "VARCHAR(200)"),
    ]),
    ("usuarios", "#1A5FD6", 1, [
        ("PK", "id_usuario", "UUID"),
        ("FK", "id_rol", "SMALLINT"),
        ("", "nombre", "VARCHAR(120)"),
        ("UQ", "correo", "VARCHAR(255)"),
        ("", "password_hash", "VARCHAR(100)"),
        ("", "estado", "VARCHAR(20)"),
        ("", "correo_verificado_en", "TIMESTAMPTZ"),
        ("", "acepto_terminos_en", "TIMESTAMPTZ"),
        ("", "ultimo_acceso", "TIMESTAMPTZ"),
        ("", "almacenamiento_usado_bytes", "BIGINT"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "actualizado_en", "TIMESTAMPTZ"),
    ]),
    ("tokens_usuario", "#C2410C", 1, [
        ("PK", "id_token", "UUID"),
        ("FK", "id_usuario", "UUID"),
        ("", "tipo", "VARCHAR(20)"),
        ("UQ", "token_hash", "VARCHAR(64)"),
        ("", "expira_en", "TIMESTAMPTZ"),
        ("", "usado_en", "TIMESTAMPTZ"),
        ("", "creado_en", "TIMESTAMPTZ"),
    ]),
    ("sesiones", "#0E7490", 1, [
        ("PK", "id_sesion", "UUID"),
        ("FK", "id_usuario", "UUID"),
        ("UQ", "refresh_token_hash", "VARCHAR(64)"),
        ("", "ip", "VARCHAR(45)"),
        ("", "user_agent", "VARCHAR(300)"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "expira_en", "TIMESTAMPTZ"),
        ("", "revocada_en", "TIMESTAMPTZ"),
    ]),
    ("planes", "#B7470B", 1, [
        ("PK", "id_plan", "UUID"),
        ("UQ", "codigo", "VARCHAR(40)"),
        ("", "nombre", "VARCHAR(60)"),
        ("", "descripcion", "VARCHAR(300)"),
        ("", "precio_mensual", "NUMERIC(10,2) USD"),
        ("", "descuento_anual_pct", "SMALLINT"),
        ("", "almacenamiento_gb", "INT"),
        ("", "vigencia_dias", "INT"),
        ("", "destacado", "BOOLEAN"),
        ("", "orden", "SMALLINT"),
        ("", "color", "VARCHAR(7)"),
        ("", "activo", "BOOLEAN"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "actualizado_en", "TIMESTAMPTZ"),
    ]),
    ("plan_caracteristicas", "#A16207", 1, [
        ("PK", "id_caracteristica", "UUID"),
        ("FK", "id_plan", "UUID"),
        ("", "descripcion", "VARCHAR(120)"),
        ("", "orden", "SMALLINT"),
    ]),
    ("suscripciones", "#B3261E", 1, [
        ("PK", "id_suscripcion", "UUID"),
        ("FK", "id_usuario", "UUID"),
        ("FK", "id_plan", "UUID"),
        ("", "fecha_inicio", "TIMESTAMPTZ"),
        ("", "fecha_fin", "TIMESTAMPTZ"),
        ("", "estado", "VARCHAR(20)"),
        ("", "periodicidad", "VARCHAR(10)"),
        ("", "precio_contratado", "NUMERIC(10,2) USD"),
        ("", "renovacion_automatica", "BOOLEAN"),
        ("", "cancelada_en", "TIMESTAMPTZ"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "actualizado_en", "TIMESTAMPTZ"),
    ]),
    ("pagos", "#5B21B6", 2, [
        ("PK", "id_pago", "UUID"),
        ("FK", "id_suscripcion", "UUID"),
        ("UQ", "numero_comprobante", "VARCHAR(30)"),
        ("", "tipo", "VARCHAR(20)"),
        ("", "monto", "NUMERIC(10,2) USD"),
        ("", "metodo_simulado", "VARCHAR(40)"),
        ("", "estado", "VARCHAR(15)"),
        ("", "fecha_pago", "TIMESTAMPTZ"),
    ]),
    ("carpetas", "#1E73E8", 2, [
        ("PK", "id_carpeta", "UUID"),
        ("FK", "id_usuario", "UUID"),
        ("FK", "id_carpeta_padre", "UUID (nulo = raíz)"),
        ("", "nombre", "VARCHAR(120)"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "actualizado_en", "TIMESTAMPTZ"),
    ]),
    ("archivos", "#0B8F55", 2, [
        ("PK", "id_archivo", "UUID"),
        ("FK", "id_usuario", "UUID"),
        ("FK", "id_carpeta", "UUID (nulo = raíz)"),
        ("", "nombre_original", "VARCHAR(255)"),
        ("UQ", "clave_objeto", "VARCHAR(255)"),
        ("", "tipo_mime", "VARCHAR(100)"),
        ("", "tamano_bytes", "BIGINT"),
        ("", "creado_en", "TIMESTAMPTZ"),
        ("", "actualizado_en", "TIMESTAMPTZ"),
        ("", "eliminado_en", "TIMESTAMPTZ"),
    ]),
]

UNO = "teetee"        # exactamente uno
CERO_UNO = "teeodot"  # cero o uno
MUCHOS = "crowodot"   # cero o muchos

# (padre, hijo, etiqueta, lado_padre)
RELACIONES = [
    ("roles", "usuarios", "tiene", UNO),
    ("usuarios", "tokens_usuario", "recibe", UNO),
    ("usuarios", "sesiones", "abre", UNO),
    ("usuarios", "suscripciones", "contrata", UNO),
    ("planes", "suscripciones", "define", UNO),
    ("planes", "plan_caracteristicas", "muestra", UNO),
    ("suscripciones", "pagos", "registra", UNO),
    ("usuarios", "carpetas", "organiza", UNO),
    ("usuarios", "archivos", "sube", UNO),
    ("carpetas", "archivos", "contiene", CERO_UNO),
    ("carpetas", "carpetas", "subcarpeta de", CERO_UNO),
]

COLOR_MARCA = {"PK": "#B91C1C", "FK": "#1D4ED8", "UQ": "#7C3AED"}
FUENTE = "DejaVu Sans"


def _clarito(hex_color: str) -> str:
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
    r, g, b = (int(c + (255 - c) * 0.93) for c in (r, g, b))
    return f"#{r:02X}{g:02X}{b:02X}"


def tabla(nombre, color, avance, columnas):
    titulo = nombre if avance == 1 else f"{nombre}  <FONT POINT-SIZE='9'>· Avance 2</FONT>"
    borde = "" if avance == 1 else ' STYLE="dashed"'
    filas = [f'<TR><TD COLSPAN="3" BGCOLOR="{color}" ALIGN="CENTER"><FONT COLOR="white" POINT-SIZE="12"><B>{titulo}</B></FONT></TD></TR>']
    for marca, col, tipo in columnas:
        m = f'<FONT COLOR="{COLOR_MARCA.get(marca, "black")}" POINT-SIZE="9"><B>{marca}</B></FONT>' if marca else ""
        filas.append(
            f'<TR><TD ALIGN="LEFT" WIDTH="26">{m}</TD>'
            f'<TD ALIGN="LEFT"><FONT POINT-SIZE="10">{col}</FONT></TD>'
            f'<TD ALIGN="LEFT"><FONT POINT-SIZE="8.5" COLOR="#475569">{tipo}</FONT></TD></TR>'
        )
    return (f'  {nombre} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" '
            f'COLOR="{color}" BGCOLOR="{_clarito(color)}"{borde}>{"".join(filas)}</TABLE>>];')


def generar() -> str:
    out = [
        "digraph ER {",
        f'  graph [fontname="{FUENTE}", labelloc=t, fontsize=22, pad=0.4, nodesep=0.6, ranksep=0.9, '
        f'label=<Modelo Entidad-Relación — NimbusVault (PostgreSQL)<BR/><FONT POINT-SIZE="11" COLOR="#64748B">'
        f'Tablas con borde continuo: ya existen (migración 0001). Borde punteado: se crean en el Avance 2.</FONT><BR/> >];',
        f'  node [shape=plaintext, fontname="{FUENTE}"];',
        f'  edge [fontname="{FUENTE}", fontsize=9, color="#475569", fontcolor="#334155", dir=both, penwidth=1.2];',
    ]
    for t in TABLAS:
        out.append(tabla(*t))
    for padre, hijo, etiqueta, lado_padre in RELACIONES:
        extra = ', tailport=ne, headport=se, minlen=2' if padre == hijo else ""
        out.append(f'  {padre} -> {hijo} [label="  {etiqueta}", arrowtail={lado_padre}, arrowhead={MUCHOS}{extra}];')

    notas = [
        "Todos los montos están en dólares (USD)",
        "Los pagos son simulados: no hay cobros reales ni",
        "   se guardan datos de tarjeta",
        "Un usuario solo puede tener UNA suscripción activa",
        "   (índice único parcial WHERE estado = 'activa')",
        "suscripciones.precio_contratado guarda lo que se pagó;",
        "   no cambia si el admin edita el precio del plan",
        "UQ (id_usuario, id_carpeta_padre, nombre) en carpetas",
        "Tokens y refresh tokens se guardan hasheados (SHA-256)",
        "CHECK en estados, precios ≥ 0, fecha_fin &gt; fecha_inicio",
    ]
    filas_notas = "".join(f'<TR><TD ALIGN="LEFT"><FONT POINT-SIZE="10">{n if n.startswith(" ") else "• " + n}</FONT></TD></TR>' for n in notas)
    out.append(
        '  notas [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" COLOR="#94A3B8" BGCOLOR="#F8FAFC">'
        '<TR><TD ALIGN="LEFT"><B>Reglas que no se ven en las líneas</B></TD></TR>' + filas_notas + '</TABLE>>];'
    )
    out.append(
        '  leyenda [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" COLOR="#94A3B8" BGCOLOR="white">'
        '<TR><TD COLSPAN="2" ALIGN="LEFT"><B>Leyenda</B></TD></TR>'
        '<TR><TD ALIGN="LEFT"><FONT COLOR="#B91C1C"><B>PK</B></FONT></TD><TD ALIGN="LEFT">Clave primaria</TD></TR>'
        '<TR><TD ALIGN="LEFT"><FONT COLOR="#1D4ED8"><B>FK</B></FONT></TD><TD ALIGN="LEFT">Clave foránea</TD></TR>'
        '<TR><TD ALIGN="LEFT"><FONT COLOR="#7C3AED"><B>UQ</B></FONT></TD><TD ALIGN="LEFT">Valor único</TD></TR>'
        '<TR><TD ALIGN="LEFT">─┼┼</TD><TD ALIGN="LEFT">Uno (1)</TD></TR>'
        '<TR><TD ALIGN="LEFT">─○┼</TD><TD ALIGN="LEFT">Cero o uno (0..1)</TD></TR>'
        '<TR><TD ALIGN="LEFT">─○&lt;</TD><TD ALIGN="LEFT">Cero o muchos (0..N)</TD></TR>'
        '</TABLE>>];'
    )
    out.append("  { rank=same; roles; planes; }")
    out.append("  { rank=same; notas; leyenda; }")
    out.append("  pagos -> notas [style=invis, dir=none]; archivos -> leyenda [style=invis, dir=none];")
    out.append("}")
    return "\n".join(out)


if __name__ == "__main__":
    dot = generar()
    (AQUI / "er.dot").write_text(dot, encoding="utf-8")
    for fmt in ("png", "svg"):
        args = ["dot", f"-T{fmt}", str(AQUI / "er.dot"), "-o", str(AQUI / f"er-nimbusvault.{fmt}")]
        if fmt == "png":
            args.insert(1, "-Gdpi=150")
        subprocess.run(args, check=True)
    print("Listo: docs/diagramas/er-nimbusvault.png y .svg")
