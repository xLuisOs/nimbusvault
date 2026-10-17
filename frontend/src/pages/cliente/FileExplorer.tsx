// Explorador de archivos (3.7). Todo sale de la API: /carpetas, /archivos y /carpetas/{id}/ruta.
// La carpeta actual vive en la URL (?carpeta=<id>), así que recargar o compartir el enlace no pierde la ubicación.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { almacenamientoApi } from "@/api/almacenamiento";
import AppShell, { NavIcon, useAlmacenamiento } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import type { Archivo, Carpeta, RutaItem } from "@/types";
import { guardarBlob } from "@/utils/archivos";
import { formatoBytes, formatoModificado } from "@/utils/format";

// ── Types & data ──────────────────────────────────────────────────────────────

type ItemType = "folder" | "pdf" | "xls" | "ppt" | "img" | "doc" | "zip" | "mp4" | "mp3" | "file";

interface FsItem {
  id: string; // id_carpeta o id_archivo
  name: string;
  type: ItemType;
  label: string; // etiqueta corta (PDF, XLS… o la extensión)
  size?: string;
  bytes: number;
  modified: string;
  fecha: string; // ISO, para ordenar
  idCarpeta: string | null; // carpeta donde está (solo archivos)
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
  file:   { color: "#64748B", bg: "#F1F5F9", label: "ARCHIVO", emoji: "📄" },
};

function extension(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i > 0 ? nombre.slice(i + 1).toLowerCase() : "";
}

/** Ícono según el tipo MIME que guardó el backend o, si no dice mucho, según la extensión. */
function tipoDeArchivo(mime: string, nombre: string): ItemType {
  const ext = extension(nombre);
  const es = (patron: RegExp, exts: string[]) => patron.test(mime) || exts.includes(ext);
  if (es(/^application\/pdf$/, ["pdf"])) return "pdf";
  if (es(/spreadsheet|excel|csv/, ["xls", "xlsx", "csv", "ods"])) return "xls";
  if (es(/presentation|powerpoint/, ["ppt", "pptx", "odp", "key"])) return "ppt";
  if (es(/^image\//, ["png", "jpg", "jpeg", "gif", "webp", "svg"])) return "img";
  if (es(/^video\//, ["mp4", "mov", "avi", "mkv", "webm"])) return "mp4";
  if (es(/^audio\//, ["mp3", "wav", "ogg", "m4a", "flac"])) return "mp3";
  if (es(/zip|rar|7z|tar|gzip|compressed/, ["zip", "rar", "7z", "tar", "gz"])) return "zip";
  if (es(/word|^text\/|rtf|opendocument\.text|markdown/, ["doc", "docx", "txt", "md", "rtf", "odt"])) return "doc";
  return "file";
}

function aItemCarpeta(c: Carpeta): FsItem {
  return {
    id: c.id_carpeta, name: c.nombre, type: "folder", label: FILE_META.folder.label,
    bytes: 0, modified: formatoModificado(c.creado_en), fecha: c.creado_en, idCarpeta: c.id_carpeta_padre,
  };
}

function aItemArchivo(a: Archivo): FsItem {
  const type = tipoDeArchivo(a.tipo_mime, a.nombre_original);
  const ext = extension(a.nombre_original);
  return {
    id: a.id_archivo, name: a.nombre_original, type,
    label: type === "file" ? (ext ? ext.slice(0, 4).toUpperCase() : FILE_META.file.label) : FILE_META[type].label,
    size: formatoBytes(a.tamano_bytes), bytes: a.tamano_bytes,
    modified: formatoModificado(a.creado_en), fecha: a.creado_en, idCarpeta: a.id_carpeta,
  };
}

// ── Context menu ──────────────────────────────────────────────────────────────

type Accion = "open" | "download" | "rename" | "move" | "delete";

interface CtxMenu { x: number; y: number; item: FsItem }

const ACCIONES_CARPETA = [
  { id: "open", label: "Abrir", icon: "folder" },
  { id: "rename", label: "Renombrar", icon: "edit" },
  { id: "divider" },
  { id: "delete", label: "Eliminar", icon: "trash", danger: true },
] as const;

const ACCIONES_ARCHIVO = [
  { id: "download", label: "Descargar", icon: "download" },
  { id: "rename", label: "Renombrar", icon: "edit" },
  { id: "move", label: "Mover a…", icon: "folder" },
  { id: "divider" },
  { id: "delete", label: "Eliminar", icon: "trash", danger: true },
] as const;

function ContextMenu({ menu, onClose, onAction }: {
  menu: CtxMenu;
  onClose: () => void;
  onAction: (action: Accion, item: FsItem) => void;
}) {
  const actions = menu.item.type === "folder" ? ACCIONES_CARPETA : ACCIONES_ARCHIVO;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl overflow-hidden py-1"
        style={{
          // Que no se salga de la pantalla si se abre cerca del borde
          top: Math.min(menu.y, window.innerHeight - 220),
          left: Math.min(menu.x, window.innerWidth - 180),
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
              onClick={() => { onAction(a.id, menu.item); onClose(); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm transition-colors duration-100"
              style={{ color: "danger" in a ? "#EF4444" : "#334155" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "danger" in a ? "#FEF2F2" : "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: "danger" in a ? "#EF4444" : "#94A3B8" }}>
                <NavIcon id={a.icon} size={15} />
              </span>
              {a.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ── Modal base ────────────────────────────────────────────────────────────────

function ModalBase({ titulo, icono, color, bg, ancho = "max-w-sm", onClose, children }: {
  titulo: string;
  icono: string;
  color: string;
  bg: string;
  ancho?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${ancho} rounded-2xl overflow-hidden`}
        style={{ background: "white", border: "1px solid #E2E8F0", boxShadow: "0 24px 64px rgba(14,30,60,0.18)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F1F5F9" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
              <NavIcon id={icono} size={15} />
            </div>
            <h2 className="text-sm font-bold truncate" style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {titulo}
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
        {children}
      </div>
    </div>
  );
}

function MensajeError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ color: "#DC2626", background: "#FEF2F2" }}>
      {children}
    </p>
  );
}

function BotonesModal({ onCancel, onOk, textoOk, cargando, deshabilitado, peligro }: {
  onCancel: () => void;
  onOk: () => void;
  textoOk: string;
  cargando?: boolean;
  deshabilitado?: boolean;
  peligro?: boolean;
}) {
  const base = peligro ? "#EF4444" : "#2E9BFF";
  const hover = peligro ? "#DC2626" : "#1E6BD6";
  const inactivo = cargando || deshabilitado;
  return (
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: "#F1F5F9", color: "#334155" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#E2E8F0"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
      >
        Cancelar
      </button>
      <button
        onClick={onOk}
        disabled={inactivo}
        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
        style={{ background: base, opacity: inactivo ? 0.6 : 1, cursor: inactivo ? "not-allowed" : "pointer" }}
        onMouseEnter={(e) => { if (!inactivo) e.currentTarget.style.background = hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = base; }}
      >
        {cargando ? "Un momento…" : textoOk}
      </button>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ idCarpeta, destino, onClose, onUploaded }: {
  idCarpeta: string | null;
  destino: string;
  onClose: () => void;
  onUploaded: (archivo: Archivo) => void;
}) {
  const { disponibleBytes, cuotaBytes } = useAlmacenamiento();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startUpload(file: File) {
    setError("");
    // Aviso rápido; la validación que cuenta es la del backend (cuota atómica)
    if (cuotaBytes && file.size > disponibleBytes) {
      setError(`«${file.name}» pesa ${formatoBytes(file.size)} y solo te quedan ${formatoBytes(disponibleBytes)}.`);
      return;
    }
    setFileName(file.name);
    setProgress(0);
    setPhase("uploading");
    almacenamientoApi
      .subir(file, idCarpeta, setProgress)
      .then((archivo) => { setPhase("done"); onUploaded(archivo); })
      .catch((e) => { setError(e.message); setPhase("idle"); });
  }

  return (
    <ModalBase titulo="Subir archivo" icono="upload" color="#2E9BFF" bg="#E0F4FF" ancho="max-w-md" onClose={onClose}>
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
              <p className="text-sm font-medium break-all" style={{ color: "#2E9BFF" }}>{fileName}</p>
              <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>Ya está disponible en «{destino}».</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase("idle")}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "#F1F5F9", color: "#334155" }}
              >
                Subir otro
              </button>
              <button
                onClick={onClose}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "#2E9BFF" }}
              >
                Listo
              </button>
            </div>
          </div>
        ) : phase === "uploading" ? (
          <div className="flex flex-col gap-5 py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#E0F4FF", color: "#2E9BFF" }}>
                <NavIcon id="cloud" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#0F172A" }}>{fileName}</p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>
                  {progress < 100 ? "Subiendo…" : "Guardando en tu almacenamiento…"}
                </p>
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
                if (f) startUpload(f);
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
                  Arrastra tu archivo aquí
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#94A3B8" }}>
                  o{" "}
                  <span className="font-semibold" style={{ color: "#2E9BFF" }}>
                    haz clic para seleccionar
                  </span>
                </p>
                <p className="text-xs mt-2" style={{ color: "#CBD5E1" }}>
                  Se guardará en «{destino}»
                  {cuotaBytes > 0 && <> · {formatoBytes(disponibleBytes)} disponibles</>}
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = ""; // permite volver a elegir el mismo archivo
                  if (f) startUpload(f);
                }}
              />
            </div>

            {error && <div className="mt-4"><MensajeError>{error}</MensajeError></div>}

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
    </ModalBase>
  );
}

// ── Name modal (nueva carpeta / renombrar) ────────────────────────────────────

function NameModal({ titulo, icono, color, bg, etiqueta, inicial = "", placeholder, textoOk, onClose, onSubmit }: {
  titulo: string;
  icono: string;
  color: string;
  bg: string;
  etiqueta: string;
  inicial?: string;
  placeholder?: string;
  textoOk: string;
  onClose: () => void;
  onSubmit: (nombre: string) => Promise<void>;
}) {
  const [name, setName] = useState(inicial);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit() {
    const limpio = name.trim();
    if (!limpio) { setError("El nombre no puede estar vacío."); return; }
    if (limpio === inicial) { onClose(); return; }
    setGuardando(true);
    try {
      await onSubmit(limpio);
      onClose();
    } catch (e) {
      setError((e as Error).message); // p. ej. 409: ya existe una carpeta con ese nombre
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ModalBase titulo={titulo} icono={icono} color={color} bg={bg} onClose={onClose}>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold" style={{ color: "#334155" }}>{etiqueta}</label>
          <input
            autoFocus
            type="text"
            placeholder={placeholder}
            value={name}
            maxLength={255}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "white",
              border: `1.5px solid ${error ? "#FF6B6B" : "#E2E8F0"}`,
              color: "#0F172A",
            }}
            onFocus={(e) => {
              // Al renombrar se selecciona el nombre sin la extensión
              const punto = inicial.lastIndexOf(".");
              e.currentTarget.setSelectionRange(0, punto > 0 ? punto : e.currentTarget.value.length);
              if (!error) e.currentTarget.style.borderColor = "#2E9BFF";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(46,155,255,0.12)";
            }}
            onBlur={(e) => { if (!error) { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; } }}
          />
          {error && <p className="text-xs font-medium" style={{ color: "#FF6B6B" }}>{error}</p>}
        </div>
        <BotonesModal onCancel={onClose} onOk={handleSubmit} textoOk={textoOk} cargando={guardando} />
      </div>
    </ModalBase>
  );
}

// ── Confirm delete modal ──────────────────────────────────────────────────────

function ConfirmDeleteModal({ item, onClose, onConfirm }: {
  item: FsItem;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState(false);
  const esCarpeta = item.type === "folder";

  async function confirmar() {
    setBorrando(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message); // p. ej. 409: la carpeta no está vacía
      setBorrando(false);
    }
  }

  return (
    <ModalBase titulo={esCarpeta ? "Eliminar carpeta" : "Eliminar archivo"} icono="trash" color="#EF4444" bg="#FEF2F2" onClose={onClose}>
      <div className="p-6 flex flex-col gap-4">
        <p className="text-sm" style={{ color: "#334155" }}>
          ¿Seguro que quieres eliminar <span className="font-semibold break-all">«{item.name}»</span>?
          {esCarpeta
            ? " Solo se pueden eliminar carpetas vacías."
            : " El archivo se borra de tu almacenamiento y se libera su espacio."}
        </p>
        {error && <MensajeError>{error}</MensajeError>}
        <BotonesModal onCancel={onClose} onOk={confirmar} textoOk="Eliminar" cargando={borrando} peligro />
      </div>
    </ModalBase>
  );
}

// ── Move modal ────────────────────────────────────────────────────────────────

function MoveModal({ item, onClose, onMove }: {
  item: FsItem;
  onClose: () => void;
  onMove: (idDestino: string | null, nombreDestino: string) => Promise<void>;
}) {
  // Navegación propia dentro del modal: de la raíz hacia la carpeta destino
  const [ruta, setRuta] = useState<RutaItem[]>([]);
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [moviendo, setMoviendo] = useState(false);
  const [error, setError] = useState("");
  const destino = ruta[ruta.length - 1] ?? null;
  const idDestino = destino?.id_carpeta ?? null;

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    almacenamientoApi
      .listarCarpetas(idDestino)
      .then((c) => vivo && setCarpetas(c))
      .catch((e) => vivo && setError(e.message))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [idDestino]);

  async function mover() {
    setMoviendo(true);
    try {
      await onMove(idDestino, destino?.nombre ?? "Mis archivos");
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setMoviendo(false);
    }
  }

  const mismaCarpeta = idDestino === item.idCarpeta;

  return (
    <ModalBase titulo={`Mover «${item.name}»`} icono="folder" color="#F59E0B" bg="#FFFBEB" ancho="max-w-md" onClose={onClose}>
      <div className="p-6 flex flex-col gap-4">
        {/* Breadcrumb del destino */}
        <nav className="flex items-center gap-1.5 flex-wrap text-sm">
          {[{ id_carpeta: "", nombre: "Mis archivos" }, ...ruta].map((r, idx, todos) => (
            <span key={r.id_carpeta || "raiz"} className="flex items-center gap-1.5">
              {idx > 0 && <span style={{ color: "#CBD5E1" }}>/</span>}
              <button
                onClick={() => setRuta(ruta.slice(0, idx))}
                disabled={idx === todos.length - 1}
                className="font-medium"
                style={{ color: idx === todos.length - 1 ? "#0F172A" : "#2E9BFF" }}
              >
                {r.nombre}
              </button>
            </span>
          ))}
        </nav>

        <div className="rounded-xl overflow-y-auto" style={{ border: "1px solid #E2E8F0", maxHeight: "16rem", minHeight: "8rem" }}>
          {cargando ? (
            <p className="text-xs text-center py-10" style={{ color: "#94A3B8" }}>Cargando carpetas…</p>
          ) : carpetas.length === 0 ? (
            <p className="text-xs text-center py-10" style={{ color: "#94A3B8" }}>No hay subcarpetas aquí.</p>
          ) : (
            carpetas.map((c) => (
              <button
                key={c.id_carpeta}
                onClick={() => setRuta([...ruta, { id_carpeta: c.id_carpeta, nombre: c.nombre }])}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors"
                style={{ color: "#334155", borderBottom: "1px solid #F8FAFC" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ color: "#F59E0B" }}><NavIcon id="folder" size={16} /></span>
                <span className="flex-1 truncate">{c.nombre}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))
          )}
        </div>

        {mismaCarpeta && (
          <p className="text-xs" style={{ color: "#94A3B8" }}>El archivo ya está en esta carpeta.</p>
        )}
        {error && <MensajeError>{error}</MensajeError>}
        <BotonesModal onCancel={onClose} onOk={mover} textoOk="Mover aquí" cargando={moviendo} deshabilitado={mismaCarpeta} />
      </div>
    </ModalBase>
  );
}

// ── File/folder card ──────────────────────────────────────────────────────────

interface ItemCardProps {
  item: FsItem;
  view: "grid" | "list";
  onOpen: (item: FsItem) => void;
  onAction: (action: Accion, item: FsItem) => void;
  onContext: (e: React.MouseEvent, item: FsItem) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}

function ItemCard({ item, view, onOpen, onAction, onContext, selected, onSelect }: ItemCardProps) {
  const meta = FILE_META[item.type];
  const esCarpeta = item.type === "folder";

  if (view === "list") {
    return (
      <div
        className="flex items-center gap-4 px-5 py-3 transition-colors duration-100 cursor-pointer group"
        style={{ background: selected ? "#F0F9FF" : "transparent", borderBottom: "1px solid #F8FAFC" }}
        onClick={() => esCarpeta ? onOpen(item) : onSelect(item.id)}
        onDoubleClick={() => !esCarpeta && onOpen(item)}
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
          {esCarpeta ? <NavIcon id="folder" size={18} /> : <span>{meta.emoji}</span>}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }} title={item.name}>{item.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{item.label}</span>
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
          {(esCarpeta ? (["more"] as const) : (["download", "more"] as const)).map((act) => (
            <button
              key={act}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#94A3B8" }}
              title={act === "download" ? "Descargar" : "Más opciones"}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#334155"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
              onClick={(e) => { e.stopPropagation(); act === "more" ? onContext(e, item) : onAction("download", item); }}
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
      onClick={() => esCarpeta ? onOpen(item) : onSelect(item.id)}
      onDoubleClick={() => !esCarpeta && onOpen(item)}
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

      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: meta.bg, color: meta.color }}
      >
        {esCarpeta ? <NavIcon id="folder" size={24} /> : <span>{meta.emoji}</span>}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#0F172A" }} title={item.name}>{item.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
          {item.size ?? "Carpeta"}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.color }}>{item.label}</span>
        <span className="text-[10px]" style={{ color: "#CBD5E1" }}>{item.modified.split(",")[0]}</span>
      </div>
    </div>
  );
}

// ── Storage indicator (bottom bar) ────────────────────────────────────────────

function StorageBar() {
  const { pct, disponibleBytes, cuotaBytes } = useAlmacenamiento();
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
              style={{ width: `${pct}%`, background: pct >= 90 ? "#FF6B6B" : "linear-gradient(90deg,#2E9BFF,#00D1C1)" }}
            />
          </div>
          <span className="text-[10px] font-bold" style={{ color: "#334155" }}>{pct}%</span>
        </div>
        <p className="text-[10px]" style={{ color: "#94A3B8" }}>
          {cuotaBytes ? (
            <><span className="font-semibold" style={{ color: "#0F172A" }}>{formatoBytes(disponibleBytes)}</span> disponibles</>
          ) : (
            "Sin plan activo"
          )}
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

type Modal =
  | { tipo: "upload" }
  | { tipo: "newFolder" }
  | { tipo: "rename" | "move" | "delete"; item: FsItem }
  | null;

type Aviso = { texto: string; tono: "ok" | "error" };

export default function FileExplorer({ onLogout, onDashboard, onPlans, onPayments, onConsumption }: FileExplorerProps) {
  const { recargarUsuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const idCarpeta = params.get("carpeta");

  // Datos de la API
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [ruta, setRuta] = useState<RutaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // se incrementa para volver a pedir el listado

  // Estado de la vista
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [notification, setNotification] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  function showNotif(texto: string, tono: Aviso["tono"] = "ok") {
    clearTimeout(temporizador.current);
    setNotification({ texto, tono });
    temporizador.current = setTimeout(() => setNotification(null), tono === "error" ? 4500 : 2800);
  }

  // Carga del contenido de la carpeta actual (y de su ruta para el breadcrumb)
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setErrorCarga(null);
    Promise.all([
      almacenamientoApi.listarCarpetas(idCarpeta),
      almacenamientoApi.listarArchivos(idCarpeta),
      idCarpeta ? almacenamientoApi.ruta(idCarpeta) : Promise.resolve([]),
    ])
      .then(([c, a, r]) => {
        if (!vivo) return;
        setCarpetas(c);
        setArchivos(a);
        setRuta(r);
      })
      .catch((e) => {
        if (!vivo) return;
        if (e.status === 404 && idCarpeta) {
          showNotif("La carpeta no existe o fue eliminada.", "error");
          setParams({}, { replace: true });
        } else {
          setErrorCarga(e.message);
        }
      })
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [idCarpeta, version]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const recargar = () => setVersion((v) => v + 1);
  const actualizarEspacio = () => recargarUsuario().catch(() => undefined);

  const items: FsItem[] = [...carpetas.map(aItemCarpeta), ...archivos.map(aItemArchivo)];
  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    // Folders first always
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    if (sortBy === "name") return a.name.localeCompare(b.name, "es", { numeric: true });
    if (sortBy === "size") return b.bytes - a.bytes;
    return b.fecha.localeCompare(a.fecha); // más recientes primero
  });

  const nombreActual = ruta[ruta.length - 1]?.nombre ?? "Mis archivos";
  const breadcrumbs = [{ id: null as string | null, nombre: "Mis archivos" }, ...ruta.map((r) => ({ id: r.id_carpeta, nombre: r.nombre }))];

  function irA(id: string | null) {
    setParams(id ? { carpeta: id } : {});
    setSelected(new Set());
    setSearch("");
  }

  function openItem(item: FsItem) {
    if (item.type === "folder") irA(item.id);
    else handleAction("download", item);
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const ns = new Set(s);
      ns.has(id) ? ns.delete(id) : ns.add(id);
      return ns;
    });
  }

  async function descargar(item: FsItem) {
    showNotif(`Descargando "${item.name}"…`);
    try {
      guardarBlob(await almacenamientoApi.descargar(item.id), item.name);
    } catch (e) {
      showNotif((e as Error).message, "error");
    }
  }

  function handleAction(action: Accion, item: FsItem) {
    if (action === "open") openItem(item);
    else if (action === "download") descargar(item);
    else setModal({ tipo: action, item });
  }

  function handleNav(id: string) {
    if (id === "dashboard") onDashboard();
    else if (id === "plans") onPlans();
    else if (id === "payments" && onPayments) onPayments();
    else if (id === "consumption" && onConsumption) onConsumption();
  }

  async function createFolder(name: string) {
    await almacenamientoApi.crearCarpeta(name, idCarpeta);
    recargar();
    showNotif(`Carpeta "${name}" creada.`);
  }

  async function renombrar(item: FsItem, nombre: string) {
    if (item.type === "folder") await almacenamientoApi.renombrarCarpeta(item.id, nombre);
    else await almacenamientoApi.renombrarArchivo(item.id, nombre);
    recargar();
    showNotif(`"${item.name}" ahora se llama "${nombre}".`);
  }

  async function mover(item: FsItem, idDestino: string | null, nombreDestino: string) {
    await almacenamientoApi.moverArchivo(item.id, idDestino);
    recargar();
    showNotif(`"${item.name}" movido a "${nombreDestino}".`);
  }

  async function eliminar(item: FsItem) {
    if (item.type === "folder") {
      await almacenamientoApi.eliminarCarpeta(item.id);
    } else {
      await almacenamientoApi.eliminarArchivo(item.id);
      actualizarEspacio();
    }
    setSelected((s) => { const ns = new Set(s); ns.delete(item.id); return ns; });
    recargar();
    showNotif(`"${item.name}" eliminado.`);
  }

  function handleUploaded(archivo: Archivo) {
    recargar();
    actualizarEspacio();
    showNotif(`"${archivo.nombre_original}" subido correctamente.`);
  }

  return (
    <>
      <AppShell
        activeNav="files"
        onNav={handleNav}
        onLogout={onLogout}
        onUpload={() => setModal({ tipo: "upload" })}
        headerTitle="Mis archivos"
        headerActions={
          <div className="flex items-center gap-2 mr-1">
            {/* Search (en la carpeta actual) */}
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }}>
                <NavIcon id="search" size={15} />
              </span>
              <input
                type="text"
                placeholder="Buscar en esta carpeta…"
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
                <span key={crumb.id ?? "raiz"} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 3l4 4-4 4" stroke="#CBD5E1" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <button
                    onClick={() => idx < breadcrumbs.length - 1 && irA(crumb.id)}
                    className="text-sm transition-colors duration-150 font-medium"
                    style={{ color: idx === breadcrumbs.length - 1 ? "#0F172A" : "#94A3B8" }}
                    onMouseEnter={(e) => { if (idx < breadcrumbs.length - 1) e.currentTarget.style.color = "#2E9BFF"; }}
                    onMouseLeave={(e) => { if (idx < breadcrumbs.length - 1) e.currentTarget.style.color = "#94A3B8"; }}
                  >
                    {idx === breadcrumbs.length - 1
                      ? <span className="font-bold" style={{ color: "#0F172A" }}>{crumb.nombre}</span>
                      : crumb.nombre}
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
                onClick={() => setModal({ tipo: "newFolder" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{ color: "#2E9BFF", border: "1.5px solid #2E9BFF", background: "white" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#E0F4FF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
              >
                <NavIcon id="folder-plus" size={14} />
                <span className="hidden sm:inline">Nueva carpeta</span>
              </button>

              <button
                onClick={() => setModal({ tipo: "upload" })}
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
            {cargando && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <svg className="animate-spin mb-4" width="28" height="28" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#E2E8F0" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="#2E9BFF" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="text-xs" style={{ color: "#94A3B8" }}>Cargando archivos…</p>
              </div>
            ) : errorCarga ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: "#DC2626" }}>No se pudo cargar el contenido</p>
                <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>{errorCarga}</p>
                <button
                  onClick={recargar}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ background: "#2E9BFF" }}
                >
                  Reintentar
                </button>
              </div>
            ) : sorted.length === 0 ? (
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
                    onAction={handleAction}
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
                  {["", "", "Nombre", "Tamaño", "Fecha", ""].map((h, i) => (
                    <span key={i} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#CBD5E1" }}>{h}</span>
                  ))}
                </div>
                {sorted.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    view="list"
                    onOpen={openItem}
                    onAction={handleAction}
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
      {modal?.tipo === "upload" && (
        <UploadModal idCarpeta={idCarpeta} destino={nombreActual} onClose={() => setModal(null)} onUploaded={handleUploaded} />
      )}
      {modal?.tipo === "newFolder" && (
        <NameModal
          titulo="Nueva carpeta" icono="folder-plus" color="#F59E0B" bg="#FFFBEB"
          etiqueta="Nombre de la carpeta" placeholder="Nueva carpeta" textoOk="Crear"
          onClose={() => setModal(null)} onSubmit={createFolder}
        />
      )}
      {modal?.tipo === "rename" && (
        <NameModal
          titulo={modal.item.type === "folder" ? "Renombrar carpeta" : "Renombrar archivo"}
          icono="edit" color="#2E9BFF" bg="#E0F4FF" etiqueta="Nuevo nombre" inicial={modal.item.name} textoOk="Guardar"
          onClose={() => setModal(null)} onSubmit={(nombre) => renombrar(modal.item, nombre)}
        />
      )}
      {modal?.tipo === "move" && (
        <MoveModal
          item={modal.item}
          onClose={() => setModal(null)}
          onMove={(id, nombre) => mover(modal.item, id, nombre)}
        />
      )}
      {modal?.tipo === "delete" && (
        <ConfirmDeleteModal item={modal.item} onClose={() => setModal(null)} onConfirm={() => eliminar(modal.item)} />
      )}

      {/* Storage indicator */}
      <StorageBar />

      {/* Toast notification */}
      {notification && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white"
          style={{ background: notification.tono === "error" ? "#7F1D1D" : "#0F172A", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.24)" }}
        >
          {notification.tono === "error" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="#FF6B6B" fillOpacity="0.3"/>
              <path d="M5 5l4 4M9 5l-4 4" stroke="#FF6B6B" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="#00C896" fillOpacity="0.3"/>
              <path d="M4 7l2 2 4-4" stroke="#00C896" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {notification.texto}
        </div>
      )}
    </>
  );
}
