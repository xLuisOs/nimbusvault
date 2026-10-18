/** Entrega un Blob al usuario como descarga (archivos del explorador, comprobantes de pago). */
export function guardarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después: algunos navegadores todavía leen la URL tras el click
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Tipo de archivo (ícono y color), compartido por el explorador y el dashboard ──

export type ItemType = "folder" | "pdf" | "xls" | "ppt" | "img" | "doc" | "zip" | "mp4" | "mp3" | "file";

export const FILE_META: Record<ItemType, { color: string; bg: string; label: string; emoji: string }> = {
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

export function extension(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i > 0 ? nombre.slice(i + 1).toLowerCase() : "";
}

/** Ícono según el tipo MIME que guardó el backend o, si no dice mucho, según la extensión. */
export function tipoDeArchivo(mime: string, nombre: string): ItemType {
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
