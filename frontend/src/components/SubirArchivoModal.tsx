// Subida real desde el dashboard y el panel de consumo: los archivos quedan en la raíz de "Mis archivos".
// El backend valida la cuota y el tamaño; aquí solo se adelanta el aviso para no esperar la subida completa.
import { useRef, useState } from "react";

import { almacenamientoApi } from "@/api/almacenamiento";
import { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { formatoBytes } from "@/utils/format";

const MAX_MB = 50; // mismo límite que ARCHIVO_MAX_MB del backend

type Estado = "esperando" | "subiendo" | "listo" | "error";
interface Item { archivo: File; estado: Estado; pct: number; error?: string }

interface Props {
  onClose: () => void;
  /** Se llama al terminar si se subió al menos un archivo (para refrescar el resumen). */
  onSubido?: () => void;
  onVerArchivos?: () => void;
}

export default function SubirArchivoModal({ onClose, onSubido, onVerArchivos }: Props) {
  const { recargarUsuario } = useAuth();
  const { pct: usadoPct, disponibleBytes } = useAlmacenamiento();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const terminado = items.length > 0 && !trabajando;
  const subidos = items.filter((i) => i.estado === "listo").length;

  function actualizar(idx: number, cambios: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...cambios } : it)));
  }

  async function subir(lista: FileList | null) {
    if (!lista?.length || trabajando) return;
    const nuevos: Item[] = Array.from(lista).map((archivo) => ({ archivo, estado: "esperando", pct: 0 }));
    setItems(nuevos);
    setTrabajando(true);

    let libre = disponibleBytes;
    let alguno = false;
    // Uno por uno: así cada archivo valida la cuota con lo que dejó el anterior
    for (let i = 0; i < nuevos.length; i++) {
      const { archivo } = nuevos[i];
      if (archivo.size > MAX_MB * 1024 * 1024) {
        actualizar(i, { estado: "error", error: `Supera el máximo de ${MAX_MB} MB` });
        continue;
      }
      if (archivo.size > libre) {
        actualizar(i, { estado: "error", error: `No cabe: te quedan ${formatoBytes(libre)}` });
        continue;
      }
      actualizar(i, { estado: "subiendo" });
      try {
        await almacenamientoApi.subir(archivo, null, (pct) => actualizar(i, { pct }));
        actualizar(i, { estado: "listo", pct: 100 });
        libre -= archivo.size;
        alguno = true;
      } catch (e) {
        actualizar(i, { estado: "error", error: (e as Error).message });
      }
    }

    setTrabajando(false);
    if (alguno) {
      await recargarUsuario().catch(() => undefined); // la barra de espacio del menú
      onSubido?.();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !trabajando) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--nv-bg)", border: "1px solid var(--nv-border)", boxShadow: "0 24px 64px rgba(14,30,60,0.18)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--nv-border)", background: "var(--nv-surface)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Subir archivos
          </h2>
          <button
            onClick={onClose}
            disabled={trabajando}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: "var(--nv-text-4)" }}
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {items.length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-3 py-10 px-6 text-center cursor-pointer transition-all duration-150"
              style={{ border: `2px dashed ${dragging ? "#2E9BFF" : "var(--nv-border-strong)"}`, background: dragging ? "var(--nv-blue-soft)" : "var(--nv-surface)" }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); subir(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--nv-blue-soft)", color: "#2E9BFF" }}>
                <NavIcon id="upload" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>
                  Arrastra aquí o <span style={{ color: "#2E9BFF" }}>selecciona archivos</span>
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--nv-text-4)" }}>
                  Se guardan en la raíz de Mis archivos · máx. {MAX_MB} MB por archivo
                </p>
              </div>
              <input ref={fileRef} type="file" multiple className="sr-only" onChange={(e) => subir(e.target.files)} />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((it, i) => (
                <div key={i} className="rounded-xl px-4 py-3" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--nv-text-1)" }} title={it.archivo.name}>
                      {it.archivo.name}
                    </p>
                    <span
                      className="text-xs font-semibold flex-shrink-0"
                      style={{ color: it.estado === "error" ? "#DC2626" : it.estado === "listo" ? "#059669" : "#2E9BFF" }}
                    >
                      {it.estado === "listo" ? "✓ Subido" : it.estado === "error" ? "Error"
                        : it.estado === "subiendo" ? `${it.pct}%` : "En cola"}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: it.error ? "#DC2626" : "var(--nv-text-4)" }}>
                    {it.error ?? formatoBytes(it.archivo.size)}
                  </p>
                  {(it.estado === "subiendo" || it.estado === "listo") && (
                    <div className="h-1.5 rounded-full mt-2" style={{ background: "var(--nv-border)" }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${it.pct}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {terminado ? (
            <div className="flex gap-3">
              <button
                onClick={() => setItems([])}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--nv-muted)", color: "var(--nv-text-2)" }}
              >
                Subir más
              </button>
              <button
                onClick={subidos && onVerArchivos ? onVerArchivos : onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#2E9BFF" }}
              >
                {subidos && onVerArchivos ? "Ver en Mis archivos" : "Cerrar"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--nv-muted)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--nv-blue-soft)", color: "#2E9BFF" }}>
                <NavIcon id="cloud" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--nv-text-2)" }}>Espacio disponible</span>
                  <span className="text-xs font-bold" style={{ color: "#2E9BFF" }}>{formatoBytes(disponibleBytes)} libres</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "var(--nv-border)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${usadoPct}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
