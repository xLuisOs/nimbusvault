import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";

// ── Data ───────────────────────────────────────────────────────────────────────

const KPIS = [
  {
    label: "Usuarios activos",
    value: "2,847",
    delta: "+12%",
    sub: "vs. mes anterior",
    up: true,
    color: "#2E9BFF",
    bg: "#E0F4FF",
    icon: "users",
  },
  {
    label: "Almacenamiento usado",
    value: "847 TB",
    delta: "+8%",
    sub: "de 2,000 TB",
    up: true,
    color: "#00D1C1",
    bg: "#E0FBF9",
    icon: "server",
  },
  {
    label: "Ingresos del mes",
    value: "$24,580",
    delta: "+18%",
    sub: "vs. septiembre 2025",
    up: true,
    color: "#A78BFA",
    bg: "#F5F3FF",
    icon: "layers",
  },
  {
    label: "Suscripciones activas",
    value: "1,203",
    delta: "-3%",
    sub: "vs. mes anterior",
    up: false,
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: "grid",
  },
];

const GROWTH = [
  { mes: "Feb", usuarios: 1820 },
  { mes: "Mar", usuarios: 2010 },
  { mes: "Abr", usuarios: 2190 },
  { mes: "May", usuarios: 2340 },
  { mes: "Jun", usuarios: 2450 },
  { mes: "Jul", usuarios: 2600 },
  { mes: "Ago", usuarios: 2710 },
  { mes: "Sep", usuarios: 2847 },
];

const PLAN_DIST = [
  { name: "Starter",    value: 42, color: "#4DB8FF" },
  { name: "Pro",        value: 35, color: "#2E9BFF" },
  { name: "Business",   value: 18, color: "#00D1C1" },
  { name: "Enterprise", value:  5, color: "#0EA5E9" },
];

const RECENT_SUBS = [
  { user: "Ana Torres",      email: "ana@empresa.com",    plan: "Pro",        date: "10 sep, 2026", status: "Activo"    },
  { user: "Carlos Mendoza",  email: "carlos@startup.io",  plan: "Business",   date: "09 sep, 2026", status: "Activo"    },
  { user: "María López",     email: "maria@agencia.com",  plan: "Starter",    date: "08 sep, 2026", status: "Activo"    },
  { user: "Javier Ruiz",     email: "javier@corp.com",    plan: "Enterprise", date: "07 sep, 2026", status: "Activo"    },
  { user: "Laura Castillo",  email: "laura@tech.io",      plan: "Pro",        date: "06 sep, 2026", status: "Suspendido"},
  { user: "Sergio Vega",     email: "sergio@digital.com", plan: "Starter",    date: "05 sep, 2026", status: "Activo"    },
];

const PLAN_COLOR: Record<string, string> = {
  Starter: "#4DB8FF", Pro: "#2E9BFF", Business: "#00D1C1", Enterprise: "#0EA5E9",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, delta, sub, up, color, bg, icon }: typeof KPIS[number]) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: bg, color }}
        >
          <AdminIcon id={icon} size={20} />
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            background: up ? "#DCFCE7" : "#FEE2E2",
            color: up ? "#00C896" : "#FF6B6B",
          }}
        >
          {delta}
        </span>
      </div>
      <div>
        <p
          className="text-2xl font-extrabold leading-none mb-1"
          style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {value}
        </p>
        <p className="text-xs font-semibold" style={{ color: "#64748B" }}>{label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{sub}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>{sub}</p>
        <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

const DonutTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-xl" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <div className="flex items-center gap-2 font-semibold mb-0.5" style={{ color: "#0F172A" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.payload.color }} />
        {p.name}
      </div>
      <span className="font-bold text-sm" style={{ color: p.payload.color }}>{p.value}%</span>
    </div>
  );
};

const LineTooltipCustom = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl text-xs shadow-xl" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <p className="font-bold mb-1" style={{ color: "#0F172A" }}>{label}</p>
      <p style={{ color: "#2E9BFF" }}>
        <span className="font-semibold">Usuarios:</span> {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  const active = status === "Activo";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: active ? "#DCFCE7" : "#FEE2E2",
        color: active ? "#00C896" : "#FF6B6B",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#00C896" : "#FF6B6B" }} />
      {status}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminDashboardProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminDashboard({ onNav, onLogout }: AdminDashboardProps) {
  return (
    <AdminShell
      activeNav="dashboard"
      onNav={onNav}
      onLogout={onLogout}
      title="Dashboard"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Line chart — 2/3 width */}
          <div className="lg:col-span-2">
            <ChartCard title="Crecimiento de usuarios" sub="Registro acumulado">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={GROWTH} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2E9BFF" />
                      <stop offset="100%" stopColor="#00D1C1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip content={<LineTooltipCustom />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                  <Line
                    type="monotone"
                    dataKey="usuarios"
                    stroke="url(#adminLineGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Donut — 1/3 width */}
          <ChartCard title="Distribución por plan" sub="Suscripciones activas">
            <div className="relative" style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={PLAN_DIST}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    {PLAN_DIST.map((e) => (
                      <Cell key={e.name} fill={e.color} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-lg font-extrabold leading-none" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>1,203</p>
                  <p className="text-[9px] font-semibold" style={{ color: "#94A3B8" }}>suscriptores</p>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-3 flex flex-col gap-1.5">
              {PLAN_DIST.map(({ name, value, color }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs" style={{ color: "#64748B" }}>{name}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{value}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Recent subscriptions table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E2E8F0" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>Registro reciente</p>
              <h3 className="text-sm font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Últimas suscripciones</h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
              {RECENT_SUBS.length} entradas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                  {["Usuario", "Plan", "Fecha", "Estado"].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_SUBS.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: i < RECENT_SUBS.length - 1 ? "1px solid #F8FAFC" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: `hsl(${row.user.charCodeAt(0) * 5 % 360}, 60%, 55%)` }}
                        >
                          {row.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "#0F172A" }}>{row.user}</p>
                          <p className="text-[10px]" style={{ color: "#94A3B8" }}>{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: PLAN_COLOR[row.plan] + "18", color: PLAN_COLOR[row.plan] }}
                      >
                        {row.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs" style={{ color: "#64748B" }}>{row.date}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminShell>
  );
}
