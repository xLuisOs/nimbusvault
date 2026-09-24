import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "@/api/auth";
import AuthLayout, { Alerta, BotonPrimario, IconoEstado, Titulo } from "@/components/layout/AuthLayout";

const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-150 focus:ring-4 focus:ring-sky-100";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError("Usa letras y números.");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");
    setError("");
    setCargando(true);
    try {
      await authApi.restablecer(token, password);
      setListo(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout>
        <IconoEstado tono="error" />
        <Titulo sub="Abre el enlace completo que te llegó al correo o pide uno nuevo.">Enlace incompleto</Titulo>
        <Link to="/olvide-contrasena" className="block text-center text-sm font-semibold" style={{ color: "#2E9BFF" }}>
          Pedir un enlace nuevo
        </Link>
      </AuthLayout>
    );
  }

  if (listo) {
    return (
      <AuthLayout>
        <IconoEstado tono="exito" />
        <Titulo sub="Por seguridad cerramos las sesiones que tenías abiertas.">Contraseña actualizada</Titulo>
        <Link to="/login" className="block w-full py-3.5 rounded-xl text-sm font-bold text-white text-center" style={{ background: "#2E9BFF" }}>
          Iniciar sesión
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Titulo sub="Elige una contraseña que no uses en otros sitios.">Crea una nueva contraseña</Titulo>
      {error && <Alerta>{error}</Alerta>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw" className="text-sm font-semibold" style={{ color: "#334155" }}>Nueva contraseña</label>
          <input id="pw" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={password}
            onChange={(e) => setPassword(e.target.value)} className={inputCls}
            style={{ background: "white", border: "1.5px solid #E2E8F0", color: "#0F172A" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw2" className="text-sm font-semibold" style={{ color: "#334155" }}>Confirmar contraseña</label>
          <input id="pw2" type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)} className={inputCls}
            style={{ background: "white", border: "1.5px solid #E2E8F0", color: "#0F172A" }} />
        </div>
        <BotonPrimario type="submit" cargando={cargando}>{cargando ? "Guardando…" : "Guardar contraseña"}</BotonPrimario>
      </form>
    </AuthLayout>
  );
}
