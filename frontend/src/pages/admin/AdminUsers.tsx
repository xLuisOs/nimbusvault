import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi } from "@/api/admin";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";
import { useAuth } from "@/context/AuthContext";
import type { Rol, UsuarioAdmin } from "@/types";
import { formatoBytes, formatoFecha, haceCuanto, iniciales } from "@/utils/format";

// ── Data ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const ROL_TEXTO: Record<Rol, string> = { CLIENTE: "Cliente", ADMINISTRADOR: "Admin", SOPORTE: "Soporte" };
const ROL_STYLE: Record<Rol, { bg: string; color: string }> = {
  CLIENTE:       { bg: "var(--nv-blue-soft)", color: "#1E6BD6" },
  ADMINISTRADOR: { bg: "#062D5B", color: "white"   },
  SOPORTE:       { bg: "var(--nv-blue-soft)", color: "#0EA5E9" },
};
const ESTADO_STYLE: Record<UsuarioAdmin["estado"], { texto: string; bg: string; color: string }> = {
  activo:     { texto: "Activo",     bg: "var(--nv-green-soft)", color: "#00C896" },
  suspendido: { texto: "Suspendido", bg: "var(--nv-red-soft)", color: "#FF6B6B" },
  pendiente:  { texto: "Pendiente",  bg: "var(--nv-amber-soft)", color: "var(--nv-amber-strong)" },
};
const PLAN_COLOR: Record<string, string> = {
  Gratis: "var(--nv-text-3)", Personal: "#4DB8FF", Pro: "#2E9BFF", Business: "#00D1C1",
};

// ── Badges ─────────────────────────────────────────────────────────────────────

function RoleBadge({ rol }: { rol: Rol }) {
  const s = ROL_STYLE[rol];
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.color }}>
      {ROL_TEXTO[rol]}
    </span>
  );
}

function StatusBadge({ estado }: { estado: UsuarioAdmin["estado"] }) {
  const s = ESTADO_STYLE[estado];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.texto}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-[11px]" style={{ color: "var(--nv-border-strong)" }}>—</span>;
  const color = PLAN_COLOR[plan] ?? "var(--nv-text-3)";
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "18", color }}>
      {plan}
    </span>
  );
}

// ── Filter select ──────────────────────────────────────────────────────────────

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-2 rounded-xl outline-none transition-all duration-150"
      style={{
        background: "var(--nv-surface)",
        border: "1.5px solid var(--nv-border)",
        color: value ? "var(--nv-text-1)" : "var(--nv-text-4)",
        appearance: "none",
        paddingRight: "32px",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%2394A3B8' strokeWidth='1.4' strokeLinecap='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const OPCIONES_ROL = (Object.keys(ROL_TEXTO) as Rol[]).map((r) => ({ value: r, label: ROL_TEXTO[r] }));

// ── Modals ─────────────────────────────────────────────────────────────────────

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "var(--nv-surface)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
          <h3 className="font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{titulo}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--nv-text-4)" }} aria-label="Cerrar"
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <AdminIcon id="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" };

function Botones({ cargando, texto, onCancel, peligro = false }: { cargando: boolean; texto: string; onCancel: () => void; peligro?: boolean }) {
  return (
    <div className="flex gap-3 mt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--nv-muted)", color: "var(--nv-text-3)" }}>
        Cancelar
      </button>
      <button
        type="submit"
        disabled={cargando}
        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
        style={{ background: peligro ? "#EF4444" : "#2E9BFF", boxShadow: peligro ? undefined : "0 2px 12px rgba(46,155,255,0.28)" }}
      >
        {cargando ? "Guardando…" : texto}
      </button>
    </div>
  );
}

function InvitarModal({ onClose, onListo }: { onClose: () => void; onListo: (u: UsuarioAdmin) => void }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<Rol>("CLIENTE");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      onListo(await adminApi.invitar(nombre.trim(), correo.trim(), rol));
    } catch (err) {
      setError((err as Error).message);
      setCargando(false);
    }
  }

  return (
    <Modal titulo="Nuevo usuario" onClose={onClose}>
      <form className="p-6 flex flex-col gap-4" onSubmit={enviar}>
        <p className="text-xs" style={{ color: "var(--nv-text-3)" }}>
          Le enviaremos un correo para que elija su contraseña. Los clientes empiezan en el plan Gratis.
        </p>
        <Campo label="Nombre completo">
          <input required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana Torres"
            className="px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Campo>
        <Campo label="Correo electrónico">
          <input required type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="ana@empresa.com"
            className="px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Campo>
        <Campo label="Rol">
          <Select value={rol} onChange={(v) => setRol(v as Rol)} options={OPCIONES_ROL} />
        </Campo>
        {error && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</p>}
        <Botones cargando={cargando} texto="Enviar invitación" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function EditarModal({ usuario, onClose, onListo }: { usuario: UsuarioAdmin; onClose: () => void; onListo: (u: UsuarioAdmin) => void }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const cambios: { nombre?: string; rol?: Rol } = {};
    if (nombre.trim() !== usuario.nombre) cambios.nombre = nombre.trim();
    if (rol !== usuario.rol) cambios.rol = rol;
    if (!Object.keys(cambios).length) return onClose();
    setCargando(true);
    setError("");
    try {
      onListo(await adminApi.actualizar(usuario.id_usuario, cambios));
    } catch (err) {
      setError((err as Error).message);
      setCargando(false);
    }
  }

  return (
    <Modal titulo="Editar usuario" onClose={onClose}>
      <form className="p-6 flex flex-col gap-4" onSubmit={enviar}>
        <p className="text-xs" style={{ color: "var(--nv-text-3)" }}>{usuario.correo}</p>
        <Campo label="Nombre completo">
          <input required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Campo>
        <Campo label="Rol">
          <Select value={rol} onChange={(v) => setRol(v as Rol)} options={OPCIONES_ROL} />
        </Campo>
        {rol !== usuario.rol && (
          <p className="text-xs" style={{ color: "var(--nv-amber-strong)" }}>Al cambiar el rol se cierran sus sesiones abiertas.</p>
        )}
        {error && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</p>}
        <Botones cargando={cargando} texto="Guardar cambios" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function EliminarModal({ usuario, onClose, onListo }: { usuario: UsuarioAdmin; onClose: () => void; onListo: () => void }) {
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    try {
      await adminApi.eliminar(usuario.id_usuario);
      onListo();
    } catch (err) {
      setError((err as Error).message);
      setCargando(false);
    }
  }

  return (
    <Modal titulo="Eliminar usuario" onClose={onClose}>
      <form className="p-6 flex flex-col gap-4" onSubmit={enviar}>
        <p className="text-sm" style={{ color: "var(--nv-text-2)" }}>
          ¿Eliminar a <strong>{usuario.nombre}</strong> ({usuario.correo})?
        </p>
        <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: "var(--nv-red-soft)", color: "var(--nv-red-strong)" }}>
          Se borran su cuenta, sus {formatoBytes(usuario.almacenamiento_usado_bytes)} de archivos (también del almacenamiento),
          sus suscripciones y su historial de pagos. No se puede deshacer.
        </p>
        {error && <p className="text-xs font-semibold" style={{ color: "#DC2626" }}>{error}</p>}
        <Botones cargando={cargando} texto="Eliminar definitivamente" onCancel={onClose} peligro />
      </form>
    </Modal>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminUsersProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

type ModalAbierto = { tipo: "nuevo" } | { tipo: "editar" | "eliminar"; usuario: UsuarioAdmin } | null;

export default function AdminUsers({ onNav, onLogout }: AdminUsersProps) {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [search, setSearch]     = useState("");
  const [roleF, setRoleF]       = useState("");
  const [statusF, setStatusF]   = useState("");
  const [page, setPage]         = useState(1);
  const [modal, setModal]       = useState<ModalAbierto>(null);
  const [notif, setNotif] = useState<{ texto: string; error?: boolean } | null>(null);

  const cargar = useCallback(() => {
    adminApi.usuarios().then(setUsuarios).catch((e: Error) => setErrorCarga(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  function showNotif(texto: string, error = false) {
    setNotif({ texto, error });
    setTimeout(() => setNotif(null), 3500);
  }

  function reemplazar(u: UsuarioAdmin) {
    setUsuarios((prev) => prev?.map((x) => (x.id_usuario === u.id_usuario ? u : x)) ?? prev);
  }

  async function alternarEstado(u: UsuarioAdmin) {
    const nuevo = u.estado === "activo" ? "suspendido" : "activo";
    try {
      reemplazar(await adminApi.actualizar(u.id_usuario, { estado: nuevo }));
      showNotif(`${u.nombre} ${nuevo === "suspendido" ? "fue suspendido y se cerraron sus sesiones" : "está activo de nuevo"}.`);
    } catch (e) {
      showNotif((e as Error).message, true);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (usuarios ?? []).filter((u) =>
      (!q || u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q)) &&
      (!roleF || u.rol === roleF) &&
      (!statusF || u.estado === statusF),
    );
  }, [usuarios, search, roleF, statusF]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilter(setter: (v: string) => void, v: string) {
    setter(v);
    setPage(1);
  }

  return (
    <AdminShell
      activeNav="usuarios"
      onNav={onNav}
      onLogout={onLogout}
      title="Usuarios"
      headerRight={
        <button
          onClick={() => setModal({ tipo: "nuevo" })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-150"
          style={{ background: "#2E9BFF", boxShadow: "0 2px 12px rgba(46,155,255,0.28)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
        >
          <AdminIcon id="plus" size={16} />
          Nuevo usuario
        </button>
      }
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-5">

        {/* Notification */}
        {notif && (
          <div className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={notif.error
              ? { background: "var(--nv-red-soft)", color: "var(--nv-red-strong)", border: "1px solid var(--nv-red-border)" }
              : { background: "var(--nv-green-soft)", color: "var(--nv-green-strong)", border: "1px solid var(--nv-green-border)" }}>
            <AdminIcon id={notif.error ? "x" : "check"} size={16} />{notif.texto}
          </div>
        )}
        {errorCarga && (
          <p className="text-xs px-4 py-2.5 rounded-xl" style={{ background: "var(--nv-red-soft)", color: "var(--nv-red-strong)" }}>
            No se pudieron cargar los usuarios: {errorCarga}
          </p>
        )}

        {/* Filters */}
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
          style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}
        >
          <div className="relative flex-1 min-w-48">
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--nv-text-4)" }}>
              <AdminIcon id="search" size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o correo…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all"
              style={{ background: "var(--nv-bg)", border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
              onBlur={(e) => (e.target.style.borderColor = "var(--nv-border)")}
            />
          </div>

          <Select value={roleF} onChange={(v) => handleFilter(setRoleF, v)} placeholder="Todos los roles" options={OPCIONES_ROL} />
          <Select
            value={statusF}
            onChange={(v) => handleFilter(setStatusF, v)}
            placeholder="Todos los estados"
            options={(Object.keys(ESTADO_STYLE) as UsuarioAdmin["estado"][]).map((e) => ({ value: e, label: ESTADO_STYLE[e].texto }))}
          />

          {(search || roleF || statusF) && (
            <button
              onClick={() => { setSearch(""); setRoleF(""); setStatusF(""); setPage(1); }}
              className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              style={{ color: "var(--nv-text-4)", background: "var(--nv-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B6B"; e.currentTarget.style.background = "var(--nv-red-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--nv-text-4)"; e.currentTarget.style.background = "var(--nv-muted)"; }}
            >
              Limpiar filtros
            </button>
          )}

          <div className="ml-auto text-xs" style={{ color: "var(--nv-text-4)" }}>
            {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nv-muted)" }}>
                  {["Usuario", "Rol", "Plan", "Almacenamiento", "Estado", "Alta", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--nv-text-4)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios === null && !errorCarga ? (
                  <tr><td colSpan={7} className="text-center py-12 text-sm" style={{ color: "var(--nv-text-4)" }}>Cargando usuarios…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm" style={{ color: "var(--nv-text-4)" }}>
                      No se encontraron usuarios con esos filtros.
                    </td>
                  </tr>
                ) : pageRows.map((u, i) => {
                  const soyYo = u.id_usuario === yo?.id_usuario;
                  const pctUso = u.cuota_bytes ? Math.min(100, Math.round((u.almacenamiento_usado_bytes / u.cuota_bytes) * 100)) : 0;
                  return (
                    <tr
                      key={u.id_usuario}
                      style={{ borderBottom: i < pageRows.length - 1 ? "1px solid var(--nv-bg)" : "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--nv-bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: `hsl(${(u.nombre.charCodeAt(0) * 5) % 360}, 60%, 55%)` }}
                          >
                            {iniciales(u.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--nv-text-1)" }}>
                              {u.nombre}{soyYo && <span style={{ color: "var(--nv-text-4)" }}> (tú)</span>}
                            </p>
                            <p className="text-[11px] whitespace-nowrap" style={{ color: "var(--nv-text-3)" }}>{u.correo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><RoleBadge rol={u.rol} /></td>
                      <td className="px-5 py-3.5"><PlanBadge plan={u.plan} /></td>
                      <td className="px-5 py-3.5">
                        {u.cuota_bytes ? (
                          <div className="min-w-24">
                            <p className="text-xs font-semibold" style={{ color: "var(--nv-text-2)" }}>{formatoBytes(u.almacenamiento_usado_bytes)}</p>
                            <div className="h-1 rounded-full mt-1" style={{ background: "var(--nv-muted)" }}>
                              <div className="h-1 rounded-full" style={{ width: `${Math.max(pctUso, u.almacenamiento_usado_bytes ? 2 : 0)}%`, background: pctUso >= 90 ? "#F59E0B" : "#2E9BFF" }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: "var(--nv-border-strong)" }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge estado={u.estado} /></td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-xs" style={{ color: "var(--nv-text-3)" }}>{formatoFecha(u.creado_en)}</p>
                        <p className="text-[10px]" style={{ color: "var(--nv-text-4)" }}>
                          {u.ultimo_acceso ? `Último acceso ${haceCuanto(u.ultimo_acceso)}` : "Nunca ha entrado"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5" style={{ opacity: soyYo ? 0.35 : 1 }}>
                          <button
                            onClick={() => setModal({ tipo: "editar", usuario: u })}
                            disabled={soyYo}
                            className="p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                            style={{ color: "var(--nv-text-4)" }}
                            title={soyYo ? "No puedes editarte a ti mismo" : "Editar nombre o rol"}
                            onMouseEnter={(e) => { if (!soyYo) { e.currentTarget.style.background = "var(--nv-blue-soft)"; e.currentTarget.style.color = "#2E9BFF"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--nv-text-4)"; }}
                          >
                            <AdminIcon id="edit" size={15} />
                          </button>
                          <button
                            onClick={() => alternarEstado(u)}
                            disabled={soyYo || u.estado === "pendiente"}
                            className="p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                            style={{ color: u.estado === "suspendido" ? "#FF6B6B" : "var(--nv-text-4)", opacity: u.estado === "pendiente" ? 0.35 : 1 }}
                            title={u.estado === "pendiente" ? "Aún no confirma su correo" : u.estado === "activo" ? "Suspender" : "Reactivar"}
                            onMouseEnter={(e) => { if (!soyYo) { e.currentTarget.style.background = "var(--nv-amber-soft)"; e.currentTarget.style.color = "#F59E0B"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = u.estado === "suspendido" ? "#FF6B6B" : "var(--nv-text-4)"; }}
                          >
                            <AdminIcon id="toggle" size={15} />
                          </button>
                          <button
                            onClick={() => setModal({ tipo: "eliminar", usuario: u })}
                            disabled={soyYo}
                            className="p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                            style={{ color: "var(--nv-text-4)" }}
                            title={soyYo ? "No puedes eliminarte a ti mismo" : "Eliminar"}
                            onMouseEnter={(e) => { if (!soyYo) { e.currentTarget.style.background = "var(--nv-red-soft)"; e.currentTarget.style.color = "#FF6B6B"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--nv-text-4)"; }}
                          >
                            <AdminIcon id="trash" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--nv-muted)" }}>
              <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: p === page ? "#2E9BFF" : "var(--nv-muted)", color: p === page ? "white" : "var(--nv-text-3)" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal?.tipo === "nuevo" && (
        <InvitarModal
          onClose={() => setModal(null)}
          onListo={(u) => {
            setUsuarios((prev) => (prev ? [u, ...prev] : [u]));
            setModal(null);
            showNotif(`Le enviamos a ${u.correo} un correo para elegir su contraseña.`);
          }}
        />
      )}
      {modal?.tipo === "editar" && (
        <EditarModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onListo={(u) => { reemplazar(u); setModal(null); showNotif(`Se guardaron los cambios de ${u.nombre}.`); }}
        />
      )}
      {modal?.tipo === "eliminar" && (
        <EliminarModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onListo={() => {
            const eliminado = modal.usuario;
            setUsuarios((prev) => prev?.filter((x) => x.id_usuario !== eliminado.id_usuario) ?? prev);
            setModal(null);
            showNotif(`${eliminado.nombre} fue eliminado.`);
          }}
        />
      )}
    </AdminShell>
  );
}
