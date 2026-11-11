import BotonTema from "@/components/BotonTema";
import { AdminIcon } from "@/components/layout/AdminShell";
import { useAuth } from "@/context/AuthContext";
import { iniciales } from "@/utils/format";

export type SoporteVista = "clientes" | "config";

const NAV: { id: SoporteVista; label: string; icon: string }[] = [
  { id: "clientes", label: "Clientes", icon: "users" },
  { id: "config", label: "Configuración", icon: "settings" },
];

interface SoporteShellProps {
  vista: SoporteVista;
  onVista: (vista: SoporteVista) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function SoporteShell({ vista, onVista, onLogout, children }: SoporteShellProps) {
  const { usuario } = useAuth();

  return (
    <div className="nv-app min-h-screen flex flex-col" style={{ background: "var(--nv-bg)", fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-20" style={{ background: "#062D5B", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 12a4 4 0 0 1-.4-7.96A5.5 5.5 0 1 1 15.5 9a3 3 0 0 1-3 3H3Z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-white leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Nimbus<span style={{ color: "#2E9BFF" }}>Vault</span>
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "#4DB8FF" }}>Soporte</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #2E9BFF, #00D1C1)" }}
              title={usuario?.correo}
            >
              {iniciales(usuario?.nombre ?? "Soporte")}
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.75)" }}
              aria-label="Cerrar sesión"
            >
              <AdminIcon id="logout" size={16} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 flex items-center gap-2">
        {NAV.map(({ id, label, icon }) => {
          const activa = vista === id;
          return (
            <button
              key={id}
              onClick={() => onVista(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: activa ? "#2E9BFF" : "var(--nv-surface)",
                color: activa ? "white" : "var(--nv-text-3)",
                border: activa ? "1px solid #2E9BFF" : "1px solid var(--nv-border)",
              }}
            >
              <AdminIcon id={icon} size={16} />
              {label}
            </button>
          );
        })}
        <div className="ml-auto"><BotonTema /></div>
      </nav>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 flex-1">{children}</main>
    </div>
  );
}
