import { api, apiBlob, apiSubir } from "./client";
import type { Archivo, Carpeta, RutaItem, UsoAlmacenamiento } from "@/types";

// Sin id de carpeta, los listados devuelven la raíz del usuario
const conCarpeta = (clave: string, id: string | null) => (id ? `?${clave}=${encodeURIComponent(id)}` : "");

export const almacenamientoApi = {
  uso: () => api<UsoAlmacenamiento>("/almacenamiento/uso"),

  // Carpetas
  listarCarpetas: (idPadre: string | null) => api<Carpeta[]>(`/carpetas${conCarpeta("id_carpeta_padre", idPadre)}`),
  crearCarpeta: (nombre: string, idPadre: string | null) =>
    api<Carpeta>("/carpetas", { method: "POST", body: { nombre, id_carpeta_padre: idPadre } }),
  renombrarCarpeta: (id: string, nombre: string) =>
    api<Carpeta>(`/carpetas/${id}`, { method: "PATCH", body: { nombre } }),
  ruta: (id: string) => api<RutaItem[]>(`/carpetas/${id}/ruta`),
  eliminarCarpeta: (id: string) => api<void>(`/carpetas/${id}`, { method: "DELETE" }),

  // Archivos
  listarArchivos: (idCarpeta: string | null) => api<Archivo[]>(`/archivos${conCarpeta("id_carpeta", idCarpeta)}`),
  subir: (archivo: File, idCarpeta: string | null, alAvanzar?: (pct: number) => void) => {
    const datos = new FormData();
    datos.append("archivo", archivo);
    if (idCarpeta) datos.append("id_carpeta", idCarpeta);
    return apiSubir<Archivo>("/archivos", datos, alAvanzar);
  },
  descargar: (id: string) => apiBlob(`/archivos/${id}/descarga`),
  renombrarArchivo: (id: string, nombre: string) =>
    api<Archivo>(`/archivos/${id}`, { method: "PATCH", body: { nombre_original: nombre } }),
  /** `null` mueve el archivo a la raíz. */
  moverArchivo: (id: string, idCarpeta: string | null) =>
    api<Archivo>(`/archivos/${id}`, { method: "PATCH", body: { id_carpeta: idCarpeta } }),
  eliminarArchivo: (id: string) => api<void>(`/archivos/${id}`, { method: "DELETE" }),
};
