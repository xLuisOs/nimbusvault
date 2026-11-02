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

// ── Almacenamiento (explorador de archivos) ──────────────────────────────────

export interface Carpeta {
  id_carpeta: string;
  id_carpeta_padre: string | null;
  nombre: string;
  creado_en: string;
}

export interface Archivo {
  id_archivo: string;
  id_carpeta: string | null;
  nombre_original: string;
  tipo_mime: string;
  tamano_bytes: number;
  creado_en: string;
}

/** Un eslabón del breadcrumb, de la raíz hacia la carpeta actual. */
export interface RutaItem {
  id_carpeta: string;
  nombre: string;
}

export interface UsoAlmacenamiento {
  plan: string;
  usado_bytes: number;
  cuota_bytes: number;
  disponible_bytes: number;
  porcentaje: number;
}

// ── Pagos (simulados) ────────────────────────────────────────────────────────

export interface Pago {
  id_pago: string;
  numero_comprobante: string;
  tipo: "contratacion" | "renovacion";
  monto: string; // USD; decimal como texto
  estado: "pendiente" | "aprobado" | "rechazado";
  fecha_pago: string | null;
  plan_codigo: string;
  plan_nombre: string;
  periodicidad: "mensual" | "anual";
  vigencia_inicio: string;
  vigencia_fin: string;
  marca_tarjeta: "visa" | "mastercard" | "amex" | "otra" | null;
  ultimos_4: string | null;
}

export interface TarjetaSimulada {
  numero: string;
  titular: string;
  vencimiento: string; // MM/AA
  cvv: string;
}

// ── Resumen del cliente (dashboard y consumo) ────────────────────────────────

export type TipoEvento = "subida" | "descarga" | "eliminacion" | "carpeta" | "pago";

export interface Evento {
  tipo: TipoEvento;
  descripcion: string;
  tamano_bytes: number;
  creado_en: string;
}

export interface ArchivoReciente extends Archivo {
  carpeta: string | null;
}

export interface ResumenEspacio {
  archivos: number;
  carpetas: number;
  usado_bytes: number;
  cuota_bytes: number;
  por_categoria: { categoria: string; etiqueta: string; bytes: number; archivos: number }[];
  recientes: ArchivoReciente[];
  actividad: Evento[];
  este_mes: {
    subidas: number;
    descargas: number;
    subidas_mes_anterior: number;
    descargas_mes_anterior: number;
    bytes_eliminados: number;
  };
  tendencia: { dia: string; subidas: number; descargas: number }[]; // dia = AAAA-MM-DD
  crecimiento: { mes: string; bytes: number }[]; // mes = AAAA-MM
}

// ── Panel administrativo ─────────────────────────────────────────────────────

export interface ResumenAdmin {
  kpis: {
    clientes_activos: number;
    clientes_nuevos_mes: number;
    clientes_nuevos_mes_anterior: number;
    almacenamiento_usado_bytes: number;
    cuota_contratada_bytes: number;
    ingresos_mes: string;
    ingresos_mes_anterior: string;
    suscripciones_pagadas: number;
    suscripciones_activas: number;
  };
  crecimiento: { mes: string; clientes: number }[];
  distribucion: { plan: string; color: string; suscripciones: number }[];
  ultimas_suscripciones: {
    nombre: string;
    correo: string;
    plan: string;
    color: string;
    periodicidad: "mensual" | "anual";
    precio_contratado: string;
    fecha_inicio: string;
    estado: "activa" | "vencida" | "cancelada";
    estado_usuario: Usuario["estado"];
  }[];
}

export interface UsuarioAdmin {
  id_usuario: string;
  nombre: string;
  correo: string;
  rol: Rol;
  estado: Usuario["estado"];
  plan: string | null;
  almacenamiento_usado_bytes: number;
  cuota_bytes: number;
  creado_en: string;
  ultimo_acceso: string | null;
}

export interface InfraAdmin {
  componentes: {
    id: string;
    nombre: string;
    estado: "operativo" | "advertencia" | "error";
    metrica: string;
    metrica_etiqueta: string;
    detalle: string;
  }[];
  alertas: { severidad: "alta" | "media" | "baja"; titulo: string; componente: string }[];
  historial_almacenamiento: { dia: string; bytes: number }[];
  cuota_contratada_bytes: number;
  actividad: {
    subidas: number;
    descargas: number;
    bytes_subidos: number;
    sesiones_activas: number;
    usuarios_con_acceso_hoy: number;
    archivos_almacenados: number;
  };
  en_linea_desde: string;
  entorno: string;
  version: string;
}
