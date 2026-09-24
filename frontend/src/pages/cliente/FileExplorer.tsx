import { useState, useRef } from "react";
import AppShell, { NavIcon, STORAGE } from "@/components/layout/AppShell";

// ── Types & data ──────────────────────────────────────────────────────────────

type ItemType = "folder" | "pdf" | "xls" | "ppt" | "img" | "doc" | "zip" | "mp4" | "mp3";

interface FsItem {
  id: number;
  name: string;
  type: ItemType;
  size?: string;
  modified: string;
  shared?: boolean;
  items?: number;
}

const FILE_META: Record<ItemType, { color: string; bg: string; label: string; emoji: string }> = {
  folder: { color: "#F59E0B", bg: "#FFFBEB", label: "Carpeta", emoji: "📁" },
  pdf:    { color: "#EF4444", bg: "#FEF2F2", label: "PDF",     emoji: "📄" },
  xls:    { color: "#22C55E", bg: "#F0FDF4", label: "XLS",     emoji: "📊" },
  ppt:    { color: "#F97316", bg: "#FFF7ED", label: "PPT",     emoji: "📑" },
  img:    { color: "#EC4899", bg: "#FDF2F8", label: "IMG",     emoji: "🖼️" },
  doc:    { color: "#6366F1", bg: "#EEF2FF", label: "DOC",     emoji: "📝" },
  zip:    { color: "#64748B", bg: "#F8FAFC", label: "ZIP",     emoji: "📦" },
  mp4:    { color: "#8B5CF6", bg: "#F5F3FF", label: "MP4",     emoji: "🎬" },
  mp3:    { color: "#06B6D4", bg: "#ECFEFF", label: "MP3",     emoji: "🎵" },
};

const ROOT_ITEMS: FsItem[] = [
  { id: 1,  name: "Proyectos",          type: "folder", modified: "Hoy, 10:32 am", items: 12 },
  { id: 2,  name: "Facturas",           type: "folder", modified: "Ayer, 4:00 pm",  items: 8  },
  { id: 3,  name: "Marketing",          type: "folder", modified: "Mar 8, 9:15 am", items: 23, shared: true },
  { id: 4,  name: "Backups",            type: "folder", modified: "Mar 6, 6:00 am", items: 5  },
  { id: 5,  name: "Presentación Q3 2026.pptx", type: "ppt",  size: "8.4 MB",  modified: "Hoy, 10:32 am", shared: true },
  { id: 6,  name: "Base de datos clientes.xlsx", type: "xls", size: "2.1 MB", modified: "Hoy, 9:15 am" },
  { id: 7,  name: "Contrato proveedor ABC.pdf",  type: "pdf", size: "540 KB", modified: "Ayer, 4:47 pm", shared: true },
  { id: 8,  name: "Logo_v3_final.png",   type: "img", size: "1.8 MB", modified: "Ayer, 2:20 pm" },
  { id: 10, name: "API_docs_v2.md",      type: "doc", size: "128 KB", modified: "Mar 9, 11:00 am" },
  { id: 11, name: "backup_sept_2026.zip",type: "zip", size: "34.6 MB",modified: "Mar 8, 8:30 am" },
];

const FOLDER_CONTENTS: Record<string, FsItem[]> = {
  Proyectos: [
    { id: 101, name: "Facturas",         type: "folder", modified: "Ayer",          items: 8  },
    { id: 102, name: "Propuesta_v2.pdf", type: "pdf",    size: "1.2 MB", modified: "Ayer, 9:00 am" },
    { id: 103, name: "Cronograma.xlsx",  type: "xls",    size: "320 KB", modified: "Mar 8" },
    { id: 104, name: "Brief_diseño.doc", type: "doc",    size: "88 KB",  modified: "Mar 7" },
  ],
  Facturas: [
    { id: 201, name: "Factura_001.pdf",  type: "pdf", size: "210 KB", modified: "Mar 5" },
    { id: 202, name: "Factura_002.pdf",  type: "pdf", size: "198 KB", modified: "Mar 4" },
    { id: 203, name: "Resumen_Q2.xlsx",  type: "xls", size: "450 KB", modified: "Mar 3" },
  ],
  Marketing: [
    { id: 301, name: "Campaña Sept.pptx", type: "ppt", size: "14 MB", modified: "Mar 8", shared: true },
    { id: 302, name: "Banner_web.png",    type: "img", size: "2.4 MB", modified: "Mar 7" },
    { id: 303, name: "Guión_campaña.doc", type: "doc", size: "64 KB",  modified: "Mar 6" },
  ],
  Backups: [
    { id: 401, name: "backup_ago_2026.zip", type: "zip", size: "28 MB", modified: "Mar 1" },
    { id: 402, name: "backup_jul_2026.zip", type: "zip", size: "25 MB", modified: "Feb 28" },
  ],
};

// ── Context menu ──────────────────────────────────────────────────────────────

interface CtxMenu { x: number; y: number; item: FsItem }

function ContextMenu({ menu, onClose, onAction }: {
  menu: CtxMenu;
  onClose: () => void;
  onAction: (action: string, item: FsItem) => void;
}) {
  const actions = [
    { id: "download", label: "Descargar",  icon: "download" },
    { id: "share",    label: "Compartir",  icon: "share" },
    { id: "rename",   label: "Renombrar",  icon: "edit" },
    { id: "link",     label: "Copiar enlace", icon: "link" },
    { id: "divider" },
    { id: "delete",   label: "Eliminar",   icon: "trash", danger: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl overflow-hidden py-1"
        style={{
          top: menu.y,
          left: menu.x,
          background: "white",
          border: "1px solid #E2E8F0",
          boxShadow: "0 8px 32px rgba(14,30,60,0.14)",
          minWidth: "168px",
        }}
      >
        {actions.map((a, i) =>
          a.id === "divider" ? (
            <div key={i} className="my-1 mx-3 h-px" style={{ background: "#F1F5F9" }} />
          ) : (
            <button
              key={a.id}
              onClick={() => { onAction(a.id!, menu.item); onClose(); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors duration-100"
              style={{ color: a.danger ? "#EF4444" : "#334155" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = a.danger ? "#FEF2F2" : "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: a.danger ? "#EF4444" : "#94A3B8" }}>
                <NavIcon id={a.icon!} size={15} />
              </span>
              {a.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (name: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startUpload(name: string) {
    setFileName(name);
    setPhase("uploading");
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 20 + 8;
      if (p >= 100) {
        clearInterval(iv);
        setProgress(100);
        setTimeout(() => { setPhase("done"); onUploaded(name); }, 400);
      } else {
        setProgress(Math.round(p));
      }
    }, 160);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid #E2E8F0", boxShadow: "0 24px 64px rgba(14,30,60,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
              <NavIcon id="upload" size={15} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Subir archivo
            </h2>
          </div>
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
          {phase === "done" ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00C896,#00D1C1)" }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M6 14l5 5 11-10" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-bold mb-1" style={{ color: "#0F172A" }}>¡Archivo subido!</p>
                <p className="text-sm font-medium" style={{ color: "#2E9BFF" }}>{fileName}</p>
                <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Ya está disponible en esta carpeta.</p>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#2E9BFF" }}
              >
                Listo
              </button>
            </div>
          ) : phase === "uploading" ? (
            <div className="flex flex-col gap-5 py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
                  <NavIcon id="cloud" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#0F172A" }}>{fileName}</p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>Subiendo…</p>
                </div>
                <span className="text-sm font-bold" style={{ color: "#2E9BFF" }}>{progress}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                <div
                  className="h-2 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                className="rounded-2xl flex flex-col items-center justify-center gap-4 py-12 px-6 text-center cursor-pointer transition-all duration-200 select-none"
                style={{
                  border: `2px dashed ${dragging ? "#2E9BFF" : "#94A3B8"}`,
                  background: dragging ? "#E0F4FF" : "#FAFBFC",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) startUpload(f.name);
                  else startUpload("archivo_ejemplo.pdf");
                }}
                onClick={() => inputRef.current?.click()}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200"
                  style={{
                    background: dragging ? "#2E9BFF" : "#E0F4FF",
                    color: dragging ? "white" : "#2E9BFF",
                    transform: dragging ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <NavIcon id="cloud" size={32} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#334155" }}>
                    Arrastra tus archivos aquí
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: "#94A3B8" }}>
                    o{" "}
                    <span className="font-semibold" style={{ color: "#2E9BFF" }}>
                      haz clic para seleccionar
                    </span>
                  </p>
                  <p className="text-xs mt-2" style={{ color: "#CBD5E1" }}>
                    PDF, DOC, XLS, PNG, MP4, ZIP — máx. 500 MB
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) startUpload(f.name);
                  }}
                />
              </div>

              {/* Supported types */}
              <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                {(["pdf","xls","ppt","img","mp4","zip","doc"] as ItemType[]).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ background: FILE_META[t].bg, color: FILE_META[t].color }}
                  >
                    {FILE_META[t].label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New folder modal ──────────────────────────────────────────────────────────

function NewFolderModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleCreate() {
    if (!name.trim()) { setError("El nombre no puede estar vacío."); return; }
    onCreate(name.trim());
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid #E2E8F0", boxShadow: "0 16px 48px rgba(14,30,60,0.16)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FFFBEB", color: "#F59E0B" }}>
              <NavIcon id="folder-plus" size={15} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Nueva carpeta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg"
            style={{ color: "#94A3B8" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "#334155" }}>Nombre de la carpeta</label>
            <input
              autoFocus
              type="text"
              placeholder="Nueva carpeta"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "white",
                border: `1.5px solid ${error ? "#FF6B6B" : "#E2E8F0"}`,
                color: "#0F172A",
              }}
              onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "#2E9BFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(46,155,255,0.12)"; }}
              onBlur={(e) => { if (!error) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; } }}
            />
            {error && <p className="text-xs font-medium" style={{ color: "#FF6B6B" }}>{error}</p>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#F1F5F9", color: "#334155" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#E2E8F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: "#2E9BFF" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── File/folder card ──────────────────────────────────────────────────────────

interface ItemCardProps {
  item: FsItem;
  view: "grid" | "list";
  onOpen: (item: FsItem) => void;
  onContext: (e: React.MouseEvent, item: FsItem) => void;
  selected: boolean;
  onSelect: (id: number) => void;
}

function ItemCard({ item, view, onOpen, onContext, selected, onSelect }: ItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = FILE_META[item.type];

  if (view === "list") {
    return (
      <div
        className="flex items-center gap-4 px-5 py-3 transition-colors duration-100 cursor-pointer group"
        style={{ background: selected ? "#F0F9FF" : "transparent", borderBottom: "1px solid #F8FAFC" }}
        onClick={() => item.type === "folder" ? onOpen(item) : onSelect(item.id)}
        onDoubleClick={() => item.type !== "folder" && onOpen(item)}
        onContextMenu={(e) => { e.preventDefault(); onContext(e, item); }}
      >
        {/* Checkbox */}
        <div
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            border: `1.5px solid ${selected ? "#2E9BFF" : "#CBD5E1"}`,
            background: selected ? "#2E9BFF" : "white",
            opacity: selected ? 1 : 0,
          }}
        >
          {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>

        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
          style={{ background: meta.bg, color: meta.color }}
        >
          {item.type === "folder" ? (
            <NavIcon id="folder" size={18} />
          ) : (
            <span>{meta.emoji}</span>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>{item.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            {item.shared && <span className="text-[10px]" style={{ color: "#00D1C1" }}>● Compartido</span>}
            {item.items !== undefined && <span className="text-[10px]" style={{ color: "#94A3B8" }}>{item.items} elementos</span>}
          </div>
        </div>

        {/* Size / date */}
        <span className="text-xs hidden sm:block flex-shrink-0 w-20 text-right" style={{ color: "#94A3B8" }}>
          {item.size ?? "—"}
        </span>
        <span className="text-xs hidden md:block flex-shrink-0 w-36 text-right" style={{ color: "#94A3B8" }}>
          {item.modified}
        </span>

        {/* Actions on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(["download","share","more"] as const).map((act) => (
            <button
              key={act}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#94A3B8" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
              onClick={(e) => { e.stopPropagation(); if (act === "more") onContext(e, item); }}
            >
              <NavIcon id={act} size={15} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-150 group relative"
      style={{
        background: selected ? "#EFF8FF" : "white",
        border: `1.5px solid ${selected ? "#2E9BFF" : "#E2E8F0"}`,
        boxShadow: selected ? "0 0 0 2px rgba(46,155,255,0.15)" : "none",
      }}
      onClick={() => item.type === "folder" ? onOpen(item) : onSelect(item.id)}
      onDoubleClick={() => item.type !== "folder" && onOpen(item)}
      onContextMenu={(e) => { e.preventDefault(); onContext(e, item); }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#BAE6FD";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }
      }}
    >
      {/* Three-dot menu */}
      <button
        className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "#94A3B8" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
        onClick={(e) => { e.stopPropagation(); onContext(e, item); }}
      >
        <NavIcon id="more" size={16} />
      </button>

      {/* Shared badge */}
      {item.shared && (
        <div className="absolute top-2.5 left-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#00D1C1" }} title="Compartido" />
        </div>
      )}

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: meta.bg, color: meta.color }}
      >
        {item.type === "folder" ? <NavIcon id="folder" size={24} /> : <span>{meta.emoji}</span>}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#0F172A" }}>{item.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
          {item.size ?? (item.items !== undefined ? `${item.items} elementos` : "")}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        <span className="text-[10px]" style={{ color: "#CBD5E1" }}>{item.modified.split(",")[0]}</span>
      </div>
    </div>
  );
}

// ── Storage indicator (bottom bar) ────────────────────────────────────────────

function StorageBar() {
  const pct = Math.round((STORAGE.used / STORAGE.total) * 100);
  return (
    <div
      className="fixed bottom-4 right-6 z-20 flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-lg"
      style={{
        background: "white",
        border: "1px solid #E2E8F0",
        boxShadow: "0 4px 20px rgba(14,30,60,0.10)",
      }}
    >
      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
        <NavIcon id="cloud" size={13} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-24 h-1.5 rounded-full" style={{ background: "#E2E8F0" }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#2E9BFF,#00D1C1)" }}
            />
          </div>
          <span className="text-[10px] font-bold" style={{ color: "#334155" }}>{pct}%</span>
        </div>
        <p className="text-[10px]" style={{ color: "#94A3B8" }}>
          <span className="font-semibold" style={{ color: "#0F172A" }}>{STORAGE.total - STORAGE.used} GB</span> disponibles
        </p>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

interface FileExplorerProps {
  onLogout: () => void;
  onDashboard: () => void;
  onPlans: () => void;
  onPayments?: () => void;
  onConsumption?: () => void;
}

export default function FileExplorer({ onLogout, onDashboard, onPlans, onPayments, onConsumption }: FileExplorerProps) {
  // Navigation state
  const [path, setPath] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [items, setItems] = useState<FsItem[]>(ROOT_ITEMS);
  const [notification, setNotification] = useState<string | null>(null);

  const currentFolderName = path[path.length - 1];
  const currentItems = path.length === 0
    ? items
    : FOLDER_CONTENTS[currentFolderName] ?? [];

  const filtered = currentItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    // Folders first always
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "size") return (a.size ?? "").localeCompare(b.size ?? "");
    return a.modified.localeCompare(b.modified);
  });

  function openItem(item: FsItem) {
    if (item.type === "folder") {
      setPath((p) => [...p, item.name]);
      setSelected(new Set());
      setSearch("");
    }
  }

  function navigate(idx: number) {
    setPath((p) => p.slice(0, idx + 1));
    setSelected(new Set());
  }

  function toggleSelect(id: number) {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  }

  function showNotif(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2800);
  }

  function handleAction(action: string, item: FsItem) {
    if (action === "delete") {
      showNotif(`"${item.name}" eliminado.`);
    } else if (action === "rename") {
      showNotif(`Renombrando "${item.name}"…`);
    } else if (action === "download") {
      showNotif(`Descargando "${item.name}"…`);
    } else if (action === "link") {
      showNotif("Enlace copiado al portapapeles.");
    } else if (action === "share") {
      showNotif(`"${item.name}" compartido.`);
    }
  }

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
    else if (id === "payments" && onPayments) onPayments();
    else if (id === "consumption" && onConsumption) onConsumption();
  }

  function createFolder(name: string) {
    const newFolder: FsItem = {
      id: Date.now(),
      name,
      type: "folder",
      modified: "Ahora",
      items: 0,
    };
    setItems((prev) => [newFolder, ...prev]);
    showNotif(`Carpeta "${name}" creada.`);
  }

  function handleUploaded(name: string) {
    showNotif(`"${name}" subido correctamente.`);
  }

  const breadcrumbs = ["Mis archivos", ...path];

  return (
    <>
      <AppShell
        activeNav="files"
        onNav={handleNav}
        onLogout={onLogout}
        onUpload={() => setUploadOpen(true)}
        headerTitle="Mis archivos"
        headerActions={
          <div className="flex items-center gap-2 mr-1">
            {/* Search */}
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
                <NavIcon id="search" size={15} />
              </span>
              <input
                type="text"
                placeholder="Buscar archivos…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: "#F1F5F9",
                  border: "1.5px solid transparent",
                  color: "#0F172A",
                  width: "200px",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#2E9BFF"; e.currentTarget.style.background = "white"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(46,155,255,0.10)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Sub-toolbar */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 flex-wrap gap-3"
            style={{ background: "rgba(248,250,252,0.95)", borderBottom: "1px solid #F1F5F9", backdropFilter: "blur(8px)" }}
          >
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 flex-wrap">
              {breadcrumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 3l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <button
                    onClick={() => idx === 0 ? setPath([]) : navigate(idx - 1)}
                    className="text-sm transition-colors duration-150 font-medium"
                    style={{ color: idx === breadcrumbs.length - 1 ? "#0F172A" : "#94A3B8" }}
                    onMouseEnter={(e) => { if (idx < breadcrumbs.length - 1) e.currentTarget.style.color = "#2E9BFF"; }}
                    onMouseLeave={(e) => { if (idx < breadcrumbs.length - 1) e.currentTarget.style.color = "#94A3B8"; }}
                  >
                    {idx === breadcrumbs.length - 1
                      ? <span className="font-bold" style={{ color: "#0F172A" }}>{crumb}</span>
                      : crumb}
                  </button>
                </span>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: "#E0F4FF", color: "#2E9BFF" }}
                >
                  {selected.size} seleccionado{selected.size > 1 ? "s" : ""}
                  <button
                    onClick={() => setSelected(new Set())}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-xs font-semibold pl-3 pr-7 py-1.5 rounded-lg appearance-none cursor-pointer outline-none transition-all"
                  style={{ background: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}
                >
                  <option value="name">Nombre</option>
                  <option value="date">Fecha</option>
                  <option value="size">Tamaño</option>
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94A3B8" }}>
                  <NavIcon id="sort" size={12} />
                </span>
              </div>

              {/* View toggle */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                {(["grid","list"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="px-2.5 py-1.5 transition-colors duration-150"
                    style={{ background: view === v ? "#2E9BFF" : "white", color: view === v ? "white" : "#94A3B8" }}
                    title={v === "grid" ? "Vista cuadrícula" : "Vista lista"}
                  >
                    {v === "grid" ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M2 7h10M2 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setNewFolderOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
              >
                <NavIcon id="folder-plus" size={14} />
                <span className="hidden sm:inline">Nueva carpeta</span>
              </button>

              <button
                onClick={() => setUploadOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all duration-150"
                style={{ background: "#2E9BFF" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1E6BD6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#2E9BFF"; }}
              >
                <NavIcon id="upload" size={14} />
                <span className="hidden sm:inline">Subir archivo</span>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F1F5F9", color: "#CBD5E1" }}>
                  <NavIcon id="folder" size={32} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "#334155" }}>
                  {search ? "Sin resultados" : "Carpeta vacía"}
                </p>
                <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                  {search ? `No se encontraron archivos que coincidan con "${search}"` : "Sube archivos o crea una carpeta para empezar."}
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sorted.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    view="grid"
                    onOpen={openItem}
                    onContext={(e, it) => setCtxMenu({ x: e.clientX, y: e.clientY, item: it })}
                    selected={selected.has(item.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0", background: "white" }}>
                {/* List header */}
                <div
                  className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-4 px-5 py-3"
                  style={{ borderBottom: "1px solid #F1F5F9", background: "#F8FAFC" }}
                >
                  {["", "", "Nombre", "Tamaño", "Modificado", ""].map((h, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#CBD5E1" }}>{h}</span>
                  ))}
                </div>
                {sorted.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    view="list"
                    onOpen={openItem}
                    onContext={(e, it) => setCtxMenu({ x: e.clientX, y: e.clientY, item: it })}
                    selected={selected.has(item.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </AppShell>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} onAction={handleAction} />
      )}

      {/* Modals */}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />}
      {newFolderOpen && <NewFolderModal onClose={() => setNewFolderOpen(false)} onCreate={createFolder} />}

      {/* Storage indicator */}
      <StorageBar />

      {/* Toast notification */}
      {notification && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white"
          style={{ background: "#0F172A", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.24)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" fill="#00C896" fillOpacity="0.3"/>
            <path d="M4 7l2 2 4-4" stroke="#00C896" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {notification}
        </div>
      )}
    </>
  );
}
