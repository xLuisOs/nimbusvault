import { useEffect, useState } from "react";
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

import { adminApi } from "@/api/admin";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";
import type { ResumenAdmin } from "@/types";
import { formatoBytes, formatoDolares, formatoFecha, iniciales, nombreMes } from "@/utils/format";

// ── Sub-components ─────────────────────────────────────────────────────────────

interface Kpi {
  label: string;
  value: string;
  delta: string | null; // null = sin comparación
  up: boolean;
  sub: string;
  color: string;
  bg: string;
  icon: string;
}

function porcentaje(actual: number, anterior: number): { delta: string | null; up: boolean } {
  if (anterior === 0) return { delta: actual > 0 ? "nuevo" : null, up: true };
  const d = Math.round(((actual - anterior) / anterior) * 100);
  return { delta: `${d >= 0 ? "+" : ""}${d}%`, up: d >= 0 };
}

function kpisDesde(r: ResumenAdmin): Kpi[] {
  const k = r.kpis;
  const ingresos = porcentaje(Number(k.ingresos_mes), Number(k.ingresos_mes_anterior));
  // Total de clientes al cierre de este mes contra el del mes anterior
  const n = r.crecimiento.length;
  const nuevos = porcentaje(r.crecimiento[n - 1]?.clientes ?? 0, r.crecimiento[n - 2]?.clientes ?? 0);
  const usoPct = k.cuota_contratada_bytes ? Math.round((k.almacenamiento_usado_bytes / k.cuota_contratada_bytes) * 100) : 0;
  return [
    {
      label: "Clientes activos", value: k.clientes_activos.toLocaleString("es-GT"), ...nuevos,
      sub: `${k.clientes_nuevos_mes} nuevo${k.clientes_nuevos_mes !== 1 ? "s" : ""} este mes`,
      color: "#2E9BFF", bg: "#E0F4FF", icon: "users",
    },
    {
      label: "Almacenamiento usado", value: formatoBytes(k.almacenamiento_usado_bytes), delta: `${usoPct}%`, up: usoPct < 80,
      sub: `de ${formatoBytes(k.cuota_contratada_bytes)} contratados`, color: "#00D1C1", bg: "#E0FBF9", icon: "server",
    },
    {
      label: "Ingresos del mes", value: formatoDolares(k.ingresos_mes), ...ingresos,
      sub: `${formatoDolares(k.ingresos_mes_anterior)} el mes anterior · simulados`, color: "#A78BFA", bg: "#F5F3FF", icon: "layers",
    },
    {
      label: "Suscripciones de pago", value: String(k.suscripciones_pagadas), delta: null, up: true,
      sub: `de ${k.suscripciones_activas} activas (el resto en Gratis)`, color: "#F59E0B", bg: "#FFFBEB", icon: "grid",
    },
  ];
}

function KpiCard({ label, value, delta, sub, up, color, bg, icon }: Kpi) {
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
        {delta && (
          <span
            className="text-xs font-bold px-2 py-1 rounded-full"
            style={{
              background: up ? "#DCFCE7" : "#FEE2E2",
              color: up ? "#00C896" : "#FF6B6B",
            }}
          >
            {delta}
          </span>
        )}
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
      <span className="font-bold text-sm" style={{ color: p.payload.color }}>
        {p.value} suscripci{p.value !== 1 ? "ones" : "ón"}
      </span>
    </div>
  );
};

const LineTooltipCustom = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2.5 rounded-xl text-xs shadow-xl" style={{ background: "white", border: "1px solid #E2E8F0" }}>
      <p className="font-bold mb-1" style={{ color: "#0F172A" }}>{label}</p>
      <p style={{ color: "#2E9BFF" }}>
        <span className="font-semibold">Clientes:</span> {payload[0].value.toLocaleString("es-GT")}
      </p>
    </div>
  );
};

const ESTADO_SUSCRIPCION: Record<string, { texto: string; bg: string; color: string }> = {
  activa:     { texto: "Activa",     bg: "#DCFCE7", color: "#00C896" },
  cancelada:  { texto: "Cancelada",  bg: "#F1F5F9", color: "#64748B" },
  vencida:    { texto: "Vencida",    bg: "#FEF3C7", color: "#B45309" },
  suspendido: { texto: "Usuario suspendido", bg: "#FEE2E2", color: "#FF6B6B" },
};

function StatusBadge({ estado }: { estado: string }) {
  const s = ESTADO_SUSCRIPCION[estado] ?? ESTADO_SUSCRIPCION.activa;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.texto}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminDashboardProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminDashboard({ onNav, onLogout }: AdminDashboardProps) {
  const [datos, setDatos] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.resumen().then(setDatos).catch((e: Error) => setError(e.message));
  }, []);

  const crecimiento = datos?.crecimiento.map((p) => ({ mes: nombreMes(p.mes), clientes: p.clientes })) ?? [];
  const distribucion = datos?.distribucion ?? [];
  const totalSus = distribucion.reduce((s, d) => s + d.suscripciones, 0);
  const recientes = datos?.ultimas_suscripciones ?? [];

  return (
    <AdminShell
      activeNav="dashboard"
      onNav={onNav}
      onLogout={onLogout}
      title="Dashboard"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {error && (
          <p className="text-xs px-4 py-2.5 rounded-xl" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            No se pudo cargar el resumen: {error}
          </p>
        )}
        {!datos && !error && <p className="text-sm text-center py-16" style={{ color: "#94A3B8" }}>Cargando métricas…</p>}

        {datos && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpisDesde(datos).map((k) => <KpiCard key={k.label} {...k} />)}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ChartCard title="Crecimiento de clientes" sub="Registro acumulado · últimos 8 meses">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={crecimiento} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminLineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#2E9BFF" />
                          <stop offset="100%" stopColor="#00D1C1" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
                      <Tooltip content={<LineTooltipCustom />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                      <Line
                        type="monotone"
                        dataKey="clientes"
                        stroke="url(#adminLineGrad)"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              <ChartCard title="Distribución por plan" sub="Suscripciones activas">
                <div className="relative" style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribucion.map((d) => ({ name: d.plan, value: d.suscripciones, color: d.color }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={distribucion.length > 1 ? 2 : 0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {distribucion.map((d) => (
                          <Cell key={d.plan} fill={d.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-lg font-extrabold leading-none" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {totalSus.toLocaleString("es-GT")}
                      </p>
                      <p className="text-[9px] font-semibold" style={{ color: "#94A3B8" }}>suscriptores</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {distribucion.map(({ plan, suscripciones, color }) => (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-xs" style={{ color: "#64748B" }}>{plan}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: "#0F172A" }}>
                        {totalSus ? Math.round((suscripciones / totalSus) * 100) : 0}%
                        <span className="font-normal" style={{ color: "#94A3B8" }}> · {suscripciones}</span>
                      </span>
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
                  {recientes.length} entradas
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                      {["Usuario", "Plan", "Precio", "Fecha", "Estado"].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-xs" style={{ color: "#94A3B8" }}>Aún no hay suscripciones.</td></tr>
                    )}
                    {recientes.map((row, i) => (
                      <tr
                        key={`${row.correo}-${row.fecha_inicio}`}
                        style={{ borderBottom: i < recientes.length - 1 ? "1px solid #F8FAFC" : "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: `hsl(${(row.nombre.charCodeAt(0) * 5) % 360}, 60%, 55%)` }}
                            >
                              {iniciales(row.nombre)}
                            </div>
                            <div>
                              <p className="text-xs font-semibold" style={{ color: "#0F172A" }}>{row.nombre}</p>
                              <p className="text-[10px]" style={{ color: "#94A3B8" }}>{row.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: row.color + "18", color: row.color }}
                          >
                            {row.plan}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs" style={{ color: "#64748B" }}>
                          {Number(row.precio_contratado) === 0 ? "Gratis"
                            : `${formatoDolares(row.precio_contratado)}/${row.periodicidad === "anual" ? "año" : "mes"}`}
                        </td>
                        <td className="px-6 py-3.5 text-xs" style={{ color: "#64748B" }}>{formatoFecha(row.fecha_inicio)}</td>
                        <td className="px-6 py-3.5">
                          <StatusBadge estado={row.estado_usuario === "suspendido" ? "suspendido" : row.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
