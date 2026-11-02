// Destino de los roles que no tienen panel propio (por ahora SOPORTE).
// Evita que ProtectedRoute los mande a una ruta que los vuelve a rechazar (bucle infinito).
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout, { BotonPrimario, IconoEstado, Titulo } from "@/components/layout/AuthLayout";
import { RUTA_SIN_ACCESO, rutaInicio } from "@/components/routing/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

export default function SinAcceso() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);
  const panel = usuario ? rutaInicio(usuario.rol) : RUTA_SIN_ACCESO;

  async function cerrarSesion() {
    setSaliendo(true);
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  }

  return (
    <AuthLayout>
      <IconoEstado tono="error" />
      <Titulo
        sub={
          <>
            Tu cuenta tiene el rol <strong style={{ color: "#334155" }}>{usuario?.rol ?? "—"}</strong>, que todavía no
            tiene un panel en NimbusVault. Si crees que es un error, contacta al administrador.
          </>
        }
      >
        Sin acceso
      </Titulo>

      <div className="flex flex-col gap-3">
        {panel !== RUTA_SIN_ACCESO && (
          <Link
            to={panel}
            className="block w-full py-3.5 rounded-xl text-sm font-bold text-center"
            style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF" }}
          >
            Ir a mi panel
          </Link>
        )}
        <BotonPrimario onClick={cerrarSesion} cargando={saliendo}>
          Cerrar sesión
        </BotonPrimario>
        <Link to="/" className="text-center text-sm font-semibold mt-1" style={{ color: "#64748B" }}>
          Volver al inicio
        </Link>
      </div>
    </AuthLayout>
  );
}
