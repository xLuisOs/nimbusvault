import { useEffect, useState } from "react";
import AdminShell, { AdminNavId, AdminIcon } from "@/components/layout/AdminShell";
import { planesApi } from "@/api/planes";
import type { PlanAdmin, PlanFormulario } from "@/types";
import { formatoGB, formatoDolares } from "@/utils/format";

// ── Data ───────────────────────────────────────────────────────────────────────
// Los planes vienen de GET /api/admin/planes (solo administrador).

interface Plan {
  id: string;
  name: string;
  desc: string;
  price: string;
  gbLabel: string;
  subs: number;
  status: "Activo" | "Inactivo";
  color: string;
  vigencia: string;
  raw: PlanAdmin;
}

function aVista(p: PlanAdmin): Plan {
  const precio = Number(p.precio_mensual);
  return {
    id: p.id_plan,
    name: p.nombre,
    desc: p.descripcion,
    price: precio === 0 ? "Gratis" : `${formatoDolares(precio)}/mes`,
    gbLabel: formatoGB(p.almacenamiento_gb),
    subs: p.suscriptores_activos,
    status: p.activo ? "Activo" : "Inactivo",
    color: p.color,
    vigencia: VIGENCIAS[p.vigencia_dias] ?? `${p.vigencia_dias} días`,
    raw: p,
  };
}

const VIGENCIAS: Record<number, string> = { 30: "Mensual", 90: "Trimestral", 365: "Anual" };

interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  plan?: Plan;
}

function aCodigo(nombre: string) {
  return nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Activo" | "Inactivo" }) {
  const active = status === "Activo";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: active ? "var(--nv-green-soft)" : "var(--nv-muted)", color: active ? "#00C896" : "var(--nv-text-4)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#00C896" : "var(--nv-text-4)" }} />
      {status}
    </span>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

interface PlanModalProps {
  modalState: ModalState;
  onClose: () => void;
  onSave: (data: PlanFormulario) => Promise<void>;
}

function PlanModal({ modalState, onClose, onSave }: PlanModalProps) {
  const raw = modalState.plan?.raw;
  const initial = { name: raw?.nombre ?? "" };
  const [form, setForm] = useState({
    name:     raw?.nombre ?? "",
    desc:     raw?.descripcion ?? "",
    price:    raw ? String(Number(raw.precio_mensual)) : "",
    gb:       raw ? String(raw.almacenamiento_gb) : "",
    vigencia: String(raw?.vigencia_dias ?? 30),
    features: raw?.caracteristicas.join("\n") ?? "",
    destacado: raw?.destacado ? "si" : "no",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await onSave({
        codigo: raw ? undefined : aCodigo(form.name),
        nombre: form.name.trim(),
        descripcion: form.desc.trim() || form.name.trim(),
        precio_mensual: Number(form.price || 0).toFixed(2),
        almacenamiento_gb: Number(form.gb),
        vigencia_dias: Number(form.vigencia),
        descuento_anual_pct: raw?.descuento_anual_pct ?? 20,
        destacado: form.destacado === "si",
        orden: raw?.orden ?? 99,
        color: raw?.color ?? "#2E9BFF",
        caracteristicas: form.features.split("\n").map((f) => f.trim()).filter(Boolean),
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const title = modalState.mode === "create" ? "Nuevo plan" : `Editar plan — ${initial.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "var(--nv-surface)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
          <h3 className="font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--nv-text-4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--nv-muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <AdminIcon id="x" size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--nv-red-soft)", color: "var(--nv-red-strong)" }}>
              {error}
            </div>
          )}
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Nombre del plan</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Pro Plus"
              className="px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
              onBlur={(e) => (e.target.style.borderColor = "var(--nv-border)")}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Descripción</label>
            <textarea
              value={form.desc}
              onChange={(e) => set("desc")(e.target.value)}
              placeholder="Describe brevemente qué incluye este plan…"
              rows={2}
              className="px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
              onBlur={(e) => (e.target.style.borderColor = "var(--nv-border)")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Precio mensual (USD)</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => set("price")(e.target.value)}
                placeholder="9.00"
                className="px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
                onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
                onBlur={(e) => (e.target.style.borderColor = "var(--nv-border)")}
              />
            </div>

            {/* GB */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Almacenamiento (GB)</label>
              <input
                required
                type="number"
                min={1}
                value={form.gb}
                onChange={(e) => set("gb")(e.target.value)}
                placeholder="100"
                className="px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
                onFocus={(e) => (e.target.style.borderColor = "#2E9BFF")}
                onBlur={(e) => (e.target.style.borderColor = "var(--nv-border)")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Vigencia */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Vigencia</label>
              <select
                value={form.vigencia}
                onChange={(e) => set("vigencia")(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
              >
                <option value="30">Mensual (30 días)</option>
                <option value="90">Trimestral (90 días)</option>
                <option value="365">Anual (365 días)</option>
              </select>
            </div>

            {/* Destacado */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>¿Plan recomendado?</label>
              <select
                value={form.destacado}
                onChange={(e) => set("destacado")(e.target.value)}
                className="px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
              >
                <option value="no">No</option>
                <option value="si">Sí, mostrar "Más popular"</option>
              </select>
            </div>
          </div>

          {/* Características */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--nv-text-2)" }}>Características (una por línea)</label>
            <textarea
              value={form.features}
              onChange={(e) => set("features")(e.target.value)}
              placeholder={"100 GB de almacenamiento\nSoporte prioritario"}
              rows={4}
              className="px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ border: "1.5px solid var(--nv-border)", color: "var(--nv-text-1)" }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--nv-muted)", color: "var(--nv-text-3)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#2E9BFF", boxShadow: "0 2px 12px rgba(46,155,255,0.28)" }}
            >
              {guardando ? "Guardando…" : modalState.mode === "create" ? "Crear plan" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface AdminPlansProps {
  onNav: (id: AdminNavId) => void;
  onLogout: () => void;
}

export default function AdminPlans({ onNav, onLogout }: AdminPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create" });
  const [notif, setNotif] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");

  async function cargar() {
    try {
      setPlans((await planesApi.listarAdmin()).map(aVista));
      setErrorGeneral("");
    } catch (err: any) {
      setErrorGeneral(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function showNotif(msg: string) {
    setNotif(msg);
    setTimeout(() => setNotif(""), 2800);
  }

  function openCreate() { setModal({ open: true, mode: "create" }); }
  function openEdit(plan: Plan) { setModal({ open: true, mode: "edit", plan }); }

  async function handleSave(data: PlanFormulario) {
    if (modal.mode === "create") {
      await planesApi.crear(data);
      showNotif("Plan creado exitosamente.");
    } else if (modal.plan) {
      await planesApi.actualizar(modal.plan.id, data);
      showNotif("Plan actualizado exitosamente.");
    }
    await cargar();
  }

  async function toggleStatus(id: string) {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    try {
      await planesApi.cambiarEstado(id, plan.status !== "Activo");
      showNotif("Estado del plan actualizado.");
      await cargar();
    } catch (err: any) {
      setErrorGeneral(err.message);
    }
  }

  async function deletePlan(id: string) {
    try {
      await planesApi.eliminar(id);
      showNotif("Plan eliminado.");
      await cargar();
    } catch (err: any) {
      setErrorGeneral(err.message);
    }
  }

  return (
    <AdminShell
      activeNav="planes"
      onNav={onNav}
      onLogout={onLogout}
      title="Planes"
      headerRight={
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-150"
          style={{ background: "#2E9BFF", boxShadow: "0 2px 12px rgba(46,155,255,0.28)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1E6BD6")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2E9BFF")}
        >
          <AdminIcon id="plus" size={16} />
          Nuevo plan
        </button>
      }
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-5">

        {errorGeneral && (
          <div className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--nv-red-soft)", color: "var(--nv-red-strong)", border: "1px solid var(--nv-red-border)" }}>
            {errorGeneral}
          </div>
        )}
        {cargando && <p className="text-sm" style={{ color: "var(--nv-text-4)" }}>Cargando planes…</p>}

        {notif && (
          <div className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ background: "var(--nv-green-soft)", color: "var(--nv-green-strong)", border: "1px solid var(--nv-green-border)" }}>
            <AdminIcon id="check" size={16} />{notif}
          </div>
        )}

        {/* Plan cards grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--nv-surface)", border: `1px solid var(--nv-border)` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold text-white"
                  style={{ background: plan.color }}
                >
                  {plan.name.slice(0, 2).toUpperCase()}
                </div>
                <StatusBadge status={plan.status} />
              </div>

              {/* Name + price */}
              <div>
                <h3
                  className="text-base font-extrabold"
                  style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {plan.name}
                </h3>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--nv-text-3)" }}>{plan.desc}</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Precio",  value: plan.price    },
                  { label: "Espacio", value: plan.gbLabel  },
                  { label: "Suscriptores", value: plan.subs.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-2 text-center" style={{ background: "var(--nv-bg)" }}>
                    <p className="text-xs font-extrabold leading-tight" style={{ color: plan.color, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {value}
                    </p>
                    <p className="text-[9px] font-semibold mt-0.5" style={{ color: "var(--nv-text-4)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Vigencia tag */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: plan.color + "18", color: plan.color }}>
                  {plan.vigencia}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid var(--nv-muted)" }}>
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--nv-muted)", color: "var(--nv-text-2)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-blue-soft)"; e.currentTarget.style.color = "#2E9BFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--nv-muted)"; e.currentTarget.style.color = "var(--nv-text-2)"; }}
                >
                  <AdminIcon id="edit" size={13} />
                  Editar
                </button>
                <button
                  onClick={() => toggleStatus(plan.id)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: plan.status === "Activo" ? "var(--nv-amber-soft)" : "var(--nv-green-soft)",
                    color: plan.status === "Activo" ? "var(--nv-amber-strong)" : "var(--nv-green-strong)",
                  }}
                  title={plan.status === "Activo" ? "Desactivar" : "Activar"}
                >
                  <AdminIcon id="toggle" size={13} />
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--nv-muted)", color: "var(--nv-text-4)" }}
                  title="Eliminar"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-red-soft)"; e.currentTarget.style.color = "#FF6B6B"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--nv-muted)"; e.currentTarget.style.color = "var(--nv-text-4)"; }}
                >
                  <AdminIcon id="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Plans table (alternate view) */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--nv-surface)", border: "1px solid var(--nv-border)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--nv-muted)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--nv-text-4)" }}>Vista completa</p>
            <h3 className="text-sm font-extrabold" style={{ color: "var(--nv-text-1)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Todos los planes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nv-muted)" }}>
                  {["Plan", "Precio", "Almacenamiento", "Suscriptores", "Vigencia", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--nv-text-4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, i) => (
                  <tr
                    key={plan.id}
                    style={{ borderBottom: i < plans.length - 1 ? "1px solid var(--nv-bg)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--nv-bg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white" style={{ background: plan.color }}>
                          {plan.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: "var(--nv-text-1)" }}>{plan.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold" style={{ color: plan.color }}>{plan.price}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--nv-text-2)" }}>{plan.gbLabel}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold" style={{ color: "var(--nv-text-2)" }}>{plan.subs.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: plan.color + "18", color: plan.color }}>{plan.vigencia}</span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={plan.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(plan)}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--nv-text-4)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-blue-soft)"; e.currentTarget.style.color = "#2E9BFF"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--nv-text-4)"; }}>
                          <AdminIcon id="edit" size={15} />
                        </button>
                        <button onClick={() => deletePlan(plan.id)}
                          className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--nv-text-4)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nv-red-soft)"; e.currentTarget.style.color = "#FF6B6B"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--nv-text-4)"; }}>
                          <AdminIcon id="trash" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {modal.open && (
        <PlanModal modalState={modal} onClose={() => setModal({ open: false, mode: "create" })} onSave={handleSave} />
      )}
    </AdminShell>
  );
}
