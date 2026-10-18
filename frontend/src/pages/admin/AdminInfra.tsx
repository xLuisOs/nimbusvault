import { useCallback, useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { adminApi } from "@/api/admin";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";
import type { InfraAdmin } from "@/types";
import { diaCorto, formatoBytes, haceCuanto } from "@/utils/format";

// ── Semáforo ───────────────────────────────────────────────────────────────────

type Estado = InfraAdmin["componentes"][number]["estado"];

const COLOR_ESTADO: Record<Estado, string> = { operativo: "#00C896", advertencia: "#FBBF24", error: "#FF6B6B" };
const TEXTO_ESTADO: Record<Estado, string> = { operativo: "Operativo", advertencia: "Advertencia", error: "Error" };
const COLOR_SEVERIDAD: Record<InfraAdmin["alertas"][number]["severidad"], string> = {
  alta: "#FF6B6B", media: "#FBBF24", baja: "#2E9BFF",
};

function Semaphore({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{ width: size, height: size, background: color, boxShadow: `0 0 0 3px ${color}30`, display: "inline-block" }}
    />
  );
}

function ComponentCard({ c }: { c: InfraAdmin["componentes"][number] }) {
  const color = COLOR_ESTADO[c.estado];
  const statusBg: Record<Estado, string> = { operativo: "#DCFCE7", advertencia: "#FEF9C3", error: "#FEE2E2" };
  const statusColor: Record<Estado, string> = { operativo: "#065F46", advertencia: "#92400E", error: "#991B1B" };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "white", border: `1px solid ${c.estado === "operativo" ? "#E2E8F0" : color + "40"}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Semaphore color={color} size={11} />
          <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.nombre}
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: statusBg[c.estado], color: statusColor[c.estado] }}>
          {TEXTO_ESTADO[c.estado]}
        </span>
      </div>

      <div>
        <p className="text-2xl font-extrabold leading-none" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {c.metrica}
        </p>
        <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#94A3B8" }}>{c.metrica_etiqueta}</p>
      </div>

      <p className="text-[11px] font-medium break-words" style={{ color: c.estado === "error" ? "#B91C1C" : "#94A3B8" }}>{c.detalle}</p>
    </div>
  );
}

const StorageTooltip = ({ active, payload, label }: { active?: boolean; payload?: { payload: { bytes: number } }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl text-xs shadow-xl" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <p className="font-bold mb-0.5" style={{ color: "#0F172A" }}>{label}</p>
      <p style={{ color: "#2E9BFF" }}>
        <span className="font-semibold">Almacenamiento:</span> {formatoBytes(payload[0].payload.bytes)}
      </p>
    </div>
  );
};

function unidadPara(maxBytes: number): { nombre: string; divisor: number } {
  if (maxBytes >= 1024 ** 3) return { nombre: "GB", divisor: 1024 ** 3 };
  if (maxBytes >= 1024 ** 2) return { nombre: "MB", divisor: 1024 ** 2 };
  return { nombre: "KB", divisor: 1024 };
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminInfraProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminInfra({ onNav, onLogout }: AdminInfraProps) {
  const [datos, setDatos] = useState<InfraAdmin | null>(null);
  const [error, setError] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [revisadoEn, setRevisadoEn] = useState<Date | null>(null);

  const revisar = useCallback(() => {
    setRevisando(true);
    adminApi
      .infra()
      .then((d) => { setDatos(d); setError(""); setRevisadoEn(new Date()); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setRevisando(false));
  }, []);
  useEffect(revisar, [revisar]);

  const componentes = datos?.componentes ?? [];
  const hayError = componentes.some((c) => c.estado === "error");
  const hayAviso = componentes.some((c) => c.estado === "advertencia");
  const alertas = datos?.alertas ?? [];

  const historial = datos?.historial_almacenamiento ?? [];
  const unidad = unidadPara(Math.max(...historial.map((p) => p.bytes), 1));
  const serie = historial.map((p) => ({ dia: diaCorto(p.dia), valor: +(p.bytes / unidad.divisor).toFixed(2), bytes: p.bytes }));

  const a = datos?.actividad;
  const metricas = a ? [
    { label: "Subidas (24 h)", value: String(a.subidas), sub: `${formatoBytes(a.bytes_subidos)} subidos`, color: "#2E9BFF", bg: "#E0F4FF" },
    { label: "Descargas (24 h)", value: String(a.descargas), sub: "archivos descargados", color: "#A78BFA", bg: "#F5F3FF" },
    { label: "Usuarios que entraron hoy", value: String(a.usuarios_con_acceso_hoy), sub: `${a.sesiones_activas} sesiones abiertas`, color: "#00C896", bg: "#DCFCE7" },
    { label: "Archivos almacenados", value: a.archivos_almacenados.toLocaleString("es-GT"), sub: "en toda la plataforma", color: "#F59E0B", bg: "#FFFBEB" },
  ] : [];

  return (
    <AdminShell
      activeNav="infra"
      onNav={onNav}
      onLogout={onLogout}
      title="Infraestructura"
      headerRight={
        <button
          onClick={revisar}
          disabled={revisando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-150 disabled:opacity-60"
          style={{ background: "#2E9BFF" }}
        >
          {revisando ? "Revisando…" : "Volver a revisar"}
        </button>
      }
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {error && (
          <p className="text-xs px-4 py-2.5 rounded-xl" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            No se pudo consultar la infraestructura: {error}
          </p>
        )}
        {!datos && !error && <p className="text-sm text-center py-16" style={{ color: "#94A3B8" }}>Revisando servicios…</p>}

        {datos && (
          <>
            {/* System status bar */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 rounded-2xl"
              style={{
                background: hayError ? "#FEE2E2" : hayAviso ? "#FEF9C3" : "#DCFCE7",
                border: `1px solid ${hayError ? "#FECACA" : hayAviso ? "#FDE68A" : "#A7F3D0"}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Semaphore color={hayError ? "#FF6B6B" : hayAviso ? "#FBBF24" : "#00C896"} size={10} />
                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
                  {hayError
                    ? "Sistema degradado: hay un servicio que no responde"
                    : hayAviso
                    ? "Sistema operativo con advertencias"
                    : "Todos los sistemas operativos"}
                </p>
              </div>
              <p className="text-xs" style={{ color: "#64748B" }}>
                API en línea {haceCuanto(datos.en_linea_desde).replace("hace", "desde hace")} · entorno {datos.entorno}
                {revisadoEn && ` · revisado ${revisadoEn.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
              </p>
            </div>

            {/* Component status cards */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {componentes.map((c) => <ComponentCard key={c.id} c={c} />)}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "white", border: "1px solid #E2E8F0" }}>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Últimos 14 días</p>
                  <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Almacenamiento total de la plataforma ({unidad.nombre})
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>
                    {formatoBytes(historial[historial.length - 1]?.bytes ?? 0)} usados de {formatoBytes(datos.cuota_contratada_bytes)} contratados por los clientes
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={serie} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="storageGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2E9BFF" />
                        <stop offset="100%" stopColor="#00D1C1" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<StorageTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="url(#storageGrad)"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Alerts card */}
              <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background: "white", border: "1px solid #E2E8F0" }}>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Ahora mismo</p>
                    <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Alertas</h3>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-extrabold"
                    style={{
                      background: alertas.length ? "#FEE2E2" : "#DCFCE7",
                      color: alertas.length ? "#FF6B6B" : "#00C896",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                  >
                    {alertas.length}
                  </div>
                </div>

                <div className="flex-1 flex flex-col divide-y" style={{ borderColor: "#F8FAFC" }}>
                  {alertas.length === 0 && (
                    <div className="px-5 py-8 flex flex-col items-center gap-2 text-center">
                      <span style={{ color: "#00C896" }}><AdminIcon id="check" size={22} /></span>
                      <p className="text-xs" style={{ color: "#64748B" }}>Sin alertas: servicios respondiendo y ningún cliente cerca de su límite.</p>
                    </div>
                  )}
                  {alertas.map((al, i) => {
                    const color = COLOR_SEVERIDAD[al.severidad];
                    return (
                      <div key={i} className="px-5 py-3.5 flex items-start gap-2">
                        <span className="mt-1"><Semaphore color={color} size={8} /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug break-words" style={{ color: "#0F172A" }}>{al.titulo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: color + "18", color }}>
                              {al.severidad}
                            </span>
                            <span className="text-[10px]" style={{ color: "#94A3B8" }}>{al.componente}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Metrics summary row */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {metricas.map(({ label, value, sub, color, bg }) => (
                <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #E2E8F0" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, color }}>
                    <AdminIcon id="server" size={16} />
                  </div>
                  <p className="text-xl font-extrabold leading-none mb-1" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {value}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: "#64748B" }}>{label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{sub}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
