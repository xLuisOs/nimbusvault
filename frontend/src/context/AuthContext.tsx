import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { authApi } from "@/api/auth";
import { onSesionExpirada, setAccessToken } from "@/api/client";
import type { TokenRespuesta, Usuario } from "@/types";

// Una sola restauración de sesión aunque el efecto corra dos veces (StrictMode) o haya
// varias pestañas: como el refresh token rota, dos llamadas en paralelo cerrarían la sesión.
let restauracion: Promise<TokenRespuesta> | null = null;
function restaurarSesion() {
  restauracion ??= authApi.refresh().finally(() => setTimeout(() => (restauracion = null), 1000));
  return restauracion;
}

interface AuthState {
  usuario: Usuario | null;
  cargando: boolean;
  login: (correo: string, password: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  recargarUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app intentamos recuperar la sesión con la cookie httpOnly de refresh
  useEffect(() => {
    onSesionExpirada(() => setUsuario(null));
    restaurarSesion()
      .then((r) => {
        setAccessToken(r.access_token);
        setUsuario(r.usuario);
      })
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (correo: string, password: string) => {
    const r = await authApi.login(correo, password);
    setAccessToken(r.access_token);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUsuario(null);
    }
  }, []);

  const recargarUsuario = useCallback(async () => {
    setUsuario(await authApi.me());
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, recargarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
