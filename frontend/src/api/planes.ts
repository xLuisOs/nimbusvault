import { useEffect, useState } from "react";

import { api } from "./client";
import type { Plan, PlanAdmin, PlanFormulario } from "@/types";

export const planesApi = {
  listar: () => api<Plan[]>("/planes"),

  // Solo administrador
  listarAdmin: () => api<PlanAdmin[]>("/admin/planes"),
  crear: (datos: PlanFormulario) => api<Plan>("/admin/planes", { method: "POST", body: datos }),
  actualizar: (id: string, datos: PlanFormulario) => api<Plan>(`/admin/planes/${id}`, { method: "PUT", body: datos }),
  cambiarEstado: (id: string, activo: boolean) =>
    api<Plan>(`/admin/planes/${id}/estado`, { method: "PATCH", body: { activo } }),
  eliminar: (id: string) => api<void>(`/admin/planes/${id}`, { method: "DELETE" }),
};

/** Catálogo público para el landing y la página de planes. */
export function usePlanes() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    planesApi
      .listar()
      .then((p) => vivo && setPlanes(p))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, []);

  return { planes, cargando, error };
}
