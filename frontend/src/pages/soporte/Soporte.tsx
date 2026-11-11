import { useState } from "react";

import SoporteShell, { type SoporteVista } from "@/components/layout/SoporteShell";
import { Apariencia, Perfil, Seguridad } from "@/pages/cliente/Configuracion";
import SoporteClientes from "./SoporteClientes";

export default function Soporte({ onLogout }: { onLogout: () => void }) {
  const [vista, setVista] = useState<SoporteVista>("clientes");

  return (
    <SoporteShell vista={vista} onVista={setVista} onLogout={onLogout}>
      {vista === "clientes" ? (
        <SoporteClientes />
      ) : (
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          <Perfil />
          <Apariencia />
          <Seguridad />
        </div>
      )}
    </SoporteShell>
  );
}
