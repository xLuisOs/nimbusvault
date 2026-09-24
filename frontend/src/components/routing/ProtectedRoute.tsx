import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import type { Rol } from "@/types";

export function PantallaCarga() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
      <svg className="animate-spin" width="28" height="28" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M8 2a6 6 0 0 1 6 6" stroke="#2E9BFF" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function rutaInicio(rol: Rol) {
  return rol === "ADMINISTRADOR" ? "/admin" : "/dashboard";
}

/** Solo deja pasar si hay sesión (y, si se indica, si el rol coincide). */
export default function ProtectedRoute({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <PantallaCarga />;
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return <Outlet />;
}
