import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { iniciales } from "@/utils/format";

// ── Nav ────────────────────────────────────────────────────────────────────────

export type AdminNavId = "dashboard" | "usuarios" | "planes" | "infra";

export const ADMIN_NAV: { id: AdminNavId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard",       icon: "grid"   },
  { id: "usuarios",  label: "Usuarios",         icon: "users"  },
  { id: "planes",    label: "Planes",           icon: "layers" },
  { id: "infra",     label: "Infraestructura",  icon: "server" },
];

// ── Icons ──────────────────────────────────────────────────────────────────────

export function AdminIcon({ id, size = 20 }: { id: string; size?: number }) {
  const p: Record<string, React.ReactNode> = {
    grid:    <><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></>,
    users:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    layers:  <><path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    server:  <><rect x="2" y="2" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><rect x="2" y="14" width="20" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="6" cy="18" r="1.2" fill="currentColor"/></>,
    logout:  <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    menu:    <><path d="M3 6h18M3 11h18M3 16h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    plus:    <><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    edit:    <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    trash:   <><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    search:  <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    x:       <><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    alert:   <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    check:   <><path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>,
    "eye-off":<><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    toggle:  <><rect x="1" y="5" width="22" height="14" rx="7" stroke="currentColor" strokeWidth="1.6" fill="none"/><circle cx="16" cy="12" r="4" fill="currentColor"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {p[id] ?? null}
    </svg>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  active: AdminNavId;
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

function AdminSidebar({ active, onNav, onLogout }: AdminSidebarProps) {
  const { usuario } = useAuth();
  return (
    <aside
      className="flex flex-col h-screen sticky top-0 flex-shrink-0 w-56"
      style={{ background: "#062D5B", borderRight: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#4DB8FF" }}>Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className="text-[9px] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
          Administración
        </p>
        {ADMIN_NAV.map(({ id, label, icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all duration-150"
              style={{
                background: isActive ? "#2E9BFF" : "transparent",
                color: isActive ? "white" : "rgba(255,255,255,0.65)",
                boxShadow: isActive ? "0 2px 12px rgba(46,155,255,0.35)" : "none",
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white"; }}}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}}
            >
              <AdminIcon id={icon} size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2.5 px-3 py-3 mt-3 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2E9BFF, #00D1C1)" }}
          >
            {iniciales(usuario?.nombre ?? "Admin")}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{usuario?.nombre}</p>
            <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{usuario?.correo}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,107,0.12)"; e.currentTarget.style.color = "#FF6B6B"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
        >
          <AdminIcon id="logout" size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ── Shell wrapper ──────────────────────────────────────────────────────────────

interface AdminShellProps {
  activeNav: AdminNavId;
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export default function AdminShell({ activeNav, onNav, onLogout, title, headerRight, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar active={activeNav} onNav={onNav} onLogout={onLogout} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-shrink-0">
            <AdminSidebar active={activeNav} onNav={(id) => { onNav(id); setMobileOpen(false); }} onLogout={onLogout} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 flex-shrink-0"
          style={{
            background: "rgba(248,250,252,0.94)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg"
              style={{ color: "#64748B" }}
              onClick={() => setMobileOpen(true)}
            >
              <AdminIcon id="menu" size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#94A3B8" }}>
                Panel de administración
              </p>
              <h1
                className="text-base font-extrabold leading-tight"
                style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">{headerRight}</div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
