export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  username?: string | null;
  tipo: 'FINAL' | 'REVENDEDOR';
  estado: 'ACTIVO' | 'BANEADO';
  dias_gracia_max: number;
}

export interface EnlaceProveedor {
  id?: number;
  nombre: string;
  url: string;
}

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  saldo_a_favor: number;
  enlaces?: EnlaceProveedor[];
}

export interface Plataforma {
  id: number;
  nombre: string;
}

export interface Credencial {
  id: number;
  email: string;
  password?: string;
}

export interface Perfil {
  id: number;
  cuenta_madre_id: number;
  nombre_perfil: string;
  pin: string | null;
  asignado: boolean;
  reportado?: boolean;
}

export interface CuentaMadre {
  id: number;
  proveedor_id: number;
  credencial_id: number;
  plataforma_id: number;
  max_perfiles: number;
  precio_compra: number;
  fecha_compra: string;
  fecha_vencimiento: string;
  estado: 'ACTIVA' | 'CAIDA' | 'VENCIDA' | 'RENOVADA' | 'CANCELADA';
  notas?: string | null;
  perfiles: Perfil[];
  clave_plataforma?: string | null;
  proveedor?: Proveedor;
}

export interface VentaDetalle {
  id: number;
  venta_id: number;
  plataforma_id: number;
  combo_id: number | null;
  cuenta_madre_id: number;
  perfil_id: number;
  tipo_unidad?: 'PANTALLA' | 'CUENTA';
  precio_aplicado: number;
}

export interface Venta {
  id: number;
  cliente_id: number;
  fecha_inicio: string;
  fecha_corte: string;
  monto_total: number;
  estado_pago: 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADO';
  tipo_venta?: string;
  detalles: VentaDetalle[];
}

export interface VentaItem {
  plataforma_id: number;
  precio_original: number;
  precio_aplicado: number;
  tipo_unidad: 'PANTALLA' | 'CUENTA';
  is_edited: boolean;
  cuenta_madre_id: number | null;
}
