import { useState } from "react";

import { authApi } from "@/api/auth";

// ── Logo ──────────────────────────────────────────────────────────────────────

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 mx-auto mb-8 select-none focus:outline-none"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
      >
        <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
          <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white" />
        </svg>
      </div>
      <span
        className="text-xl font-extrabold tracking-tight"
        style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
      </span>
    </button>
  );
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14"
      style={{ background: "linear-gradient(160deg, #E0F4FF 0%, #ffffff 55%, #f0fafb 100%)" }}
    >
      {/* Blobs */}
      <div
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{
          background: "radial-gradient(circle, #2E9BFF, transparent 70%)",
          transform: "translate(40%, -40%)",
        }}
      />
      <div
        className="fixed bottom-0 left-0 w-72 h-72 rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{
          background: "radial-gradient(circle, #00D1C1, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

// ── Send form ─────────────────────────────────────────────────────────────────

interface SendFormProps {
  onBack: () => void;
  onSent: (email: string) => void;
}

function SendForm({ onBack, onSent }: SendFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Introduce un correo válido.");
      return;
    }
    setError("");
    setLoading(true);
    authApi
      .olvideContrasena(email)
      .then(() => onSent(email))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <PageShell>
      <Logo onClick={onBack} />

      <div
        className="rounded-2xl px-8 py-10 w-full"
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 40px rgba(14, 30, 60, 0.08)",
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #E0F4FF 0%, #ddfaf7 100%)", border: "1px solid #BAE6FD" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="7" width="22" height="16" rx="3" stroke="#2E9BFF" strokeWidth="1.8"/>
              <path d="M3 10l11 7 11-7" stroke="#2E9BFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <h1
            className="text-2xl font-extrabold mb-2"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Recupera tu contraseña
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
            Te enviaremos un enlace a tu correo para restablecer tu contraseña.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recover-email" className="text-sm font-semibold" style={{ color: "#334155" }}>
              Correo electrónico
            </label>
            <input
              id="recover-email"
              type="email"
              placeholder="maria@empresa.com"
              value={email}
              autoComplete="email"
              onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150"
              style={{
                background: "white",
                border: `1.5px solid ${error ? "#FF6B6B" : focused ? "#2E9BFF" : "#E2E8F0"}`,
                color: "#0F172A",
                boxShadow: focused && !error
                  ? "0 0 0 3px rgba(46,155,255,0.12)"
                  : error
                  ? "0 0 0 3px rgba(255,107,107,0.10)"
                  : "none",
              }}
            />
            {error && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#FF6B6B" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="#FF6B6B" strokeWidth="1.5" />
                  <path d="M7 4v3.5M7 9.5v.5" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              background: loading ? "#7BBFFF" : "#2E9BFF",
              boxShadow: loading ? "none" : "0 4px 16px rgba(46,155,255,0.30)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#1E6BD6";
                e.currentTarget.style.boxShadow = "0 6px 22px rgba(46,155,255,0.42)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = "#2E9BFF";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(46,155,255,0.30)";
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
                Enviando…
              </>
            ) : (
              "Enviar enlace"
            )}
          </button>
        </form>

        {/* Back link */}
        <p className="text-center text-sm mt-6" style={{ color: "#64748B" }}>
          <button
            onClick={onBack}
            className="font-semibold hover:underline focus:outline-none transition-colors inline-flex items-center gap-1.5"
            style={{ color: "#2E9BFF" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver a iniciar sesión
          </button>
        </p>
      </div>

      <TrustBadges />
    </PageShell>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────

interface SuccessStateProps {
  email: string;
  onBack: () => void;
  onResend: () => void;
}

function SuccessState({ email, onBack, onResend }: SuccessStateProps) {
  const [resent, setResent] = useState(false);

  function handleResend() {
    setResent(true);
    setTimeout(() => setResent(false), 3000);
    onResend();
  }

  return (
    <PageShell>
      <Logo onClick={onBack} />

      <div
        className="rounded-2xl px-8 py-10 w-full text-center"
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 40px rgba(14, 30, 60, 0.08)",
        }}
      >
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer ring pulse */}
            <div
              className="absolute inset-0 rounded-full opacity-20 animate-ping"
              style={{ background: "#00C896", animationDuration: "2s" }}
            />
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center relative"
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
        </div>

        {/* Copy */}
        <h1
          className="text-2xl font-extrabold mb-3"
          style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Revisa tu correo
        </h1>
        <p className="text-sm leading-relaxed mb-2" style={{ color: "#64748B" }}>
          Te enviamos un enlace de recuperación a
        </p>
        <p
          className="text-sm font-bold mb-6 px-3 py-1.5 rounded-lg inline-block"
          style={{ color: "#0F172A", background: "#E0F4FF", border: "1px solid #BAE6FD" }}
        >
          {email}
        </p>

        {/* Info steps */}
        <div
          className="rounded-xl p-4 mb-6 text-left flex flex-col gap-3"
          style={{ background: "white", border: "1px solid #E2E8F0" }}
        >
          {[
            { step: "1", text: "Abre el correo de NimbusVault" },
            { step: "2", text: "Haz clic en \"Restablecer contraseña\"" },
            { step: "3", text: "El enlace expira en 30 minutos" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: "#E0F4FF", color: "#2E9BFF" }}
              >
                {step}
              </div>
              <span className="text-sm" style={{ color: "#334155" }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Resend */}
        <p className="text-sm mb-5" style={{ color: "#64748B" }}>
          ¿No lo recibiste?{" "}
          <button
            onClick={handleResend}
            disabled={resent}
            className="font-semibold hover:underline focus:outline-none transition-colors"
            style={{ color: resent ? "#00C896" : "#2E9BFF" }}
            onMouseEnter={(e) => { if (!resent) e.currentTarget.style.color = "#1E6BD6"; }}
            onMouseLeave={(e) => { if (!resent) e.currentTarget.style.color = "#2E9BFF"; }}
          >
            {resent ? "¡Enviado!" : "Reenviar enlace"}
          </button>
        </p>

        {/* Back to login */}
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 inline-flex items-center justify-center gap-2"
          style={{
            background: "white",
            border: "1.5px solid #E2E8F0",
            color: "#334155",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#CBD5E1";
            e.currentTarget.style.background = "#F1F5F9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#E2E8F0";
            e.currentTarget.style.background = "white";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver a iniciar sesión
        </button>
      </div>

      <TrustBadges />
    </PageShell>
  );
}

// ── Trust badges ──────────────────────────────────────────────────────────────

function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-5 mt-6">
      {[
        { icon: "🔒", text: "SSL 256-bit" },
        { icon: "🛡️", text: "GDPR ready" },
        { icon: "☁️", text: "99.9% uptime" },
      ].map(({ icon, text }) => (
        <div key={text} className="flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
          <span>{icon}</span>
          <span className="font-medium">{text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo) {
    return (
      <SuccessState
        email={sentTo}
        onBack={onBack}
        onResend={() => { authApi.olvideContrasena(sentTo).catch(() => {}); }}
      />
    );
  }

  return <SendForm onBack={onBack} onSent={(email) => setSentTo(email)} />;
}
