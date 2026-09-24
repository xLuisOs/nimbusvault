import { useState } from "react";
import { AdminNavId } from "@/components/layout/AdminShell";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminPlans from "./AdminPlans";
import AdminInfra from "./AdminInfra";

interface AdminProps {
  onLogout: () => void;
}

export default function Admin({ onLogout }: AdminProps) {
  const [screen, setScreen] = useState<AdminNavId>("dashboard");

  function handleNav(id: AdminNavId) {
    setScreen(id);
  }

  if (screen === "usuarios") return <AdminUsers  onNav={handleNav} onLogout={onLogout} />;
  if (screen === "planes")   return <AdminPlans  onNav={handleNav} onLogout={onLogout} />;
  if (screen === "infra")    return <AdminInfra  onNav={handleNav} onLogout={onLogout} />;
  return <AdminDashboard onNav={handleNav} onLogout={onLogout} />;
}
