import { useState, useMemo } from "react";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";

// ── Data ───────────────────────────────────────────────────────────────────────

type Role   = "Cliente" | "Admin" | "Soporte";
type Status = "Activo" | "Suspendido";

interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  plan: string;
  status: Status;
  date: string;
  storage: string;
}

const USERS: User[] = [
  { id: 1, name: "Luis Granados",   email: "luis@empresa.com",     role: "Admin",    plan: "Pro",        status: "Activo",     date: "01 mar, 2026", storage: "62 GB"  },
  { id: 2, name: "Ana Torres",      email: "ana@empresa.com",      role: "Cliente",  plan: "Business",   status: "Activo",     date: "15 mar, 2026", storage: "340 GB" },
  { id: 3, name: "Carlos Mendoza",  email: "carlos@startup.io",    role: "Cliente",  plan: "Starter",    status: "Activo",     date: "02 abr, 2026", storage: "3.1 GB" },
  { id: 4, name: "María López",     email: "maria@agencia.com",    role: "Soporte",  plan: "Pro",        status: "Activo",     date: "10 abr, 2026", storage: "87 GB"  },
  { id: 5, name: "Javier Ruiz",     email: "javier@corp.com",      role: "Cliente",  plan: "Enterprise", status: "Activo",     date: "22 abr, 2026", storage: "2.4 TB" },
  { id: 6, name: "Laura Castillo",  email: "laura@tech.io",        role: "Cliente",  plan: "Pro",        status: "Suspendido", date: "05 may, 2026", storage: "94 GB"  },
  { id: 7, name: "Sergio Vega",     email: "sergio@digital.com",   role: "Cliente",  plan: "Starter",    status: "Activo",     date: "18 may, 2026", storage: "1.8 GB" },
  { id: 8, name: "Patricia Núñez",  email: "patricia@empresa.mx",  role: "Admin",    plan: "Business",   status: "Activo",     date: "30 may, 2026", storage: "510 GB" },
];

const PAGE_SIZE = 5;

const ROLE_STYLE: Record<Role, { bg: string; color: string }> = {
  Cliente: { bg: "#E0F4FF", color: "#1E6BD6" },
  Admin:   { bg: "#062D5B", color: "white"   },
  Soporte: { bg: "#E0F4FF", color: "#0EA5E9" },
};

const PLAN_COLOR: Record<string, string> = {
  Starter: "#4DB8FF", Pro: "#2E9BFF", Business: "#00D1C1", Enterprise: "#0EA5E9",
};

// ── Badges ─────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const s = ROLE_STYLE[role];
  return (
    <span
      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const active = status === "Activo";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: active ? "#DCFCE7" : "#FEE2E2", color: active ? "#00C896" : "#FF6B6B" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#00C896" : "#FF6B6B" }} />
      {status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const color = PLAN_COLOR[plan] ?? "#64748B";
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "18", color }}>
      {plan}
    </span>
  );
}

// ── Filter select ──────────────────────────────────────────────────────────────

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-2 rounded-xl outline-none transition-all duration-150"
      style={{
        background: "white",
        border: "1.5px solid #E2E8F0",
        color: value ? "#0F172A" : "#94A3B8",
        appearance: "none",
        paddingRight: "32px",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%2394A3B8' strokeWidth='1.4' strokeLinecap='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminUsersProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminUsers({ onNav, onLogout }: AdminUsersProps) {
  const [search, setSearch]     = useState("");
  const [roleF, setRoleF]       = useState("");
  const [statusF, setStatusF]   = useState("");
  const [page, setPage]         = useState(1);
  const [showNewModal, setShowNewModal] = useState(false);
  const [notif, setNotif] = useState("");

  function showNotif(msg: string) {
    setNotif(msg);
    setTimeout(() => setNotif(""), 2800);
  }

  const filtered = useMemo(() => {
    return USERS.filter((u) => {
      const q = search.toLowerCase();
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchR = !roleF || u.role === roleF;
      const matchS = !statusF || u.status === statusF;
      return matchQ && matchR && matchS;
    });
  }, [search, roleF, statusF]);

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
          onClick={() => setShowNewModal(true)}
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
            style={{ background: "#DCFCE7", color: "#065F46", border: "1px solid #A7F3D0" }}>
            <AdminIcon id="check" size={16} />{notif}
          </div>
        )}

        {/* Filters */}
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
          style={{ background: "white", border: "1px solid #E2E8F0" }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
              <AdminIcon id="search" size={16} />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o correo…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-all"
              style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", color: "#0F172A" }}
              onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
            />
          </div>

          <Select
            value={roleF}
            onChange={(v) => handleFilter(setRoleF, v)}
            placeholder="Todos los roles"
            options={[
              { value: "Cliente", label: "Cliente" },
              { value: "Admin",   label: "Admin"   },
              { value: "Soporte", label: "Soporte" },
            ]}
          />
          <Select
            value={statusF}
            onChange={(v) => handleFilter(setStatusF, v)}
            placeholder="Todos los estados"
            options={[
              { value: "Activo",     label: "Activo"     },
              { value: "Suspendido", label: "Suspendido" },
            ]}
          />

          {(search || roleF || statusF) && (
            <button
              onClick={() => { setSearch(""); setRoleF(""); setStatusF(""); setPage(1); }}
              className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
              style={{ color: "#94A3B8", background: "#F1F5F9" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B6B"; e.currentTarget.style.background = "#FEE2E2"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.background = "#F1F5F9"; }}
            >
              Limpiar filtros
            </button>
          )}

          <div className="ml-auto text-xs" style={{ color: "#94A3B8" }}>
            {filtered.length} usuario{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E2E8F0" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                  {["Nombre", "Correo", "Rol", "Plan", "Almacenamiento", "Estado", "Alta", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm" style={{ color: "#94A3B8" }}>
                      No se encontraron usuarios con esos filtros.
                    </td>
                  </tr>
                ) : pageRows.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: i < pageRows.length - 1 ? "1px solid #F8FAFC" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Nombre */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: `hsl(${u.name.charCodeAt(0) * 5 % 360}, 60%, 55%)` }}
                        >
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "#0F172A" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#64748B" }}>{u.email}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5"><PlanBadge plan={u.plan} /></td>
                    <td className="px-5 py-3.5 text-xs font-semibold" style={{ color: "#334155" }}>{u.storage}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "#94A3B8" }}>{u.date}</td>
                    {/* Acciones */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => showNotif(`Usuario "${u.name}" editado.`)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#94A3B8" }}
                          title="Editar"
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; e.currentTarget.style.color = "#2E9BFF"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
                        >
                          <AdminIcon id="edit" size={15} />
                        </button>
                        <button
                          onClick={() => showNotif(`Usuario "${u.name}" ${u.status === "Activo" ? "suspendido" : "activado"}.`)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#94A3B8" }}
                          title={u.status === "Activo" ? "Suspender" : "Activar"}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#FFF8E1"; e.currentTarget.style.color = "#F59E0B"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
                        >
                          <AdminIcon id="toggle" size={15} />
                        </button>
                        <button
                          onClick={() => showNotif(`Usuario "${u.name}" eliminado.`)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: "#94A3B8" }}
                          title="Eliminar"
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.color = "#FF6B6B"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
                        >
                          <AdminIcon id="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: "1px solid #F1F5F9" }}
            >
              <p className="text-xs" style={{ color: "#94A3B8" }}>
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: p === page ? "#2E9BFF" : "#F1F5F9",
                      color: p === page ? "white" : "#64748B",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* New user modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}>
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
              <h3 className="font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Nuevo usuario</h3>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 rounded-lg" style={{ color: "#94A3B8" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                <AdminIcon id="x" size={18} />
              </button>
            </div>
            <form className="p-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setShowNewModal(false); showNotif("Usuario creado exitosamente."); }}>
              {[
                { id: "un", label: "Nombre completo", placeholder: "Ana Torres" },
                { id: "ue", label: "Correo electrónico", placeholder: "ana@empresa.com" },
              ].map(({ id, label, placeholder }) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold" style={{ color: "#334155" }}>{label}</label>
                  <input
                    placeholder={placeholder}
                    className="px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1.5px solid #E2E8F0", color: "#0F172A" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
                    onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold" style={{ color: "#334155" }}>Rol</label>
                  <select className="px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1.5px solid #E2E8F0", color: "#0F172A" }}>
                    <option>Cliente</option>
                    <option>Admin</option>
                    <option>Soporte</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold" style={{ color: "#334155" }}>Plan</label>
                  <select className="px-4 py-2.5 rounded-xl text-sm outline-none" style={{ border: "1.5px solid #E2E8F0", color: "#0F172A" }}>
                    <option>Starter</option>
                    <option>Pro</option>
                    <option>Business</option>
                    <option>Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "#F1F5F9", color: "#64748B" }}>
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#2E9BFF", boxShadow: "0 2px 12px rgba(46,155,255,0.28)" }}>
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
