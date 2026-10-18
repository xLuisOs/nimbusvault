import { useTema } from "@/utils/tema";

/** Botón del encabezado para pasar de claro a oscuro y viceversa (en Configuración está también "Sistema"). */
export default function BotonTema() {
  const { actual, cambiar } = useTema();
  const oscuro = actual === "oscuro";
  const titulo = oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  return (
    <button
      onClick={() => cambiar(oscuro ? "claro" : "oscuro")}
      title={titulo}
      aria-label={titulo}
      className="p-2 rounded-xl transition-colors duration-150"
      style={{ color: "var(--nv-text-3)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-muted)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {oscuro ? (
        // Sol
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Luna
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
