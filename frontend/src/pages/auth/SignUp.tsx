import { useState, useEffect } from "react";

import { authApi } from "@/api/auth";
import AuthLayout, { Alerta, IconoEstado, Titulo } from "@/components/layout/AuthLayout";

// ── Helpers ───────────────────────────────────────────────────────────────────

function validate(fields: {
  name: string;
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
}) {
  const errors: Record<string, string> = {};
  if (!fields.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!fields.email.trim()) errors.email = "El correo es obligatorio.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errors.email = "Introduce un correo válido.";
  if (!fields.password) errors.password = "La contraseña es obligatoria.";
  else if (fields.password.length < 8)
    errors.password = "Debe tener al menos 8 caracteres.";
  else if (!/[A-Za-z]/.test(fields.password) || !/\d/.test(fields.password))
    errors.password = "Usa letras y números.";
  if (!fields.confirm) errors.confirm = "Confirma tu contraseña.";
  else if (fields.confirm !== fields.password)
    errors.confirm = "Las contraseñas no coinciden.";
  if (!fields.terms) errors.terms = "Debes aceptar los términos para continuar.";
  return errors;
}

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: "", color: "transparent", width: "0%" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Débil", color: "#FF6B6B", width: "25%" };
  if (score === 2) return { label: "Regular", color: "#F59E0B", width: "50%" };
  if (score === 3) return { label: "Buena", color: "#4DB8FF", width: "75%" };
  return { label: "Fuerte", color: "#00D1C1", width: "100%" };
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
}

function InputField({
  id, label, type = "text", placeholder, value, error, onChange, autoComplete, suffix,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold" style={{ color: "#334155" }}>
        {label}
      </label>
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
            boxShadow: focused && !error ? "0 0 0 3px rgba(46,155,255,0.12)" : error ? "0 0 0 3px rgba(255,107,107,0.10)" : "none",
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

interface SignUpProps {
  onBack: () => void;
  onLogin: () => void;
}

export default function SignUp({ onBack, onLogin }: SignUpProps) {
  const [fields, setFields] = useState({ name: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const strength = strengthLabel(fields.password);

  // Force confirm error live after first submit attempt
  useEffect(() => {
    if (submitted && fields.confirm && fields.password) {
      setErrors((prev) => ({
        ...prev,
        confirm: fields.confirm !== fields.password ? "Las contraseñas no coinciden." : "",
      }));
    }
  }, [fields.confirm, fields.password, submitted]);

  const set = (key: keyof typeof fields) => (v: string | boolean) =>
    setFields((f) => ({ ...f, [key]: v }));

  const [cargando, setCargando] = useState(false);
  const [errorApi, setErrorApi] = useState("");
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [reenviado, setReenviado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(fields);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCargando(true);
    setErrorApi("");
    try {
      await authApi.registro({
        nombre: fields.name,
        correo: fields.email,
        password: fields.password,
        acepto_terminos: fields.terms,
      });
      setEnviadoA(fields.email);
    } catch (err: any) {
      setErrorApi(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (enviadoA) {
    return (
      <AuthLayout>
        <IconoEstado tono="info" />
        <Titulo sub={<>Te enviamos un enlace a <b style={{ color: "#0F172A" }}>{enviadoA}</b>. Ábrelo para activar tu cuenta.</>}>
          Revisa tu correo
        </Titulo>
        {reenviado && <Alerta tono="exito">Listo, te mandamos otro enlace.</Alerta>}
        <button
          onClick={async () => { await authApi.reenviarVerificacion(enviadoA); setReenviado(true); }}
          className="w-full py-3 rounded-xl text-sm font-semibold mb-3"
          style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
        >
          Reenviar correo
        </button>
        <button onClick={onLogin} className="w-full text-sm font-semibold" style={{ color: "#64748B" }}>
          Ya lo confirmé, iniciar sesión
        </button>
      </AuthLayout>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14"
      style={{ background: "linear-gradient(160deg, #E0F4FF 0%, #ffffff 55%, #f0fafb 100%)" }}
    >
      {/* Decorative blobs */}
      <div
        className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #2E9BFF, transparent 70%)", transform: "translate(40%, -40%)" }}
      />
      <div
        className="fixed bottom-0 left-0 w-72 h-72 rounded-full opacity-15 pointer-events-none blur-3xl"
        style={{ background: "radial-gradient(circle, #00D1C1, transparent 70%)", transform: "translate(-30%, 30%)" }}
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
              Crea tu cuenta
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Empieza gratis, sin tarjeta de crédito.
            </p>
          </div>

          {errorApi && <Alerta>{errorApi}</Alerta>}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <InputField
              id="name"
              label="Nombre completo"
              placeholder="María García"
              value={fields.name}
              error={errors.name}
              onChange={set("name")}
              autoComplete="name"
            />

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

            <div className="flex flex-col gap-1.5">
              <InputField
                id="password"
                label="Contraseña"
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={fields.password}
                error={errors.password}
                onChange={set("password")}
                autoComplete="new-password"
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
              {/* Strength bar */}
              {fields.password.length > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: strength.width, background: strength.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: strength.color, minWidth: 42 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <InputField
              id="confirm"
              label="Confirmar contraseña"
              type={showConfirm ? "text" : "password"}
              placeholder="Repite tu contraseña"
              value={fields.confirm}
              error={errors.confirm}
              onChange={set("confirm")}
              autoComplete="new-password"
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="focus:outline-none"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              }
            />

            {/* Terms */}
            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={fields.terms}
                    onChange={(e) => set("terms")(e.target.checked)}
                  />
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150"
                    style={{
                      background: fields.terms ? "#2E9BFF" : "white",
                      border: `1.5px solid ${errors.terms ? "#FF6B6B" : fields.terms ? "#2E9BFF" : "#CBD5E1"}`,
                      boxShadow: fields.terms ? "0 0 0 3px rgba(46,155,255,0.15)" : "none",
                    }}
                  >
                    {fields.terms && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm leading-relaxed" style={{ color: "#334155" }}>
                  Acepto los{" "}
                  <a href="#" style={{ color: "#2E9BFF" }} className="font-semibold hover:underline">
                    Términos de servicio
                  </a>{" "}
                  y la{" "}
                  <a href="#" style={{ color: "#2E9BFF" }} className="font-semibold hover:underline">
                    Política de privacidad
                  </a>
                </span>
              </label>
              {errors.terms && (
                <div className="flex items-center gap-1.5 text-xs font-medium ml-8" style={{ color: "#FF6B6B" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#FF6B6B" strokeWidth="1.5" />
                    <path d="M7 4v3.5M7 9.5v.5" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {errors.terms}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-150 mt-1"
              style={{ background: "#2E9BFF", boxShadow: "0 4px 16px rgba(46,155,255,0.30)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(46,155,255,0.42)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(46,155,255,0.30)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {cargando ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm mt-6" style={{ color: "#64748B" }}>
            ¿Ya tienes cuenta?{" "}
            <button
              onClick={onLogin}
              className="font-semibold hover:underline focus:outline-none transition-colors"
              style={{ color: "#2E9BFF" }}
            >
              Inicia sesión
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
