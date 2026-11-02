// Tema claro / oscuro. Se guarda en este navegador y se aplica como <html data-tema="...">;
// los colores salen de las variables --nv-* de index.css.
import { useEffect, useState } from "react";

export type PreferenciaTema = "claro" | "oscuro" | "sistema";

const CLAVE = "nv-tema";
const consultaOscuro = () => window.matchMedia("(prefers-color-scheme: dark)");

export function leerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE);
    if (v === "claro" || v === "oscuro" || v === "sistema") return v;
  } catch { /* navegación privada o almacenamiento bloqueado */ }
  return "claro";
}

function resolver(p: PreferenciaTema): "claro" | "oscuro" {
  return p === "sistema" ? (consultaOscuro().matches ? "oscuro" : "claro") : p;
}

function aplicar(p: PreferenciaTema) {
  const raiz = document.documentElement;
  // Sin transiciones durante el cambio: si no, los elementos con transition-colors se quedan a medias
  // (sobre todo en pestañas en segundo plano) y el cambio se ve escalonado.
  raiz.classList.add("nv-cambiando-tema");
  raiz.dataset.tema = resolver(p);
  void raiz.offsetHeight; // fuerza a calcular los estilos nuevos ya, sin transición
  raiz.classList.remove("nv-cambiando-tema");
}

/** Se llama una vez al arrancar (main.tsx), antes de pintar, para que no parpadee el tema claro. */
export function iniciarTema() {
  aplicar(leerPreferencia());
  // En "sistema", seguir al sistema operativo si cambia mientras la app está abierta
  consultaOscuro().addEventListener("change", () => {
    if (leerPreferencia() === "sistema") aplicar("sistema");
  });
}

const oyentes = new Set<(p: PreferenciaTema) => void>();

export function guardarPreferencia(p: PreferenciaTema) {
  try { localStorage.setItem(CLAVE, p); } catch { /* se aplica igual, solo no se recuerda */ }
  aplicar(p);
  oyentes.forEach((f) => f(p));
}

/** Preferencia actual y el tema que de verdad se está viendo; se actualiza si cambia en otra pantalla. */
export function useTema() {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(leerPreferencia);
  useEffect(() => {
    oyentes.add(setPreferencia);
    return () => { oyentes.delete(setPreferencia); };
  }, []);
  return { preferencia, actual: resolver(preferencia), cambiar: guardarPreferencia };
}
