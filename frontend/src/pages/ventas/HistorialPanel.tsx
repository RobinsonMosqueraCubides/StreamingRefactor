import { useState } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import api from '../../api/axios';
import { 
  Search, ShieldAlert, Calendar, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Smartphone
} from 'lucide-react';

import type { Cliente, Plataforma, CuentaMadre, Credencial } from '../../types';

interface HistorialPanelProps {
  sales: any[];
  clientes: Cliente[];
  plataformas: Plataforma[];
  cuentas: CuentaMadre[];
  credenciales: Credencial[];
  historySearch: string;
  setHistorySearch: (val: string) => void;
  historyFilter: 'todos' | 'vence_2_dias' | 'vence_hoy';
  setHistoryFilter: (val: 'todos' | 'vence_2_dias' | 'vence_hoy') => void;
  expandedSaleId: number | null;
  setExpandedSaleId: (val: number | null) => void;
  onOpenGarantiaModal: (detail: any) => void;
  onOpenRenovacionModal: (sale: any) => void;
  onConfirmarPago: (ventaId: number) => Promise<void>;
}

export default function HistorialPanel({
  sales,
  clientes,
  plataformas,
  cuentas,
  credenciales,
  historySearch,
  setHistorySearch,
  historyFilter,
  setHistoryFilter,
  expandedSaleId,
  setExpandedSaleId,
  onOpenGarantiaModal,
  onOpenRenovacionModal,
  onConfirmarPago
}: HistorialPanelProps) {
  const [showPasswords, setShowPasswords] = useState<{[key: number]: boolean}>({});
  const [waLoading, setWaLoading] = useState<{[key: string]: boolean}>({});

  const handleOpenWhatsAppLink = async (ventaId: number, detailId: number, templateType: string) => {
    const key = `${detailId}-${templateType}`;
    setWaLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/ventas/${ventaId}/whatsapp-link`, {
        params: { detail_id: detailId, template_type: templateType }
      });
      window.open(res.data.url, '_blank');
    } catch (err: any) {
      alert('Error al generar el enlace de WhatsApp: ' + (err.response?.data?.detail || err.message));
    } finally {
      setWaLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getClienteName = (clientId: number) => {
    return clientes.find(c => c.id === clientId)?.nombre || `Cliente #${clientId}`;
  };

  const getClientePhone = (clientId: number) => {
    return clientes.find(c => c.id === clientId)?.telefono || 'N/A';
  };

  const getPlataformaName = (platId: number) => {
    return plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
  };

  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    if (status === 'PAGADO') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'PAGO_PARCIAL') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const filteredSales = sales.filter(s => {
    const clName = getClienteName(s.cliente_id).toLowerCase();
    const matchesSearch = clName.includes(historySearch.toLowerCase()) || String(s.id).includes(historySearch);
    
    if (!matchesSearch) return false;

    const diff = getDaysDiff(s.fecha_corte);
    if (historyFilter === 'vence_2_dias') {
      return diff === 2;
    }
    if (historyFilter === 'vence_hoy') {
      return diff <= 0;
    }

    return true;
  });

  return (
    <Card className="bg-slate-900/40 space-y-4">
      {/* Controles de Búsqueda y Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Input
            placeholder="Buscar por cliente o folio..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
          />
        </div>
        <Select
          value={historyFilter}
          onChange={(e) => setHistoryFilter(e.target.value as any)}
        >
          <option value="todos">Todos los Vencimientos</option>
          <option value="vence_2_dias">Vence en 2 Días</option>
          <option value="vence_hoy">Vencidos / Vence Hoy</option>
        </Select>
      </div>

      {filteredSales.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600" />
          <p className="font-semibold text-sm">No se encontraron ventas registradas</p>
          <p className="text-xs">Modifica la búsqueda o los filtros actuales.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-850">
          {filteredSales.map((sale) => {
            const diffDays = getDaysDiff(sale.fecha_corte);
            const isExpanded = expandedSaleId === sale.id;

            return (
              <div key={sale.id} className="py-4 space-y-4">
                <div 
                  onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                  className="flex justify-between items-center cursor-pointer hover:bg-slate-800/10 p-2 rounded-xl transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-200">
                      {getClienteName(sale.cliente_id)}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">Folio Venta: #{sale.id}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-200">${sale.monto_total.toLocaleString('es-CO')} COP</p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(sale.estado_pago)}`}>
                        {sale.estado_pago}
                      </span>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Corte: {sale.fecha_corte}
                      </p>
                      <span className={`text-[10px] font-semibold ${
                        diffDays <= 0 ? 'text-rose-400' : diffDays === 2 ? 'text-amber-400' : 'text-slate-500'
                      }`}>
                        {diffDays <= 0 ? 'Vencida' : `Faltan ${diffDays} días`}
                      </span>
                    </div>

                    {/* Botones de Acción Rápida */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {((sale.estado_pago === 'PENDIENTE' || sale.estado_pago === 'PAGO_PARCIAL') && diffDays > 2) ? (
                        <button
                          onClick={() => onConfirmarPago(sale.id)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all shadow-sm"
                        >
                          Confirmar Pago
                        </button>
                      ) : (diffDays <= 2) ? (
                        <button
                          onClick={() => onOpenRenovacionModal(sale)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all shadow-sm"
                        >
                          Renovar
                        </button>
                      ) : null}
                    </div>

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pl-2 pr-2 sm:pl-6 pb-2 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                      <p className="text-slate-400">Teléfono: <strong className="text-slate-200">{getClientePhone(sale.cliente_id)}</strong></p>
                      <p className="text-slate-400">Fecha Corte: <strong className="text-slate-200">{sale.fecha_corte}</strong></p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perfiles en esta orden</h4>
                      {sale.detalles.map((detail: any, index: number) => {
                        const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
                        const cred = credenciales.find(c => c.id === cm?.credencial_id);
                        
                        let profileUser = getClienteName(sale.cliente_id);
                        let pinVal = 'N/A';
                        if (cm && cm.perfiles) {
                          const matchPerfil = cm.perfiles.find((p: any) => p.id === detail.perfil_id);
                          if (matchPerfil) {
                            profileUser = matchPerfil.nombre_perfil;
                            if (matchPerfil.pin) pinVal = matchPerfil.pin;
                          }
                        }

                        const typeTemplate = diffDays <= 0 ? 'corte' : 'cobro';
                        const waKey = `${detail.id}-${typeTemplate}`;

                        return (
                          <div key={index} className="flex flex-col md:flex-row justify-between bg-slate-950/40 border border-slate-850 p-4 rounded-xl gap-4">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-200">
                                {getPlataformaName(detail.plataforma_id)}
                              </p>
                              <p className="text-xs text-slate-500">Monto aplicado: ${detail.precio_aplicado.toLocaleString('es-CO')} COP</p>
                              
                              {/* Credenciales con toggle de show/hide */}
                              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 mt-2 max-w-2xl items-center">
                                <p>Usuario: <strong className="text-slate-200 font-sans">{cred?.email || 'N/A'}</strong></p>
                                <p className="flex items-center gap-1.5">
                                  Clave: 
                                  <strong className="text-slate-200 font-sans">
                                    {showPasswords[cred?.id || 0] ? (cred?.password || 'N/A') : '••••••••'}
                                  </strong>
                                  {cred && (
                                    <button 
                                      onClick={() => setShowPasswords(prev => ({ ...prev, [cred.id]: !prev[cred.id] }))}
                                      className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                                      type="button"
                                    >
                                      {showPasswords[cred.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </p>
                                <p>Perfil: <strong className="text-slate-200 font-sans">{profileUser}</strong></p>
                                <p>PIN: <strong className="text-cyan-400 font-sans">{pinVal}</strong></p>
                              </div>
                            </div>

                            <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                              {(diffDays === 2 || diffDays <= 0) ? (
                                <button
                                  onClick={() => handleOpenWhatsAppLink(sale.id, detail.id, typeTemplate)}
                                  disabled={waLoading[waKey]}
                                  className={`inline-flex items-center gap-1.5 text-xs font-bold transition-all px-3 py-2 rounded-lg border cursor-pointer ${
                                    diffDays <= 0 
                                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' 
                                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                                  }`}
                                >
                                  <Smartphone className="w-3.5 h-3.5" /> 
                                  {waLoading[waKey] ? 'Generando...' : (diffDays <= 0 ? 'Notificar Corte' : 'Notificar Cobro')}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenWhatsAppLink(sale.id, detail.id, 'cambio_credenciales')}
                                  disabled={waLoading[`${detail.id}-cambio_credenciales`]}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3 py-2 rounded-lg cursor-pointer"
                                >
                                  <Smartphone className="w-3.5 h-3.5" /> 
                                  {waLoading[`${detail.id}-cambio_credenciales`] ? 'Generando...' : 'Reenviar Accesos'}
                                </button>
                              )}

                              <button
                                onClick={() => onOpenGarantiaModal(detail)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-2 rounded-lg cursor-pointer bg-transparent"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" /> Reportar Falla
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-850 pt-3">
                      <button
                        onClick={() => onOpenRenovacionModal(sale)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Renovar Suscripción
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
