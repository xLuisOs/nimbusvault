"""Prueba de carga (RNF / tarea 4.7): subir un archivo de 50 MB en menos de 10 s.

Sube un archivo aleatorio de 50 MB con una cuenta CLIENTE, lo descarga para comprobar que llegó íntegro
y lo borra al final, así la cuenta queda como estaba. Repite la prueba varias veces y resume los tiempos.

Uso (la contraseña se pide en la terminal, no se escribe en el comando):
    python scripts/prueba_carga.py --url https://nimbusvault-api-7b7k.onrender.com --correo cliente@ejemplo.com
    python scripts/prueba_carga.py --url http://localhost:8000 --correo cliente@ejemplo.com --rondas 5 --salida resultado.md

El tiempo medido incluye la red entre esta computadora y la API, igual que lo vive un usuario real.
"""

import argparse
import getpass
import hashlib
import io
import os
import statistics
import sys
import time
from datetime import datetime

import httpx

MB = 1024 * 1024
LIMITE_SEGUNDOS = 10.0


def despertar(cliente: httpx.Client) -> None:
    """En el plan gratis de Render la API duerme: la despertamos antes de medir para no contar el arranque."""
    print("Despertando la API…", end="", flush=True)
    for _ in range(40):
        try:
            if cliente.get("/api/health", timeout=10).status_code == 200:
                print(" lista.")
                return
        except httpx.HTTPError:
            pass
        print(".", end="", flush=True)
        time.sleep(3)
    sys.exit("\nLa API no respondió en 2 minutos.")


def iniciar_sesion(cliente: httpx.Client, correo: str, password: str) -> None:
    r = cliente.post("/api/auth/login", json={"correo": correo, "password": password})
    if r.status_code != 200:
        sys.exit(f"No se pudo iniciar sesión ({r.status_code}): {r.text}")
    datos = r.json()
    if datos["usuario"]["rol"] != "CLIENTE":
        sys.exit("La cuenta debe ser de rol CLIENTE (los administradores no suben archivos).")
    cliente.headers["Authorization"] = f"Bearer {datos['access_token']}"


def ronda(cliente: httpx.Client, n: int, tam_mb: int) -> dict:
    contenido = os.urandom(tam_mb * MB)
    huella = hashlib.sha256(contenido).hexdigest()
    nombre = f"prueba-carga-{tam_mb}MB-{n}.bin"

    inicio = time.perf_counter()
    r = cliente.post("/api/archivos", files={"archivo": (nombre, io.BytesIO(contenido), "application/octet-stream")})
    subida = time.perf_counter() - inicio
    if r.status_code != 201:
        sys.exit(f"La subida falló ({r.status_code}): {r.text}")
    id_archivo = r.json()["id_archivo"]

    try:
        inicio = time.perf_counter()
        d = cliente.get(f"/api/archivos/{id_archivo}/descarga")
        descarga = time.perf_counter() - inicio
        integro = d.status_code == 200 and hashlib.sha256(d.content).hexdigest() == huella
    finally:
        cliente.delete(f"/api/archivos/{id_archivo}")  # la cuenta queda como estaba

    return {"subida": subida, "descarga": descarga, "integro": integro, "mbps": tam_mb * 8 / subida}


def resumen_markdown(url: str, tam_mb: int, filas: list[dict]) -> str:
    subidas = [f["subida"] for f in filas]
    lineas = [
        f"# Prueba de carga: archivo de {tam_mb} MB",
        "",
        f"- Fecha: {datetime.now():%d/%m/%Y %H:%M}",
        f"- API: {url}",
        f"- Criterio: subir el archivo en menos de {LIMITE_SEGUNDOS:.0f} s",
        "",
        "| Ronda | Subida (s) | Velocidad (Mbps) | Descarga (s) | Íntegro | Resultado |",
        "|---|---|---|---|---|---|",
    ]
    for i, f in enumerate(filas, 1):
        ok = "Cumple" if f["subida"] < LIMITE_SEGUNDOS and f["integro"] else "No cumple"
        lineas.append(f"| {i} | {f['subida']:.2f} | {f['mbps']:.1f} | {f['descarga']:.2f} | "
                      f"{'Sí' if f['integro'] else 'No'} | {ok} |")
    lineas += [
        "",
        f"Promedio de subida: **{statistics.mean(subidas):.2f} s** (mínimo {min(subidas):.2f} s, máximo {max(subidas):.2f} s).",
        f"Resultado: **{'CUMPLE' if all(s < LIMITE_SEGUNDOS for s in subidas) and all(f['integro'] for f in filas) else 'NO CUMPLE'}**.",
    ]
    return "\n".join(lineas) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--url", required=True, help="URL base de la API, sin /api")
    p.add_argument("--correo", required=True, help="Cuenta CLIENTE con al menos 50 MB libres")
    p.add_argument("--rondas", type=int, default=3)
    p.add_argument("--mb", type=int, default=50, help="Tamaño del archivo (máximo permitido: 50)")
    p.add_argument("--salida", help="Archivo .md donde guardar el resultado como evidencia")
    args = p.parse_args()

    password = os.environ.get("NV_PASSWORD") or getpass.getpass(f"Contraseña de {args.correo}: ")
    with httpx.Client(base_url=args.url.rstrip("/"), timeout=120) as cliente:
        despertar(cliente)
        iniciar_sesion(cliente, args.correo, password)
        filas = []
        for n in range(1, args.rondas + 1):
            f = ronda(cliente, n, args.mb)
            filas.append(f)
            print(f"Ronda {n}: subida {f['subida']:.2f} s ({f['mbps']:.1f} Mbps), "
                  f"descarga {f['descarga']:.2f} s, íntegro: {'sí' if f['integro'] else 'NO'}")

    texto = resumen_markdown(args.url, args.mb, filas)
    print("\n" + texto)
    if args.salida:
        with open(args.salida, "w", encoding="utf-8") as fh:
            fh.write(texto)
        print(f"Resultado guardado en {args.salida}")


if __name__ == "__main__":
    main()
