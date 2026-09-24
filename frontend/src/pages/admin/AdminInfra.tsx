import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";

// ── Data ───────────────────────────────────────────────────────────────────────

type SemColor = "#00C896" | "#FBBF24" | "#FF6B6B";

interface Component {
  id: string;
  name: string;
  status: "Operativo" | "Advertencia" | "Error";
  color: SemColor;
  metric: string;
  metricLabel: string;
  uptime: string;
  detail: string;
}

const COMPONENTS: Component[] = [
  {
    id: "api",
    name: "API Backend",
    status: "Operativo",
    color: "#00C896",
    metric: "42 ms",
    metricLabel: "Latencia P95",
    uptime: "99.98 %",
    detail: "12 pods activos · 3.1k req/min",
  },
  {
    id: "db",
    name: "Base de datos",
    status: "Operativo",
    color: "#00C896",
    metric: "847 GB",
    metricLabel: "Almacenamiento usado",
    uptime: "99.99 %",
    detail: "PostgreSQL 16 · réplicas ×3",
  },
  {
    id: "minio",
    name: "MinIO / S3",
    status: "Advertencia",
    color: "#FBBF24",
    metric: "320 ms",
    metricLabel: "Latencia PUT (elevada)",
    uptime: "99.71 %",
    detail: "Bucket principal degradado",
  },
  {
    id: "auth",
    name: "Autenticación",
    status: "Operativo",
    color: "#00C896",
    metric: "0",
    metricLabel: "Errores en 24 h",
    uptime: "100 %",
    detail: "OAuth2 + JWT · 2,847 sesiones",
  },
];

// Storage usage — last 12 hours (hourly)
const STORAGE_HISTORY = [
  { h: "00:00", tb: 831 }, { h: "01:00", tb: 832 }, { h: "02:00", tb: 832 },
  { h: "03:00", tb: 833 }, { h: "04:00", tb: 834 }, { h: "05:00", tb: 835 },
  { h: "06:00", tb: 837 }, { h: "07:00", tb: 839 }, { h: "08:00", tb: 841 },
  { h: "09:00", tb: 843 }, { h: "10:00", tb: 845 }, { h: "11:00", tb: 847 },
];

interface Incident {
  id: number;
  title: string;
  component: string;
  severity: "Alto" | "Medio" | "Bajo";
  time: string;
  color: SemColor;
}

const INCIDENTS: Incident[] = [
  { id: 1, title: "MinIO latencia elevada en bucket principal", component: "MinIO / S3",    severity: "Alto",  time: "Hace 2 h",  color: "#FF6B6B" },
  { id: 2, title: "Respaldo nocturno completado con retraso",   component: "Base de datos", severity: "Medio", time: "Hace 5 h",  color: "#FBBF24" },
  { id: 3, title: "Query lenta detectada en tabla sessions",    component: "Base de datos", severity: "Bajo",  time: "Hace 8 h",  color: "#FBBF24" },
];

const OPEN_COUNT = INCIDENTS.length;

// ── Sub-components ─────────────────────────────────────────────────────────────

function Semaphore({ color, size = 10 }: { color: SemColor; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 0 3px ${color}30`,
        display: "inline-block",
      }}
    />
  );
}

function ComponentCard({ c }: { c: Component }) {
  const statusBg: Record<string, string> = {
    Operativo:   "#DCFCE7",
    Advertencia: "#FEF9C3",
    Error:       "#FEE2E2",
  };
  const statusColor: Record<string, string> = {
    Operativo:   "#065F46",
    Advertencia: "#92400E",
    Error:       "#991B1B",
  };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: "white",
        border: `1px solid ${c.color === "#00C896" ? "#E2E8F0" : c.color + "40"}`,
      }}
    >
      {/* Top */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Semaphore color={c.color} size={11} />
          <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.name}
          </h3>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: statusBg[c.status], color: statusColor[c.status] }}
        >
          {c.status}
        </span>
      </div>

      {/* Metric */}
      <div className="flex items-end justify-between">
        <div>
          <p
            className="text-2xl font-extrabold leading-none"
            style={{ color: c.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {c.metric}
          </p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#94A3B8" }}>{c.metricLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color: "#0F172A" }}>{c.uptime}</p>
          <p className="text-[10px]" style={{ color: "#94A3B8" }}>uptime 30d</p>
        </div>
      </div>

      {/* Detail */}
      <p className="text-[11px] font-medium" style={{ color: "#94A3B8" }}>{c.detail}</p>
    </div>
  );
}

const StorageTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl text-xs shadow-xl" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <p className="font-bold mb-0.5" style={{ color: "#0F172A" }}>{label}</p>
      <p style={{ color: "#2E9BFF" }}>
        <span className="font-semibold">Almacenamiento:</span> {payload[0].value} TB
      </p>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminInfraProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminInfra({ onNav, onLogout }: AdminInfraProps) {
  return (
    <AdminShell
      activeNav="infra"
      onNav={onNav}
      onLogout={onLogout}
      title="Infraestructura"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* System status bar */}
        <div
          className="flex items-center justify-between px-5 py-3.5 rounded-2xl"
          style={{
            background: COMPONENTS.some((c) => c.status === "Error") ? "#FEE2E2"
              : COMPONENTS.some((c) => c.status === "Advertencia") ? "#FEF9C3"
              : "#DCFCE7",
            border: `1px solid ${
              COMPONENTS.some((c) => c.status === "Error") ? "#FECACA"
              : COMPONENTS.some((c) => c.status === "Advertencia") ? "#FDE68A"
              : "#A7F3D0"
            }`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Semaphore
              color={COMPONENTS.some((c) => c.status === "Error") ? "#FF6B6B" : COMPONENTS.some((c) => c.status === "Advertencia") ? "#FBBF24" : "#00C896"}
              size={10}
            />
            <p className="text-sm font-bold" style={{ color: "#0F172A" }}>
              {COMPONENTS.some((c) => c.status === "Error")
                ? "Sistema degradado — se requiere atención inmediata"
                : COMPONENTS.some((c) => c.status === "Advertencia")
                ? "Sistema operativo con advertencias activas"
                : "Todos los sistemas operativos"}
            </p>
          </div>
          <p className="text-xs" style={{ color: "#64748B" }}>
            Actualizado: {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Component status cards */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COMPONENTS.map((c) => <ComponentCard key={c.id} c={c} />)}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Storage usage line chart — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "white", border: "1px solid #E2E8F0" }}>
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Últimas 12 horas</p>
              <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Uso de almacenamiento (TB)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={STORAGE_HISTORY} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2E9BFF" />
                    <stop offset="100%" stopColor="#00D1C1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="h" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  axisLine={false} tickLine={false}
                  domain={["dataMin - 5", "dataMax + 5"]}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<StorageTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                <ReferenceLine
                  y={900}
                  stroke="#FBBF24"
                  strokeDasharray="4 4"
                  label={{ value: "Límite alerta 900 TB", position: "right", fontSize: 9, fill: "#B45309" }}
                />
                <Line
                  type="monotone"
                  dataKey="tb"
                  stroke="url(#storageGrad)"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Incidents card — 1/3 */}
          <div className="rounded-2xl flex flex-col overflow-hidden" style={{ background: "white", border: "1px solid #E2E8F0" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>En curso</p>
                <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Incidencias abiertas</h3>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-extrabold"
                style={{
                  background: OPEN_COUNT > 0 ? "#FEE2E2" : "#DCFCE7",
                  color: OPEN_COUNT > 0 ? "#FF6B6B" : "#00C896",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {OPEN_COUNT}
              </div>
            </div>

            {/* Incident list */}
            <div className="flex-1 flex flex-col divide-y" style={{ borderColor: "#F8FAFC" }}>
              {INCIDENTS.map((inc) => (
                <div key={inc.id} className="px-5 py-3.5 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <Semaphore color={inc.color} size={8} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug" style={{ color: "#0F172A" }}>{inc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: inc.color + "18", color: inc.color }}
                        >
                          {inc.severity}
                        </span>
                        <span className="text-[10px]" style={{ color: "#94A3B8" }}>{inc.component}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] pl-3" style={{ color: "#94A3B8" }}>{inc.time}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3" style={{ borderTop: "1px solid #F1F5F9" }}>
              <button
                className="w-full py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: "#F8FAFC", color: "#64748B" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; e.currentTarget.style.color = "#2E9BFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#64748B"; }}
              >
                Ver historial completo →
              </button>
            </div>
          </div>
        </div>

        {/* Metrics summary row */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Total requests hoy",    value: "4.2M",  color: "#2E9BFF",  bg: "#E0F4FF" },
            { label: "Errores 5xx (24 h)",    value: "18",    color: "#FF6B6B",  bg: "#FEE2E2" },
            { label: "Usuarios conectados",   value: "312",   color: "#00C896",  bg: "#DCFCE7" },
            { label: "Transfers activas",     value: "47",    color: "#A78BFA",  bg: "#F5F3FF" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #E2E8F0" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                <AdminIcon id="server" size={16} />
              </div>
              <p className="text-xl font-extrabold leading-none mb-1" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {value}
              </p>
              <p className="text-xs" style={{ color: "#94A3B8" }}>{label}</p>
            </div>
          ))}
        </div>

      </div>
    </AdminShell>
  );
}
