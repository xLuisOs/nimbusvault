import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "@/api/auth";
import AuthLayout, { IconoEstado, Titulo } from "@/components/layout/AuthLayout";

type Estado = "verificando" | "ok" | "error";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "error");
  const [mensaje, setMensaje] = useState(token ? "" : "El enlace está incompleto.");
  const yaEnviado = useRef(false); // StrictMode monta dos veces en desarrollo; el token es de un solo uso

  useEffect(() => {
    if (!token || yaEnviado.current) return;
    yaEnviado.current = true;
    authApi
      .verificarCorreo(token)
      .then((r) => { setEstado("ok"); setMensaje(r.mensaje); })
      .catch((e) => { setEstado("error"); setMensaje(e.message); });
  }, [token]);

  return (
    <AuthLayout>
      {estado === "verificando" && (
        <>
          <IconoEstado tono="info" />
          <Titulo sub="Un momento…">Verificando tu correo</Titulo>
        </>
      )}

      {estado === "ok" && (
        <>
          <IconoEstado tono="exito" />
          <Titulo sub="Tu cuenta ya está activa y tienes el plan Gratis con 5 GB para empezar.">¡Correo confirmado!</Titulo>
          <Link to="/login" className="block w-full py-3.5 rounded-xl text-sm font-bold text-white text-center" style={{ background: "#2E9BFF" }}>
            Iniciar sesión
          </Link>
        </>
      )}

      {estado === "error" && (
        <>
          <IconoEstado tono="error" />
          <Titulo sub={`${mensaje} Si ya habías confirmado tu correo, solo inicia sesión.`}>No pudimos verificar tu correo</Titulo>
          <Link to="/login" className="block w-full py-3.5 rounded-xl text-sm font-bold text-center" style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF" }}>
            Ir a iniciar sesión
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
