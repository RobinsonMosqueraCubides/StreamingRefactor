import { useState } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import { 
  ChevronDown, ChevronUp, Database, DollarSign, RefreshCw, 
  AlertTriangle, KeyRound, Eye, EyeOff, Users, Search, X, Edit,
  XCircle
} from 'lucide-react';

import type { CuentaMadre, Proveedor, Plataforma, Credencial } from '../../types';

interface CuentasTabProps {
  cuentas: CuentaMadre[];
  proveedores: Proveedor[];
  plataformas: Plataforma[];
  credenciales: Credencial[];
  expandedCuentaId: number | null;
  onToggleExpand: (id: number) => void;
  onOpenProvGarantia: (cuenta: CuentaMadre) => void;
  onOpenRenew: (cuenta: CuentaMadre) => void;
  onOpenEdit: (cuenta: CuentaMadre) => void;
  onOpenCancel: (cuenta: CuentaMadre) => void;
}

export default function CuentasTab({
  cuentas,
  proveedores,
  plataformas,
  credenciales,
  expandedCuentaId,
  onToggleExpand,
  onOpenProvGarantia,
  onOpenRenew,
  onOpenEdit,
  onOpenCancel
}: CuentasTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [vencimientoFilter, setVencimientoFilter] = useState<'todas' | 'dos_dias' | 'cinco_dias' | 'vencidas'>('todas');
  const [groupBy, setGroupBy] = useState<'none' | 'proveedor' | 'plataforma'>('none');
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
    if (estado === 'CANCELADA') return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  // Helper checks
  const isExpiringSoon = (c: CuentaMadre) => {
    const diff = getDaysDiff(c.fecha_vencimiento);
    return diff <= 2 && diff > 0 && c.estado === 'ACTIVA';
  };

  // Brand color mapping for popular streaming platforms
  const getPlatformStyle = (name: string) => {
    const normalized = name.toLowerCase();
    if (normalized.includes('netflix')) return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', accent: 'text-rose-500', logoColor: '#E50914', borderSelected: 'border-rose-500/80 ring-1 ring-rose-500/20 bg-rose-950/20' };
    if (normalized.includes('disney')) return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', accent: 'text-blue-450', logoColor: '#00A3FF', borderSelected: 'border-blue-500/80 ring-1 ring-blue-500/20 bg-blue-950/20' };
    if (normalized.includes('hbo') || normalized.includes('max')) return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', accent: 'text-purple-450', logoColor: '#9933FF', borderSelected: 'border-purple-500/80 ring-1 ring-purple-500/20 bg-purple-950/20' };
    if (normalized.includes('prime') || normalized.includes('amazon')) return { bg: 'bg-sky-500/10 border-sky-500/25 text-sky-400', accent: 'text-sky-455', logoColor: '#00A8E1', borderSelected: 'border-sky-500/80 ring-1 ring-sky-500/20 bg-sky-950/20' };
    if (normalized.includes('youtube')) return { bg: 'bg-red-500/10 border-red-500/20 text-red-400', accent: 'text-red-500', logoColor: '#FF0000', borderSelected: 'border-red-500/80 ring-1 ring-red-500/20 bg-red-950/20' };
    if (normalized.includes('spotify')) return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450', accent: 'text-emerald-500', logoColor: '#1DB954', borderSelected: 'border-emerald-500/80 ring-1 ring-emerald-500/20 bg-emerald-950/20' };
    return { bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', accent: 'text-cyan-400', logoColor: '#06B6D4', borderSelected: 'border-cyan-500/80 ring-1 ring-cyan-500/20 bg-cyan-950/20' };
  };

  const renderPlatformLogo = (name: string) => {
    const style = getPlatformStyle(name);
    const initial = name.charAt(0).toUpperCase();
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-all"
        style={{ backgroundColor: `${style.logoColor}20`, color: style.logoColor, border: `1px solid ${style.logoColor}40` }}
      >
        {initial}
      </div>
    );
  };

  const renderVencimientoStatus = (fechaVencimiento: string, estado: string) => {
    const diffDays = getDaysDiff(fechaVencimiento);
    if (estado === 'CANCELADA') {
      return (
        <span className="text-[10px] font-semibold text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 rounded-md">
          Cancelada
        </span>
      );
    }
    if (estado === 'RENOVADA') {
      return (
        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          Renovada
        </span>
      );
    }
    if (diffDays < 0 || estado === 'VENCIDA') {
      return (
        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Vencida ({Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'día' : 'días'})
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Vence hoy
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Vence mañana
        </span>
      );
    }
    if (diffDays === 2) {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-550/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          Vence en 2 días
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-slate-400">
        Faltan {diffDays} días
      </span>
    );
  };

  // 1. Estadísticas de Plataformas
  const platformStats = plataformas.map(plat => {
    const platCuentas = cuentas.filter(c => c.plataforma_id === plat.id);
    const totalCuentas = platCuentas.length;
    
    // Perfiles libres (stock real disponible)
    const freeProfiles = platCuentas.reduce((acc, c) => {
      const free = c.perfiles?.filter(p => !p.asignado).length || 0;
      return acc + free;
    }, 0);

    // Cuentas por vencer en <= 2 días
    const expiringSoon = platCuentas.filter(isExpiringSoon).length;

    return {
      ...plat,
      totalCuentas,
      freeProfiles,
      expiringSoon
    };
  });

  // 2. Estadísticas de Proveedores
  const providerStats = proveedores.map(prov => {
    const provCuentas = cuentas.filter(c => c.proveedor_id === prov.id);
    const totalCuentas = provCuentas.length;

    // Cuentas por vencer en <= 2 días
    const expiringSoon = provCuentas.filter(isExpiringSoon).length;

    return {
      ...prov,
      totalCuentas,
      expiringSoon
    };
  });

  // Cuentas a vencer globalmente (para banner de advertencia rápido)
  const expiringSoonGlobal = cuentas.filter(isExpiringSoon);

  // Filter accounts
  const filteredCuentas = cuentas.filter(c => {
    // 1. Filtro por buscador (email o nombre de perfil asignado)
    if (searchTerm.trim() !== '') {
      const credEmail = getCredencialEmail(c.credencial_id).toLowerCase();
      const hasMatchingProfile = c.perfiles?.some(p => p.nombre_perfil.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!credEmail.includes(searchTerm.toLowerCase()) && !hasMatchingProfile) {
        return false;
      }
    }

    // 2. Filtro por Plataforma Seleccionada
    if (selectedPlatformId !== null && c.plataforma_id !== selectedPlatformId) {
      return false;
    }

    // 3. Filtro por Proveedor Seleccionado
    if (selectedProviderId !== null && c.proveedor_id !== selectedProviderId) {
      return false;
    }

    // 4. Filtro por Vencimiento
    const days = getDaysDiff(c.fecha_vencimiento);
    if (vencimientoFilter === 'dos_dias') {
      return days <= 2 && c.estado !== 'RENOVADA';
    }
    if (vencimientoFilter === 'cinco_dias') {
      return days <= 5 && c.estado !== 'RENOVADA';
    }
    if (vencimientoFilter === 'vencidas') {
      return c.estado === 'VENCIDA' || (days <= 0 && c.estado !== 'RENOVADA');
    }

    return true;
  });

  // Función para renderizar una cuenta individual
  const renderCuentaItem = (cuenta: CuentaMadre) => {
    const isExpanded = expandedCuentaId === cuenta.id;
    const diffDays = getDaysDiff(cuenta.fecha_vencimiento);
    const totalPerfiles = cuenta.max_perfiles || cuenta.perfiles?.length || 0;
    const asignadosCount = cuenta.perfiles?.filter(p => p.asignado)?.length || 0;
    const usagePercentage = totalPerfiles > 0 ? (asignadosCount / totalPerfiles) * 100 : 0;
    const credEmail = getCredencialEmail(cuenta.credencial_id);
    const credPassword = getCredencialPassword(cuenta.credencial_id);
    const platformName = getPlataformaName(cuenta.plataforma_id);
    const isExpiring = diffDays <= 2 && diffDays > 0 && cuenta.estado === 'ACTIVA';

    return (
      <div 
        key={cuenta.id} 
        className={`bg-slate-950/40 border rounded-xl overflow-hidden transition-all duration-200 ${
          isExpanded ? 'border-slate-800 bg-slate-900/10' : 'border-slate-850 hover:bg-slate-900/10'
        } ${
          isExpiring ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' : ''
        }`}
      >
        {/* Header Acordeón */}
        <div 
          onClick={() => onToggleExpand(cuenta.id)}
          className="grid grid-cols-1 sm:grid-cols-12 items-start sm:items-center p-4 gap-4 cursor-pointer select-none"
        >
          {/* Col 1: Logo, plataforma, correo (4 columnas) */}
          <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
            {renderPlatformLogo(platformName)}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-200 truncate">
                  {platformName}
                </p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${getEstadoBadgeColor(cuenta.estado)}`}>
                  {cuenta.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono select-all bg-slate-950/60 px-2 py-0.5 rounded border border-slate-850 inline-block truncate max-w-full">
                {credEmail}
              </p>
            </div>
          </div>

          {/* Col 2: Barra de Perfiles (2 columnas) - Oculta en extra-small, visible en sm y superior */}
          <div className="hidden sm:flex sm:col-span-2 flex-col gap-1 w-full max-w-[120px] justify-self-start sm:justify-self-center">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Perfiles</span>
              <span className="font-semibold text-slate-350">{asignadosCount}/{totalPerfiles}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePercentage === 100 ? 'bg-cyan-500' : 'bg-emerald-450'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>

          {/* Col 3: Proveedor e Info de Vencimiento (3 columnas) */}
          <div className="sm:col-span-3 text-left sm:text-right min-w-0">
            <p className="text-xs text-slate-400 truncate">
              Proveedor: <strong className="text-slate-350">{getProveedorName(cuenta.proveedor_id)}</strong>
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              Vence: {cuenta.fecha_vencimiento}
            </p>
          </div>

          {/* Col 4: Badge de Vencimiento y Expandir (3 columnas) */}
          <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div className="text-right">
              {renderVencimientoStatus(cuenta.fecha_vencimiento, cuenta.estado)}
            </div>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />}
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
                <p className="text-xs text-slate-300 truncate">Usuario: <strong className="font-mono select-all">{credEmail}</strong></p>
                <div className="text-xs text-slate-300 flex items-center gap-1.5 truncate">
                  <span>Clave:</span>
                  <strong className="font-mono select-all">
                    {showPasswords[cuenta.credencial_id] ? (
                      getProveedorName(cuenta.proveedor_id) === "Correos A" ? (cuenta.clave_plataforma || 'N/A') : credPassword
                    ) : '••••••••'}
                  </strong>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPasswords(prev => ({ ...prev, [cuenta.credencial_id]: !prev[cuenta.credencial_id] }));
                    }}
                    className="text-slate-550 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                    type="button"
                  >
                    {showPasswords[cuenta.credencial_id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Card>

              {/* Acciones de Cuenta Madre */}
              <Card className="bg-slate-900/40 p-3 flex flex-col gap-2 justify-center border-slate-850">
                <button
                  onClick={() => onOpenEdit(cuenta)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar Cuenta
                </button>
                <button
                  onClick={() => onOpenRenew(cuenta)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Renovar Cuenta
                </button>
                {cuenta.estado !== 'CANCELADA' && (
                  <button
                    onClick={() => onOpenCancel(cuenta)}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-3 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancelar Cuenta
                  </button>
                )}
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
                        <p className="text-[10px] text-slate-550 font-mono">PIN: {p.pin || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                          p.asignado 
                            ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' 
                            : 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20'
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
  };

  // Lógica de agrupamiento
  const renderAgrupado = () => {
    if (groupBy === 'proveedor') {
      const grouped = proveedores.map(prov => {
        const provCuentas = filteredCuentas.filter(c => c.proveedor_id === prov.id);
        return { prov, cuentas: provCuentas };
      }).filter(g => g.cuentas.length > 0);

      const sinProv = filteredCuentas.filter(c => !proveedores.some(p => p.id === c.proveedor_id));

      return (
        <div className="space-y-6">
          {grouped.map(({ prov, cuentas }) => (
            <div key={prov.id} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Proveedor: {prov.nombre} <span className="text-slate-500 font-normal">({cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'})</span>
                </h3>
              </div>
              <div className="space-y-3">
                {cuentas.map(renderCuentaItem)}
              </div>
            </div>
          ))}
          {sinProv.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sin Proveedor Asignado <span className="text-slate-500 font-normal">({sinProv.length})</span>
                </h3>
              </div>
              <div className="space-y-3">
                {sinProv.map(renderCuentaItem)}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (groupBy === 'plataforma') {
      const grouped = plataformas.map(plat => {
        const platCuentas = filteredCuentas.filter(c => c.plataforma_id === plat.id);
        return { plat, cuentas: platCuentas };
      }).filter(g => g.cuentas.length > 0);

      const sinPlat = filteredCuentas.filter(c => !plataformas.some(p => p.id === c.plataforma_id));

      return (
        <div className="space-y-6">
          {grouped.map(({ plat, cuentas }) => (
            <div key={plat.id} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Plataforma: {plat.nombre} <span className="text-slate-500 font-normal">({cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'})</span>
                </h3>
              </div>
              <div className="space-y-3">
                {cuentas.map(renderCuentaItem)}
              </div>
            </div>
          ))}
          {sinPlat.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                <Database className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sin Plataforma Asignada <span className="text-slate-500 font-normal">({sinPlat.length})</span>
                </h3>
              </div>
              <div className="space-y-3">
                {sinPlat.map(renderCuentaItem)}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredCuentas.map(renderCuentaItem)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner de alerta rápida para cuentas que vencen en <= 2 días */}
      {expiringSoonGlobal.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold">¡Atención! Cuentas por vencer</h4>
              <p className="text-xs text-amber-500/80">Tienes {expiringSoonGlobal.length} {expiringSoonGlobal.length === 1 ? 'cuenta' : 'cuentas'} a 2 días o menos de vencer.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setVencimientoFilter('dos_dias');
              setSelectedPlatformId(null);
              setSelectedProviderId(null);
            }}
            className="text-xs font-bold bg-amber-550 text-slate-955 px-3 py-1.5 rounded-lg hover:bg-amber-400 transition-colors border-none cursor-pointer w-full sm:w-auto text-center"
          >
            Filtrar ahora
          </button>
        </div>
      )}

      {/* Resumen por Plataforma */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock por Plataforma (Perfiles Libres)</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {platformStats.map(plat => {
            const style = getPlatformStyle(plat.nombre);
            const isSelected = selectedPlatformId === plat.id;
            return (
              <div
                key={plat.id}
                onClick={() => {
                  setSelectedPlatformId(isSelected ? null : plat.id);
                }}
                className={`bg-slate-950/40 p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 select-none ${
                  isSelected ? style.borderSelected : 'border-slate-850 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  {renderPlatformLogo(plat.nombre)}
                  {plat.expiringSoon > 0 && (
                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-450" /> {plat.expiringSoon}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 mt-2">
                  <p className="text-xs font-bold text-slate-200 truncate">{plat.nombre}</p>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">{plat.freeProfiles} libres</span>
                    <span className="text-slate-500">({plat.totalCuentas} ct.)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen por Proveedor */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cuentas por Proveedor</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {providerStats.map(prov => {
            const isSelected = selectedProviderId === prov.id;
            return (
              <div
                key={prov.id}
                onClick={() => {
                  setSelectedProviderId(isSelected ? null : prov.id);
                }}
                className={`bg-slate-950/40 p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 select-none ${
                  isSelected ? 'border-cyan-500/80 ring-1 ring-cyan-500/20 bg-cyan-950/20' : 'border-slate-850 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="w-7 h-7 bg-slate-950/80 rounded-lg flex items-center justify-center border border-slate-800">
                    <Users className="w-3.5 h-3.5 text-slate-450" />
                  </div>
                  {prov.expiringSoon > 0 && (
                    <span className="text-[9px] font-black text-amber-455 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-450" /> {prov.expiringSoon}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 mt-2">
                  <p className="text-xs font-bold text-slate-200 truncate">{prov.nombre}</p>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-450 font-medium">{prov.totalCuentas} {prov.totalCuentas === 1 ? 'cuenta' : 'cuentas'}</span>
                    <span className="text-cyan-400 font-mono font-bold">${prov.saldo_a_favor.toLocaleString('es-CO')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="flex flex-col gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-200">Listado de Cuentas Madre</h2>
            <p className="text-xs text-slate-500">Maneja accesos, perfiles de streaming e inventario general.</p>
          </div>
          {(selectedPlatformId !== null || selectedProviderId !== null || searchTerm !== '' || vencimientoFilter !== 'todas') && (
            <button
              onClick={() => {
                setSelectedPlatformId(null);
                setSelectedProviderId(null);
                setSearchTerm('');
                setVencimientoFilter('todas');
              }}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
            >
              <X className="w-3 h-3" /> Limpiar todos los filtros
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Buscador de Cuentas */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por correo de cuenta o nombre de perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-550 text-xs focus:outline-none focus:border-cyan-500/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-550 hover:text-slate-350 bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
            {/* Filtro de Expiración */}
            <div className="w-full sm:w-56">
              <Select
                value={vencimientoFilter}
                onChange={(e) => setVencimientoFilter(e.target.value as any)}
              >
                <option value="todas">Todos los Vencimientos</option>
                <option value="dos_dias">⚠️ Vence en 2 días o menos</option>
                <option value="cinco_dias">Vence en 5 días o menos</option>
                <option value="vencidas">🔴 Cuentas Vencidas</option>
              </Select>
            </div>

            {/* Agrupamiento */}
            <div className="w-full sm:w-48">
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
              >
                <option value="none">Sin Agrupar</option>
                <option value="proveedor">Agrupar por Proveedor</option>
                <option value="plataforma">Agrupar por Plataforma</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {filteredCuentas.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-650 animate-pulse" />
          <p className="font-semibold text-sm">No se encontraron cuentas madre con los filtros actuales</p>
          <p className="text-xs">Modifica los filtros seleccionados o registra una nueva cuenta madre.</p>
        </div>
      ) : renderAgrupado()}
    </div>
  );
}
