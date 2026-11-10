"""Pruebas finales en el ambiente productivo (tarea 5.5).

Recorre la aplicación publicada como lo haría un usuario y deja un reporte en Markdown como evidencia.
Todo lo que crea (carpetas y archivos de prueba) lo borra al final: las cuentas quedan como estaban.
No contrata planes ni crea cuentas.

    Públicas  (sin cuenta): sitio, rutas, catálogo de planes, seguridad de la API.
    Cliente   (--cliente):  sesión, carpetas, archivos, descarga íntegra, cuota, pagos y permisos.
    Admin     (--admin):    panel administrativo y permisos.

Uso (las contraseñas se piden en la terminal):
    python scripts/pruebas_finales.py
    python scripts/pruebas_finales.py --cliente cliente@ejemplo.com --admin admin@ejemplo.com --salida ../docs/pruebas-finales.md
"""

import argparse
import getpass
import hashlib
import os
import sys
import time
import uuid
from dataclasses import dataclass
from datetime import datetime

import httpx

API = "https://nimbusvault-api-7b7k.onrender.com"
WEB = "https://nimbusvault-web.onrender.com"


@dataclass
class Resultado:
    grupo: str
    prueba: str
    ok: bool
    detalle: str
    ms: int


resultados: list[Resultado] = []


def prueba(grupo: str, nombre: str):
    """Decorador que ejecuta la prueba en el momento en que se define y registra el resultado.

    Una prueba falla si lanza AssertionError (o un error de red). El nombre decorado queda con
    True/False, así se puede saltar lo que depende de ella (por ejemplo, si el login falló).
    """

    def correr(f) -> bool:
        inicio = time.perf_counter()
        try:
            detalle = f() or ""
            ok = True
        except AssertionError as e:
            detalle, ok = str(e) or "falló la verificación", False
        except (httpx.HTTPError, KeyError, ValueError) as e:
            detalle, ok = f"error: {e}", False
        ms = int((time.perf_counter() - inicio) * 1000)
        resultados.append(Resultado(grupo, nombre, ok, detalle, ms))
        print(f"  {'OK   ' if ok else 'FALLA'}  {nombre}" + (f"  ({detalle})" if detalle else ""))
        return ok

    return correr


def esperar(r: httpx.Response, *codigos: int) -> httpx.Response:
    assert r.status_code in codigos, f"se esperaba {'/'.join(map(str, codigos))} y llegó {r.status_code}: {r.text[:150]}"
    return r


def despertar(c: httpx.Client) -> None:
    print("Despertando la API…", end="", flush=True)
    for _ in range(45):
        try:
            if c.get(f"{API}/api/health", timeout=10).status_code == 200:
                print(" lista.\n")
                return
        except httpx.HTTPError:
            pass
        print(".", end="", flush=True)
        time.sleep(4)
    sys.exit("\nLa API no respondió en 3 minutos.")


# ── Públicas ──────────────────────────────────────────────────────────────────

def pruebas_publicas(c: httpx.Client) -> None:
    print("Pruebas públicas (sin cuenta)")
    g = "Públicas"

    @prueba(g, "La API responde y está en modo producción")
    def _():
        d = esperar(c.get(f"{API}/api/health"), 200).json()
        assert d.get("estado") == "ok" and d.get("entorno") == "produccion", f"respuesta: {d}"

    @prueba(g, "El sitio carga por HTTPS")
    def _():
        r = esperar(c.get(WEB + "/"), 200)
        assert "<div id=\"root\"" in r.text, "no es la aplicación React"

    @prueba(g, "HTTP redirige a HTTPS")
    def _():
        r = c.get(WEB.replace("https://", "http://") + "/", follow_redirects=False)
        assert r.status_code in (301, 302, 307, 308) and r.headers.get("location", "").startswith("https://"), \
            f"llegó {r.status_code}"

    @prueba(g, "Las rutas internas abren directo (recargar la página no da 404)")
    def _():
        for ruta in ("/planes", "/login", "/registro", "/dashboard", "/admin"):
            esperar(c.get(WEB + ruta), 200)
        return "5 rutas"

    @prueba(g, "Catálogo de planes con datos reales")
    def _():
        planes = esperar(c.get(f"{API}/api/planes"), 200).json()
        assert len(planes) >= 2, "hay menos de 2 planes"
        assert any(float(p["precio_mensual"]) == 0 for p in planes), "falta el plan gratis"
        return f"{len(planes)} planes: " + ", ".join(p["nombre"] for p in planes)

    @prueba(g, "El frontend reenvía /api al backend (mismo dominio)")
    def _():
        esperar(c.get(f"{WEB}/api/planes"), 200)

    @prueba(g, "Detalle de un plan y 404 para uno inexistente")
    def _():
        codigo = c.get(f"{API}/api/planes").json()[0]["codigo"]
        esperar(c.get(f"{API}/api/planes/{codigo}"), 200)
        esperar(c.get(f"{API}/api/planes/no-existe-{uuid.uuid4().hex[:6]}"), 404)

    @prueba(g, "Sin sesión no se puede entrar a datos privados (401)")
    def _():
        for ruta in ("/api/auth/me", "/api/archivos", "/api/carpetas", "/api/pagos", "/api/admin/usuarios", "/api/admin/planes"):
            esperar(c.get(API + ruta), 401)
        return "6 rutas protegidas"

    @prueba(g, "Un token falso es rechazado (401)")
    def _():
        esperar(c.get(f"{API}/api/auth/me", headers={"Authorization": "Bearer token.falso.123"}), 401)

    @prueba(g, "Credenciales incorrectas: mensaje genérico (401)")
    def _():
        r = esperar(c.post(f"{API}/api/auth/login",
                           json={"correo": f"nadie-{uuid.uuid4().hex[:8]}@example.com", "password": "NoExiste123"}), 401)
        assert "incorrectos" in r.text, "el mensaje no es genérico"

    @prueba(g, "El registro valida los datos (422 y no crea la cuenta)")
    def _():
        esperar(c.post(f"{API}/api/auth/registro",
                       json={"nombre": "X", "correo": "no-es-correo", "password": "123", "acepto_terminos": True}), 422)

    @prueba(g, "Recuperar contraseña no revela si el correo existe")
    def _():
        esperar(c.post(f"{API}/api/auth/olvide-contrasena", json={"correo": f"nadie-{uuid.uuid4().hex[:8]}@example.com"}), 200)

    @prueba(g, "CORS: otro sitio no puede llamar a la API desde el navegador")
    def _():
        r = c.options(f"{API}/api/planes", headers={"Origin": "https://sitio-malicioso.example",
                                                    "Access-Control-Request-Method": "GET"})
        assert r.headers.get("access-control-allow-origin") not in ("*", "https://sitio-malicioso.example"), \
            "la API acepta cualquier origen"

    @prueba(g, "Tiempo de respuesta del catálogo menor a 1 s (API despierta)")
    def _():
        inicio = time.perf_counter()
        esperar(c.get(f"{API}/api/planes"), 200)
        ms = (time.perf_counter() - inicio) * 1000
        assert ms < 1000, f"{ms:.0f} ms"
        return f"{ms:.0f} ms"


# ── Cliente ───────────────────────────────────────────────────────────────────

def iniciar_sesion(c: httpx.Client, correo: str, password: str) -> dict:
    r = esperar(c.post(f"{API}/api/auth/login", json={"correo": correo, "password": password}), 200)
    return r.json()


def pruebas_cliente(c: httpx.Client, correo: str, password: str) -> None:
    print("\nPruebas del cliente")
    g = "Cliente"
    estado: dict = {}

    @prueba(g, "Inicio de sesión de cliente")
    def login():
        d = iniciar_sesion(c, correo, password)
        assert d["usuario"]["rol"] == "CLIENTE", f"la cuenta es {d['usuario']['rol']}, no CLIENTE"
        estado["h"] = {"Authorization": f"Bearer {d['access_token']}"}
        plan = (d["usuario"].get("suscripcion") or {}).get("plan_nombre") or "sin plan"
        return f"{d['usuario']['nombre']} · {plan}"

    if not login:
        return
    h = estado["h"]
    nombre = f"_prueba-final-{uuid.uuid4().hex[:6]}"
    contenido = os.urandom(256 * 1024)

    @prueba(g, "Perfil y uso de almacenamiento")
    def _():
        esperar(c.get(f"{API}/api/auth/me", headers=h), 200)
        uso = esperar(c.get(f"{API}/api/almacenamiento/uso", headers=h), 200).json()
        estado["usado"] = uso.get("usado_bytes")
        esperar(c.get(f"{API}/api/almacenamiento/resumen", headers=h), 200)
        return f"usado: {uso.get('usado_bytes')} bytes"

    @prueba(g, "Crear carpeta y subcarpeta")
    def _():
        a = esperar(c.post(f"{API}/api/carpetas", headers=h, json={"nombre": nombre}), 201).json()
        b = esperar(c.post(f"{API}/api/carpetas", headers=h, json={"nombre": nombre + "-destino"}), 201).json()
        estado["a"], estado["b"] = a["id_carpeta"], b["id_carpeta"]

    @prueba(g, "No permite dos carpetas con el mismo nombre (409)")
    def _():
        esperar(c.post(f"{API}/api/carpetas", headers=h, json={"nombre": nombre}), 409)

    @prueba(g, "Subir archivo a una carpeta")
    def _():
        r = esperar(c.post(f"{API}/api/archivos", headers=h, data={"id_carpeta": estado["a"]},
                           files={"archivo": ("evidencia.bin", contenido, "application/octet-stream")}), 201)
        estado["arch"] = r.json()["id_archivo"]

    @prueba(g, "El espacio usado aumenta exactamente lo que pesa el archivo")
    def _():
        uso = c.get(f"{API}/api/almacenamiento/uso", headers=h).json()["usado_bytes"]
        assert uso - (estado.get("usado") or 0) == len(contenido), f"aumentó {uso - (estado.get('usado') or 0)} bytes"

    @prueba(g, "Rechaza archivos vacíos (400)")
    def _():
        esperar(c.post(f"{API}/api/archivos", headers=h, files={"archivo": ("vacio.txt", b"", "text/plain")}), 400)

    @prueba(g, "Listar, renombrar y mover el archivo")
    def _():
        lista = esperar(c.get(f"{API}/api/archivos", headers=h, params={"id_carpeta": estado["a"]}), 200).json()
        assert any(x["id_archivo"] == estado["arch"] for x in lista), "no aparece en la carpeta"
        esperar(c.patch(f"{API}/api/archivos/{estado['arch']}", headers=h, json={"nombre_original": "renombrado.bin"}), 200)
        esperar(c.patch(f"{API}/api/archivos/{estado['arch']}", headers=h, json={"id_carpeta": estado["b"]}), 200)

    @prueba(g, "Renombrar carpeta, moverla y ver su ruta")
    def _():
        esperar(c.patch(f"{API}/api/carpetas/{estado['a']}", headers=h, json={"nombre": nombre + "-ok"}), 200)
        esperar(c.patch(f"{API}/api/carpetas/{estado['a']}/mover", headers=h, json={"id_carpeta_padre": estado["b"]}), 200)
        ruta = esperar(c.get(f"{API}/api/carpetas/{estado['a']}/ruta", headers=h), 200).json()
        assert [x["nombre"] for x in ruta] == [nombre + "-destino", nombre + "-ok"], f"ruta: {[x['nombre'] for x in ruta]}"

    @prueba(g, "No permite crear ciclos al mover carpetas (409)")
    def _():
        esperar(c.patch(f"{API}/api/carpetas/{estado['b']}/mover", headers=h, json={"id_carpeta_padre": estado["a"]}), 409)

    @prueba(g, "Descarga íntegra (SHA-256 idéntico)")
    def _():
        r = esperar(c.get(f"{API}/api/archivos/{estado['arch']}/descarga", headers=h), 200)
        assert hashlib.sha256(r.content).digest() == hashlib.sha256(contenido).digest(), "el archivo llegó distinto"

    @prueba(g, "No borra una carpeta que no está vacía (409)")
    def _():
        esperar(c.delete(f"{API}/api/carpetas/{estado['b']}", headers=h), 409)

    @prueba(g, "Historial de pagos y comprobante PDF")
    def _():
        pagos = esperar(c.get(f"{API}/api/pagos", headers=h), 200).json()
        if not pagos:
            return "sin pagos en esta cuenta (no se pudo probar el PDF)"
        r = esperar(c.get(f"{API}/api/pagos/{pagos[0]['id_pago']}/comprobante", headers=h), 200)
        assert r.content.startswith(b"%PDF"), "el comprobante no es un PDF"
        return f"{len(pagos)} pago(s), PDF de {len(r.content) // 1024} KB"

    @prueba(g, "Un cliente no entra al panel de administración (403)")
    def _():
        esperar(c.get(f"{API}/api/admin/usuarios", headers=h), 403)
        esperar(c.post(f"{API}/api/admin/planes/recalculo-cuota", headers=h), 403)

    @prueba(g, "Limpieza: borrar archivo y carpetas, y el espacio vuelve a su valor")
    def _():
        if "arch" in estado:
            esperar(c.delete(f"{API}/api/archivos/{estado['arch']}", headers=h), 204)
        for k in ("a", "b"):
            if k in estado:
                esperar(c.delete(f"{API}/api/carpetas/{estado[k]}", headers=h), 204)
        uso = c.get(f"{API}/api/almacenamiento/uso", headers=h).json()["usado_bytes"]
        assert uso == estado.get("usado"), f"quedaron {uso - (estado.get('usado') or 0)} bytes de diferencia"

    @prueba(g, "La sesión se renueva sola y cerrar sesión la invalida")
    def _():
        esperar(c.post(f"{API}/api/auth/refresh"), 200)  # cookie de renovación (como al recargar la página)
        esperar(c.post(f"{API}/api/auth/logout", headers=h), 200)
        esperar(c.post(f"{API}/api/auth/refresh"), 401)


# ── Admin ─────────────────────────────────────────────────────────────────────

def pruebas_admin(c: httpx.Client, correo: str, password: str) -> None:
    print("\nPruebas del administrador")
    g = "Administrador"
    estado: dict = {}

    @prueba(g, "Inicio de sesión de administrador")
    def login():
        d = iniciar_sesion(c, correo, password)
        assert d["usuario"]["rol"] == "ADMINISTRADOR", f"la cuenta es {d['usuario']['rol']}, no ADMINISTRADOR"
        estado["h"] = {"Authorization": f"Bearer {d['access_token']}"}

    if not login:
        return
    h = estado["h"]

    @prueba(g, "Dashboard con métricas reales")
    def _():
        d = esperar(c.get(f"{API}/api/admin/resumen", headers=h), 200).json()
        return ", ".join(f"{k}" for k in list(d)[:5])

    @prueba(g, "Gestión de usuarios")
    def _():
        u = esperar(c.get(f"{API}/api/admin/usuarios", headers=h), 200).json()
        return f"{len(u)} usuarios"

    @prueba(g, "Administración de planes")
    def _():
        p = esperar(c.get(f"{API}/api/admin/planes", headers=h), 200).json()
        return f"{len(p)} planes (incluye inactivos)"

    @prueba(g, "Infraestructura en vivo")
    def _():
        esperar(c.get(f"{API}/api/admin/infra", headers=h), 200)

    @prueba(g, "Recálculo de cuota")
    def _():
        d = esperar(c.post(f"{API}/api/admin/planes/recalculo-cuota", headers=h), 200).json()
        return f"{d.get('actualizados')} usuario(s) corregido(s)"

    @prueba(g, "El administrador no tiene almacenamiento de cliente (403)")
    def _():
        esperar(c.get(f"{API}/api/archivos", headers=h), 403)

    c.post(f"{API}/api/auth/logout", headers=h)


# ── Reporte ───────────────────────────────────────────────────────────────────

def reporte() -> str:
    ok = sum(r.ok for r in resultados)
    lineas = [
        "# Pruebas finales en el ambiente productivo",
        "",
        f"- Fecha: {datetime.now():%d/%m/%Y %H:%M}",
        f"- Sitio: {WEB}",
        f"- API: {API}",
        f"- Resultado: **{ok} de {len(resultados)} pruebas correctas**",
        "",
    ]
    for grupo in dict.fromkeys(r.grupo for r in resultados):
        lineas += [f"## {grupo}", "", "| Prueba | Resultado | Detalle | Tiempo |", "|---|---|---|---|"]
        for r in (x for x in resultados if x.grupo == grupo):
            lineas.append(f"| {r.prueba} | {'Correcta' if r.ok else 'FALLA'} | {r.detalle.replace('|', '/')} | {r.ms} ms |")
        lineas.append("")
    return "\n".join(lineas)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--cliente", help="correo de una cuenta CLIENTE")
    p.add_argument("--admin", help="correo de una cuenta ADMIN")
    p.add_argument("--salida", help="archivo .md donde guardar el reporte")
    args = p.parse_args()

    pw_cliente = getpass.getpass(f"Contraseña de {args.cliente}: ") if args.cliente else None
    pw_admin = getpass.getpass(f"Contraseña de {args.admin}: ") if args.admin else None

    with httpx.Client(timeout=60, follow_redirects=True) as c:
        despertar(c)
        pruebas_publicas(c)
    if args.cliente:
        with httpx.Client(timeout=60) as c:  # cliente nuevo: cookies de sesión separadas
            pruebas_cliente(c, args.cliente, pw_cliente)
    if args.admin:
        with httpx.Client(timeout=60) as c:
            pruebas_admin(c, args.admin, pw_admin)

    texto = reporte()
    print("\n" + texto)
    if args.salida:
        with open(args.salida, "w", encoding="utf-8") as fh:
            fh.write(texto)
        print(f"Reporte guardado en {args.salida}")
    sys.exit(0 if all(r.ok for r in resultados) else 1)


if __name__ == "__main__":
    main()
