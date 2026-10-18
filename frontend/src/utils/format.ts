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

/** Minutos respecto a UTC del navegador (Guatemala: -360), para que el backend agrupe por días y meses locales. */
export function desfaseMinutos(): number {
  return -new Date().getTimezoneOffset();
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-10" → "Oct" */
export function nombreMes(aaaaMm: string): string {
  const m = MESES_CORTOS[Number(aaaaMm.slice(5, 7)) - 1] ?? aaaaMm;
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** "2026-10-18" → "18 oct" */
export function diaCorto(aaaaMmDd: string): string {
  return `${Number(aaaaMmDd.slice(8, 10))} ${MESES_CORTOS[Number(aaaaMmDd.slice(5, 7)) - 1] ?? ""}`;
}

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días" o la fecha corta. */
export function haceCuanto(iso: string): string {
  const seg = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seg < 60) return "hace un momento";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  const dias = Math.floor(seg / 86400);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" });
}

/** Variación contra el periodo anterior, lista para mostrar: "+3 vs. mes anterior". */
export function variacion(actual: number, anterior: number, sufijo = "vs. mes anterior"): string {
  const d = actual - anterior;
  return `${d > 0 ? "↑ " : d < 0 ? "↓ " : ""}${d > 0 ? "+" : ""}${d} ${sufijo}`;
}
