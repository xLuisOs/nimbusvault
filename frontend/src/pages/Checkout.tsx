import { useState } from "react";

import { pagosApi } from "@/api/pagos";
import { useAuth } from "@/context/AuthContext";
import type { Pago, Plan } from "@/types";
import { guardarBlob } from "@/utils/archivos";
import { formatoDolares, formatoFecha, formatoGB } from "@/utils/format";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckoutPlan {
  id: string; // código del plan
  idPlan: string;
  name: string;
  storage: string;
  price: number; // mensual, o mensualizado con descuento si es anual
  annual: boolean;
  discountPct: number;
  vigencia: number; // días que dura el ciclo mensual
  features: string[];
  color: string;
  colorBg: string;
}

/** Adapta el plan de la API (GET /api/planes/{codigo}) a lo que dibuja el checkout. */
export function aCheckoutPlan(p: Plan, annual: boolean): CheckoutPlan {
  return {
    id: p.codigo,
    idPlan: p.id_plan,
    name: p.nombre,
    storage: formatoGB(p.almacenamiento_gb),
    price: Number(annual ? p.precio_anual_mensualizado : p.precio_mensual),
    annual,
    discountPct: p.descuento_anual_pct,
    vigencia: p.vigencia_dias,
    features: p.caracteristicas,
    color: p.color,
    colorBg: p.color + "14", // mismo color con ~8 % de opacidad
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCard(raw: string) {
  return raw
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

function startDate() {
  return new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
}

/** Lo que se cobra hoy: el mes, o los 12 meses con descuento si es anual. */
function totalACobrar(plan: CheckoutPlan) {
  return plan.annual ? `${formatoDolares(plan.price * 12)} al año` : `${formatoDolares(plan.price)}/mes`;
}

function nextBillingDate(annual: boolean, vigenciaDias: number) {
  const d = new Date();
  annual ? d.setFullYear(d.getFullYear() + 1) : d.setDate(d.getDate() + vigenciaDias);
  return d.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
}

function cardBrand(number: string): "visa" | "mc" | "amex" | null {
  const n = number.replace(/\s/g, "");
  if (n.startsWith("4")) return "visa";
  if (n.startsWith("5")) return "mc";
  if (n.startsWith("3")) return "amex";
  return null;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CardBrandBadge({ brand }: { brand: "visa" | "mc" | "amex" | null }) {
  if (!brand) return null;
  const labels: Record<string, string> = { visa: "VISA", mc: "MC", amex: "AMEX" };
  const colors: Record<string, string> = { visa: "#1A1F71", mc: "#EB001B", amex: "#007BC1" };
  return (
    <span
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold px-1.5 py-0.5 rounded"
      style={{ background: colors[brand] + "18", color: colors[brand] }}
    >
      {labels[brand]}
    </span>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="2" y="5.5" width="9" height="6" rx="1.5" stroke="#94A3B8" strokeWidth="1.3" />
      <path d="M4.5 5.5V4a2 2 0 0 1 4 0v1.5" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="6.5" cy="8.5" r="0.8" fill="#94A3B8" />
    </svg>
  );
}

function CloudIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 11a3 3 0 0 1-.35-5.97A4.5 4.5 0 1 1 13 9a2.5 2.5 0 0 1-2.5 2H3Z" stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 select-none focus:outline-none">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white" />
        </svg>
      </div>
      <span
        className="text-lg font-extrabold tracking-tight"
        style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
      </span>
    </button>
  );
}

// ── Input field ───────────────────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  maxLength?: number;
  onChange: (v: string) => void;
  suffix?: React.ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}

function Field({ id, label, placeholder, value, error, maxLength, onChange, suffix, inputMode, autoComplete }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: "#334155" }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150 font-mono"
          style={{
            background: "white",
            border: `1.5px solid ${error ? "#FF6B6B" : focused ? "#2E9BFF" : "#E2E8F0"}`,
            color: "#0F172A",
            boxShadow: focused && !error
              ? "0 0 0 3px rgba(46,155,255,0.12)"
              : error
              ? "0 0 0 3px rgba(255,107,107,0.10)"
              : "none",
            paddingRight: suffix ? "60px" : undefined,
          }}
        />
        {suffix}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#FF6B6B" }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#FF6B6B" strokeWidth="1.3" />
            <path d="M6.5 3.5v3M6.5 8.5v.5" stroke="#FF6B6B" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

// ── Plan summary card ─────────────────────────────────────────────────────────

function PlanSummary({ plan }: { plan: CheckoutPlan }) {
  // plan.price ya viene con el descuento anual aplicado (lo calcula la API)
  const annualTotal = plan.annual ? formatoDolares(plan.price * 12) : null;
  const displayPrice = formatoDolares(plan.price).slice(1);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #E2E8F0", background: "white" }}
    >
      {/* Color bar */}
      <div
        className="h-1.5"
        style={{ background: `linear-gradient(90deg, ${plan.color}, #00D1C1)` }}
      />

      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: plan.colorBg, color: plan.color }}
              >
                {plan.name}
              </span>
              {plan.annual && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#E0FBF9", color: "#00C896" }}
                >
                  Anual −{plan.discountPct}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <CloudIcon color={plan.color} />
              <span className="text-sm font-semibold" style={{ color: "#334155" }}>
                {plan.storage} de almacenamiento
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-xs" style={{ color: "#94A3B8" }}>$</span>
              <span
                className="text-3xl font-extrabold"
                style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {displayPrice}
              </span>
              <span className="text-xs" style={{ color: "#94A3B8" }}>/mes</span>
            </div>
            {plan.annual && annualTotal && (
              <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
                {annualTotal} facturado anualmente
              </p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2.5"
          style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}
        >
          {[
            { label: "Fecha de inicio", value: startDate() },
            { label: "Próxima factura", value: nextBillingDate(plan.annual, plan.vigencia) },
            { label: "Ciclo de facturación", value: plan.annual ? "Anual" : "Mensual" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#94A3B8" }}>{label}</span>
              <span className="text-xs font-semibold" style={{ color: "#334155" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Payment form ──────────────────────────────────────────────────────────────

interface PaymentFormProps {
  plan: CheckoutPlan;
  onConfirm: (pago: Pago) => void;
}

function PaymentForm({ plan, onConfirm }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState("");
  const [loading, setLoading] = useState(false);

  const brand = cardBrand(cardNumber);

  function validate() {
    const e: Record<string, string> = {};
    const digits = cardNumber.replace(/\s/g, "");
    if (!digits) e.card = "Ingresa el número de tarjeta.";
    else if (digits.length < 16) e.card = "El número debe tener 16 dígitos.";
    if (!expiry) e.expiry = "Ingresa la fecha de vencimiento.";
    else if (expiry.length < 5) e.expiry = "Formato MM/AA.";
    else {
      const [mes, anio] = expiry.split("/").map(Number);
      const hoy = new Date();
      if (mes < 1 || mes > 12) e.expiry = "Mes inválido.";
      else if (2000 + anio < hoy.getFullYear() || (2000 + anio === hoy.getFullYear() && mes < hoy.getMonth() + 1))
        e.expiry = "La tarjeta está vencida.";
    }
    if (!cvv) e.cvv = "Ingresa el CVV.";
    else if (cvv.length < 3) e.cvv = "CVV inválido.";
    if (!name.trim()) e.name = "Ingresa el nombre del titular.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setErrorApi("");
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      // Solo viaja al backend; allí se descarta todo menos la marca y los últimos 4 dígitos
      const pago = await pagosApi.contratar(plan.idPlan, plan.annual ? "anual" : "mensual", {
        numero: cardNumber.replace(/\s/g, ""),
        titular: name.trim(),
        vencimiento: expiry,
        cvv,
      });
      onConfirm(pago);
    } catch (err) {
      // p. ej. 409: ya tienes este plan o tus archivos no caben en él
      setErrorApi((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Section label */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
          Método de pago
        </span>
        <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2.5 rounded-xl px-4 py-3"
        style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
          <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#F59E0B" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 6v3M8 10.5v.5" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
          <span className="font-bold">Entorno académico.</span>{" "}
          <span style={{ color: "#94A3B8" }}>Pago simulado con fines académicos. No se realizará ningún cargo real.</span>
        </p>
      </div>

      <Field
        id="card-name"
        label="Nombre del titular"
        placeholder="María García"
        value={name}
        error={errors.name}
        onChange={setName}
        autoComplete="cc-name"
      />

      <Field
        id="card-number"
        label="Número de tarjeta"
        placeholder="1234 5678 9012 3456"
        value={cardNumber}
        error={errors.card}
        maxLength={19}
        inputMode="numeric"
        autoComplete="cc-number"
        onChange={(v) => setCardNumber(formatCard(v))}
        suffix={<CardBrandBadge brand={brand} />}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="expiry"
          label="Vencimiento"
          placeholder="MM/AA"
          value={expiry}
          error={errors.expiry}
          maxLength={5}
          inputMode="numeric"
          autoComplete="cc-exp"
          onChange={(v) => setExpiry(formatExpiry(v))}
        />
        <div className="flex flex-col gap-1.5">
          <Field
            id="cvv"
            label="CVV"
            placeholder="•••"
            value={cvv}
            error={errors.cvv}
            maxLength={4}
            inputMode="numeric"
            autoComplete="cc-csc"
            onChange={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-1.5">
        <LockIcon />
        <span className="text-xs" style={{ color: "#94A3B8" }}>
          Pago simulado · No se realiza ningún cobro real ni se guardan datos de tarjeta
        </span>
      </div>

      {errorApi && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
        >
          <svg width="16" height="16" viewBox="0 0 13 13" fill="none" className="flex-shrink-0 mt-0.5">
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#DC2626" strokeWidth="1.3" />
            <path d="M6.5 3.5v3M6.5 8.5v.5" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {errorApi}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-150"
        style={{
          background: loading ? "#7BBFFF" : "#2E9BFF",
          boxShadow: loading ? "none" : "0 4px 18px rgba(46,155,255,0.32)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "#1E6BD6";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(46,155,255,0.44)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = "#2E9BFF";
            e.currentTarget.style.boxShadow = "0 4px 18px rgba(46,155,255,0.32)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Procesando…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 5h12v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5ZM2 5V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1M6 9h4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Confirmar pago simulado — {totalACobrar(plan)}
          </>
        )}
      </button>

      <p className="text-center text-xs" style={{ color: "#94A3B8" }}>
        Al confirmar aceptas los{" "}
        <a href="#" style={{ color: "#2E9BFF" }} className="hover:underline font-semibold">
          Términos de servicio
        </a>{" "}
        y la{" "}
        <a href="#" style={{ color: "#2E9BFF" }} className="hover:underline font-semibold">
          Política de privacidad
        </a>
      </p>
    </form>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

interface SuccessProps {
  plan: CheckoutPlan;
  pago: Pago;
  onDashboard: () => void;
  onPayments: () => void;
}

function SuccessState({ plan, pago, onDashboard, onPayments }: SuccessProps) {
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  async function descargarComprobante() {
    setDescargando(true);
    setErrorPdf("");
    try {
      guardarBlob(await pagosApi.comprobante(pago.id_pago), `comprobante-${pago.numero_comprobante}.pdf`);
    } catch (e) {
      setErrorPdf((e as Error).message);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-6">
      {/* Animated success ring */}
      <div className="relative flex items-center justify-center mt-2">
        <div
          className="absolute w-28 h-28 rounded-full opacity-15 animate-ping"
          style={{ background: "#00C896", animationDuration: "2.2s" }}
        />
        <div
          className="absolute w-20 h-20 rounded-full opacity-25"
          style={{ background: "#00C896" }}
        />
        <div
          className="relative w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #00C896 0%, #00D1C1 100%)" }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M7 16.5l5.5 5.5L25 10"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div>
        <h2
          className="text-2xl font-extrabold mb-2"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          ¡Tu plan está activo!
        </h2>
        <p className="text-sm" style={{ color: "#64748B" }}>
          Tu suscripción al plan{" "}
          <span className="font-bold" style={{ color: plan.color }}>{plan.name}</span>{" "}
          fue activada exitosamente.
        </p>
      </div>

      {/* Summary pill */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ border: "1px solid #E2E8F0", background: "white" }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${plan.color}, #00D1C1)` }} />
        <div className="px-6 py-5">
          <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>
            Comprobante <span className="font-bold font-mono" style={{ color: "#334155" }}>{pago.numero_comprobante}</span>
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Plan", value: plan.name },
              { label: "Almacenamiento", value: plan.storage },
              { label: "Pagado", value: `${formatoDolares(pago.monto)} (simulado)` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs mb-1" style={{ color: "#94A3B8" }}>{label}</p>
                <p className="text-sm font-bold" style={{ color: "#0F172A" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What's next */}
      <div
        className="w-full rounded-xl p-4 text-left flex flex-col gap-3"
        style={{ background: "#F0FDF9", border: "1px solid #A7F3D0" }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#059669" }}>
          Próximos pasos
        </p>
        {[
          `Tu espacio ya es de ${plan.storage}: puedes subir archivos desde "Mis archivos"`,
          `El comprobante ${pago.numero_comprobante} quedó en tu historial de pagos`,
          `Tu plan está vigente hasta el ${formatoFecha(pago.vigencia_fin)}`,
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
              style={{ background: "#00C896", color: "white" }}
            >
              {i + 1}
            </div>
            <span className="text-sm" style={{ color: "#334155" }}>{step}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onDashboard}
        className="w-full py-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-150"
        style={{
          background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)",
          boxShadow: "0 4px 18px rgba(46,155,255,0.30)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 8px 28px rgba(46,155,255,0.44)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 18px rgba(46,155,255,0.30)";
        }}
      >
        Ir a mi panel
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="w-full grid grid-cols-2 gap-3 -mt-2">
        <button
          onClick={descargarComprobante}
          disabled={descargando}
          className="py-3 rounded-xl text-xs font-bold transition-colors"
          style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
        >
          {descargando ? "Descargando…" : "Descargar comprobante (PDF)"}
        </button>
        <button
          onClick={onPayments}
          className="py-3 rounded-xl text-xs font-bold transition-colors"
          style={{ color: "#334155", background: "#F1F5F9" }}
        >
          Ver historial de pagos
        </button>
      </div>
      {errorPdf && <p className="text-xs font-medium" style={{ color: "#DC2626" }}>{errorPdf}</p>}

      <p className="text-xs" style={{ color: "#94A3B8" }}>
        Vigente hasta el{" "}
        <span className="font-semibold" style={{ color: "#64748B" }}>
          {formatoFecha(pago.vigencia_fin)}
        </span>
      </p>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface CheckoutProps {
  plan: CheckoutPlan;
  onBack: () => void;
  onDashboard: () => void;
  onPayments: () => void;
}

export default function Checkout({ plan, onBack, onDashboard, onPayments }: CheckoutProps) {
  const { recargarUsuario } = useAuth();
  const [pago, setPago] = useState<Pago | null>(null);

  function handleConfirm(nuevo: Pago) {
    setPago(nuevo);
    // El plan, la cuota y la vigencia del usuario cambiaron: se refresca la sesión
    recargarUsuario().catch(() => undefined);
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #E0F4FF 0%, #F8FAFC 50%, #f0fafb 100%)" }}
    >
      {/* Decorative blobs */}
      <div
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #2E9BFF, transparent 70%)", transform: "translate(40%,-40%)" }}
      />
      <div
        className="fixed bottom-0 left-0 w-72 h-72 rounded-full opacity-10 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00D1C1, transparent 70%)", transform: "translate(-30%,30%)" }}
      />

      {/* Header bar */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(248,250,252,0.88)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(226,232,240,0.7)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo onClick={onBack} />
          {!pago && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150"
              style={{ color: "#64748B" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#334155")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Volver a planes
            </button>
          )}
        </div>
      </header>

      {/* Page title */}
      {!pago && (
        <div className="text-center pt-10 pb-2 px-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    background: s === 2 ? "#2E9BFF" : s < 2 ? "#00C896" : "#E2E8F0",
                    color: s <= 2 ? "white" : "#94A3B8",
                  }}
                >
                  {s < 2 ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div className="w-8 h-0.5" style={{ background: s < 2 ? "#00C896" : "#E2E8F0" }} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs font-medium mb-1" style={{ color: "#94A3B8" }}>
            Paso 2 de 3
          </p>
          <h1
            className="text-2xl md:text-3xl font-extrabold"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Confirma tu suscripción
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Revisa los detalles de tu plan antes de continuar.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        {pago ? (
          /* ── Success ── */
          <div className="max-w-md mx-auto">
            <div
              className="rounded-2xl px-8 py-10"
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                boxShadow: "0 8px 40px rgba(14,30,60,0.08)",
              }}
            >
              <SuccessState plan={plan} pago={pago} onDashboard={onDashboard} onPayments={onPayments} />
            </div>
          </div>
        ) : (
          /* ── Checkout layout ── */
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 items-start">
            {/* Left: plan summary */}
            <div className="flex flex-col gap-5">
              <PlanSummary plan={plan} />

              {/* What's included */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "white", border: "1px solid #E2E8F0" }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#94A3B8" }}
                >
                  Incluido en tu plan
                </p>
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#334155" }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                        <circle cx="8" cy="8" r="7" fill="#00C896" fillOpacity="0.15" />
                        <path d="M5 8l2 2 4-4" stroke="#00C896" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: payment form */}
            <div
              className="rounded-2xl px-7 py-7"
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                boxShadow: "0 4px 24px rgba(14,30,60,0.06)",
              }}
            >
              <PaymentForm plan={plan} onConfirm={handleConfirm} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
