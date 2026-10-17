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

export function formatoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ["KB", "MB", "GB", "TB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) { valor /= 1024; i++; }
  return `${valor >= 100 ? Math.round(valor) : +valor.toFixed(1)} ${unidades[i]}`;
}

/** "Hoy, 10:32", "Ayer, 16:05" o "8 mar 2026" (lo que se cuenta antes de la coma sirve como fecha corta). */
export function formatoModificado(iso: string): string {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" });
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return fecha.toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}
