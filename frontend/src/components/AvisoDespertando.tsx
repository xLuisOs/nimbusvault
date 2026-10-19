// Aviso flotante mientras la API de Render despierta (plan gratis: ~40 s después de 15 min sin uso).
// Lo muestra cualquier petición que esté esperando, en cualquier pantalla.
import { useEffect, useState } from "react";

import { alDespertar } from "@/api/client";

export default function AvisoDespertando() {
  const [visible, setVisible] = useState(false);
  useEffect(() => alDespertar(setVisible), []);
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold"
      style={{ background: "#062D5B", color: "white", boxShadow: "0 10px 30px rgba(6,45,91,0.35)" }}
    >
      <span
        className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#00D1C1" }}
      />
      <span>
        Despertando el servidor, un momento…
        <span className="block text-[11px] font-normal" style={{ color: "rgba(255,255,255,0.65)" }}>
          Si llevaba un rato sin uso tarda hasta un minuto.
        </span>
      </span>
    </div>
  );
}
