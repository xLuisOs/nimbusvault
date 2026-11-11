import { api } from "./client";
import type { Pago, UsuarioAdmin } from "@/types";

export const soporteApi = {
  clientes: () => api<UsuarioAdmin[]>("/soporte/clientes"),
  pagos: (id: string) => api<Pago[]>(`/soporte/clientes/${id}/pagos`),
  reenviarVerificacion: (id: string) =>
    api<{ mensaje: string }>(`/soporte/clientes/${id}/reenviar-verificacion`, { method: "POST" }),
  enviarRecuperacion: (id: string) =>
    api<{ mensaje: string }>(`/soporte/clientes/${id}/enviar-recuperacion`, { method: "POST" }),
};
