// Marco compartido para las pantallas de autenticación que no venían del Figma
// (verificar correo, restablecer contraseña, mensaje de registro exitoso).
import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 mx-auto mb-8 select-none w-fit">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
      >
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white" />
        </svg>
      </div>
      <span className="text-xl font-extrabold tracking-tight" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
      </span>
    </Link>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14"
      style={{ background: "linear-gradient(160deg, #E0F4FF 0%, #ffffff 55%, #f0fafb 100%)" }}
    >
      <div className="relative w-full max-w-md">
        <Logo />
        <div
          className="rounded-2xl px-8 py-10 w-full"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", boxShadow: "0 8px 40px rgba(14, 30, 60, 0.08)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type Tono = "exito" | "error" | "info";
const TONOS: Record<Tono, { bg: string; fg: string }> = {
  exito: { bg: "#DCFCE7", fg: "#00A37A" },
  error: { bg: "#FEE2E2", fg: "#E5484D" },
  info: { bg: "#E0F4FF", fg: "#2E9BFF" },
};

export function IconoEstado({ tono }: { tono: Tono }) {
  const { bg, fg } = TONOS[tono];
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: bg }}>
      {tono === "exito" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
      {tono === "error" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7L7 17" stroke={fg} strokeWidth="2.4" strokeLinecap="round" /></svg>
      )}
      {tono === "info" && (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke={fg} strokeWidth="2" /><path d="M3 7l9 6 9-6" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </div>
  );
}

export function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="text-center mb-7">
      <h1 className="text-2xl font-extrabold mb-1.5" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </h1>
      {sub && <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>{sub}</p>}
    </div>
  );
}

export function Alerta({ children, tono = "error" }: { children: React.ReactNode; tono?: Tono }) {
  const { bg, fg } = TONOS[tono];
  return (
    <div className="px-4 py-3 rounded-xl text-sm font-medium mb-5" style={{ background: bg, color: fg }}>
      {children}
    </div>
  );
}

export function BotonPrimario(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { cargando?: boolean }) {
  const { cargando, children, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled || cargando}
      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 flex items-center justify-center gap-2 hover:brightness-95"
      style={{
        background: cargando ? "#7BBFFF" : "#2E9BFF",
        boxShadow: cargando ? "none" : "0 4px 16px rgba(46,155,255,0.30)",
        cursor: cargando ? "not-allowed" : "pointer",
      }}
    >
      {cargando && (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
