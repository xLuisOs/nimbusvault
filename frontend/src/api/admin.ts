import { api } from "./client";
import type { InfraAdmin, ResumenAdmin, Rol, UsuarioAdmin } from "@/types";
import { desfaseMinutos } from "@/utils/format";

export const adminApi = {
  resumen: () => api<ResumenAdmin>(`/admin/resumen?desfase_min=${desfaseMinutos()}`),
  infra: () => api<InfraAdmin>(`/admin/infra?desfase_min=${desfaseMinutos()}`),

  usuarios: () => api<UsuarioAdmin[]>("/admin/usuarios"),
  /** El invitado recibe un correo para elegir su contraseña. */
  invitar: (nombre: string, correo: string, rol: Rol) =>
    api<UsuarioAdmin>("/admin/usuarios", { method: "POST", body: { nombre, correo, rol } }),
  actualizar: (id: string, cambios: { nombre?: string; rol?: Rol; estado?: "activo" | "suspendido" }) =>
    api<UsuarioAdmin>(`/admin/usuarios/${id}`, { method: "PATCH", body: cambios }),
  eliminar: (id: string) => api<void>(`/admin/usuarios/${id}`, { method: "DELETE" }),
};
