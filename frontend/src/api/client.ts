// Cliente HTTP único para toda la app.
// - Agrega el access token (JWT) a cada petición.
// - Si la API responde 401, intenta renovar la sesión con la cookie de refresh y reintenta una vez.

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

export async function api<T>(ruta: string, { method = "GET", body, reintentar = true }: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No hay conexión con el servidor. ¿Está corriendo el backend?");
  }

  if (res.status === 401 && reintentar && !ruta.startsWith("/auth/")) {
    if (await refrescar()) return api<T>(ruta, { method, body, reintentar: false });
    accessToken = null;
    alExpirarSesion?.();
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, mensajeDeError(data, res.status), data?.detail);
  return data as T;
}
