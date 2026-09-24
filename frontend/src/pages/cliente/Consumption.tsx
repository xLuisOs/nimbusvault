import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
  BarChart, Bar, Legend,
} from "recharts";
import AppShell, { NavIcon, STORAGE } from "@/components/layout/AppShell";

// ── Palette & data ────────────────────────────────────────────────────────────

// Categorical palette — fixed order, CVD-safe (validated via OKLab hue separation)
const CAT = {
  docs:   { color: "#2E9BFF", label: "Documentos", gb: 24.1 },
  images: { color: "#00C896", label: "Imágenes",   gb: 18.6 },
  other:  { color: "#F59E0B", label: "Otros",       gb: 12.3 },
  zip:    { color: "#A78BFA", label: "Comprimidos", gb: 7.0  },
};

const USED_GB   = STORAGE.used;   // 62
const TOTAL_GB  = STORAGE.total;  // 100
const FREE_GB   = TOTAL_GB - USED_GB;
const USED_PCT  = Math.round((USED_GB / TOTAL_GB) * 100);
const WARN      = USED_PCT >= 90;

// Donut slices: type segments + available
const DONUT_DATA = [
  ...Object.values(CAT).map(({ color, label, gb }) => ({ name: label, value: gb, color })),
  { name: "Disponible", value: FREE_GB, color: "#E2E8F0" },
];

// Activity timeline
const ACTIVITY = [
  { id: 1, icon: "upload",   label: "Subiste",      file: "Presentación Q3 2026.pptx", time: "Hoy, 10:32 am", color: "#2E9BFF" },
  { id: 2, icon: "share",    label: "Compartiste",  file: "Contrato proveedor ABC.pdf", time: "Hoy, 9:15 am",  color: "#00D1C1" },
  { id: 3, icon: "download", label: "Descargaste",  file: "Base de datos clientes.xlsx",time: "Ayer, 4:47 pm", color: "#A78BFA" },
  { id: 4, icon: "upload",   label: "Subiste",      file: "Logo_v3_final.png",           time: "Ayer, 2:20 pm", color: "#2E9BFF" },
  { id: 5, icon: "trash",    label: "Eliminaste",   file: "Draft_v1_antiguo.doc",        time: "Mar 9, 3:10 pm",color: "#FF6B6B" },
  { id: 6, icon: "upload",   label: "Subiste",      file: "backup_sept_2026.zip",        time: "Mar 8, 8:30 am",color: "#2E9BFF" },
  { id: 7, icon: "share",    label: "Compartiste",  file: "API_docs_v2.md",              time: "Mar 7, 11:00 am",color: "#00D1C1" },
  { id: 8, icon: "download", label: "Descargaste",  file: "Campaña Sept.pptx",           time: "Mar 6, 5:45 pm",color: "#A78BFA" },
];

// Line chart: uploads/downloads last 8 days
const ACTIVITY_TREND = [
  { day: "3 sep", subidas: 3, descargas: 1 },
  { day: "4 sep", subidas: 1, descargas: 2 },
  { day: "5 sep", subidas: 4, descargas: 3 },
  { day: "6 sep", subidas: 2, descargas: 1 },
  { day: "7 sep", subidas: 6, descargas: 4 },
  { day: "8 sep", subidas: 3, descargas: 5 },
  { day: "9 sep", subidas: 5, descargas: 2 },
  { day: "10 sep",subidas: 8, descargas: 6 },
];

// Bar chart: storage growth over 6 months
const GROWTH_DATA = [
  { mes: "Abr", gb: 18 },
  { mes: "May", gb: 27 },
  { mes: "Jun", gb: 34 },
  { mes: "Jul", gb: 45 },
  { mes: "Ago", gb: 55 },
  { mes: "Sep", gb: USED_GB },
];

// ── Warning badge ─────────────────────────────────────────────────────────────

function WarnBadge() {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
      style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", color: "#92400E" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
        <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round" fill="#FFFBEB"/>
        <path d="M8 6v3M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Cerca del límite — usaste el {USED_PCT}% de tu espacio. Considera ampliar tu plan.
    </div>
  );
}

// ── Custom donut tooltip ──────────────────────────────────────────────────────

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = ((p.value / TOTAL_GB) * 100).toFixed(1);
  return (
    <div
      className="px-3.5 py-2.5 rounded-xl text-sm shadow-xl"
      style={{ background: "white", border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(14,30,60,0.12)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.payload.color }} />
        <span className="font-semibold" style={{ color: "#0F172A" }}>{p.name}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {p.value.toFixed(1)} GB
        </span>
        <span className="text-xs" style={{ color: "#94A3B8" }}>({pct}%)</span>
      </div>
    </div>
  );
}

// ── Donut card ────────────────────────────────────────────────────────────────

function DonutCard() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#94A3B8" }}>
            Distribución del almacenamiento
          </p>
          <h2
            className="text-base font-extrabold"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {USED_GB} GB usados de {TOTAL_GB} GB
          </h2>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: WARN ? "#FFFBEB" : "#E0F4FF", color: WARN ? "#B45309" : "#2E9BFF" }}
        >
          {USED_PCT}% usado
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <linearGradient id="usedGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"   stopColor="#2E9BFF" />
                  <stop offset="100%" stopColor="#00D1C1" />
                </linearGradient>
              </defs>
              <Pie
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                onMouseEnter={(_, idx) => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
                strokeWidth={0}
              >
                {DONUT_DATA.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={activeIdx === null || activeIdx === idx ? 1 : 0.45}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <ReTooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p
              className="text-2xl font-extrabold leading-none"
              style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {USED_PCT}%
            </p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#94A3B8" }}>utilizado</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 flex-1 w-full">
          {Object.values(CAT).map(({ color, label, gb }, idx) => {
            const pct = ((gb / TOTAL_GB) * 100).toFixed(1);
            const isActive = activeIdx === null || activeIdx === idx;
            return (
              <div
                key={label}
                className="flex items-center gap-3 cursor-default transition-opacity"
                style={{ opacity: isActive ? 1 : 0.4 }}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#334155" }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{gb} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-semibold w-10 text-right" style={{ color: "#94A3B8" }}>{pct}%</span>
              </div>
            );
          })}
          {/* Available row */}
          <div className="flex items-center gap-3 pt-1.5" style={{ borderTop: "1px solid #F1F5F9" }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#E2E8F0" }} />
            <span className="text-xs flex-1" style={{ color: "#94A3B8" }}>Disponible</span>
            <span className="text-xs font-bold" style={{ color: "#94A3B8" }}>{FREE_GB} GB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Activity trend card ───────────────────────────────────────────────────────

const CustomLineDot = (props: { cx?: number; cy?: number; stroke?: string }) => {
  const { cx, cy, stroke } = props;
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="white" strokeWidth={2} />;
};

function ActivityTrendCard() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#94A3B8" }}>
          Actividad de archivos
        </p>
        <h2
          className="text-base font-extrabold"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Subidas y descargas — últimos 8 días
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={ACTIVITY_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <LineTooltip
            contentStyle={{
              background: "white",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 20px rgba(14,30,60,0.10)",
            }}
            labelStyle={{ color: "#0F172A", fontWeight: 700, marginBottom: 4 }}
            itemStyle={{ color: "#334155" }}
            cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(v) => <span style={{ color: "#64748B", fontWeight: 600 }}>{v === "subidas" ? "Subidas" : "Descargas"}</span>}
          />
          <Line
            type="monotone"
            dataKey="subidas"
            stroke="#2E9BFF"
            strokeWidth={2}
            dot={<CustomLineDot stroke="#2E9BFF" />}
            activeDot={{ r: 6, fill: "#2E9BFF", stroke: "white", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="descargas"
            stroke="#00C896"
            strokeWidth={2}
            dot={<CustomLineDot stroke="#00C896" />}
            activeDot={{ r: 6, fill: "#00C896", stroke: "white", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Storage growth card ───────────────────────────────────────────────────────

function GrowthCard() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#94A3B8" }}>
          Crecimiento de almacenamiento
        </p>
        <h2
          className="text-base font-extrabold"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Espacio utilizado — últimos 6 meses
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={GROWTH_DATA} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#2E9BFF" stopOpacity={1} />
              <stop offset="100%" stopColor="#00D1C1" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            unit=" GB"
          />
          <ReTooltip
            contentStyle={{
              background: "white",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 20px rgba(14,30,60,0.10)",
            }}
            labelStyle={{ color: "#0F172A", fontWeight: 700, marginBottom: 4 }}
            formatter={(v) => [`${v} GB`, "Almacenamiento usado"]}
            cursor={{ fill: "rgba(46,155,255,0.06)" }}
          />
          <Bar dataKey="gb" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Activity timeline card ────────────────────────────────────────────────────

function TimelineCard() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? ACTIVITY : ACTIVITY.slice(0, 5);

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #F1F5F9" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#94A3B8" }}>
            Línea de tiempo
          </p>
          <h2
            className="text-base font-extrabold"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Actividad reciente
          </h2>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "#E0F4FF", color: "#2E9BFF" }}
        >
          {ACTIVITY.length} eventos
        </span>
      </div>

      <div className="px-6 py-4 flex flex-col gap-0">
        {visible.map((item, idx) => (
          <div key={item.id} className="flex gap-4 relative">
            {/* Vertical connector */}
            {idx < visible.length - 1 && (
              <div
                className="absolute left-[17px] top-8 w-px"
                style={{ height: "calc(100% - 8px)", background: "#F1F5F9" }}
              />
            )}

            {/* Icon bubble */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5"
              style={{
                background: item.color + "18",
                border: `1.5px solid ${item.color}30`,
                color: item.color,
              }}
            >
              <NavIcon id={item.icon} size={15} />
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-snug" style={{ color: "#334155" }}>
                  <span className="font-semibold" style={{ color: "#0F172A" }}>
                    {item.label}
                  </span>{" "}
                  <span
                    className="font-medium truncate"
                    style={{ color: item.color }}
                    title={item.file}
                  >
                    {item.file.length > 32 ? item.file.slice(0, 32) + "…" : item.file}
                  </span>
                </p>
                <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: "#94A3B8" }}>
                  {item.time}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {ACTIVITY.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mx-6 mb-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
          style={{ background: "#F8FAFC", color: "#64748B", border: "1px solid #E2E8F0" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#64748B"; }}
        >
          {expanded ? (
            <>Ver menos <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 7.5L6 4.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>
          ) : (
            <>Ver {ACTIVITY.length - 5} más <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>
          )}
        </button>
      )}
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow() {
  const stats = [
    { label: "Subidas este mes",    value: "32",        sub: "↑ 8 vs mes anterior",   color: "#2E9BFF",  bg: "#E0F4FF" },
    { label: "Descargas este mes",  value: "24",        sub: "↓ 3 vs mes anterior",   color: "#00C896",  bg: "#F0FDF9" },
    { label: "Archivos compartidos",value: "9",         sub: "con 4 colaboradores",    color: "#A78BFA",  bg: "#F5F3FF" },
    { label: "Espacio recuperado",  value: "5.2 GB",    sub: "archivos eliminados",    color: "#F59E0B",  bg: "#FFFBEB" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, color, bg }) => (
        <div
          key={label}
          className="rounded-2xl p-5"
          style={{ background: "white", border: "1px solid #E2E8F0" }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>{label}</p>
          </div>
          <p
            className="text-2xl font-extrabold leading-none mb-1"
            style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {value}
          </p>
          <p className="text-xs" style={{ color: "#94A3B8" }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface ConsumptionProps {
  onLogout: () => void;
  onDashboard: () => void;
  onPlans: () => void;
  onFiles?: () => void;
  onPayments?: () => void;
}

export default function Consumption({ onLogout, onDashboard, onPlans, onFiles, onPayments }: ConsumptionProps) {
  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans")   onPlans();
    else if (id === "files" && onFiles) onFiles();
    else if (id === "payments" && onPayments) onPayments();
  }

  return (
    <AppShell
      activeNav="dashboard"
      onNav={handleNav}
      onLogout={onLogout}
      onUpload={() => {}}
      headerTitle="Consumo y actividad"
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-5">

          {/* Warning badge — only when ≥ 90% */}
          {WARN && <WarnBadge />}

          {/* Demo: always show badge for design review (remove in production) */}
          {!WARN && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#F0FDF9", border: "1px solid #A7F3D0", color: "#065F46" }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00C896" }} />
              Almacenamiento en buen estado — {FREE_GB} GB disponibles.
              El badge de advertencia <strong>"Cerca del límite"</strong> aparece automáticamente cuando el uso supera el 90%.
            </div>
          )}

          {/* Stat row */}
          <StatRow />

          {/* Donut + timeline */}
          <div className="grid lg:grid-cols-2 gap-5">
            <DonutCard />
            <TimelineCard />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-2 gap-5">
            <ActivityTrendCard />
            <GrowthCard />
          </div>

        </div>
      </main>
    </AppShell>
  );
}
