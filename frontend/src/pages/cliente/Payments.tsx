import { useState, useMemo } from "react";
import AppShell, { NavIcon } from "@/components/layout/AppShell";

// ── Data ──────────────────────────────────────────────────────────────────────

type PayStatus = "pagado" | "pendiente" | "fallido";

interface Payment {
  id: string;
  date: string;         // ISO
  dateLabel: string;
  plan: string;
  amount: number;
  status: PayStatus;
  method: string;
  last4: string;
}

const PAYMENTS: Payment[] = [
  { id: "NV-2026-0091", date: "2026-09-01", dateLabel: "1 sep 2026",  plan: "Pro",      amount: 9,  status: "pagado",    method: "Visa",       last4: "4821" },
  { id: "NV-2026-0078", date: "2026-08-01", dateLabel: "1 ago 2026",  plan: "Pro",      amount: 9,  status: "pagado",    method: "Visa",       last4: "4821" },
  { id: "NV-2026-0065", date: "2026-07-01", dateLabel: "1 jul 2026",  plan: "Pro",      amount: 9,  status: "pagado",    method: "Mastercard", last4: "7734" },
  { id: "NV-2026-0052", date: "2026-06-01", dateLabel: "1 jun 2026",  plan: "Personal", amount: 5,  status: "pagado",    method: "Mastercard", last4: "7734" },
  { id: "NV-2026-0039", date: "2026-05-01", dateLabel: "1 may 2026",  plan: "Personal", amount: 5,  status: "fallido",   method: "Visa",       last4: "4821" },
  { id: "NV-2026-0026", date: "2026-04-01", dateLabel: "1 abr 2026",  plan: "Personal", amount: 5,  status: "pagado",    method: "Visa",       last4: "4821" },
  { id: "NV-2026-0013", date: "2026-03-01", dateLabel: "1 mar 2026",  plan: "Gratis",   amount: 0,  status: "pagado",    method: "Visa",       last4: "4821" },
  { id: "NV-2026-0001", date: "2026-02-01", dateLabel: "1 feb 2026",  plan: "Gratis",   amount: 0,  status: "pendiente", method: "—",          last4: "—"    },
];

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
  const total     = payments.reduce((s, p) => s + (p.status === "pagado" ? p.amount : 0), 0);
  const pending   = payments.filter((p) => p.status === "pendiente").length;
  const failed    = payments.filter((p) => p.status === "fallido").length;
  const lastPlan  = payments.find((p) => p.status === "pagado")?.plan ?? "—";

  const cards = [
    { label: "Total pagado",      value: `$${total.toFixed(2)}`, sub: "historial completo",     color: "#00C896", bg: "#F0FDF9" },
    { label: "Pagos pendientes",  value: String(pending),              sub: pending ? "requieren atención" : "todo al día", color: pending ? "#B45309" : "#00C896", bg: pending ? "#FFFBEB" : "#F0FDF9" },
    { label: "Pagos fallidos",    value: String(failed),               sub: failed  ? "revisar método de pago" : "sin problemas",  color: failed  ? "#DC2626" : "#00C896", bg: failed  ? "#FEF2F2" : "#F0FDF9" },
    { label: "Plan actual",       value: lastPlan,                     sub: "activo este mes",         color: "#2E9BFF", bg: "#E0F4FF" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(({ label, value, sub, color, bg }) => (
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
  onStatus: (v: string) => void;
  onPlan: (v: string) => void;
  onPeriod: (v: string) => void;
  onReset: () => void;
  total: number;
  filtered: number;
}

function FilterBar({ status, plan, period, onStatus, onPlan, onPeriod, onReset, total, filtered }: FilterBarProps) {
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

        {/* Plan */}
        <div className="relative">
          <select value={plan} onChange={(e) => onPlan(e.target.value)} style={SELECT_STYLE}>
            <option value="all">Todos los planes</option>
            <option value="Básico">Básico</option>
            <option value="Personal">Personal</option>
            <option value="Pro">Pro</option>
            <option value="Business">Business</option>
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

  function handleDownload() {
    if (payment.status !== "pagado") return;
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1200);
  }

  const canDownload = payment.status === "pagado";

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
          <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{payment.id}</p>
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
          <span className="text-sm font-semibold" style={{ color: "#334155" }}>Plan {payment.plan}</span>
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
        {payment.last4 !== "—" ? (
          <div className="flex items-center gap-1.5">
            <div
              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold"
              style={{
                background: payment.method === "Visa" ? "#1A1F7110" : "#EB001B10",
                color: payment.method === "Visa" ? "#1A1F71" : "#EB001B",
              }}
            >
              {payment.method}
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
          title={canDownload ? "Descargar comprobante" : "Sin comprobante disponible"}
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
      </td>
    </tr>
  );
}

function PaymentsTable({ payments }: { payments: Payment[] }) {
  const headers = ["Fecha", "Plan", "Monto", "Método", "Estado", "Comprobante"];

  if (payments.length === 0) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
        style={{ background: "white", border: "1px solid #E2E8F0" }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F1F5F9", color: "#CBD5E1" }}>
          <NavIcon id="card" size={28} />
        </div>
        <p className="text-sm font-semibold" style={{ color: "#334155" }}>Sin resultados</p>
        <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>No hay pagos que coincidan con los filtros aplicados.</p>
      </div>
    );
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
                  className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    color: "#334155",
                    display: i === 3 ? undefined : undefined,
                  }}
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

// ── Next payment banner ───────────────────────────────────────────────────────

function NextPaymentBanner({ onPlans }: { onPlans: () => void }) {
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  const label = next.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });

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
          <p className="text-xs font-semibold mb-0.5" style={{ color: "#93C5FD" }}>PRÓXIMO COBRO</p>
          <p className="text-sm font-bold text-white">
            Plan Pro — <span style={{ color: "#4DB8FF" }}>$9.00</span> el {label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150"
          style={{ background: "rgba(255,255,255,0.08)", color: "#93C5FD", border: "1px solid rgba(255,255,255,0.12)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
        >
          Actualizar método de pago
        </button>
        <button
          onClick={onPlans}
          className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all duration-150"
          style={{ background: "#2E9BFF" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
        >
          Cambiar plan
        </button>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface PaymentsProps {
  onLogout: () => void;
  onDashboard: () => void;
  onPlans: () => void;
  onConsumption?: () => void;
}

export default function Payments({ onLogout, onDashboard, onPlans, onConsumption }: PaymentsProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const filtered = useMemo(() => {
    const cutoff = new Date();
    if (periodFilter === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    else if (periodFilter === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (periodFilter === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);

    return PAYMENTS.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (planFilter !== "all" && p.plan !== planFilter) return false;
      if (periodFilter !== "all" && new Date(p.date) < cutoff) return false;
      return true;
    });
  }, [statusFilter, planFilter, periodFilter]);

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
    else if (id === "consumption" && onConsumption) onConsumption();
  }

  return (
    <AppShell
      activeNav="payments"
      onNav={handleNav}
      onLogout={onLogout}
      onUpload={() => {}}
      headerTitle="Historial de pagos"
    >
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">

          {/* Next payment */}
          <NextPaymentBanner onPlans={onPlans} />

          {/* Summary cards */}
          <SummaryCards payments={PAYMENTS} />

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
                  Registro completo de transacciones de tu cuenta
                </p>
              </div>
              <button
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150"
                style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
              >
                <NavIcon id="download" size={13} />
                Exportar CSV
              </button>
            </div>

            <FilterBar
              status={statusFilter}
              plan={planFilter}
              period={periodFilter}
              onStatus={setStatusFilter}
              onPlan={setPlanFilter}
              onPeriod={setPeriodFilter}
              onReset={() => { setStatusFilter("all"); setPlanFilter("all"); setPeriodFilter("all"); }}
              total={PAYMENTS.length}
              filtered={filtered.length}
            />

            <PaymentsTable payments={filtered} />
          </div>

        </div>
      </main>
    </AppShell>
  );
}
