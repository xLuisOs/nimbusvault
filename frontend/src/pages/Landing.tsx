import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { usePlanes } from "@/api/planes";
import { rutaInicio } from "@/components/routing/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { formatoDolares, formatoGB } from "@/utils/format";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconCloud() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 20a5 5 0 0 1-.5-9.95A7 7 0 1 1 22 14a4 4 0 0 1-4 4H8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconSelfService() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 14h8M14 10v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconScale() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 20 L14 8 L24 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 24 h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="14" cy="8" r="2" fill="currentColor"/>
    </svg>
  );
}

function IconTransparency() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="4" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 11h20" stroke="currentColor" strokeWidth="2"/>
      <path d="M11 11v13" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="15" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      <rect x="15" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// ── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group select-none">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white"/>
        </svg>
      </div>
      <span className="text-lg font-extrabold tracking-tight" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
      </span>
    </Link>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onSignUp: () => void;
  onLogin: () => void;
  onPlans: () => void;
  onAdmin: () => void;
  onPanel: () => void;
  esAdmin: boolean;
  conSesion: boolean;
}

function Header({ onSignUp, onLogin, onPlans, onAdmin, onPanel, esAdmin, conSesion }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(248, 250, 252, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(203, 213, 225, 0.6)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
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
          <button
            onClick={onPlans}
            className="text-sm font-medium transition-colors duration-150"
            style={{ color: "#334155" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#2E9BFF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >
            Planes
          </button>
          {esAdmin && (
          <button
            onClick={onAdmin}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-150"
            style={{ color: "#062D5B", background: "#E0F4FF", border: "1px solid #BAE6FD" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#062D5B"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#E0F4FF"; e.currentTarget.style.color = "#062D5B"; }}
          >
            Panel Admin
          </button>
          )}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {conSesion ? (
            <button
              onClick={onPanel}
              className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all duration-150 hover:brightness-95"
              style={{ background: "#2E9BFF" }}
            >
              Ir a mi panel
            </button>
          ) : (
            <>
              <button
                onClick={onLogin}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors duration-150 hover:text-[#2E9BFF]"
                style={{ color: "#334155" }}
              >
                Iniciar sesión
              </button>
              <button
                onClick={onSignUp}
                className="text-sm font-semibold px-5 py-2 rounded-lg text-white transition-all duration-150 hover:brightness-95"
                style={{ background: "#2E9BFF" }}
              >
                Comenzar gratis
              </button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-1"
          style={{ color: "#334155" }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <IconX /> : <IconMenu />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-6 py-5 flex flex-col gap-4" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
          {["Producto", "Nosotros"].map((item) => (
            <a key={item} href="#" className="text-sm font-medium" style={{ color: "#334155" }}>
              {item}
            </a>
          ))}
          <button onClick={onPlans} className="text-sm font-medium text-left" style={{ color: "#334155" }}>Planes</button>
          <hr style={{ borderColor: "#E2E8F0" }} />
          {!conSesion && <button onClick={onLogin} className="text-sm font-semibold text-left" style={{ color: "#334155" }}>Iniciar sesión</button>}
          <button
            onClick={conSesion ? onPanel : onSignUp}
            className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white text-center"
            style={{ background: "#2E9BFF" }}
          >
            {conSesion ? "Ir a mi panel" : "Comenzar gratis"}
          </button>
        </div>
      )}
    </header>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div
      className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "white", border: "1px solid rgba(255,255,255,0.3)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#0F172A" }}>
        <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
        <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
        <span className="ml-auto text-xs font-mono" style={{ color: "#64748B" }}>nimbvault.io/dashboard</span>
      </div>

      {/* App shell */}
      <div className="flex" style={{ height: "320px" }}>
        {/* Sidebar */}
        <aside className="w-44 flex-shrink-0 py-4 px-3 flex flex-col gap-1" style={{ background: "#F8FAFC", borderRight: "1px solid #E2E8F0" }}>
          <div className="mb-3 px-2 text-xs font-semibold" style={{ color: "#94A3B8" }}>ALMACENAMIENTO</div>
          {[
            { label: "Mis archivos", active: true },
            { label: "Compartidos", active: false },
            { label: "Recientes", active: false },
            { label: "Papelera", active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className="text-xs font-medium px-2 py-1.5 rounded-md"
              style={{
                background: active ? "#E0F4FF" : "transparent",
                color: active ? "#2E9BFF" : "#64748B",
              }}
            >
              {label}
            </div>
          ))}
          <div className="mt-auto">
            <div className="text-xs mb-1" style={{ color: "#94A3B8" }}>Uso: 18.4 GB / 50 GB</div>
            <div className="h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
              <div className="h-1.5 rounded-full" style={{ width: "37%", background: "linear-gradient(90deg, #2E9BFF, #00D1C1)" }} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>Mis archivos</span>
            <div className="flex gap-1">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>⊞</div>
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs" style={{ background: "#F1F5F9", color: "#64748B" }}>☰</div>
            </div>
          </div>

          {/* File grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { name: "Diseños.fig", color: "#A78BFA", icon: "◈" },
              { name: "Informe Q3.pdf", color: "#F87171", icon: "⊞" },
              { name: "Dataset.csv", color: "#34D399", icon: "≡" },
              { name: "Video_demo.mp4", color: "#FB923C", icon: "▶" },
              { name: "Backup_2026.zip", color: "#2E9BFF", icon: "◉" },
              { name: "Foto equipo.jpg", color: "#F472B6", icon: "◰" },
            ].map(({ name, color, icon }) => (
              <div
                key={name}
                className="rounded-lg p-2 flex flex-col items-center gap-1 cursor-pointer transition-all"
                style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                  style={{ background: color + "20", color }}
                >
                  {icon}
                </div>
                <span className="text-center text-[9px] leading-tight" style={{ color: "#64748B", wordBreak: "break-all" }}>{name}</span>
              </div>
            ))}
          </div>

          {/* Recent activity row */}
          <div className="rounded-lg p-2" style={{ background: "#F1F5F9" }}>
            <span className="text-[10px] font-semibold" style={{ color: "#94A3B8" }}>ACTIVIDAD RECIENTE</span>
            <div className="mt-1 flex flex-col gap-0.5">
              {["Laura subió Presupuesto.xlsx", "Tú compartiste Diseños.fig", "Sergio descargó Informe Q3.pdf"].map((a) => (
                <div key={a} className="text-[9px]" style={{ color: "#64748B" }}>{a}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section
      className="relative min-h-screen flex items-center pt-16 overflow-hidden"
      style={{ background: "#F8FAFC" }}
    >
      {/* Gradient blob background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 70% 40%, #2E9BFF 0%, #00D1C1 60%, transparent 100%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center w-full">
        {/* Left: copy */}
        <div className="flex flex-col gap-7">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full w-fit"
            style={{ background: "#E0F4FF", color: "#2E9BFF", border: "1px solid #BAE6FD" }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#2E9BFF" }} />
            Storage as a Service — ahora disponible
          </div>

          <h1
            className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Tu espacio en la nube,{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #2E9BFF 0%, #00D1C1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              a tu manera
            </span>
          </h1>

          <p className="text-lg leading-relaxed max-w-md" style={{ color: "#334155" }}>
            Almacena, gestiona y comparte archivos desde un panel unificado. Escala tu capacidad en segundos sin sorpresas en la factura.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={onSignUp}
              className="inline-flex items-center gap-2 text-sm font-semibold px-7 py-3.5 rounded-xl text-white shadow-lg transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #1E6BD6 100%)", boxShadow: "0 4px 20px rgba(46,155,255,0.35)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(46,155,255,0.45)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,155,255,0.35)"; }}
            >
              Comenzar gratis
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3.5 rounded-xl transition-all duration-200"
              style={{ color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#2E9BFF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
            >
              Ver demostración
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M6.5 5.5l4 2.5-4 2.5V5.5Z" fill="currentColor"/></svg>
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-2.5">
              {["#6366F1","#EC4899","#F59E0B","#10B981"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-white" style={{ background: c }}>
                  {["JM","AL","RS","KP"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: "#64748B" }}>
              <span className="font-semibold" style={{ color: "#0F172A" }}>+2,400 equipos</span> confían en NimbusVault
            </p>
          </div>
        </div>

        {/* Right: mockup */}
        <div className="flex justify-center md:justify-end">
          <div className="relative">
            {/* Glow behind mockup */}
            <div
              className="absolute -inset-6 rounded-3xl opacity-30 blur-2xl"
              style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
            />
            <div className="relative">
              <AppMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: IconSelfService,
    title: "Autoservicio total",
    desc: "Crea buckets, configura permisos y sube archivos sin intervención del equipo técnico. Control completo desde el primer día.",
    color: "#2E9BFF",
    bg: "#E0F4FF",
  },
  {
    Icon: IconScale,
    title: "Escalabilidad por planes",
    desc: "Empieza con 5 GB gratuitos y sube a terabytes en un clic. Sin contratos, sin penalizaciones por reducir.",
    color: "#00D1C1",
    bg: "#E0FBF9",
  },
  {
    Icon: IconTransparency,
    title: "Transparencia de consumo",
    desc: "Visualiza en tiempo real cuánto espacio usas, qué archivos ocupan más y cuánto pagarás al final del ciclo.",
    color: "#4DB8FF",
    bg: "#E8F4FF",
  },
  {
    Icon: IconDashboard,
    title: "Panel administrativo",
    desc: "Gestiona usuarios, audita accesos, configura alertas de cuota y genera reportes de uso con un panel centralizado.",
    color: "#6366F1",
    bg: "#EEF2FF",
  },
];

function Features() {
  return (
    <section className="py-28" style={{ background: "#F8FAFC" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-sm font-semibold mb-3" style={{ color: "#2E9BFF" }}>CARACTERÍSTICAS</p>
          <h2
            className="text-4xl font-extrabold leading-tight mb-4"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Todo lo que necesitas para gestionar archivos en la nube
          </h2>
          <p className="text-base leading-relaxed" style={{ color: "#334155" }}>
            Diseñado para equipos que necesitan velocidad, control y visibilidad sin complejidad operativa.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 cursor-default group"
              style={{ background: "white", border: "1px solid #E2E8F0" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = color; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: bg, color }}
              >
                <Icon />
              </div>
              <div>
                <h3
                  className="text-base font-bold mb-2"
                  style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────────

function Pricing({ onSignUp, onPlans }: { onSignUp: () => void; onPlans: () => void }) {
  const { planes, cargando, error } = usePlanes();
  const PLANS = planes.map((p) => {
    const gratis = Number(p.precio_mensual) === 0;
    return {
      name: p.nombre,
      price: gratis ? "Gratis" : formatoDolares(p.precio_mensual),
      period: gratis ? "" : "/mes",
      storage: formatoGB(p.almacenamiento_gb),
      desc: p.descripcion,
      features: p.caracteristicas,
      cta: gratis ? "Comenzar gratis" : `Elegir ${p.nombre}`,
      featured: p.destacado,
      color: p.color,
      gratis,
    };
  });

  return (
    <section className="py-28" style={{ background: "#E0F4FF" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-sm font-semibold mb-3" style={{ color: "#2E9BFF" }}>PLANES</p>
          <h2
            className="text-4xl font-extrabold leading-tight mb-4"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Precios simples y predecibles
          </h2>
          <p className="text-base" style={{ color: "#334155" }}>
            Sin costes ocultos. Sin sorpresas. Cancela cuando quieras.
          </p>
        </div>

        {cargando && <p className="text-center text-sm" style={{ color: "#64748B" }}>Cargando planes…</p>}
        {error && <p className="text-center text-sm font-semibold" style={{ color: "#E5484D" }}>No se pudieron cargar los planes.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map(({ name, price, period, storage, desc, features, cta, featured, color, gratis }) => (
            <div
              key={name}
              className="rounded-2xl p-6 flex flex-col gap-5 relative"
              style={{
                background: "white",
                border: featured ? `2px solid #2E9BFF` : "1px solid #E2E8F0",
                boxShadow: featured ? "0 16px 48px rgba(46,155,255,0.18)" : "0 1px 8px rgba(0,0,0,0.04)",
                transform: featured ? "scale(1.03)" : "scale(1)",
              }}
            >
              {featured && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(90deg, #2E9BFF, #00D1C1)" }}
                >
                  Recomendado
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold" style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{name}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: color + "18", color }}
                  >
                    {storage}
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5 mt-3 mb-2">
                  <span
                    className="text-3xl font-extrabold"
                    style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {price}
                  </span>
                  {period && <span className="text-sm" style={{ color: "#94A3B8" }}>{period}</span>}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#334155" }}>
                    <span className="mt-0.5 flex-shrink-0" style={{ color: featured ? "#2E9BFF" : "#00D1C1" }}>
                      <IconCheck />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={gratis ? onSignUp : onPlans}
                className="mt-auto text-sm font-semibold px-4 py-3 rounded-xl text-center transition-all duration-150"
                style={
                  featured
                    ? { background: "#2E9BFF", color: "white" }
                    : { background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }
                }
                onMouseEnter={(e) => {
                  if (featured) { e.currentTarget.style.background = "#1E6BD6"; }
                  else { e.currentTarget.style.background = "#E2E8F0"; }
                }}
                onMouseLeave={(e) => {
                  if (featured) { e.currentTarget.style.background = "#2E9BFF"; }
                  else { e.currentTarget.style.background = "#F1F5F9"; }
                }}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm mt-10" style={{ color: "#94A3B8" }}>
          Precios en dólares (USD). Los pagos de la plataforma son simulados: no se realiza ningún cobro real.
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    {
      title: "Producto",
      links: ["Características", "Planes y precios", "Changelog", "Roadmap"],
    },
    {
      title: "Empresa",
      links: ["Nosotros", "Blog", "Carreras", "Prensa"],
    },
    {
      title: "Soporte",
      links: ["Documentación", "Estado del servicio", "Comunidad", "Contacto"],
    },
    {
      title: "Legal",
      links: ["Privacidad", "Términos de servicio", "Cookies", "Seguridad"],
    },
  ];

  return (
    <footer className="pt-20 pb-10" style={{ background: "#0F172A" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand col */}
          <div className="lg:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4 select-none">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white"/>
                </svg>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
              </span>
            </a>
            <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
              Almacenamiento en la nube inteligente para equipos modernos.
            </p>
          </div>

          {/* Link columns */}
          {cols.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-xs font-bold uppercase mb-4 tracking-widest" style={{ color: "#475569" }}>{title}</h4>
              <ul className="flex flex-col gap-3">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-150"
                      style={{ color: "#94A3B8" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#E2E8F0")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94A3B8")}
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid #1E293B" }}
        >
          <p className="text-sm" style={{ color: "#475569" }}>
            © {new Date().getFullYear()} NimbusVault, Inc. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-1 text-sm" style={{ color: "#475569" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#00D1C1" }} />
            Todos los sistemas operativos
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Header
        onSignUp={() => navigate("/registro")}
        onLogin={() => navigate("/login")}
        onPlans={() => navigate("/planes")}
        onAdmin={() => navigate("/admin")}
        onPanel={() => usuario && navigate(rutaInicio(usuario.rol))}
        esAdmin={usuario?.rol === "ADMINISTRADOR"}
        conSesion={!!usuario}
      />
      <main>
        <Hero onSignUp={() => navigate(usuario ? rutaInicio(usuario.rol) : "/registro")} />
        <Features />
        <Pricing onSignUp={() => navigate("/registro")} onPlans={() => navigate("/planes")} />
      </main>
      <Footer />
    </div>
  );
}
