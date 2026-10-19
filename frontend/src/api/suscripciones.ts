import { api } from "./client";

export const suscripcionesApi = {
  cambiarPlan: (id_plan: string, periodicidad: "mensual" | "anual" = "mensual") =>
    api<{ mensaje: string; suscripcion: { id_suscripcion: string; id_plan: string; estado: string; periodicidad: string; fecha_inicio: string; fecha_fin: string; almacenamiento_gb: number } }> ("/suscripciones/cambiar-plan", {
      method: "POST",
      body: { id_plan, periodicidad },
    }),

  renovar: (id_plan?: string, periodicidad: "mensual" | "anual" = "mensual") =>
    api<{ mensaje: string; suscripcion: { id_suscripcion: string; id_plan: string; estado: string; periodicidad: string; fecha_inicio: string; fecha_fin: string; almacenamiento_gb: number } }> ("/suscripciones/renovar", {
      method: "POST",
      body: { ...(id_plan ? { id_plan } : {}), periodicidad },
    }),
};
