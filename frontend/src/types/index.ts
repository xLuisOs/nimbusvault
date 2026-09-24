// Tipos que devuelve la API. Si cambian un schema en el backend, actualícenlo aquí.

export type Rol = "ADMINISTRADOR" | "CLIENTE" | "SOPORTE";

export interface SuscripcionResumen {
  id_suscripcion: string;
  plan_codigo: string;
  plan_nombre: string;
  almacenamiento_gb: number;
  precio_contratado: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: "activa" | "vencida" | "cancelada";
}

export interface Usuario {
  id_usuario: string;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: "pendiente" | "activo" | "suspendido";
  creado_en: string;
  almacenamiento_usado_bytes: number;
  suscripcion: SuscripcionResumen | null;
}

export interface TokenRespuesta {
  access_token: string;
  token_type: string;
  expira_en_segundos: number;
  usuario: Usuario;
}

export interface Plan {
  id_plan: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio_mensual: string; // en USD; decimal como texto para no perder precisión
  precio_anual_mensualizado: string;
  descuento_anual_pct: number;
  almacenamiento_gb: number;
  vigencia_dias: number;
  destacado: boolean;
  orden: number;
  color: string;
  activo: boolean;
  caracteristicas: string[];
}

export interface PlanAdmin extends Plan {
  suscriptores_activos: number;
}

export interface PlanFormulario {
  codigo?: string;
  nombre: string;
  descripcion: string;
  precio_mensual: string;
  almacenamiento_gb: number;
  vigencia_dias: number;
  descuento_anual_pct: number;
  destacado: boolean;
  orden: number;
  color: string;
  caracteristicas: string[];
}
