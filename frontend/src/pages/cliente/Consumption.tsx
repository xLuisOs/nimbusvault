import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip,
  BarChart, Bar, Legend,
} from "recharts";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";

// ── Palette & data ────────────────────────────────────────────────────────────

// Categorical palette — fixed order, CVD-safe (validated via OKLab hue separation)
const CAT = {
  docs:   { color: "#2E9BFF", label: "Documentos" },
  images: { color: "#00C896", label: "Imágenes" },
  other:  { color: "#F59E0B", label: "Otros" },
  zip:    { color: "#A78BFA", label: "Comprimidos" },
};

function getStorageMetrics() {
  const { used, total, pct } = useAlmacenamiento();
  const free = Math.max(0, total - used);
  return { used, total, free, pct, warn: pct >= 90 };
}

function buildCategoryData(usedGb: number) {
  const categories = [
    { key: "docs", color: CAT.docs.color, label: CAT.docs.label, gb: Number((usedGb * 0.38).toFixed(1)) },
    { key: "images", color: CAT.images.color, label: CAT.images.label, gb: Number((usedGb * 0.27).toFixed(1)) },
    { key: "other", color: CAT.other.color, label: CAT.other.label, gb: Number((usedGb * 0.2).toFixed(1)) },
    { key: "zip", color: CAT.zip.color, label: CAT.zip.label, gb: Number((usedGb - (usedGb * 0.38 + usedGb * 0.27 + usedGb * 0.2)).toFixed(1)) },
  ];

  return categories.map((item) => ({
    ...item,
    gb: Math.max(0.1, item.gb),
  }));
}

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

function getGrowthData(usedGb: number) {
  return [
    { mes: "Abr", gb: 18 },
    { mes: "May", gb: 27 },
    { mes: "Jun", gb: 34 },
    { mes: "Jul", gb: 45 },
    { mes: "Ago", gb: 55 },
    { mes: "Sep", gb: Math.max(0.1, usedGb) },
  ];

import { useResumenEspacio } from "@/api/almacenamiento";
import SubirArchivoModal from "@/components/SubirArchivoModal";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import type { ResumenEspacio } from "@/types";
import { EVENTO_META } from "@/utils/actividad";
import { diaCorto, formatoBytes, formatoGB, formatoModificado, nombreMes, variacion } from "@/utils/format";

// ── Paleta por tipo de archivo (orden fijo para que cada tipo tenga siempre su color) ──

const COLOR_CATEGORIA: Record<string, string> = {
  documentos:  "#2E9BFF",
  imagenes:    "#00C896",
  videos:      "#EC4899",
  audio:       "#06B6D4",
  comprimidos: "#A78BFA",
  otros:       "#F59E0B",
};

/** Unidad para las gráficas según el valor más grande (no tiene sentido graficar 0.0001 GB). */
function unidadPara(maxBytes: number): { nombre: string; divisor: number } {
  if (maxBytes >= 1024 ** 3) return { nombre: "GB", divisor: 1024 ** 3 };
  if (maxBytes >= 1024 ** 2) return { nombre: "MB", divisor: 1024 ** 2 };
  return { nombre: "KB", divisor: 1024 };
}

// ── Warning badge ─────────────────────────────────────────────────────────────

function WarnBadge({ usedPct, freeGb }: { usedPct: number; freeGb: number }) {
function EstadoBadge({ pct, disponible, onPlans }: { pct: number; disponible: number; onPlans: () => void }) {
  if (pct >= 90) {
    return (
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: "var(--nv-amber-soft)", border: "1.5px solid var(--nv-amber-border)", color: "var(--nv-amber-strong)" }}
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round" fill="var(--nv-amber-soft)"/>
            <path d="M8 6v3M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Cerca del límite: usaste el {pct}% de tu espacio.
        </span>
        <button onClick={onPlans} className="text-xs font-bold underline">Ampliar mi plan</button>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
      style={{ background: "var(--nv-green-soft)", border: "1px solid var(--nv-green-border)", color: "var(--nv-green-strong)" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
        <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round" fill="#FFFBEB"/>
        <path d="M8 6v3M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Cerca del límite — usaste el {usedPct}% de tu espacio. Considera ampliar tu plan.
      {freeGb > 0 && <span className="font-medium">({freeGb.toFixed(1)} GB disponibles)</span>}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00C896" }} />
      Almacenamiento en buen estado: te quedan {formatoBytes(disponible)} disponibles.
    </div>
  );
}

// ── Custom donut tooltip ──────────────────────────────────────────────────────

function DonutTooltip({ active, payload, totalGb }: { active?: boolean; payload?: { name: string; value: number; payload: { color: string } }[]; totalGb: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = ((p.value / totalGb) * 100).toFixed(1);
function DonutTooltip({ active, payload, cuota }: {
  active?: boolean; cuota: number;
  payload?: { name: string; value: number; payload: { color: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const pct = cuota ? ((p.value / cuota) * 100).toFixed(1) : "0";
  return (
    <div
      className="px-3.5 py-2.5 rounded-xl text-sm shadow-xl"
      style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)", boxShadow: "0 4px 20px rgba(14,30,60,0.12)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.payload.color }} />
        <span className="font-semibold" style={{ color: "var(--nv-text-1)" }}>{p.name}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatoBytes(p.value)}
        </span>
        <span className="text-xs" style={{ color: "var(--nv-text-4)" }}>({pct}% del plan)</span>
      </div>
    </div>
  );
}

// ── Donut card ────────────────────────────────────────────────────────────────

function DonutCard({ resumen }: { resumen: ResumenEspacio }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const { used, total, free, pct, warn } = getStorageMetrics();
  const categories = buildCategoryData(used);
  const donutData = [
    ...categories.map(({ color, label, gb }) => ({ name: label, value: gb, color })),
    { name: "Disponible", value: free, color: "#E2E8F0" },
  const { usado_bytes: usado, cuota_bytes: cuota, por_categoria } = resumen;
  const libre = Math.max(cuota - usado, 0);
  const pct = cuota ? Math.round((usado / cuota) * 100) : 0;
  const cats = por_categoria.map((c) => ({ ...c, color: COLOR_CATEGORIA[c.categoria] ?? "var(--nv-text-4)" }));

  // El espacio libre casi siempre domina: se dibuja aparte para que los tipos se alcancen a ver
  const data = [
    ...cats.map((c) => ({ name: c.etiqueta, value: c.bytes, color: c.color })),
    { name: "Disponible", value: libre, color: "var(--nv-border)" },
  ];

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nv-text-4)" }}>
            Distribución del almacenamiento
          </p>
          <h2
            className="text-base font-extrabold"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {used.toFixed(1)} GB usados de {total} GB
          <h2 className="text-base font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {formatoBytes(usado)} usados de {formatoGB(Math.round(cuota / 1024 ** 3))}
          </h2>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: warn ? "#FFFBEB" : "#E0F4FF", color: warn ? "#B45309" : "#2E9BFF" }}
          style={{ background: pct >= 90 ? "var(--nv-amber-soft)" : "var(--nv-blue-soft)", color: pct >= 90 ? "var(--nv-amber-strong)" : "#2E9BFF" }}
        >
          {pct}% usado
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={90}
                paddingAngle={cats.length ? 2 : 0}
                minAngle={cats.length ? 4 : 0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                onMouseEnter={(_, idx) => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
                strokeWidth={0}
              >
                {donutData.map((entry, idx) => (
                {data.map((entry, idx) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={activeIdx === null || activeIdx === idx ? 1 : 0.45}
                    stroke="var(--nv-surface)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <ReTooltip content={<DonutTooltip totalGb={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p
              className="text-2xl font-extrabold leading-none"
              style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              <ReTooltip content={<DonutTooltip cuota={cuota} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-extrabold leading-none" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {pct}%
            </p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--nv-text-4)" }}>utilizado</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 w-full">
          {categories.map(({ color, label, gb }, idx) => {
            const pctByType = total ? ((gb / total) * 100).toFixed(1) : "0.0";
          {cats.length === 0 && (
            <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>Todavía no tienes archivos guardados.</p>
          )}
          {cats.map(({ color, etiqueta, bytes, archivos }, idx) => {
            const deLoUsado = usado ? (bytes / usado) * 100 : 0;
            const isActive = activeIdx === null || activeIdx === idx;
            return (
              <div
                key={etiqueta}
                className="flex items-center gap-3 cursor-default transition-opacity"
                style={{ opacity: isActive ? 1 : 0.4 }}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#334155" }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{gb.toFixed(1)} GB</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#F1F5F9" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pctByType}%`, background: color }}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-semibold w-10 text-right" style={{ color: "#94A3B8" }}>{pctByType}%</span>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1.5" style={{ borderTop: "1px solid #F1F5F9" }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "#E2E8F0" }} />
            <span className="text-xs flex-1" style={{ color: "#94A3B8" }}>Disponible</span>
            <span className="text-xs font-bold" style={{ color: "#94A3B8" }}>{free.toFixed(1)} GB</span>
                    <span className="text-xs font-medium" style={{ color: "var(--nv-text-2)" }}>
                      {etiqueta} <span style={{ color: "var(--nv-text-4)" }}>· {archivos}</span>
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--nv-text-1)" }}>{formatoBytes(bytes)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--nv-muted)" }}>
                    <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${deLoUsado}%`, background: color }} />
                  </div>
                </div>
                <span className="text-[10px] font-semibold w-10 text-right" style={{ color: "var(--nv-text-4)" }}>
                  {deLoUsado.toFixed(0)}%
                </span>
              </div>
            );
          })}
          {/* Available row */}
          <div className="flex items-center gap-3 pt-1.5" style={{ borderTop: "1px solid var(--nv-muted)" }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: "var(--nv-border)" }} />
            <span className="text-xs flex-1" style={{ color: "var(--nv-text-4)" }}>Disponible</span>
            <span className="text-xs font-bold" style={{ color: "var(--nv-text-4)" }}>{formatoBytes(libre)}</span>
          </div>
          {cats.length > 0 && (
            <p className="text-[10px]" style={{ color: "var(--nv-border-strong)" }}>El porcentaje de cada tipo es sobre lo que tienes guardado.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity trend card ───────────────────────────────────────────────────────

const CustomLineDot = (props: { cx?: number; cy?: number; stroke?: string }) => {
  const { cx, cy, stroke } = props;
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="var(--nv-surface)" strokeWidth={2} />;
};

function ActivityTrendCard({ resumen }: { resumen: ResumenEspacio }) {
  const data = resumen.tendencia.map((p) => ({ ...p, day: diaCorto(p.dia) }));
  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nv-text-4)" }}>
          Actividad de archivos
        </p>
        <h2 className="text-base font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Subidas y descargas · últimos 8 días
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nv-muted)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--nv-text-4)", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--nv-text-4)" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <LineTooltip
            contentStyle={{
              background: "var(--nv-surface)", border: "1px solid var(--nv-border)", borderRadius: "12px", fontSize: "12px",
              boxShadow: "0 4px 20px rgba(14,30,60,0.10)",
            }}
            labelStyle={{ color: "var(--nv-text-1)", fontWeight: 700, marginBottom: 4 }}
            itemStyle={{ color: "var(--nv-text-2)" }}
            cursor={{ stroke: "var(--nv-border)", strokeWidth: 1 }}
            formatter={(v, nombre) => [v, nombre === "subidas" ? "Subidas" : "Descargas"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(v) => <span style={{ color: "var(--nv-text-3)", fontWeight: 600 }}>{v === "subidas" ? "Subidas" : "Descargas"}</span>}
          />
          <Line type="monotone" dataKey="subidas" stroke="#2E9BFF" strokeWidth={2}
            dot={<CustomLineDot stroke="#2E9BFF" />} activeDot={{ r: 6, fill: "#2E9BFF", stroke: "var(--nv-surface)", strokeWidth: 2 }} />
          <Line type="monotone" dataKey="descargas" stroke="#00C896" strokeWidth={2}
            dot={<CustomLineDot stroke="#00C896" />} activeDot={{ r: 6, fill: "#00C896", stroke: "var(--nv-surface)", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Storage growth card ───────────────────────────────────────────────────────

function GrowthCard() {
  const { used } = getStorageMetrics();
  const growthData = getGrowthData(used);

function GrowthCard({ resumen }: { resumen: ResumenEspacio }) {
  const unidad = unidadPara(Math.max(...resumen.crecimiento.map((p) => p.bytes), 1));
  const data = resumen.crecimiento.map((p) => ({
    mes: nombreMes(p.mes),
    valor: +(p.bytes / unidad.divisor).toFixed(2),
    bytes: p.bytes,
  }));
  return (
    <div className="rounded-2xl p-6" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nv-text-4)" }}>
          Crecimiento de almacenamiento
        </p>
        <h2 className="text-base font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Espacio utilizado al cierre de cada mes
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barSize={28}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E9BFF" stopOpacity={1} />
              <stop offset="100%" stopColor="#00D1C1" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--nv-muted)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--nv-text-4)", fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--nv-text-4)" }} axisLine={false} tickLine={false} unit={` ${unidad.nombre}`} />
          <ReTooltip
            contentStyle={{
              background: "var(--nv-surface)", border: "1px solid var(--nv-border)", borderRadius: "12px", fontSize: "12px",
              boxShadow: "0 4px 20px rgba(14,30,60,0.10)",
            }}
            labelStyle={{ color: "var(--nv-text-1)", fontWeight: 700, marginBottom: 4 }}
            formatter={(_v, _n, item) => [formatoBytes((item.payload as { bytes: number }).bytes), "Almacenamiento usado"]}
            cursor={{ fill: "rgba(46,155,255,0.06)" }}
          />
          <Bar dataKey="valor" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Activity timeline card ────────────────────────────────────────────────────

function TimelineCard({ resumen }: { resumen: ResumenEspacio }) {
  const [expanded, setExpanded] = useState(false);
  const eventos = resumen.actividad;
  const visible = expanded ? eventos : eventos.slice(0, 5);

  return (
    <div className="rounded-2xl flex flex-col" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--nv-text-4)" }}>Línea de tiempo</p>
          <h2 className="text-base font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Actividad reciente
          </h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--nv-blue-soft)", color: "#2E9BFF" }}>
          {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="px-6 py-4 flex flex-col gap-0">
        {visible.map((item, idx) => (
          <div key={item.id} className="flex gap-4 relative">
            {idx < visible.length - 1 && (
              <div
                className="absolute left-[17px] top-8 w-px"
                style={{ height: "calc(100% - 8px)", background: "#F1F5F9" }}
              />
            )}

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
        {eventos.length === 0 && (
          <p className="text-xs py-6 text-center" style={{ color: "var(--nv-text-4)" }}>
            Cuando subas, descargues o elimines archivos aparecerá aquí.
          </p>
        )}
        {visible.map((item, idx) => {
          const meta = EVENTO_META[item.tipo];
          return (
            <div key={`${item.creado_en}-${idx}`} className="flex gap-4 relative">
              {idx < visible.length - 1 && (
                <div className="absolute left-[17px] top-8 w-px" style={{ height: "calc(100% - 8px)", background: "var(--nv-muted)" }} />
              )}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5"
                style={{ background: meta.color + "18", border: `1.5px solid ${meta.color}30`, color: meta.color }}
              >
                <NavIcon id={meta.icon} size={15} />
              </div>
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-snug min-w-0" style={{ color: "var(--nv-text-2)" }}>
                    <span className="font-semibold" style={{ color: "var(--nv-text-1)" }}>{meta.etiqueta}</span>{" "}
                    <span className="font-medium" style={{ color: meta.color }} title={item.descripcion}>
                      {item.descripcion.length > 32 ? item.descripcion.slice(0, 32) + "…" : item.descripcion}
                    </span>
                  </p>
                  <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: "var(--nv-text-4)" }}>
                    {formatoModificado(item.creado_en)}
                  </span>
                </div>
                {item.tamano_bytes > 0 && (
                  <p className="text-[11px]" style={{ color: "var(--nv-text-4)" }}>{formatoBytes(item.tamano_bytes)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {eventos.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mx-6 mb-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
          style={{ background: "var(--nv-bg)", color: "var(--nv-text-3)", border: "1px solid var(--nv-border)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-muted)"; e.currentTarget.style.color = "var(--nv-text-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--nv-bg)"; e.currentTarget.style.color = "var(--nv-text-3)"; }}
        >
          {expanded ? (
            <>Ver menos <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 7.5L6 4.5l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>
          ) : (
            <>Ver {eventos.length - 5} más <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg></>
          )}
        </button>
      )}
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow() {
  const { used, total, free } = getStorageMetrics();
  const stats = [
    { label: "Subidas este mes",    value: "32",        sub: "↑ 8 vs mes anterior",   color: "#2E9BFF",  bg: "#E0F4FF" },
    { label: "Descargas este mes",  value: "24",        sub: "↓ 3 vs mes anterior",   color: "#00C896",  bg: "#F0FDF9" },
    { label: "Archivos compartidos",value: "9",         sub: "con 4 colaboradores",    color: "#A78BFA",  bg: "#F5F3FF" },
    { label: "Espacio recuperado",  value: `${Math.max(0.1, free).toFixed(1)} GB`, sub: "disponible actual", color: "#F59E0B", bg: "#FFFBEB" },
function StatRow({ resumen }: { resumen: ResumenEspacio }) {
  const m = resumen.este_mes;
  const stats = [
    { label: "Subidas este mes", value: String(m.subidas), sub: variacion(m.subidas, m.subidas_mes_anterior), color: "#2E9BFF", bg: "var(--nv-blue-soft)" },
    { label: "Descargas este mes", value: String(m.descargas), sub: variacion(m.descargas, m.descargas_mes_anterior), color: "#00C896", bg: "var(--nv-green-soft)" },
    { label: "Archivos guardados", value: String(resumen.archivos), sub: `en ${resumen.carpetas} carpeta${resumen.carpetas !== 1 ? "s" : ""}`, color: "#A78BFA", bg: "var(--nv-violet-soft)" },
    { label: "Espacio liberado", value: formatoBytes(m.bytes_eliminados), sub: "archivos eliminados este mes", color: "#F59E0B", bg: "var(--nv-amber-soft)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, sub, color, bg }) => (
        <div key={label} className="rounded-2xl p-5" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            </div>
            <p className="text-xs font-semibold" style={{ color: "var(--nv-text-4)" }}>{label}</p>
          </div>
          <p className="text-2xl font-extrabold leading-none mb-1" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {value}
          </p>
          <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>{sub}</p>
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
  const { used, total, free, pct, warn } = getStorageMetrics();
  const { resumen, error, recargar } = useResumenEspacio();
  const { pct, disponibleBytes } = useAlmacenamiento();
  const [uploadOpen, setUploadOpen] = useState(false);

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
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
          {warn && <WarnBadge usedPct={pct} freeGb={free} />}

          {!warn && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#F0FDF9", border: "1px solid #A7F3D0", color: "#065F46" }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#00C896" }} />
              Almacenamiento en buen estado — {free.toFixed(1)} GB disponibles.
              El badge de advertencia <strong>"Cerca del límite"</strong> aparece automáticamente cuando el uso supera el 90%.
            </div>
          )}

          <StatRow />

          <div className="grid lg:grid-cols-2 gap-5">
            <DonutCard />
            <TimelineCard />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <ActivityTrendCard />
            <GrowthCard />
    <>
      <AppShell
        activeNav="consumption"
        onNav={handleNav}
        onLogout={onLogout}
        onUpload={() => setUploadOpen(true)}
        headerTitle="Consumo y actividad"
      >
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-5">
            {error && (
              <p className="text-xs px-4 py-2.5 rounded-xl" style={{ background: "var(--nv-red-soft)", color: "var(--nv-red-strong)" }}>
                No se pudo cargar tu consumo: {error}
              </p>
            )}
            {!resumen && !error && (
              <p className="text-sm text-center py-16" style={{ color: "var(--nv-text-4)" }}>Cargando tu consumo…</p>
            )}
            {resumen && (
              <>
                <EstadoBadge pct={pct} disponible={disponibleBytes} onPlans={onPlans} />
                <StatRow resumen={resumen} />
                <div className="grid lg:grid-cols-2 gap-5">
                  <DonutCard resumen={resumen} />
                  <TimelineCard resumen={resumen} />
                </div>
                <div className="grid lg:grid-cols-2 gap-5">
                  <ActivityTrendCard resumen={resumen} />
                  <GrowthCard resumen={resumen} />
                </div>
              </>
            )}
          </div>
        </main>
      </AppShell>
      {uploadOpen && <SubirArchivoModal onClose={() => setUploadOpen(false)} onSubido={recargar} onVerArchivos={onFiles} />}
    </>
  );
}
