import type { Evento } from "@/types";

/** Cómo se cuenta cada evento del registro de actividad (dashboard y consumo). */
export const EVENTO_META: Record<Evento["tipo"], { verbo: string; etiqueta: string; color: string; icon: string }> = {
  subida:      { verbo: "subiste",            etiqueta: "Subiste",      color: "#2E9BFF", icon: "upload" },
  descarga:    { verbo: "descargaste",        etiqueta: "Descargaste",  color: "#A78BFA", icon: "download" },
  eliminacion: { verbo: "eliminaste",         etiqueta: "Eliminaste",   color: "#FF6B6B", icon: "trash" },
  carpeta:     { verbo: "creaste la carpeta", etiqueta: "Creaste la carpeta", color: "#F59E0B", icon: "folder-plus" },
  pago:        { verbo: "contrataste el",     etiqueta: "Contrataste el", color: "#00C896", icon: "card" },
};
