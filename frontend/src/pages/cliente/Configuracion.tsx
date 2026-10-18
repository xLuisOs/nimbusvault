// Configuración de la cuenta: perfil, apariencia (claro/oscuro), seguridad, plan y eliminar la cuenta.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { cuentaApi, type SesionAbierta } from "@/api/auth";
import SubirArchivoModal from "@/components/SubirArchivoModal";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { formatoBytes, formatoFecha, formatoGB, haceCuanto, iniciales } from "@/utils/format";
import { type PreferenciaTema, useTema } from "@/utils/tema";

// ── Piezas comunes ────────────────────────────────────────────────────────────

function Seccion({ titulo, descripcion, children, peligro = false }: {
  titulo: string; descripcion: string; children: React.ReactNode; peligro?: boolean;
}) {
  return (
    <section
      className="rounded-2xl"
      style={{ background: "var(--nv-surface)", border: `1px solid ${peligro ? "var(--nv-red-border)" : "var(--nv-border)"}` }}
    >
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
        <h2 className="text-sm font-extrabold" style={{ color: peligro ? "#EF4444" : "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {titulo}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "var(--nv-text-4)" }}>{descripcion}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Campo({ label, children, ayuda }: { label: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold" style={{ color: "var(--nv-text-2)" }}>{label}</span>
      {children}
      {ayuda && <span className="text-[11px]" style={{ color: "var(--nv-text-4)" }}>{ayuda}</span>}
    </label>
  );
}

const inputClase = "px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors w-full";
const inputEstilo = { border: "1.5px solid var(--nv-border)" };

function Aviso({ texto, error }: { texto: string; error?: boolean }) {
  if (!texto) return null;
  return (
    <p
      className="text-xs font-semibold px-3 py-2 rounded-lg"
      style={error
        ? { background: "var(--nv-red-soft)", color: "var(--nv-red-strong)" }
        : { background: "var(--nv-green-soft)", color: "var(--nv-green-strong)" }}
    >
      {texto}
    </p>
  );
}

function BotonPrimario({ children, disabled, peligro = false }: { children: React.ReactNode; disabled?: boolean; peligro?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: peligro ? "#EF4444" : "#2E9BFF" }}
    >
      {children}
    </button>
  );
}

const PASSWORD_VALIDA = (v: string) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

// ── Perfil ────────────────────────────────────────────────────────────────────

function Perfil() {
  const { usuario, recargarUsuario } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>({ texto: "" });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { setNombre(usuario?.nombre ?? ""); }, [usuario?.nombre]);
  if (!usuario) return null;
  const cambio = nombre.trim().length >= 2 && nombre.trim() !== usuario.nombre;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await cuentaApi.actualizarPerfil(nombre.trim());
      await recargarUsuario();
      setAviso({ texto: "Nombre actualizado." });
    } catch (err) {
      setAviso({ texto: (err as Error).message, error: true });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Seccion titulo="Perfil" descripcion="Así te verás en NimbusVault.">
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
          >
            {iniciales(usuario.nombre)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "var(--nv-text-1)" }}>{usuario.nombre}</p>
            <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>Cliente desde {formatoFecha(usuario.creado_en)}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Campo label="Nombre completo">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={120} required
              className={inputClase} style={inputEstilo} />
          </Campo>
          <Campo label="Correo electrónico" ayuda="Es tu usuario para entrar; no se puede cambiar.">
            <input value={usuario.correo} readOnly className={inputClase}
              style={{ ...inputEstilo, background: "var(--nv-muted)", color: "var(--nv-text-3)", cursor: "not-allowed" }} />
          </Campo>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <BotonPrimario disabled={!cambio || guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</BotonPrimario>
          <Aviso {...aviso} />
        </div>
      </form>
    </Seccion>
  );
}

// ── Apariencia ────────────────────────────────────────────────────────────────

const OPCIONES_TEMA: { id: PreferenciaTema; titulo: string; detalle: string }[] = [
  { id: "claro", titulo: "Claro", detalle: "Fondo claro, ideal de día" },
  { id: "oscuro", titulo: "Oscuro", detalle: "Descansa la vista de noche" },
  { id: "sistema", titulo: "Según el sistema", detalle: "Sigue la configuración de tu equipo" },
];

function MiniVista({ oscuro }: { oscuro: boolean }) {
  const fondo = oscuro ? "#0B1220" : "#F8FAFC";
  const tarjeta = oscuro ? "#111B2E" : "#FFFFFF";
  const linea = oscuro ? "#253552" : "#E2E8F0";
  return (
    <div className="rounded-lg overflow-hidden flex h-16" style={{ background: fondo, border: `1px solid ${linea}` }}>
      <div className="w-5" style={{ background: "#062D5B" }} />
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-2 w-1/2 rounded" style={{ background: linea }} />
        <div className="flex-1 rounded flex items-end p-1" style={{ background: tarjeta, border: `1px solid ${linea}` }}>
          <div className="h-1.5 w-2/3 rounded" style={{ background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }} />
        </div>
      </div>
    </div>
  );
}

function Apariencia() {
  const { preferencia, cambiar } = useTema();
  const sistemaOscuro = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <Seccion titulo="Apariencia" descripcion="Elige cómo se ve la aplicación. Se recuerda en este navegador.">
      <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Tema de la aplicación">
        {OPCIONES_TEMA.map((op) => {
          const activo = preferencia === op.id;
          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => cambiar(op.id)}
              className="rounded-xl p-3 text-left flex flex-col gap-2.5 transition-all"
              style={{
                border: `2px solid ${activo ? "#2E9BFF" : "var(--nv-border)"}`,
                background: activo ? "var(--nv-blue-soft)" : "var(--nv-surface)",
              }}
            >
              {op.id === "sistema" ? (
                <div className="grid grid-cols-2 gap-1"><MiniVista oscuro={false} /><MiniVista oscuro /></div>
              ) : (
                <MiniVista oscuro={op.id === "oscuro"} />
              )}
              <div>
                <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--nv-text-1)" }}>
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${activo ? "#2E9BFF" : "var(--nv-border-strong)"}` }}
                  >
                    {activo && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2E9BFF" }} />}
                  </span>
                  {op.titulo}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--nv-text-4)" }}>
                  {op.id === "sistema" ? `${op.detalle} (ahora: ${sistemaOscuro ? "oscuro" : "claro"})` : op.detalle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Seccion>
  );
}

// ── Seguridad ─────────────────────────────────────────────────────────────────

function CambiarContrasena({ onCambiada }: { onCambiada: () => void }) {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>({ texto: "" });
  const [guardando, setGuardando] = useState(false);

  const nuevaOk = PASSWORD_VALIDA(nueva);
  const coincide = nueva === confirmar;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaOk || !coincide) return;
    setGuardando(true);
    try {
      const r = await cuentaApi.cambiarContrasena(actual, nueva);
      setAviso({ texto: r.mensaje });
      setActual(""); setNueva(""); setConfirmar("");
      onCambiada();
    } catch (err) {
      setAviso({ texto: (err as Error).message, error: true });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nv-text-4)" }}>Contraseña</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <Campo label="Contraseña actual">
          <input type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)}
            required className={inputClase} style={inputEstilo} />
        </Campo>
        <Campo label="Nueva contraseña" ayuda={nueva && !nuevaOk ? "Mínimo 8 caracteres, con letras y números" : undefined}>
          <input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)}
            required className={inputClase}
            style={{ ...inputEstilo, borderColor: nueva && !nuevaOk ? "#EF4444" : "var(--nv-border)" }} />
        </Campo>
        <Campo label="Confirmar nueva" ayuda={confirmar && !coincide ? "No coincide con la nueva contraseña" : undefined}>
          <input type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
            required className={inputClase}
            style={{ ...inputEstilo, borderColor: confirmar && !coincide ? "#EF4444" : "var(--nv-border)" }} />
        </Campo>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <BotonPrimario disabled={guardando || !actual || !nuevaOk || !coincide}>
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </BotonPrimario>
        <Aviso {...aviso} />
      </div>
      <p className="text-[11px]" style={{ color: "var(--nv-text-4)" }}>
        Al cambiarla se cierran tus sesiones en otros dispositivos; esta sigue abierta.
      </p>
    </form>
  );
}

/** "Mozilla/5.0 (Windows NT 10.0…) Chrome/…" → "Chrome en Windows" */
function describirNavegador(ua: string | null): string {
  if (!ua) return "Navegador desconocido";
  const navegador = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /python-requests|curl/i.test(ua) ? "Script" : "Navegador";
  const sistema = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return sistema ? `${navegador} en ${sistema}` : navegador;
}

function Sesiones({ version }: { version: number }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sesiones, setSesiones] = useState<SesionAbierta[] | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean }>({ texto: "" });

  const cargar = useCallback(() => {
    cuentaApi.sesiones().then(setSesiones).catch((e: Error) => setAviso({ texto: e.message, error: true }));
  }, []);
  useEffect(cargar, [cargar, version]);

  async function cerrar(s: SesionAbierta) {
    try {
      await cuentaApi.cerrarSesion(s.id_sesion);
      if (s.actual) { await logout(); navigate("/login"); return; }
      cargar();
      setAviso({ texto: `Se cerró la sesión de ${describirNavegador(s.user_agent)}.` });
    } catch (e) {
      setAviso({ texto: (e as Error).message, error: true });
    }
  }

  async function cerrarOtras() {
    try {
      const r = await cuentaApi.cerrarOtras();
      cargar();
      setAviso({ texto: r.mensaje });
    } catch (e) {
      setAviso({ texto: (e as Error).message, error: true });
    }
  }

  const otras = (sesiones ?? []).filter((s) => !s.actual).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nv-text-4)" }}>Sesiones abiertas</h3>
        {otras > 0 && (
          <button
            onClick={cerrarOtras}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: "#EF4444", border: "1px solid var(--nv-red-border)", background: "var(--nv-surface)" }}
          >
            {otras === 1 ? "Cerrar la otra sesión" : `Cerrar las otras ${otras}`}
          </button>
        )}
      </div>
      <Aviso {...aviso} />
      {sesiones === null ? (
        <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>Cargando…</p>
      ) : (
        <div className="flex flex-col divide-y rounded-xl overflow-hidden" style={{ border: "1px solid var(--nv-border)", borderColor: "var(--nv-border)" }}>
          {sesiones.map((s) => (
            <div key={s.id_sesion} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--nv-muted)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--nv-blue-soft)", color: "#2E9BFF" }}>
                <NavIcon id={/Android|iPhone|iPad/.test(s.user_agent ?? "") ? "card" : "grid"} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2 flex-wrap" style={{ color: "var(--nv-text-1)" }}>
                  {describirNavegador(s.user_agent)}
                  {s.actual && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--nv-green-soft)", color: "var(--nv-green-strong)" }}>
                      Este navegador
                    </span>
                  )}
                </p>
                <p className="text-[11px]" style={{ color: "var(--nv-text-4)" }}>
                  {s.ip ?? "IP desconocida"} · inició {haceCuanto(s.creado_en)}
                </p>
              </div>
              <button
                onClick={() => cerrar(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                style={{ color: "var(--nv-text-3)", background: "var(--nv-muted)" }}
              >
                {s.actual ? "Cerrar sesión" : "Cerrar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Seguridad() {
  const [version, setVersion] = useState(0); // recarga las sesiones al cambiar la contraseña
  return (
    <Seccion titulo="Seguridad" descripcion="Tu contraseña y los dispositivos donde tienes la sesión abierta.">
      <div className="flex flex-col gap-8">
        <CambiarContrasena onCambiada={() => setVersion((v) => v + 1)} />
        <Sesiones version={version} />
      </div>
    </Seccion>
  );
}

// ── Plan ──────────────────────────────────────────────────────────────────────

function PlanResumen({ onPlans, onPayments }: { onPlans: () => void; onPayments?: () => void }) {
  const { usuario } = useAuth();
  const { total, pct, usadoBytes } = useAlmacenamiento();
  const sus = usuario?.suscripcion;
  return (
    <Seccion titulo="Plan y facturación" descripcion="Tu plan actual y el espacio que estás usando.">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-lg font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {sus ? `Plan ${sus.plan_nombre}` : "Sin plan activo"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--nv-text-4)" }}>
            {formatoBytes(usadoBytes)} de {formatoGB(total)} ({pct}%){sus ? ` · vigente hasta ${formatoFecha(sus.fecha_fin)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {onPayments && (
            <button onClick={onPayments} className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ color: "var(--nv-text-2)", background: "var(--nv-muted)" }}>
              Ver pagos
            </button>
          )}
          <button onClick={onPlans} className="text-sm font-bold px-4 py-2 rounded-xl text-white" style={{ background: "#2E9BFF" }}>
            Cambiar de plan
          </button>
        </div>
      </div>
    </Seccion>
  );
}

// ── Eliminar la cuenta ────────────────────────────────────────────────────────

function ZonaPeligro() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { usadoBytes } = useAlmacenamiento();
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmo, setConfirmo] = useState(false);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(false);

  async function eliminar(e: React.FormEvent) {
    e.preventDefault();
    setEliminando(true);
    setError("");
    try {
      await cuentaApi.eliminarCuenta(password);
      await logout().catch(() => undefined);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setEliminando(false);
    }
  }

  return (
    <Seccion titulo="Eliminar la cuenta" descripcion="Esta acción no se puede deshacer." peligro>
      {!abierto ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm" style={{ color: "var(--nv-text-2)" }}>
            Se borran tu cuenta, tus archivos ({formatoBytes(usadoBytes)}), tus suscripciones y tu historial de pagos.
          </p>
          <button
            onClick={() => setAbierto(true)}
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ color: "#EF4444", border: "1.5px solid #EF4444", background: "var(--nv-surface)" }}
          >
            Eliminar mi cuenta
          </button>
        </div>
      ) : (
        <form onSubmit={eliminar} className="flex flex-col gap-4 max-w-md">
          <Campo label="Escribe tu contraseña para confirmar">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
              required className={inputClase} style={inputEstilo} autoFocus />
          </Campo>
          <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "var(--nv-text-2)" }}>
            <input type="checkbox" checked={confirmo} onChange={(e) => setConfirmo(e.target.checked)} className="mt-0.5" />
            Entiendo que mis archivos se borran para siempre y que no se puede recuperar la cuenta.
          </label>
          {error && <Aviso texto={error} error />}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setAbierto(false); setPassword(""); setConfirmo(false); setError(""); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--nv-muted)", color: "var(--nv-text-3)" }}>
              Cancelar
            </button>
            <BotonPrimario peligro disabled={!password || !confirmo || eliminando}>
              {eliminando ? "Eliminando…" : "Eliminar definitivamente"}
            </BotonPrimario>
          </div>
        </form>
      )}
    </Seccion>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface ConfiguracionProps {
  onLogout: () => void;
  onDashboard: () => void;
  onPlans: () => void;
  onFiles?: () => void;
  onPayments?: () => void;
  onConsumption?: () => void;
}

export default function Configuracion({ onLogout, onDashboard, onPlans, onFiles, onPayments, onConsumption }: ConfiguracionProps) {
  const [uploadOpen, setUploadOpen] = useState(false);

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
    else if (id === "files" && onFiles) onFiles();
    else if (id === "payments" && onPayments) onPayments();
    else if (id === "consumption" && onConsumption) onConsumption();
  }

  return (
    <>
      <AppShell activeNav="settings" onNav={handleNav} onLogout={onLogout} onUpload={() => setUploadOpen(true)} headerTitle="Configuración">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            <Perfil />
            <Apariencia />
            <Seguridad />
            <PlanResumen onPlans={onPlans} onPayments={onPayments} />
            <ZonaPeligro />
          </div>
        </main>
      </AppShell>
      {uploadOpen && <SubirArchivoModal onClose={() => setUploadOpen(false)} onVerArchivos={onFiles} />}
    </>
  );
}
