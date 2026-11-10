// Configuración de la cuenta del administrador: perfil, apariencia y seguridad (contraseña y sesiones).
// Reutiliza las mismas secciones que el cliente; no muestra el plan (el admin no tiene almacenamiento propio)
// ni "Eliminar la cuenta" (el backend no deja que un administrador se elimine a sí mismo).
import AdminShell, { AdminNavId } from "@/components/layout/AdminShell";
import { Apariencia, Perfil, Seguridad } from "@/pages/cliente/Configuracion";

interface AdminConfigProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminConfig({ onNav, onLogout }: AdminConfigProps) {
  return (
    <AdminShell activeNav="config" onNav={onNav} onLogout={onLogout} title="Configuración">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <Perfil />
        <Apariencia />
        <Seguridad />
        <p className="text-xs text-center" style={{ color: "var(--nv-text-4)" }}>
          Las cuentas de administrador no se eliminan desde aquí: otro administrador puede desactivarla en Usuarios.
        </p>
      </div>
    </AdminShell>
  );
}
