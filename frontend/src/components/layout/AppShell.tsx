import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { iniciales } from "@/utils/format";

// ── Nav data ──────────────────────────────────────────────────────────────────

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "files", label: "Mis archivos", icon: "folder" },
  { id: "consumption", label: "Consumo", icon: "chart" },
  { id: "plans", label: "Planes", icon: "layers" },
  { id: "payments", label: "Pagos", icon: "card" },
  { id: "settings", label: "Configuración", icon: "settings" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

// Datos de ejemplo para las pantallas que todavía no están conectadas (Avance 2)
export const STORAGE = { used: 62, total: 100 };

/** Espacio real: lo usado sale de usuarios.almacenamiento_usado_bytes y el total del plan activo. */
export function useAlmacenamiento() {
  const { usuario } = useAuth();
  const total = usuario?.suscripcion?.almacenamiento_gb ?? 0;
  const used = +((usuario?.almacenamiento_usado_bytes ?? 0) / 1024 ** 3).toFixed(1);
  const pct = total ? Math.round((used / total) * 100) : 0;
  return { used, total, pct };
}

// ── Icon set ──────────────────────────────────────────────────────────────────

export function NavIcon({ id, size = 20 }: { id: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" fill="none"/></>,
    layers: <><path d="M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.6"/><path d="M6 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    cloud: <><path d="M5 16a4 4 0 0 1-.35-7.97A6 6 0 1 1 18 12a3 3 0 0 1-3 3H5Z" stroke="currentColor" strokeWidth="1.6" fill="none"/></>,
    refresh: <><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    share: <><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="1.6"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    more: <><circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/></>,
    trash: <><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    plus: <><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    search: <><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    "folder-plus": <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 11v4M10 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    "sort": <><path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
    "chart": <><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 16l4-5 4 3 4-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[id] ?? null}
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  collapsed: boolean;
}

export function Sidebar({ active, onNav, onLogout, collapsed }: SidebarProps) {
  const STORAGE = useAlmacenamiento();
  const pct = STORAGE.pct;

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 flex-shrink-0 transition-all duration-300 z-30"
      style={{
        background: "#062D5B",
        width: collapsed ? "68px" : "220px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-16 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white" />
          </svg>
        </div>
        {!collapsed && (
          <span
            className="text-base font-extrabold tracking-tight whitespace-nowrap overflow-hidden"
            style={{ color: "white", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Nimbus<span style={{ color: "#4DB8FF" }}>Vault</span>
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-150"
              style={{ background: isActive ? "#2E9BFF" : "transparent", color: isActive ? "white" : "#93C5FD" }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(46,155,255,0.15)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              title={collapsed ? label : undefined}
            >
              <span className="flex-shrink-0"><NavIcon id={icon} /></span>
              {!collapsed && (
                <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
              )}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.7)" }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini storage bar */}
      {!collapsed && (
        <div
          className="mx-3 mb-3 rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: "#93C5FD" }}>Almacenamiento</span>
            <span className="text-xs font-bold" style={{ color: "white" }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #2E9BFF, #00D1C1)" }}
            />
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#64748B" }}>
            {STORAGE.used} GB de {STORAGE.total} GB
          </p>
        </div>
      )}

      {/* Logout */}
      <div className="px-2 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-150"
          style={{ color: "#64748B" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#FCA5A5"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <span className="flex-shrink-0"><NavIcon id="logout" /></span>
          {!collapsed && <span className="text-sm font-semibold">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Top header ────────────────────────────────────────────────────────────────

interface TopHeaderProps {
  title?: string;
  onToggleSidebar: () => void;
  onUpload: () => void;
  actions?: React.ReactNode;
}

export function TopHeader({ title, onToggleSidebar, onUpload, actions }: TopHeaderProps) {
  const { usuario } = useAuth();
  const nombre = usuario?.nombre ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 flex-shrink-0"
      style={{
        background: "rgba(248,250,252,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E2E8F0",
      }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg transition-colors duration-150"
          style={{ color: "#64748B" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
        {title ? (
          <h1 className="text-base font-extrabold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </h1>
        ) : (
          <div>
            <p className="text-xs" style={{ color: "#94A3B8" }}>{greeting},</p>
            <h1 className="text-base font-extrabold leading-tight" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {nombre}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-150"
          style={{ background: "#2E9BFF", boxShadow: "0 2px 12px rgba(46,155,255,0.28)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          <NavIcon id="upload" />
          <span className="hidden sm:inline">Subir archivo</span>
        </button>
        <button
          className="relative p-2 rounded-xl transition-colors duration-150"
          style={{ color: "#64748B" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a6 6 0 0 1 6 6v3l1.5 2.5H2.5L4 11V8a6 6 0 0 1 6-6ZM8.5 16.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "#2E9BFF" }} />
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white cursor-pointer"
          style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}>
          {iniciales(nombre)}
        </div>
      </div>
    </header>
  );
}

// ── App shell wrapper ─────────────────────────────────────────────────────────

interface AppShellProps {
  activeNav: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  onUpload: () => void;
  headerTitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({
  activeNav, onNav, onLogout, onUpload, headerTitle, headerActions, children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      <Sidebar
        active={activeNav}
        onNav={onNav}
        onLogout={onLogout}
        collapsed={collapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          title={headerTitle}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onUpload={onUpload}
          actions={headerActions}
        />
        {children}
      </div>
    </div>
  );
}
