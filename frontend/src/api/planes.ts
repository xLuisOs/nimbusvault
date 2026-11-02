import { useEffect, useState } from "react";

import { api } from "./client";
import type { Plan, PlanAdmin, PlanFormulario } from "@/types";

export const planesApi = {
  listar: () => api<Plan[]>("/planes"),
  obtener: (codigo: string) => api<Plan>(`/planes/${encodeURIComponent(codigo)}`),

  // Solo administrador
  listarAdmin: () => api<PlanAdmin[]>("/admin/planes"),
  crear: (datos: PlanFormulario) => api<Plan>("/admin/planes", { method: "POST", body: datos }),
  actualizar: (id: string, datos: PlanFormulario) => api<Plan>(`/admin/planes/${id}`, { method: "PUT", body: datos }),
  cambiarEstado: (id: string, activo: boolean) =>
    api<Plan>(`/admin/planes/${id}/estado`, { method: "PATCH", body: { activo } }),
  eliminar: (id: string) => api<void>(`/admin/planes/${id}`, { method: "DELETE" }),
};

// Si la API tardó demasiado en despertar, se vuelve a intentar sola cada 20 s (además del botón "Reintentar")
const REINTENTO_AUTOMATICO_MS = 20_000;

/** Catálogo público para el landing y la página de planes. */
export function usePlanes() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    planesApi
      .listar()
      .then((p) => vivo && setPlanes(p))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [intento]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setIntento((n) => n + 1), REINTENTO_AUTOMATICO_MS);
    return () => clearTimeout(t);
  }, [error]);

  const reintentar = () => setIntento((n) => n + 1);
  return { planes, cargando, error, reintentar };
}
