import { useState } from "react";

import { authApi } from "@/api/auth";
import { Alerta } from "@/components/layout/AuthLayout";
import { useAuth } from "@/context/AuthContext";
import type { Usuario } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(fields: { email: string; password: string }) {
  const errors: Record<string, string> = {};
  if (!fields.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errors.email = "Introduce un correo válido.";
  if (!fields.password) errors.password = "La contraseña es obligatoria.";
  return errors;
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  suffix?: React.ReactNode;
  labelSuffix?: React.ReactNode;
}

function InputField({
  id, label, type = "text", placeholder, value, error, onChange,
  autoComplete, suffix, labelSuffix,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold" style={{ color: "#334155" }}>
          {label}
        </label>
        {labelSuffix}
      </div>
      <div className="relative">
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
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
            paddingRight: suffix ? "44px" : undefined,
          }}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
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
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9s3-5.5 8-5.5S17 9 17 9s-3 5.5-8 5.5S1 9 1 9Z" stroke="#94A3B8" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.5" stroke="#94A3B8" strokeWidth="1.5" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M7.4 7.5A2.5 2.5 0 0 0 11.5 11.6M5.2 5.3C3.4 6.5 2 9 2 9s3 5.5 7 5.5c1.5 0 2.8-.5 3.9-1.3M10.7 3.8A7.5 7.5 0 0 0 9 3.5C5 3.5 2 9 2 9" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface LoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onForgot: () => void;
  onLoggedIn: (usuario: Usuario) => void;
}

export default function Login({ onBack, onSignUp, onForgot, onLoggedIn }: LoginProps) {
  const { login } = useAuth();
  const [errorApi, setErrorApi] = useState("");
  const [noVerificado, setNoVerificado] = useState(false);
  const [reenviado, setReenviado] = useState(false);
  const [fields, setFields] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof fields) => (v: string) =>
    setFields((f) => ({ ...f, [key]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(fields);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setErrorApi("");
    setNoVerificado(false);
    try {
      const usuario = await login(fields.email, fields.password);
      onLoggedIn(usuario);
    } catch (err: any) {
      if (err.message === "correo_no_verificado") setNoVerificado(true);
      else setErrorApi(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14"
      style={{ background: "linear-gradient(160deg, #E0F4FF 0%, #ffffff 55%, #f0fafb 100%)" }}
    >
      {/* Decorative blobs — same as signup for consistency */}
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

      <div className="relative w-full max-w-md">
        <Logo onClick={onBack} />

        {/* Card */}
        <div
          className="rounded-2xl px-8 py-10 w-full"
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 40px rgba(14, 30, 60, 0.08)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-extrabold mb-1.5"
              style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Inicia sesión
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Bienvenido de vuelta. Tu nube te espera.
            </p>
          </div>

          {errorApi && <Alerta>{errorApi}</Alerta>}
          {noVerificado && (
            <Alerta tono="info">
              Todavía no confirmas tu correo.{" "}
              {reenviado ? (
                "Te mandamos un enlace nuevo."
              ) : (
                <button
                  type="button"
                  className="font-bold underline"
                  onClick={async () => { await authApi.reenviarVerificacion(fields.email); setReenviado(true); }}
                >
                  Reenviar enlace
                </button>
              )}
            </Alerta>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <InputField
              id="email"
              label="Correo electrónico"
              type="email"
              placeholder="maria@empresa.com"
              value={fields.email}
              error={errors.email}
              onChange={set("email")}
              autoComplete="email"
            />

            <InputField
              id="password"
              label="Contraseña"
              type={showPw ? "text" : "password"}
              placeholder="Tu contraseña"
              value={fields.password}
              error={errors.password}
              onChange={set("password")}
              autoComplete="current-password"
              labelSuffix={
                <button
                  type="button"
                  onClick={onForgot}
                  className="text-xs font-semibold transition-colors duration-150 hover:underline focus:outline-none"
                  style={{ color: "#2E9BFF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              }
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <EyeIcon open={showPw} />
                </button>
              }
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 mt-1 flex items-center justify-center gap-2"
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
                  <svg
                    className="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Iniciando sesión…
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          {/* Sign-up link */}
          <p className="text-center text-sm mt-6" style={{ color: "#64748B" }}>
            ¿No tienes cuenta?{" "}
            <button
              onClick={onSignUp}
              className="font-semibold hover:underline focus:outline-none transition-colors"
              style={{ color: "#2E9BFF" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
            >
              Regístrate
            </button>
          </p>
        </div>

        {/* Trust badges */}
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
      </div>
    </div>
  );
}
