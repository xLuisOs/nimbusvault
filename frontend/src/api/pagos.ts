import { api, apiBlob } from "./client";
import type { Pago, TarjetaSimulada } from "@/types";

export const pagosApi = {
  /** Contrata o cambia de plan con un pago simulado; devuelve el comprobante. */
  contratar: (idPlan: string, periodicidad: "mensual" | "anual", tarjeta: TarjetaSimulada) =>
    api<Pago>("/suscripciones/contratar", { method: "POST", body: { id_plan: idPlan, periodicidad, tarjeta } }),

  listar: () => api<Pago[]>("/pagos"),

  comprobante: (id: string) => apiBlob(`/pagos/${id}/comprobante`),
};
