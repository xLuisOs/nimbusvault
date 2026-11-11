// Consola de soporte: busca clientes, consulta su plan y pagos, y les reenvía enlaces de acceso.
// Por privacidad no muestra archivos, y las acciones administrativas siguen siendo del administrador.
import { useEffect, useMemo, useState } from "react";

import { soporteApi } from "@/api/soporte";
import { AdminIcon } from "@/components/layout/AdminShell";
import type { Pago, UsuarioAdmin } from "@/types";
import { formatoBytes, formatoDolares, formatoFecha, haceCuanto, iniciales } from "@/utils/format";

const POR_PAGINA = 8;
const titulo = { color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" };
const tarjeta = { background: "var(--nv-surface)", border: "1px solid var(--nv-border)" };

const ESTADOS: Record<UsuarioAdmin["estado"], { texto: string; bg: string; color: string }> = {
  activo: { texto: "Activo", bg: "var(--nv-green-soft)", color: "var(--nv-green-strong)" },
  pendiente: { texto: "Pendiente", bg: "var(--nv-amber-soft)", color: "var(--nv-amber-strong)" },
  suspendido: { texto: "Suspendido", bg: "var(--nv-red-soft)", color: "var(--nv-red-strong)" },
};

function Estado({ estado }: { estado: UsuarioAdmin["estado"] }) {
  const e = ESTADOS[estado];
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: e.bg, color: e.color }}>
      {e.texto}
    </span>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-2xl p-4" style={tarjeta}>
      <p className="text-xs font-semibold" style={{ color: "var(--nv-text-3)" }}>{etiqueta}</p>
      <p className="text-2xl font-extrabold mt-1" style={titulo}>{valor}</p>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--nv-text-4)" }}>{etiqueta}</p>
      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--nv-text-1)" }}>{valor}</p>
    </div>
  );
}

function PagosCliente({ pagos, error }: { pagos: Pago[] | null; error: string }) {
  if (error) return <p className="text-xs font-semibold" style={{ color: "var(--nv-red-strong)" }}>{error}</p>;
  if (!pagos) return <p className="text-sm" style={{ color: "var(--nv-text-3)" }}>Cargando pagos…</p>;
  if (!pagos.length) return <p className="text-sm" style={{ color: "var(--nv-text-3)" }}>Este cliente todavía no tiene pagos.</p>;
  return (
    <div className="flex flex-col gap-2">
      {pagos.map((p) => (
        <div key={p.id_pago} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--nv-muted)" }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--nv-text-1)" }}>{p.plan_nombre} ({p.periodicidad})</p>
            <p className="text-xs truncate" style={{ color: "var(--nv-text-3)" }}>
              {p.numero_comprobante}{p.fecha_pago ? ` · ${formatoFecha(p.fecha_pago)}` : ""}
            </p>
          </div>
          <p className="text-sm font-bold flex-shrink-0" style={{ color: "var(--nv-text-1)" }}>{formatoDolares(p.monto)}</p>
        </div>
      ))}
    </div>
  );
}

function DetalleCliente({ cliente, onCerrar }: { cliente: UsuarioAdmin; onCerrar: () => void }) {
  const [pagos, setPagos] = useState<Pago[] | null>(null);
  const [errorPagos, setErrorPagos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    soporteApi.pagos(cliente.id_usuario)
      .then((p) => vivo && setPagos(p))
      .catch((e: Error) => vivo && setErrorPagos(e.message));
    return () => { vivo = false; };
  }, [cliente.id_usuario]);

  async function ejecutar(accion: () => Promise<{ mensaje: string }>) {
    setEnviando(true);
    setAviso(null);
    try {
      setAviso({ texto: (await accion()).mensaje });
    } catch (e) {
      setAviso({ texto: (e as Error).message, error: true });
    } finally {
      setEnviando(false);
    }
  }

  const porcentaje = cliente.cuota_bytes
    ? Math.min(100, Math.round((cliente.almacenamiento_usado_bytes / cliente.cuota_bytes) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: "var(--nv-surface)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <div className="flex items-start justify-between gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
          <div className="min-w-0">
            <h3 className="font-extrabold truncate" style={titulo}>{cliente.nombre}</h3>
            <p className="text-xs truncate" style={{ color: "var(--nv-text-3)" }}>{cliente.correo}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: "var(--nv-text-4)" }} aria-label="Cerrar">
            <AdminIcon id="x" size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--nv-text-4)" }}>Estado</p>
              <Estado estado={cliente.estado} />
            </div>
            <Dato etiqueta="Plan" valor={cliente.plan ?? "Sin plan"} />
            <Dato etiqueta="Registro" valor={formatoFecha(cliente.creado_en)} />
            <Dato etiqueta="Último acceso" valor={cliente.ultimo_acceso ? haceCuanto(cliente.ultimo_acceso) : "Sin accesos"} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--nv-text-3)" }}>
              <span>Espacio usado</span>
              <span>{formatoBytes(cliente.almacenamiento_usado_bytes)} de {formatoBytes(cliente.cuota_bytes)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--nv-muted)" }}>
              <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: "linear-gradient(90deg, #2E9BFF, #00D1C1)" }} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-2" style={titulo}>Pagos</h4>
            <PagosCliente pagos={pagos} error={errorPagos} />
          </div>

          <div className="flex flex-col gap-2">
            {cliente.estado === "pendiente" && (
              <button
                disabled={enviando}
                onClick={() => ejecutar(() => soporteApi.reenviarVerificacion(cliente.id_usuario))}
                className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#2E9BFF" }}
              >
                {enviando ? "Enviando…" : "Reenviar verificación"}
              </button>
            )}
            {cliente.estado === "activo" && (
              <button
                disabled={enviando}
                onClick={() => ejecutar(() => soporteApi.enviarRecuperacion(cliente.id_usuario))}
                className="py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "#2E9BFF" }}
              >
                {enviando ? "Enviando…" : "Enviar enlace para restablecer contraseña"}
              </button>
            )}
            {cliente.estado === "suspendido" && (
              <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: "var(--nv-amber-soft)", color: "var(--nv-amber-strong)" }}>
                Solo un administrador puede reactivar esta cuenta.
              </p>
            )}
            {aviso && (
              <p className="text-xs font-semibold" style={{ color: aviso.error ? "var(--nv-red-strong)" : "var(--nv-green-strong)" }}>
                {aviso.texto}
              </p>
            )}
            <p className="text-xs" style={{ color: "var(--nv-text-4)" }}>
              Por privacidad, Soporte no puede ver ni descargar los archivos del cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SoporteClientes() {
  const [clientes, setClientes] = useState<UsuarioAdmin[] | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    soporteApi.clientes().then(setClientes).catch((e: Error) => setError(e.message));
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (clientes ?? []).filter(
      (c) => (!estado || c.estado === estado) && (!q || c.nombre.toLowerCase().includes(q) || c.correo.toLowerCase().includes(q)),
    );
  }, [clientes, busqueda, estado]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const contar = (e: UsuarioAdmin["estado"]) => (clientes ?? []).filter((c) => c.estado === e).length;

  if (error) {
    return <p className="text-sm font-semibold text-center py-16" style={{ color: "var(--nv-red-strong)" }}>{error}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-extrabold" style={titulo}>Atención a clientes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nv-text-3)" }}>Consulta el estado de una cuenta y ayuda al cliente a recuperar el acceso.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Indicador etiqueta="Clientes" valor={clientes?.length ?? 0} />
        <Indicador etiqueta="Activos" valor={contar("activo")} />
        <Indicador etiqueta="Pendientes" valor={contar("pendiente")} />
        <Indicador etiqueta="Suspendidos" valor={contar("suspendido")} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={tarjeta}>
          <span style={{ color: "var(--nv-text-4)" }}><AdminIcon id="search" size={16} /></span>
          <input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar cliente"
            className="flex-1 min-w-0 text-sm outline-none bg-transparent"
            style={{ color: "var(--nv-text-1)" }}
          />
        </div>
        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1); }}
          aria-label="Filtrar por estado"
          className="text-sm px-3 py-2.5 rounded-xl outline-none"
          style={{ ...tarjeta, color: "var(--nv-text-1)" }}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pendiente">Pendientes</option>
          <option value="suspendido">Suspendidos</option>
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden" style={tarjeta}>
        {!clientes ? (
          <p className="text-sm text-center py-12" style={{ color: "var(--nv-text-3)" }}>Cargando clientes…</p>
        ) : !visibles.length ? (
          <p className="text-sm text-center py-12" style={{ color: "var(--nv-text-3)" }}>No hay clientes con esos filtros.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide" style={{ color: "var(--nv-text-4)", borderBottom: "1px solid var(--nv-border)" }}>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold hidden sm:table-cell">Plan</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold hidden md:table-cell">Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr
                  key={c.id_usuario}
                  onClick={() => setSeleccionado(c)}
                  className="cursor-pointer transition-colors hover:bg-[var(--nv-muted)]"
                  style={{ borderBottom: "1px solid var(--nv-muted)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #2E9BFF, #00D1C1)" }}
                      >
                        {iniciales(c.nombre)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--nv-text-1)" }}>{c.nombre}</p>
                        <p className="text-xs truncate" style={{ color: "var(--nv-text-3)" }}>{c.correo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden sm:table-cell" style={{ color: "var(--nv-text-2)" }}>{c.plan ?? "—"}</td>
                  <td className="px-4 py-3"><Estado estado={c.estado} /></td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell" style={{ color: "var(--nv-text-3)" }}>
                    {c.ultimo_acceso ? haceCuanto(c.ultimo_acceso) : "Sin accesos"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm" style={{ color: "var(--nv-text-3)" }}>
          <button disabled={paginaActual === 1} onClick={() => setPagina(paginaActual - 1)} className="px-3 py-1.5 rounded-lg disabled:opacity-40" style={tarjeta}>Anterior</button>
          <span>Página {paginaActual} de {totalPaginas}</span>
          <button disabled={paginaActual === totalPaginas} onClick={() => setPagina(paginaActual + 1)} className="px-3 py-1.5 rounded-lg disabled:opacity-40" style={tarjeta}>Siguiente</button>
        </div>
      )}

      {seleccionado && <DetalleCliente cliente={seleccionado} onCerrar={() => setSeleccionado(null)} />}
    </div>
  );
}
