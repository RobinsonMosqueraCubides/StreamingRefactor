import { useState } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { 
  ChevronDown, ChevronUp, Database, Calendar, DollarSign, RefreshCw, AlertTriangle, KeyRound, Eye, EyeOff
} from 'lucide-react';

interface CuentaMadre {
  id: number;
  proveedor_id: number;
  credencial_id: number;
  plataforma_id: number;
  max_perfiles: number;
  precio_compra: number;
  fecha_compra: string;
  fecha_vencimiento: string;
  estado: 'ACTIVA' | 'CAIDA' | 'VENCIDA' | 'RENOVADA';
  perfiles: any[];
}

interface Proveedor {
  id: number;
  nombre: string;
  telefono: string;
  saldo_a_favor: number;
}

interface Plataforma {
  id: number;
  nombre: string;
}

interface Credencial {
  id: number;
  email: string;
  password?: string; // Optional if we fetch details
}

interface CuentasTabProps {
  cuentas: CuentaMadre[];
  proveedores: Proveedor[];
  plataformas: Plataforma[];
  credenciales: Credencial[];
  expandedCuentaId: number | null;
  onToggleExpand: (id: number) => void;
  onOpenProvGarantia: (cuenta: CuentaMadre) => void;
  onOpenRenew: (cuenta: CuentaMadre) => void;
}

export default function CuentasTab({
  cuentas,
  proveedores,
  plataformas,
  credenciales,
  expandedCuentaId,
  onToggleExpand,
  onOpenProvGarantia,
  onOpenRenew
}: CuentasTabProps) {
  const [vencimientoFilter, setVencimientoFilter] = useState<'todas' | 'por_vencer'>('todas');
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({});

  const getProveedorName = (provId: number) => {
    return proveedores.find(p => p.id === provId)?.nombre || `Proveedor #${provId}`;
  };

  const getPlataformaName = (platId: number) => {
    return plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
  };

  const getCredencialEmail = (credId: number) => {
    return credenciales.find(c => c.id === credId)?.email || 'N/A';
  };

  const getCredencialPassword = (credId: number) => {
    return credenciales.find(c => c.id === credId)?.password || 'N/A';
  };

  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getEstadoBadgeColor = (estado: string) => {
    if (estado === 'ACTIVA') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (estado === 'RENOVADA') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (estado === 'VENCIDA') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  // Filter accounts
  const filteredCuentas = cuentas.filter(c => {
    if (vencimientoFilter === 'por_vencer') {
      const days = getDaysDiff(c.fecha_vencimiento);
      return days <= 5 && c.estado === 'ACTIVA';
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controles de Filtros */}
      <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        <div>
          <h2 className="text-sm font-bold text-slate-200">Listado de Cuentas Madre</h2>
          <p className="text-xs text-slate-500">Maneja accesos, perfiles de streaming e inventario general.</p>
        </div>
        <div className="w-56">
          <Select
            value={vencimientoFilter}
            onChange={(e) => setVencimientoFilter(e.target.value as any)}
          >
            <option value="todas">Todos los Inventarios</option>
            <option value="por_vencer">Por vencer en 5 días o menos</option>
          </Select>
        </div>
      </div>

      {filteredCuentas.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-semibold text-sm">No se encontraron cuentas madre registradas</p>
          <p className="text-xs">Modifica el filtro o añade una nueva cuenta madre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCuentas.map((cuenta) => {
            const isExpanded = expandedCuentaId === cuenta.id;
            const diffDays = getDaysDiff(cuenta.fecha_vencimiento);
            const totalPerfiles = cuenta.perfiles?.length || 0;
            const asignadosCount = cuenta.perfiles?.filter(p => p.asignado)?.length || 0;
            const credEmail = getCredencialEmail(cuenta.credencial_id);
            const credPassword = getCredencialPassword(cuenta.credencial_id);

            return (
              <div 
                key={cuenta.id} 
                className="bg-slate-950/40 border border-slate-850 rounded-xl overflow-hidden transition-all duration-200"
              >
                {/* Header Acordeón */}
                <div 
                  onClick={() => onToggleExpand(cuenta.id)}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 cursor-pointer hover:bg-slate-800/10"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      {getPlataformaName(cuenta.plataforma_id)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono select-all bg-slate-950/40 px-2 py-0.5 rounded border border-slate-850 inline-block">{credEmail}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Proveedor: <strong>{getProveedorName(cuenta.proveedor_id)}</strong></p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEstadoBadgeColor(cuenta.estado)}`}>
                        {cuenta.estado}
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-end">
                        <Calendar className="w-3.5 h-3.5" /> Vence: {cuenta.fecha_vencimiento}
                      </p>
                      <span className={`text-[10px] font-semibold ${
                        diffDays <= 0 ? 'text-rose-400 font-bold' : diffDays <= 5 ? 'text-amber-400 font-bold' : 'text-slate-500'
                      }`}>
                        {diffDays <= 0 ? 'Vencida' : `Faltan ${diffDays} días`}
                      </span>
                    </div>

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>

                {/* Body Acordeón */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/20 border-t border-slate-850 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Detalles financieros / stock */}
                      <Card className="bg-slate-900/40 p-3 space-y-2 border-slate-850">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles de Costo</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <DollarSign className="w-4 h-4 text-cyan-400" /> Precio Compra: <strong>${cuenta.precio_compra.toLocaleString('es-CO')} COP</strong>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          <Database className="w-4 h-4 text-cyan-400" /> Perfiles Asignados: <strong>{asignadosCount} / {totalPerfiles}</strong>
                        </div>
                      </Card>

                      {/* Credenciales de Acceso con toggle de show/hide */}
                      <Card className="bg-slate-900/40 p-3 space-y-2 border-slate-850">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> Credenciales Acceso
                        </h4>
                        <p className="text-xs text-slate-300 truncate">Usuario: <strong className="font-mono">{credEmail}</strong></p>
                        <div className="text-xs text-slate-300 flex items-center gap-1.5 truncate">
                          <span>Clave:</span>
                          <strong className="font-mono">
                            {showPasswords[cuenta.credencial_id] ? credPassword : '••••••••'}
                          </strong>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPasswords(prev => ({ ...prev, [cuenta.credencial_id]: !prev[cuenta.credencial_id] }));
                            }}
                            className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                            type="button"
                          >
                            {showPasswords[cuenta.credencial_id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </Card>

                      {/* Acciones de Cuenta Madre */}
                      <Card className="bg-slate-900/40 p-3 flex flex-col gap-2 justify-center border-slate-850">
                        <button
                          onClick={() => onOpenRenew(cuenta)}
                          className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Renovar Cuenta
                        </button>
                        <button
                          onClick={() => onOpenProvGarantia(cuenta)}
                          className="flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Reportar Caída (Garantía)
                        </button>
                      </Card>
                    </div>

                    {/* Tabla de perfiles internos */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perfiles Individuales ({totalPerfiles})</h4>
                      
                      <div className="overflow-hidden border border-slate-850 rounded-xl divide-y divide-slate-850">
                        {cuenta.perfiles && cuenta.perfiles.length > 0 ? (
                          cuenta.perfiles.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center p-3 text-xs bg-slate-950/20">
                              <div className="space-y-1">
                                <p className="font-bold text-slate-300">{p.nombre_perfil}</p>
                                <p className="text-[10px] text-slate-500 font-mono">PIN: {p.pin || 'N/A'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                                  p.asignado 
                                    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' 
                                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                }`}>
                                  {p.asignado ? 'ASIGNADO' : 'LIBRE'}
                                </span>
                                {p.reportado && (
                                  <span className="px-2 py-0.5 rounded-full border border-rose-500/20 text-rose-400 bg-rose-500/10 text-[9px] font-bold flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> FALLA RECIENTE
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-500 text-xs">
                            No hay perfiles configurados para esta Cuenta Madre.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
