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
