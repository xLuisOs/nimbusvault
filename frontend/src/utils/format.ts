// Todo el sistema maneja dólares (USD). Los pagos son simulados.
export function formatoDolares(valor: string | number): string {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export function formatoGB(gb: number): string {
  return gb >= 1024 ? `${+(gb / 1024).toFixed(1)} TB` : `${gb} GB`;
}

export function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}
