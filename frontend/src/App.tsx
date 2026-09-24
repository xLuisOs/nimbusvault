// Rutas de la aplicación.
// Las pantallas del Figma siguen recibiendo callbacks (onLogin, onPlans...);
// aquí los conectamos con react-router para no tener que reescribirlas.
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import ProtectedRoute, { rutaInicio } from "@/components/routing/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Plans from "@/pages/Plans";
import Checkout, { type CheckoutPlan } from "@/pages/Checkout";
import SignUp from "@/pages/auth/SignUp";
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import Dashboard from "@/pages/cliente/Dashboard";
import FileExplorer from "@/pages/cliente/FileExplorer";
import Payments from "@/pages/cliente/Payments";
import Consumption from "@/pages/cliente/Consumption";
import Admin from "@/pages/admin/Admin";

function useNavCliente() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return {
    onLogout: async () => { await logout(); navigate("/"); },
    onDashboard: () => navigate("/dashboard"),
    onFiles: () => navigate("/archivos"),
    onPlans: () => navigate("/planes"),
    onPayments: () => navigate("/pagos"),
    onConsumption: () => navigate("/consumo"),
  };
}

function LoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;

  if (usuario) return <Navigate to={rutaInicio(usuario.rol)} replace />;
  return (
    <Login
      onBack={() => navigate("/")}
      onSignUp={() => navigate("/registro")}
      onForgot={() => navigate("/olvide-contrasena")}
      onLoggedIn={(u) => navigate(u.rol === "ADMINISTRADOR" ? "/admin" : from ?? "/dashboard", { replace: true })}
    />
  );
}

function PlansRoute() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  return (
    <Plans
      onHome={() => navigate("/")}
      onLogin={() => navigate("/login")}
      onSignUp={() => navigate(usuario ? "/dashboard" : "/registro")}
      onCheckout={(plan) =>
        usuario
          ? navigate("/checkout", { state: { plan } })
          : navigate("/login", { state: { from: "/planes" } })
      }
    />
  );
}

function CheckoutRoute() {
  const navigate = useNavigate();
  const plan = (useLocation().state as { plan?: CheckoutPlan } | null)?.plan;
  if (!plan) return <Navigate to="/planes" replace />;
  return <Checkout plan={plan} onBack={() => navigate("/planes")} onDashboard={() => navigate("/dashboard")} />;
}

function AdminRoute() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return <Admin onLogout={async () => { await logout(); navigate("/"); }} />;
}

export default function App() {
  const navigate = useNavigate();
  const nav = useNavCliente();

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/planes" element={<PlansRoute />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/registro" element={<SignUp onBack={() => navigate("/")} onLogin={() => navigate("/login")} />} />
      <Route path="/olvide-contrasena" element={<ForgotPassword onBack={() => navigate("/login")} />} />
      <Route path="/restablecer-contrasena" element={<ResetPassword />} />
      <Route path="/verificar-correo" element={<VerifyEmail />} />

      {/* Cliente */}
      <Route element={<ProtectedRoute roles={["CLIENTE"]} />}>
        <Route path="/dashboard" element={<Dashboard {...nav} />} />
        <Route path="/archivos" element={<FileExplorer {...nav} />} />
        <Route path="/pagos" element={<Payments {...nav} />} />
        <Route path="/consumo" element={<Consumption {...nav} />} />
        {/* Contratación real: Avance 2. Por ahora el checkout es solo la interfaz */}
        <Route path="/checkout" element={<CheckoutRoute />} />
      </Route>

      {/* Administrador */}
      <Route element={<ProtectedRoute roles={["ADMINISTRADOR"]} />}>
        <Route path="/admin" element={<AdminRoute />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
