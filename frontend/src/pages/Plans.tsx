import { useState } from "react";
import type { CheckoutPlan } from "./Checkout";
import { usePlanes } from "@/api/planes";
import type { Plan } from "@/types";
import { formatoGB, formatoDolares } from "@/utils/format";

// ── Data ──────────────────────────────────────────────────────────────────────
// El catálogo viene de la API (GET /api/planes). Aquí solo lo adaptamos a lo que dibujan las tarjetas.

interface PlanVista {
  id: string;
  name: string;
  storage: string;
  price: number;
  priceAnnual: number;
  color: string;
  colorBg: string;
  featured: boolean;
  features: string[];
  gb: number;
  vigencia: number;
}

function aVista(p: Plan): PlanVista {
  return {
    id: p.codigo,
    name: p.nombre,
    storage: formatoGB(p.almacenamiento_gb),
    price: Number(p.precio_mensual),
    priceAnnual: Number(p.precio_anual_mensualizado),
    color: p.color,
    colorBg: p.color + "14", // mismo color con ~8 % de opacidad
    featured: p.destacado,
    features: p.caracteristicas,
    gb: p.almacenamiento_gb,
    vigencia: p.vigencia_dias,
  };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="7" fill="#00C896" fillOpacity="0.15" />
      <path d="M5 8l2 2 4-4" stroke="#00C896" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

// ── Header ────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onHome: () => void;
  onLogin: () => void;
  onSignUp: () => void;
}

function Header({ onHome, onLogin, onSignUp }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(248, 250, 252, 0.9)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo onClick={onHome} />
        <nav className="hidden md:flex items-center gap-7">
          {["Producto", "Nosotros"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors duration-150"
              style={{ color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#2E9BFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              {item}
            </a>
          ))}
          <span className="text-sm font-semibold" style={{ color: "#2E9BFF" }}>Planes</span>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150"
            style={{ color: "#334155" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#2E9BFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >
            Iniciar sesión
          </button>
          <button
            onClick={onSignUp}
            className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all duration-150"
            style={{ background: "#2E9BFF" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1E6BD6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2E9BFF")}
          >
            Comenzar gratis
          </button>
        </div>
      </div>
    </header>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function BillingToggle({
  annual,
  onChange,
}: {
  annual: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onChange(false)}
        className="text-sm font-semibold transition-colors duration-150"
        style={{ color: annual ? "#94A3B8" : "#0F172A" }}
      >
        Mensual
      </button>
      <button
        onClick={() => onChange(!annual)}
        className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
        style={{ background: annual ? "#2E9BFF" : "#CBD5E1" }}
        role="switch"
        aria-checked={annual}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: annual ? "translateX(26px)" : "translateX(2px)" }}
        />
      </button>
      <button
        onClick={() => onChange(true)}
        className="text-sm font-semibold transition-colors duration-150 flex items-center gap-1.5"
        style={{ color: annual ? "#0F172A" : "#94A3B8" }}
      >
        Anual
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "#E0FBF9", color: "#00C896" }}
        >
          −20%
        </span>
      </button>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

interface CardProps {
  plan: PlanVista;
  annual: boolean;
  onSelect: (id: string) => void;
}

function PlanCard({ plan, annual, onSelect }: CardProps) {
  const gratis = plan.price === 0;
  const displayPrice = annual ? plan.priceAnnual : plan.price;

  return (
    <div
      className="relative flex flex-col rounded-2xl transition-all duration-200 group"
      style={{
        background: "white",
        border: plan.featured ? "2px solid #2E9BFF" : "1px solid #E2E8F0",
        boxShadow: plan.featured
          ? "0 16px 48px rgba(46,155,255,0.14)"
          : "0 1px 6px rgba(0,0,0,0.04)",
        transform: plan.featured ? "translateY(-6px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (!plan.featured) {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 10px 36px rgba(0,0,0,0.09)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!plan.featured) {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 1px 6px rgba(0,0,0,0.04)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }
      }}
    >
      {/* "Más popular" badge */}
      {plan.featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full text-white shadow-md"
            style={{ background: "linear-gradient(90deg, #00D1C1, #2E9BFF)" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1l1.18 2.4L9 3.82 6.9 5.86l.47 3.14L5 7.5 2.63 9l.47-3.14L1 3.82l2.82-.42L5 1Z" fill="white"/>
            </svg>
            Más popular
          </span>
        </div>
      )}

      <div className="p-7 flex flex-col gap-6 flex-1">
        {/* Plan header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{ background: plan.colorBg, color: plan.color }}
            >
              {plan.name}
            </div>
            <div
              className="text-sm font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1"
              style={{ background: plan.colorBg, color: plan.color }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 9a3 3 0 0 1-.3-5.97A4.2 4.2 0 1 1 11.7 7a2.3 2.3 0 0 1-2.3 2H2Z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
              </svg>
              {plan.storage}
            </div>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            {gratis ? (
              <span
                className="text-5xl font-extrabold leading-none"
                style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Gratis
              </span>
            ) : (
              <>
                <span className="text-sm font-semibold" style={{ color: "#94A3B8" }}>$</span>
                <span
                  className="text-5xl font-extrabold leading-none"
                  style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {Number.isInteger(displayPrice) ? displayPrice : displayPrice.toFixed(2)}
                </span>
                <span className="text-sm" style={{ color: "#94A3B8" }}>/mes</span>
              </>
            )}
          </div>
          {annual && !gratis && (
            <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>
              <span
                className="line-through mr-1"
                style={{ color: "#CBD5E1" }}
              >
                {formatoDolares(plan.price)}
              </span>
              Facturado anualmente
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: "#F1F5F9" }} />

        {/* Features */}
        <ul className="flex flex-col gap-3 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#334155" }}>
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSelect(plan.id)}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-150"
          style={
            plan.featured
              ? {
                  background: "#2E9BFF",
                  color: "white",
                  boxShadow: "0 4px 16px rgba(46,155,255,0.30)",
                }
              : {
                  background: "white",
                  color: "#2E9BFF",
                  border: "1.5px solid #2E9BFF",
                }
          }
          onMouseEnter={(e) => {
            if (plan.featured) {
              e.currentTarget.style.background = "#1E6BD6";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(46,155,255,0.42)";
              e.currentTarget.style.transform = "translateY(-1px)";
            } else {
              e.currentTarget.style.background = "#E0F4FF";
            }
          }}
          onMouseLeave={(e) => {
            if (plan.featured) {
              e.currentTarget.style.background = "#2E9BFF";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(46,155,255,0.30)";
              e.currentTarget.style.transform = "translateY(0)";
            } else {
              e.currentTarget.style.background = "white";
            }
          }}
        >
          {gratis ? "Comenzar gratis" : `Contratar ${plan.name}`}
        </button>
      </div>
    </div>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

function ComparisonTable({ plans }: { plans: PlanVista[] }) {
  const PLANS = plans;
  const TABLE_ROWS = [
    { label: "Almacenamiento", values: plans.map((p) => p.storage) },
    { label: "Precio mensual", values: plans.map((p) => (p.price === 0 ? "Gratis" : formatoDolares(p.price))) },
    { label: "Precio pagando anual", values: plans.map((p) => (p.price === 0 ? "—" : `${formatoDolares(p.priceAnnual)}/mes`)) },
    { label: "Vigencia del ciclo", values: plans.map((p) => `${p.vigencia} días`) },
    { label: "Carpetas y subida de archivos", values: plans.map(() => "✓") },
    { label: "Panel de consumo", values: plans.map(() => "✓") },
  ];
  if (plans.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <h2
        className="text-xl font-extrabold text-center mb-8"
        style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Comparativa detallada
      </h2>
      <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid #E2E8F0" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <th className="text-left px-6 py-4 font-semibold" style={{ color: "#64748B", width: "28%" }}>
                Característica
              </th>
              {PLANS.map((p) => (
                <th
                  key={p.id}
                  className="px-4 py-4 text-center font-bold"
                  style={{
                    color: p.featured ? "#2E9BFF" : "#0F172A",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    background: p.featured ? "#EFF8FF" : "transparent",
                  }}
                >
                  {p.name}
                  {p.featured && (
                    <span
                      className="block text-[10px] font-semibold mt-0.5"
                      style={{ color: "#00D1C1" }}
                    >
                      ★ Más popular
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr
                key={row.label}
                style={{
                  background: i % 2 === 0 ? "white" : "#FAFBFC",
                  borderBottom: i < TABLE_ROWS.length - 1 ? "1px solid #F1F5F9" : "none",
                }}
              >
                <td className="px-6 py-3.5 font-medium" style={{ color: "#334155" }}>
                  {row.label}
                </td>
                {row.values.map((v, j) => (
                  <td
                    key={j}
                    className="px-4 py-3.5 text-center"
                    style={{
                      color: v === "—" ? "#CBD5E1" : v === "✓" ? "#00C896" : "#334155",
                      fontWeight: v === "✓" ? "700" : "400",
                      background: PLANS[j].featured ? "#F5FBFF" : "transparent",
                    }}
                  >
                    {v === "✓" ? (
                      <span className="inline-flex justify-center">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="7" fill="#00C896" fillOpacity="0.15" />
                          <path d="M5 8l2 2 4-4" stroke="#00C896" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── FAQ strip ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Puedes subir o bajar de plan desde tu panel. Los cambios aplican al inicio del siguiente ciclo.",
  },
  {
    q: "¿Hay contrato mínimo de permanencia?",
    a: "No. Todos los planes son mes a mes (o anuales con descuento). Cancela cuando quieras sin penalización.",
  },
  {
    q: "¿Qué pasa si supero mi límite de almacenamiento?",
    a: "Recibirás una alerta al llegar al 80 %. Puedes ampliar espacio o pasar al plan superior antes de que se bloquee la carga.",
  },
];

function FAQ() {
  return (
    <section
      className="py-16"
      style={{ background: "#E0F4FF", borderTop: "1px solid #BAE6FD" }}
    >
      <div className="max-w-3xl mx-auto px-6">
        <h2
          className="text-xl font-extrabold text-center mb-10"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Preguntas frecuentes
        </h2>
        <div className="flex flex-col gap-5">
          {FAQS.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-xl p-5"
              style={{ background: "white", border: "1px solid #E2E8F0" }}
            >
              <p className="text-sm font-bold mb-1.5" style={{ color: "#0F172A" }}>{q}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface PlansProps {
  onHome: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onCheckout: (plan: CheckoutPlan) => void;
}

export default function Plans({ onHome, onLogin, onSignUp, onCheckout }: PlansProps) {
  const [annual, setAnnual] = useState(false);
  const { planes, cargando, error } = usePlanes();
  const PLANS = planes.map(aVista);

  function handleSelect(id: string) {
    const p = PLANS.find((x) => x.id === id);
    if (!p) return;
    if (p.price === 0) { onSignUp(); return; }
    onCheckout({
      id: p.id, name: p.name, storage: p.storage, color: p.color, colorBg: p.colorBg,
      annual, price: annual ? p.priceAnnual : p.price,
    });
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <Header onHome={onHome} onLogin={onLogin} onSignUp={onSignUp} />

      {/* Hero */}
      <section className="pt-20 pb-16 text-center px-6">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "#2E9BFF" }}
        >
          Planes y precios
        </p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 max-w-2xl mx-auto"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Elige el plan que{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #2E9BFF 0%, #00D1C1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            se ajuste a ti
          </span>
        </h1>
        <p
          className="text-base mb-10 max-w-lg mx-auto"
          style={{ color: "#64748B" }}
        >
          Sin costes ocultos. Cancela cuando quieras. Empieza gratis hoy mismo.
        </p>
        <BillingToggle annual={annual} onChange={setAnnual} />
      </section>

      {/* Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        {cargando && <p className="text-center text-sm py-16" style={{ color: "#94A3B8" }}>Cargando planes…</p>}
        {error && (
          <p className="text-center text-sm py-16 font-semibold" style={{ color: "#E5484D" }}>
            No se pudieron cargar los planes: {error}
          </p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end pt-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} annual={annual} onSelect={handleSelect} />
          ))}
        </div>

        {/* Guarantee strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-8">
          {[
            { icon: "🔒", text: "Pago seguro SSL" },
            { icon: "☁️", text: "Plan gratuito de 5 GB" },
            { icon: "📞", text: "Soporte en español" },
            { icon: "🚫", text: "Sin contratos de permanencia" },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 text-sm"
              style={{ color: "#64748B" }}
            >
              <span>{icon}</span>
              <span className="font-medium">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <ComparisonTable plans={PLANS} />
      <FAQ />

      {/* CTA footer */}
      <section
        className="py-16 text-center px-6"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        }}
      >
        <h2
          className="text-2xl font-extrabold mb-3 text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          ¿Todavía no te decides?
        </h2>
        <p className="text-sm mb-7" style={{ color: "#94A3B8" }}>
          Empieza con el plan Gratis y cambia cuando lo necesites. Sin tarjeta de crédito.
        </p>
        <button
          onClick={onSignUp}
          className="inline-flex items-center gap-2 text-sm font-bold px-8 py-3.5 rounded-xl text-white transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)",
            boxShadow: "0 4px 20px rgba(46,155,255,0.35)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 8px 28px rgba(46,155,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,155,255,0.35)";
          }}
        >
          Crear cuenta gratis
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>
    </div>
  );
}
