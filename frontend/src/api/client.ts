// Cliente HTTP único para toda la app.
// - Agrega el access token (JWT) a cada petición.
// - Si la API responde 401, intenta renovar la sesión con la cookie de refresh y reintenta una vez.
// - JSON por defecto; FormData para subir archivos y Blob para descargarlos.

const BASE = import.meta.env.VITE_API_URL ?? "/api";

let accessToken: string | null = null;
let alExpirarSesion: (() => void) | null = null;
let refrescando: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onSesionExpirada(cb: () => void) {
  alExpirarSesion = cb;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalle?: unknown) {
    super(message);
  }
}

// FastAPI devuelve "detail" como texto o como lista de errores de validación
function mensajeDeError(body: any, status: number): string {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d.length) return String(d[0].msg ?? "Datos inválidos").replace(/^Value error, /, "");
  if (status >= 500) return "Error del servidor. Intenta de nuevo en un momento.";
  return "No se pudo completar la solicitud.";
}

async function refrescar(): Promise<boolean> {
  // Si varias peticiones fallan al mismo tiempo, solo se hace un refresh
  if (!refrescando) {
    refrescando = fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return false;
        const data = await r.json();
        accessToken = data.access_token;
        return true;
      })
      .catch(() => false)
      .finally(() => { setTimeout(() => (refrescando = null), 0); });
  }
  return refrescando;
}

interface Opciones {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  reintentar?: boolean;
}

const SIN_CONEXION = "No hay conexión con el servidor. ¿Está corriendo el backend?";

/** Hace la petición y, ante un 401, renueva la sesión y la repite una vez. */
async function enviar(ruta: string, { method = "GET", body, reintentar = true }: Opciones): Promise<Response> {
  const esFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  // Con FormData el navegador pone el Content-Type con su boundary
  if (body !== undefined && !esFormData) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, SIN_CONEXION);
  }

  if (res.status === 401 && reintentar && !ruta.startsWith("/auth/")) {
    if (await refrescar()) return enviar(ruta, { method, body, reintentar: false });
    accessToken = null;
    alExpirarSesion?.();
  }
  return res;
}

async function lanzarError(res: Response): Promise<never> {
  const data = await res.json().catch(() => null);
  throw new ApiError(res.status, mensajeDeError(data, res.status), data?.detail);
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const res = await enviar(ruta, opciones);
  if (res.status === 204) return undefined as T;
  if (!res.ok) return lanzarError(res);
  return (await res.json().catch(() => null)) as T;
}

/** Descarga binaria (archivos, comprobantes) con la misma sesión que el resto de la API. */
export async function apiBlob(ruta: string): Promise<Blob> {
  const res = await enviar(ruta, {});
  if (!res.ok) return lanzarError(res);
  return res.blob();
}

/**
 * Subida multipart con progreso (fetch todavía no reporta el avance del envío, XHR sí).
 * `alAvanzar` recibe un porcentaje de 0 a 100.
 */
export function apiSubir<T>(ruta: string, datos: FormData, alAvanzar?: (pct: number) => void): Promise<T> {
  const intentar = (reintentar: boolean): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE}${ruta}`);
      xhr.withCredentials = true;
      if (accessToken) xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) alAvanzar?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new ApiError(0, SIN_CONEXION));
      xhr.onload = async () => {
        if (xhr.status === 401 && reintentar) {
          if (await refrescar()) return resolve(intentar(false));
          accessToken = null;
          alExpirarSesion?.();
        }
        let data: any = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* respuesta vacía o no JSON */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new ApiError(xhr.status, mensajeDeError(data, xhr.status), data?.detail));
      };
      xhr.send(datos);
    });
  return intentar(true);
}
