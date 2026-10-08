// Historial de pagos (3.8). Los datos salen de GET /api/pagos; el comprobante, de GET /api/pagos/{id}/comprobante.
import { useEffect, useMemo, useState } from "react";

import { pagosApi } from "@/api/pagos";
import { usePlanes } from "@/api/planes";
import AppShell, { NavIcon } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import type { Pago } from "@/types";
import { guardarBlob } from "@/utils/archivos";
import { formatoDolares, formatoFecha } from "@/utils/format";

// ── Data ──────────────────────────────────────────────────────────────────────

type PayStatus = "pagado" | "pendiente" | "fallido";

interface Payment {
  id: string;           // id_pago
  comprobante: string;
  date: string;         // ISO
  dateLabel: string;
  plan: string;
  periodicidad: string;
  amount: number;
  status: PayStatus;
  method: string;
  last4: string;
}

// Estados del backend → como los nombra la pantalla
const ESTADOS: Record<Pago["estado"], PayStatus> = {
  aprobado: "pagado",
  pendiente: "pendiente",
  rechazado: "fallido",
};

const MARCAS: Record<string, { label: string; color: string }> = {
  visa:       { label: "Visa",       color: "#1A1F71" },
  mastercard: { label: "Mastercard", color: "#EB001B" },
  amex:       { label: "Amex",       color: "#007BC1" },
  otra:       { label: "Tarjeta",    color: "#64748B" },
};

function aVista(p: Pago): Payment {
  const fecha = p.fecha_pago ?? p.vigencia_inicio;
  return {
    id: p.id_pago,
    comprobante: p.numero_comprobante,
    date: fecha,
    dateLabel: new Date(fecha).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" }),
    plan: p.plan_nombre,
    periodicidad: p.periodicidad,
    amount: Number(p.monto),
    status: ESTADOS[p.estado],
    method: p.marca_tarjeta ?? "",
    last4: p.ultimos_4 ?? "—",
  };
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PayStatus, { bg: string; text: string; dot: string; label: string }> = {
  pagado:    { bg: "rgba(0,200,150,0.10)",  text: "#009971", dot: "#00C896", label: "Pagado"    },
  pendiente: { bg: "rgba(251,191,36,0.12)", text: "#B45309", dot: "#FBBF24", label: "Pendiente" },
  fallido:   { bg: "rgba(255,107,107,0.12)",text: "#DC2626", dot: "#FF6B6B", label: "Fallido"   },
};

function StatusBadge({ status }: { status: PayStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ payments }: { payments: Payment[] }) {
  const { usuario } = useAuth();
  const total     = payments.reduce((s, p) => s + (p.status === "pagado" ? p.amount : 0), 0);
  const pending   = payments.filter((p) => p.status === "pendiente").length;
  const failed    = payments.filter((p) => p.status === "fallido").length;
  const sus       = usuario?.suscripcion;

  const cards = [
    { label: "Total pagado",      value: formatoDolares(total.toFixed(2)), sub: "historial completo",     color: "#00C896", bg: "#F0FDF9" },
    { label: "Pagos pendientes",  value: String(pending),              sub: pending ? "requieren atención" : "todo al día", color: pending ? "#B45309" : "#00C896", bg: pending ? "#FFFBEB" : "#F0FDF9" },
    { label: "Pagos fallidos",    value: String(failed),               sub: failed  ? "revisar método de pago" : "sin problemas",  color: failed  ? "#DC2626" : "#00C896", bg: failed  ? "#FEF2F2" : "#F0FDF9" },
    { label: "Plan actual",       value: sus?.plan_nombre ?? "—",      sub: sus ? `vigente hasta el ${formatoFecha(sus.fecha_fin)}` : "sin plan activo", color: "#2E9BFF", bg: "#E0F4FF" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, sub, color }) => (
        <div key={label} className="rounded-2xl p-5" style={{ background: "white", border: "1px solid #E2E8F0" }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: "#94A3B8" }}>{label}</p>
          <p
            className="text-2xl font-extrabold mb-0.5"
            style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {value}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <p className="text-xs" style={{ color: "#94A3B8" }}>{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const SELECT_STYLE: React.CSSProperties = {
  background: "white",
  border: "1px solid #E2E8F0",
  color: "#334155",
  borderRadius: "10px",
  padding: "8px 32px 8px 12px",
  fontSize: "13px",
  fontWeight: 500,
  appearance: "none",
  outline: "none",
  cursor: "pointer",
};

interface FilterBarProps {
  status: string;
  plan: string;
  period: string;
  planOptions: string[];
  onStatus: (v: string) => void;
  onPlan: (v: string) => void;
  onPeriod: (v: string) => void;
  onReset: () => void;
  total: number;
  filtered: number;
}

function FilterBar({ status, plan, period, planOptions, onStatus, onPlan, onPeriod, onReset, total, filtered }: FilterBarProps) {
  const hasFilter = status !== "all" || plan !== "all" || period !== "all";

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status */}
        <div className="relative">
          <select value={status} onChange={(e) => onStatus(e.target.value)} style={SELECT_STYLE}>
            <option value="all">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }}>
            <NavIcon id="sort" size={12} />
          </span>
        </div>

        {/* Plan (nombres reales del catálogo y de los pagos) */}
        <div className="relative">
          <select value={plan} onChange={(e) => onPlan(e.target.value)} style={SELECT_STYLE}>
            <option value="all">Todos los planes</option>
            {planOptions.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }}>
            <NavIcon id="sort" size={12} />
          </span>
        </div>

        {/* Period */}
        <div className="relative">
          <select value={period} onChange={(e) => onPeriod(e.target.value)} style={SELECT_STYLE}>
            <option value="all">Todo el tiempo</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último año</option>
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }}>
            <NavIcon id="sort" size={12} />
          </span>
        </div>

        {hasFilter && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            style={{ color: "#94A3B8", background: "#F1F5F9" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#E2E8F0"; e.currentTarget.style.color = "#334155"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Limpiar
          </button>
        )}
      </div>

      <p className="text-xs" style={{ color: "#94A3B8" }}>
        {filtered === total
          ? `${total} registros`
          : <><span className="font-semibold" style={{ color: "#334155" }}>{filtered}</span> de {total} registros</>}
      </p>
    </div>
  );
}

// ── Payments table ────────────────────────────────────────────────────────────

function PaymentRow({ payment, idx }: { payment: Payment; idx: number }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (payment.status !== "pagado" || downloading) return;
    setDownloading(true);
    setError("");
    try {
      guardarBlob(await pagosApi.comprobante(payment.id), `comprobante-${payment.comprobante}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = payment.status === "pagado";
  const marca = MARCAS[payment.method];

  return (
    <tr
      className="group transition-colors duration-100"
      style={{ background: idx % 2 === 0 ? "white" : "#FAFBFC" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F0F9FF"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "white" : "#FAFBFC"; }}
    >
      {/* Fecha */}
      <td className="px-5 py-4">
        <div>
          <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{payment.dateLabel}</p>
          <p className="text-xs mt-0.5 font-mono" style={{ color: "#94A3B8" }}>{payment.comprobante}</p>
        </div>
      </td>

      {/* Plan */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #E0F4FF, #ddfaf7)", border: "1px solid #BAE6FD" }}
          >
            <NavIcon id="cloud" size={13} />
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: "#334155" }}>Plan {payment.plan}</span>
            <p className="text-[10px] capitalize" style={{ color: "#94A3B8" }}>{payment.periodicidad}</p>
          </div>
        </div>
      </td>

      {/* Monto */}
      <td className="px-5 py-4">
        <span
          className="text-sm font-extrabold"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          ${payment.amount.toFixed(2)}
        </span>
      </td>

      {/* Método */}
      <td className="px-5 py-4 hidden md:table-cell">
        {marca ? (
          <div className="flex items-center gap-1.5">
            <div
              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold"
              style={{ background: marca.color + "10", color: marca.color }}
            >
              {marca.label}
            </div>
            <span className="text-xs" style={{ color: "#94A3B8" }}>•••• {payment.last4}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: "#CBD5E1" }}>—</span>
        )}
      </td>

      {/* Estado */}
      <td className="px-5 py-4">
        <StatusBadge status={payment.status} />
      </td>

      {/* Comprobante */}
      <td className="px-5 py-4">
        <button
          onClick={handleDownload}
          disabled={!canDownload}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{
            background: canDownload ? "#E0F4FF" : "#F8FAFC",
            color: canDownload ? "#2E9BFF" : "#CBD5E1",
            cursor: canDownload ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => { if (canDownload) { e.currentTarget.style.background = "#BAE6FD"; } }}
          onMouseLeave={(e) => { if (canDownload) { e.currentTarget.style.background = "#E0F4FF"; } }}
          title={error || (canDownload ? "Descargar comprobante" : "Sin comprobante disponible")}
        >
          {downloading ? (
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="rgba(46,155,255,0.3)" strokeWidth="1.5"/>
              <path d="M6.5 1.5a5 5 0 0 1 5 5" stroke="#2E9BFF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <NavIcon id="download" size={13} />
          )}
          <span className="hidden sm:inline">{canDownload ? "PDF" : "N/A"}</span>
        </button>
        {error && <p className="text-[10px] mt-1" style={{ color: "#DC2626" }}>No se pudo descargar</p>}
      </td>
    </tr>
  );
}

function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F1F5F9", color: "#CBD5E1" }}>
        <NavIcon id="card" size={28} />
      </div>
      <p className="text-sm font-semibold" style={{ color: "#334155" }}>{titulo}</p>
      <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>{texto}</p>
      {accion}
    </div>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  const headers = ["Fecha", "Plan", "Monto", "Método", "Estado", "Comprobante"];

  if (payments.length === 0) {
    return <EstadoVacio titulo="Sin resultados" texto="No hay pagos que coincidan con los filtros aplicados." />;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {headers.map((h, i) => (
                <th
                  key={h}
                  className={`px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest ${i === 3 ? "hidden md:table-cell" : ""}`}
                  style={{ color: "#334155" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <PaymentRow key={p.id} payment={p} idx={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderTop: "1px solid #F1F5F9", background: "#FAFBFC" }}
      >
        <p className="text-xs" style={{ color: "#94A3B8" }}>
          Mostrando <span className="font-semibold" style={{ color: "#334155" }}>{payments.length}</span> pagos
        </p>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#00C896" }} />
          Total cobrado:{" "}
          <span className="font-bold" style={{ color: "#0F172A" }}>
            ${payments.filter((p) => p.status === "pagado").reduce((s, p) => s + p.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Current plan banner ───────────────────────────────────────────────────────

function CurrentPlanBanner({ onPlans }: { onPlans: () => void }) {
  const { usuario } = useAuth();
  const sus = usuario?.suscripcion;
  const gratis = !sus || Number(sus.precio_contratado) === 0;

  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap mb-6"
      style={{
        background: "linear-gradient(135deg, #062D5B 0%, #0D3F7A 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(46,155,255,0.25)", color: "#4DB8FF" }}
        >
          <NavIcon id="card" size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "#93C5FD" }}>TU PLAN</p>
          {sus ? (
            <p className="text-sm font-bold text-white">
              Plan {sus.plan_nombre} —{" "}
              <span style={{ color: "#4DB8FF" }}>{gratis ? "sin costo" : formatoDolares(sus.precio_contratado)}</span>
              {" "}· vigente hasta el {formatoFecha(sus.fecha_fin)}
            </p>
          ) : (
            <p className="text-sm font-bold text-white">No tienes un plan activo</p>
          )}
        </div>
      </div>
      <button
        onClick={onPlans}
        className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all duration-150"
        style={{ background: "#2E9BFF" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
      >
        {gratis ? "Mejorar plan" : "Cambiar plan"}
      </button>
    </div>
  );
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function exportarCsv(payments: Payment[]) {
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const filas = [
    ["Comprobante", "Fecha", "Plan", "Periodicidad", "Monto (USD)", "Estado", "Método", "Últimos 4"],
    ...payments.map((p) => [
      p.comprobante, p.date.slice(0, 10), p.plan, p.periodicidad, p.amount.toFixed(2),
      STATUS_STYLE[p.status].label, MARCAS[p.method]?.label ?? "", p.last4,
    ]),
  ];
  // BOM para que Excel respete los acentos
  const csv = "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n");
  guardarBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "historial-de-pagos.csv");
}

// ── Root export ───────────────────────────────────────────────────────────────

interface PaymentsProps {
  onLogout: () => void;
  onDashboard: () => void;
  onPlans: () => void;
  onFiles?: () => void;
  onConsumption?: () => void;
}

export default function Payments({ onLogout, onDashboard, onPlans, onFiles, onConsumption }: PaymentsProps) {
  const { planes } = usePlanes();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    pagosApi
      .listar()
      .then((p) => vivo && setPayments(p.map(aVista)))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [version]);

  // Planes del catálogo + los de pagos viejos (un plan desactivado sigue en el historial)
  const planOptions = useMemo(
    () => Array.from(new Set([...planes.filter((p) => Number(p.precio_mensual) > 0).map((p) => p.nombre), ...payments.map((p) => p.plan)])),
    [planes, payments],
  );

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (periodFilter === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (periodFilter === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (periodFilter === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);

    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (planFilter !== "all" && p.plan !== planFilter) return false;
      if (periodFilter !== "all" && new Date(p.date) < cutoff) return false;
      return true;
    });
  }, [payments, statusFilter, planFilter, periodFilter]);

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
    else if (id === "files" && onFiles) onFiles();
    else if (id === "consumption" && onConsumption) onConsumption();
  }

  return (
    <AppShell
      activeNav="payments"
      onNav={handleNav}
      onLogout={onLogout}
      onUpload={() => onFiles?.()}
      headerTitle="Historial de pagos"
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">

          {/* Current plan */}
          <CurrentPlanBanner onPlans={onPlans} />

          {/* Summary cards */}
          <SummaryCards payments={payments} />

          {/* Table section */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "white", border: "1px solid #E2E8F0" }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2
                  className="text-base font-extrabold"
                  style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Todos los pagos
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                  Registro completo de transacciones de tu cuenta (pagos simulados, en USD)
                </p>
              </div>
              <button
                onClick={() => exportarCsv(filtered)}
                disabled={filtered.length === 0}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150"
                style={{
                  color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white",
                  opacity: filtered.length === 0 ? 0.5 : 1, cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (filtered.length) e.currentTarget.style.background = "#E0F4FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
              >
                <NavIcon id="download" size={13} />
                Exportar CSV
              </button>
            </div>

            {cargando ? (
              <p className="text-center text-xs py-20" style={{ color: "#94A3B8" }}>Cargando pagos…</p>
            ) : error ? (
              <EstadoVacio
                titulo="No se pudo cargar el historial"
                texto={error}
                accion={
                  <button
                    onClick={() => setVersion((v) => v + 1)}
                    className="mt-4 px-4 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ background: "#2E9BFF" }}
                  >
                    Reintentar
                  </button>
                }
              />
            ) : payments.length === 0 ? (
              <EstadoVacio
                titulo="Aún no tienes pagos"
                texto="El plan Gratis no genera cobros. Cuando contrates un plan, tus comprobantes aparecerán aquí."
                accion={
                  <button
                    onClick={onPlans}
                    className="mt-4 px-4 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ background: "#2E9BFF" }}
                  >
                    Ver planes
                  </button>
                }
              />
            ) : (
              <>
                <FilterBar
                  status={statusFilter}
                  plan={planFilter}
                  period={periodFilter}
                  planOptions={planOptions}
                  onStatus={setStatusFilter}
                  onPlan={setPlanFilter}
                  onPeriod={setPeriodFilter}
                  onReset={() => { setStatusFilter("all"); setPlanFilter("all"); setPeriodFilter("all"); }}
                  total={payments.length}
                  filtered={filtered.length}
                />

                <PaymentsTable payments={filtered} />
              </>
            )}
          </div>

        </div>
      </main>
    </AppShell>
  );
}
