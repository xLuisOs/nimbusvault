import { useState, useRef } from "react";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { formatoFecha, formatoGB, formatoDolares } from "@/utils/format";

// ── Data ──────────────────────────────────────────────────────────────────────


const RECENT_FILES = [
  { id: 1, name: "Presentación Q3 2026.pptx", type: "ppt", size: "8.4 MB", modified: "Hoy, 10:32 am", shared: true },
  { id: 2, name: "Base de datos clientes.xlsx", type: "xls", size: "2.1 MB", modified: "Hoy, 9:15 am", shared: false },
  { id: 3, name: "Contrato proveedor ABC.pdf", type: "pdf", size: "540 KB", modified: "Ayer, 4:47 pm", shared: true },
  { id: 4, name: "Logo_v3_final.png", type: "img", size: "1.8 MB", modified: "Ayer, 2:20 pm", shared: false },
  { id: 5, name: "API_docs_v2.md", type: "doc", size: "128 KB", modified: "Mar 9, 11:00 am", shared: false },
  { id: 6, name: "backup_sept_2026.zip", type: "zip", size: "34.6 MB", modified: "Mar 8, 8:30 am", shared: false },
];


const ACTIVITY = [
  { id: 1, action: "subiste", file: "Presentación Q3 2026.pptx", time: "hace 1 hora", color: "#2E9BFF" },
  { id: 2, action: "compartiste", file: "Contrato proveedor ABC.pdf", time: "ayer", color: "#00D1C1" },
  { id: 3, action: "descargaste", file: "Logo_v3_final.png", time: "ayer", color: "#A78BFA" },
  { id: 4, action: "subiste", file: "backup_sept_2026.zip", time: "hace 3 días", color: "#2E9BFF" },
];


// ── File type helpers ─────────────────────────────────────────────────────────

const FILE_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pdf:  { color: "#EF4444", bg: "#FEF2F2", label: "PDF",  icon: "⊞" },
  xls:  { color: "#22C55E", bg: "#F0FDF4", label: "XLS",  icon: "≡" },
  ppt:  { color: "#F97316", bg: "#FFF7ED", label: "PPT",  icon: "◈" },
  img:  { color: "#EC4899", bg: "#FDF2F8", label: "IMG",  icon: "◰" },
  doc:  { color: "#6366F1", bg: "#EEF2FF", label: "DOC",  icon: "❐" },
  zip:  { color: "#F59E0B", bg: "#FFFBEB", label: "ZIP",  icon: "◉" },
};



// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: "#94A3B8" }}>{label}</p>
      <p
        className="text-2xl font-extrabold mb-0.5"
        style={{ color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: "#94A3B8" }}>{sub}</p>
    </div>
  );
}

// ── Storage card ──────────────────────────────────────────────────────────────

function StorageCard({ onChangePlan }: { onChangePlan: () => void }) {
  const { used: USED_GB, total: TOTAL_GB, pct: USED_PCT } = useAlmacenamiento();
  const pct = USED_PCT;
  const barColor = pct >= 85 ? "#FF6B6B" : pct >= 70 ? "#F59E0B" : undefined;

  return (
    <div
      className="rounded-2xl p-6 col-span-2"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: "#94A3B8" }}>ESPACIO UTILIZADO</p>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-3xl font-extrabold"
              style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {USED_GB} GB
            </span>
            <span className="text-sm" style={{ color: "#94A3B8" }}>de {TOTAL_GB} GB</span>
          </div>
        </div>
        <div
          className="text-lg font-extrabold px-3 py-1.5 rounded-xl"
          style={{
            background: pct >= 85 ? "#FEF2F2" : pct >= 70 ? "#FFFBEB" : "#E0F4FF",
            color: barColor ?? "#2E9BFF",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {pct}%
        </div>
      </div>

      {/* Bar */}
      <div className="h-3 rounded-full mb-3" style={{ background: "#E2E8F0" }}>
        <div
          className="h-3 rounded-full relative overflow-hidden transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: barColor
              ? `linear-gradient(90deg, ${barColor}, #FBBF24)`
              : "linear-gradient(90deg, #2E9BFF, #00D1C1)",
          }}
        >
          {/* Shimmer */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
              animation: "shimmer 2s infinite",
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }} />
            <span className="text-xs" style={{ color: "#64748B" }}>Utilizado · {USED_GB} GB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#E2E8F0" }} />
            <span className="text-xs" style={{ color: "#64748B" }}>Libre · {TOTAL_GB - USED_GB} GB</span>
          </div>
        </div>
        <button
          onClick={onChangePlan}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
          style={{ color: "#2E9BFF", border: "1px solid #2E9BFF", background: "white" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
        >
          Ampliar espacio
        </button>
      </div>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ onChangePlan }: { onChangePlan: () => void }) {
  // Datos reales de la suscripción activa (GET /api/auth/me)
  const { usuario } = useAuth();
  const sus = usuario?.suscripcion;
  const precio = sus ? Number(sus.precio_contratado) : 0;
  const renewalStr = sus ? formatoFecha(sus.fecha_fin) : "—";

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: "#94A3B8" }}>PLAN ACTUAL</p>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: "#E0F4FF", color: "#2E9BFF" }}
        >
          {sus ? "Activo" : "Sin plan"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)" }}
        >
          <NavIcon id="cloud" />
        </div>
        <div>
          <p
            className="text-lg font-extrabold"
            style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {sus ? `Plan ${sus.plan_nombre}` : "Sin plan activo"}
          </p>
          <p className="text-xs" style={{ color: "#94A3B8" }}>
            {precio === 0 ? "Gratis · se renueva solo" : `${formatoDolares(precio)}/mes · facturación mensual`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 py-3" style={{ borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
        {[
          { label: "Almacenamiento", value: sus ? formatoGB(sus.almacenamiento_gb) : "—" },
          { label: "Activo desde", value: sus ? formatoFecha(sus.fecha_inicio) : "—" },
          { label: "Próxima renovación", value: renewalStr },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#94A3B8" }}>{label}</span>
            <span className="text-xs font-semibold" style={{ color: "#334155" }}>{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onChangePlan}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
        style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
      >
        Cambiar de plan
      </button>
    </div>
  );
}

// ── Recent files ──────────────────────────────────────────────────────────────

function RecentFiles({ onUpload }: { onUpload: () => void }) {
  const [view, setView] = useState<"grid" | "list">("list");
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="rounded-2xl"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
        <div>
          <h2 className="text-sm font-bold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Archivos recientes
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>Tus últimas 6 modificaciones</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
            {(["list", "grid"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-2.5 py-1.5 text-xs transition-colors duration-150"
                style={{
                  background: view === v ? "#2E9BFF" : "white",
                  color: view === v ? "white" : "#94A3B8",
                }}
              >
                {v === "list" ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                    <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                    <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                    <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={onUpload}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ background: "#2E9BFF", color: "white" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
          >
            + Subir
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "list" ? (
        <div className="divide-y" style={{ borderColor: "#F8FAFC" }}>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-2.5">
            {["Nombre", "", "Tamaño", "Modificado"].map((h, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#CBD5E1" }}>{h}</span>
            ))}
          </div>
          {RECENT_FILES.map((file) => {
            const meta = FILE_META[file.type];
            const isHovered = hovered === file.id;
            return (
              <div
                key={file.id}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-6 py-3.5 transition-colors duration-100 cursor-pointer"
                style={{ background: isHovered ? "#F8FAFC" : "transparent" }}
                onMouseEnter={() => setHovered(file.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Type icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.icon}
                </div>
                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {file.shared && (
                      <span className="text-[10px]" style={{ color: "#00D1C1" }}>● Compartido</span>
                    )}
                  </div>
                </div>
                {/* Size */}
                <span className="text-xs text-right" style={{ color: "#94A3B8" }}>{file.size}</span>
                {/* Modified + actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs whitespace-nowrap hidden sm:block" style={{ color: "#94A3B8" }}>
                    {file.modified}
                  </span>
                  {isHovered && (
                    <div className="flex items-center gap-1">
                      {["download", "share", "more"].map((act) => (
                        <button
                          key={act}
                          className="p-1.5 rounded-lg transition-colors duration-100"
                          style={{ color: "#94A3B8" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
                        >
                          <NavIcon id={act} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
          {RECENT_FILES.map((file) => {
            const meta = FILE_META[file.type];
            return (
              <div
                key={file.id}
                className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all duration-150 group"
                style={{ border: "1px solid #E2E8F0", background: "#FAFBFC" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2E9BFF"; (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLDivElement).style.background = "#FAFBFC"; }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#0F172A" }}>{file.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{file.size}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3.5 flex items-center justify-between" style={{ borderTop: "1px solid #F1F5F9" }}>
        <p className="text-xs" style={{ color: "#94A3B8" }}>{RECENT_FILES.length} archivos</p>
        <button
          className="text-xs font-semibold transition-colors duration-150 flex items-center gap-1"
          style={{ color: "#2E9BFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
        >
          Ver todos los archivos
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed() {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: "white", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Actividad reciente
        </h2>
        <button
          className="text-xs font-semibold flex items-center gap-1 transition-colors"
          style={{ color: "#2E9BFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
        >
          <NavIcon id="refresh" />
        </button>
      </div>
      <div className="flex flex-col gap-0">
        {ACTIVITY.map((item, i) => (
          <div key={item.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {i < ACTIVITY.length - 1 && (
              <div
                className="absolute left-3.5 top-7 w-px"
                style={{ height: "calc(100% - 4px)", background: "#F1F5F9" }}
              />
            )}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10"
              style={{ background: item.color + "18", border: `1.5px solid ${item.color}30` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            </div>
            <div className="pb-4 min-w-0">
              <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>
                <span className="font-semibold" style={{ color: "#0F172A" }}>Tú</span>{" "}
                {item.action}{" "}
                <span className="font-medium">{item.file}</span>
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const { used: USED_GB, total: TOTAL_GB, pct: USED_PCT } = useAlmacenamiento();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function simulateUpload() {
    setUploading(true);
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setProgress(100);
        setTimeout(() => setDone(true), 300);
      } else {
        setProgress(Math.round(p));
      }
    }, 180);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", boxShadow: "0 24px 64px rgba(14,30,60,0.18)" }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E2E8F0", background: "white" }}>
          <h2 className="text-sm font-bold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Subir archivo
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#00D1C1)" }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l5 5 11-10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold" style={{ color: "#0F172A" }}>¡Archivo subido!</p>
                <p className="text-sm mt-1" style={{ color: "#64748B" }}>Tu archivo está disponible en Mis archivos.</p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#2E9BFF" }}
              >
                Entendido
              </button>
            </div>
          ) : uploading ? (
            <div className="flex flex-col gap-4 py-2">
              <p className="text-sm font-semibold text-center" style={{ color: "#334155" }}>
                Subiendo archivo…
              </p>
              <div className="h-2.5 rounded-full" style={{ background: "#E2E8F0" }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }}
                />
              </div>
              <p className="text-xs text-center font-semibold" style={{ color: "#2E9BFF" }}>{progress}%</p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                className="rounded-xl flex flex-col items-center justify-center gap-3 py-10 px-6 text-center cursor-pointer transition-all duration-150"
                style={{
                  border: `2px dashed ${dragging ? "#2E9BFF" : "#CBD5E1"}`,
                  background: dragging ? "#E0F4FF" : "white",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); simulateUpload(); }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
                  <NavIcon id="upload" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#334155" }}>
                    Arrastra aquí o{" "}
                    <span style={{ color: "#2E9BFF" }}>selecciona un archivo</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>PDF, DOC, XLS, PNG, ZIP — máx. 500 MB</p>
                </div>
                <input ref={fileRef} type="file" className="sr-only" onChange={() => simulateUpload()} />
              </div>

              {/* Space remaining */}
              <div className="mt-4 rounded-xl p-3 flex items-center gap-3" style={{ background: "#F1F5F9" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
                  <NavIcon id="cloud" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: "#334155" }}>Espacio disponible</span>
                    <span className="text-xs font-bold" style={{ color: "#2E9BFF" }}>{TOTAL_GB - USED_GB} GB libres</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${USED_PCT}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface DashboardProps {
  onLogout: () => void;
  onPlans: () => void;
  onFiles?: () => void;
  onPayments?: () => void;
  onConsumption?: () => void;
}

export default function Dashboard({ onLogout, onPlans, onFiles, onPayments, onConsumption }: DashboardProps) {
  const { used: USED_GB, total: TOTAL_GB, pct: USED_PCT } = useAlmacenamiento();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);

  function handleNav(id: string) {
    if (id === "plans") { onPlans(); return; }
    if (id === "files" && onFiles) { onFiles(); return; }
    if (id === "payments" && onPayments) { onPayments(); return; }
    if (id === "consumption" && onConsumption) { onConsumption(); return; }
    setActiveNav(id);
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      <AppShell
        activeNav={activeNav}
        onNav={handleNav}
        onLogout={onLogout}
        onUpload={() => setUploadOpen(true)}
      >
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="ARCHIVOS TOTALES" value="143" sub="↑ 12 este mes" color="#0F172A" />
              <StatCard label="COMPARTIDOS" value="28" sub="con 6 colaboradores" color="#2E9BFF" />
              <StatCard label="DESCARGADOS" value="64" sub="últimos 30 días" color="#00D1C1" />
              <StatCard label="ALMACENAMIENTO" value={`${USED_PCT}%`} sub={`${USED_GB} GB de ${TOTAL_GB} GB`} color={USED_PCT >= 80 ? "#F59E0B" : "#00C896"} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><StorageCard onChangePlan={onPlans} /></div>
              <PlanCard onChangePlan={onPlans} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><RecentFiles onUpload={() => setUploadOpen(true)} /></div>
              <ActivityFeed />
            </div>
          </div>
        </main>
      </AppShell>
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </>
  );
}
