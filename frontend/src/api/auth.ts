import { api } from "./client";
import type { TokenRespuesta, Usuario } from "@/types";

type Mensaje = { mensaje: string };

export const authApi = {
  registro: (datos: { nombre: string; correo: string; password: string; acepto_terminos: boolean }) =>
    api<Mensaje>("/auth/registro", { method: "POST", body: datos }),

  verificarCorreo: (token: string) => api<Mensaje>("/auth/verificar-correo", { method: "POST", body: { token } }),

  reenviarVerificacion: (correo: string) =>
    api<Mensaje>("/auth/reenviar-verificacion", { method: "POST", body: { correo } }),

  login: (correo: string, password: string) =>
    api<TokenRespuesta>("/auth/login", { method: "POST", body: { correo, password } }),

  refresh: () => api<TokenRespuesta>("/auth/refresh", { method: "POST" }),

  logout: () => api<Mensaje>("/auth/logout", { method: "POST" }),

  olvideContrasena: (correo: string) => api<Mensaje>("/auth/olvide-contrasena", { method: "POST", body: { correo } }),

  restablecer: (token: string, password: string) =>
    api<Mensaje>("/auth/restablecer-contrasena", { method: "POST", body: { token, password } }),

  me: () => api<Usuario>("/auth/me"),
};

export interface SesionAbierta {
  id_sesion: string;
  ip: string | null;
  user_agent: string | null;
  creado_en: string;
  expira_en: string;
  actual: boolean;
}

/** Configuración de la cuenta (pantalla /configuracion). */
export const cuentaApi = {
  actualizarPerfil: (nombre: string) => api<Usuario>("/auth/me", { method: "PATCH", body: { nombre } }),
  cambiarContrasena: (actual: string, nueva: string) =>
    api<Mensaje>("/auth/cambiar-contrasena", { method: "POST", body: { actual, nueva } }),
  sesiones: () => api<SesionAbierta[]>("/auth/sesiones"),
  cerrarSesion: (id: string) => api<Mensaje>(`/auth/sesiones/${id}`, { method: "DELETE" }),
  cerrarOtras: () => api<Mensaje>("/auth/sesiones/cerrar-otras", { method: "POST" }),
  eliminarCuenta: (password: string) => api<void>("/auth/me", { method: "DELETE", body: { password } }),
};
