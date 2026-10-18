import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { almacenamientoApi, useResumenEspacio } from "@/api/almacenamiento";
import SubirArchivoModal from "@/components/SubirArchivoModal";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import type { ArchivoReciente, Evento, ResumenEspacio } from "@/types";
import { EVENTO_META } from "@/utils/actividad";
import { FILE_META, extension, guardarBlob, tipoDeArchivo } from "@/utils/archivos";
import { formatoBytes, formatoDolares, formatoFecha, formatoGB, formatoModificado, haceCuanto } from "@/utils/format";

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
  const { total, pct, usadoBytes, disponibleBytes } = useAlmacenamiento();
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
              {formatoBytes(usadoBytes)}
            </span>
            <span className="text-sm" style={{ color: "#94A3B8" }}>de {formatoGB(total)}</span>
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
            // Aunque ocupe menos del 1 %, que se vea que hay algo guardado
            width: `${Math.max(pct, usadoBytes ? 1 : 0)}%`,
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
            <span className="text-xs" style={{ color: "#64748B" }}>Utilizado · {formatoBytes(usadoBytes)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#E2E8F0" }} />
            <span className="text-xs" style={{ color: "#64748B" }}>Libre · {formatoBytes(disponibleBytes)}</span>
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
  // En un plan anual el precio contratado es el del año completo
  const anual = sus ? new Date(sus.fecha_fin).getTime() - new Date(sus.fecha_inicio).getTime() > 40 * 86_400_000 : false;

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
          style={{ background: "linear-gradient(135deg, #2E9BFF 0%, #00D1C1 100%)", color: "white" }}
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
            {precio === 0
              ? "Gratis · se renueva solo"
              : anual
                ? `${formatoDolares(precio)}/año · facturación anual`
                : `${formatoDolares(precio)}/mes · facturación mensual`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 py-3" style={{ borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
        {[
          { label: "Almacenamiento", value: sus ? formatoGB(sus.almacenamiento_gb) : "—" },
          { label: "Activo desde", value: sus ? formatoFecha(sus.fecha_inicio) : "—" },
          { label: precio === 0 ? "Se renueva el" : "Vigente hasta", value: renewalStr },
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

function metaArchivo(a: ArchivoReciente) {
  const tipo = tipoDeArchivo(a.tipo_mime, a.nombre_original);
  const ext = extension(a.nombre_original);
  const meta = FILE_META[tipo];
  return { ...meta, label: tipo === "file" ? (ext ? ext.slice(0, 4).toUpperCase() : meta.label) : meta.label };
}

interface RecentFilesProps {
  archivos: ArchivoReciente[] | null; // null = cargando
  total: number;
  onUpload: () => void;
  onFiles: () => void;
  onAbrirCarpeta: (idCarpeta: string | null) => void;
  onDescargado: () => void;
}

function RecentFiles({ archivos, total, onUpload, onFiles, onAbrirCarpeta, onDescargado }: RecentFilesProps) {
  const [view, setView] = useState<"grid" | "list">("list");
  const [hovered, setHovered] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  async function descargar(a: ArchivoReciente) {
    try {
      guardarBlob(await almacenamientoApi.descargar(a.id_archivo), a.nombre_original);
      onDescargado(); // la descarga aparece en la actividad
    } catch (e) {
      setAviso((e as Error).message);
    }
  }

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
          <p className="text-xs mt-0.5" style={{ color: aviso ? "#DC2626" : "#94A3B8" }}>
            {aviso || "Los últimos que subiste, en cualquier carpeta"}
          </p>
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
                aria-label={v === "list" ? "Ver como lista" : "Ver como cuadrícula"}
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
      {archivos === null ? (
        <p className="px-6 py-10 text-center text-xs" style={{ color: "#94A3B8" }}>Cargando…</p>
      ) : archivos.length === 0 ? (
        <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
            <NavIcon id="upload" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#334155" }}>Todavía no tienes archivos</p>
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Sube el primero y aparecerá aquí.</p>
          </div>
          <button onClick={onUpload} className="text-xs font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "#2E9BFF" }}>
            Subir archivo
          </button>
        </div>
      ) : view === "list" ? (
        <div className="divide-y" style={{ borderColor: "#F8FAFC" }}>
          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-2.5">
            {["Nombre", "", "Tamaño", "Subido"].map((h, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#CBD5E1" }}>{h}</span>
            ))}
          </div>
          {archivos.map((file) => {
            const meta = metaArchivo(file);
            const isHovered = hovered === file.id_archivo;
            return (
              <div
                key={file.id_archivo}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-6 py-3.5 transition-colors duration-100 cursor-pointer"
                style={{ background: isHovered ? "#F8FAFC" : "transparent" }}
                onMouseEnter={() => setHovered(file.id_archivo)}
                onMouseLeave={() => setHovered(null)}
                onDoubleClick={() => onAbrirCarpeta(file.id_carpeta)}
              >
                {/* Type icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.emoji}
                </div>
                {/* Name + folder */}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }} title={file.nombre_original}>
                    {file.nombre_original}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] truncate" style={{ color: "#94A3B8" }}>
                      en {file.carpeta ?? "Mis archivos"}
                    </span>
                  </div>
                </div>
                {/* Size */}
                <span className="text-xs text-right" style={{ color: "#94A3B8" }}>{formatoBytes(file.tamano_bytes)}</span>
                {/* Date + actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs whitespace-nowrap hidden sm:block" style={{ color: "#94A3B8" }}>
                    {formatoModificado(file.creado_en)}
                  </span>
                  <div className="flex items-center gap-1" style={{ visibility: isHovered ? "visible" : "hidden" }}>
                    {[
                      { id: "download", titulo: "Descargar", accion: () => descargar(file) },
                      { id: "folder", titulo: "Abrir su carpeta", accion: () => onAbrirCarpeta(file.id_carpeta) },
                    ].map(({ id, titulo, accion }) => (
                      <button
                        key={id}
                        onClick={(e) => { e.stopPropagation(); accion(); }}
                        title={titulo}
                        aria-label={titulo}
                        className="p-1.5 rounded-lg transition-colors duration-100"
                        style={{ color: "#94A3B8" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
                      >
                        <NavIcon id={id} size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
          {archivos.map((file) => {
            const meta = metaArchivo(file);
            return (
              <div
                key={file.id_archivo}
                className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all duration-150 group"
                style={{ border: "1px solid #E2E8F0", background: "#FAFBFC" }}
                onClick={() => descargar(file)}
                title={`Descargar ${file.nombre_original}`}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#2E9BFF"; (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLDivElement).style.background = "#FAFBFC"; }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.emoji}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: "#0F172A" }}>{file.nombre_original}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>{formatoBytes(file.tamano_bytes)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3.5 flex items-center justify-between" style={{ borderTop: "1px solid #F1F5F9" }}>
        <p className="text-xs" style={{ color: "#94A3B8" }}>{total} archivo{total !== 1 ? "s" : ""} en total</p>
        <button
          onClick={onFiles}
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

function ActivityFeed({ eventos, onRefresh }: { eventos: Evento[] | null; onRefresh: () => void }) {
  const visibles = (eventos ?? []).slice(0, 6);
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
          onClick={onRefresh}
          title="Actualizar"
          aria-label="Actualizar actividad"
          className="text-xs font-semibold flex items-center gap-1 transition-colors"
          style={{ color: "#2E9BFF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1E6BD6")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#2E9BFF")}
        >
          <NavIcon id="refresh" />
        </button>
      </div>
      {eventos !== null && visibles.length === 0 && (
        <p className="text-xs py-6 text-center" style={{ color: "#94A3B8" }}>
          Aquí verás lo que subes, descargas y eliminas.
        </p>
      )}
      <div className="flex flex-col gap-0">
        {visibles.map((item, i) => {
          const meta = EVENTO_META[item.tipo];
          return (
            <div key={`${item.creado_en}-${i}`} className="flex gap-3 relative">
              {/* Timeline line */}
              {i < visibles.length - 1 && (
                <div
                  className="absolute left-3.5 top-7 w-px"
                  style={{ height: "calc(100% - 4px)", background: "#F1F5F9" }}
                />
              )}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10"
                style={{ background: meta.color + "18", border: `1.5px solid ${meta.color}30` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              </div>
              <div className="pb-4 min-w-0">
                <p className="text-xs leading-relaxed break-words" style={{ color: "#334155" }}>
                  <span className="font-semibold" style={{ color: "#0F172A" }}>Tú</span>{" "}
                  {meta.verbo}{" "}
                  <span className="font-medium">{item.descripcion}</span>
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#94A3B8" }}>
                  {haceCuanto(item.creado_en)}{item.tamano_bytes ? ` · ${formatoBytes(item.tamano_bytes)}` : ""}
                </p>
              </div>
            </div>
          );
        })}
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

function estadisticas(r: ResumenEspacio | null, pct: number, usado: number, total: number) {
  const m = r?.este_mes;
  return [
    {
      label: "ARCHIVOS TOTALES", value: r ? String(r.archivos) : "—",
      sub: m ? `${m.subidas} subido${m.subidas !== 1 ? "s" : ""} este mes` : "", color: "#0F172A",
    },
    { label: "CARPETAS", value: r ? String(r.carpetas) : "—", sub: "para organizar tus archivos", color: "#2E9BFF" },
    { label: "DESCARGAS", value: m ? String(m.descargas) : "—", sub: "este mes", color: "#00D1C1" },
    {
      label: "ALMACENAMIENTO", value: `${pct}%`, sub: `${formatoBytes(usado)} de ${formatoGB(total)}`,
      color: pct >= 80 ? "#F59E0B" : "#00C896",
    },
  ];
}

export default function Dashboard({ onLogout, onPlans, onFiles, onPayments, onConsumption }: DashboardProps) {
  const navigate = useNavigate();
  const { total, pct, usadoBytes } = useAlmacenamiento();
  const { resumen, error, recargar } = useResumenEspacio();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [uploadOpen, setUploadOpen] = useState(false);

  const irAArchivos = () => (onFiles ? onFiles() : navigate("/archivos"));

  function handleNav(id: string) {
    if (id === "plans") { onPlans(); return; }
    if (id === "files") { irAArchivos(); return; }
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
            {error && (
              <p className="text-xs px-4 py-2.5 rounded-xl" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
                No se pudo cargar tu resumen: {error}
              </p>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {estadisticas(resumen, pct, usadoBytes, total).map((e) => <StatCard key={e.label} {...e} />)}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2"><StorageCard onChangePlan={onPlans} /></div>
              <PlanCard onChangePlan={onPlans} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RecentFiles
                  archivos={resumen?.recientes ?? (error ? [] : null)}
                  total={resumen?.archivos ?? 0}
                  onUpload={() => setUploadOpen(true)}
                  onFiles={irAArchivos}
                  onAbrirCarpeta={(id) => navigate(id ? `/archivos?carpeta=${id}` : "/archivos")}
                  onDescargado={recargar}
                />
              </div>
              <ActivityFeed eventos={resumen?.actividad ?? (error ? [] : null)} onRefresh={recargar} />
            </div>
          </div>
        </main>
      </AppShell>
      {uploadOpen && (
        <SubirArchivoModal onClose={() => setUploadOpen(false)} onSubido={recargar} onVerArchivos={irAArchivos} />
      )}
    </>
  );
}
