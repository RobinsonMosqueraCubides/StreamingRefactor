import { useState } from 'react';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import api from '../../api/axios';
import { 
  Search, ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, Smartphone
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
  onRefreshData?: () => Promise<void>;
  onOpenEditarModal: (sale: any) => void;
  onDeleteVenta: (ventaId: number) => Promise<void>;
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
  onOpenGarantiaModal,
  onOpenRenovacionModal,
  onConfirmarPago,
  onRefreshData,
  onOpenEditarModal,
  onDeleteVenta
}: HistorialPanelProps) {
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [waLoading, setWaLoading] = useState<{[key: string]: boolean}>({});
  const [expandedClients, setExpandedClients] = useState<{[key: number]: boolean}>({});
  
  // Inline edit states
  const [editingDetailId, setEditingDetailId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editProfileName, setEditProfileName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

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

  const getPlataformaName = (platId: number) => {
    if (!platId) return 'Plataforma Desconocida';
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

  const getPlatformStyle = (name: string) => {
    const normalized = name.toLowerCase();
    if (normalized.includes('netflix')) return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', accent: 'text-rose-500', logoColor: '#E50914' };
    if (normalized.includes('disney')) return { bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', accent: 'text-blue-450', logoColor: '#00A3FF' };
    if (normalized.includes('hbo') || normalized.includes('max')) return { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400', accent: 'text-purple-455', logoColor: '#9933FF' };
    if (normalized.includes('prime') || normalized.includes('amazon')) return { bg: 'bg-sky-500/10 border-sky-500/25 text-sky-400', accent: 'text-sky-455', logoColor: '#00A8E1' };
    if (normalized.includes('youtube')) return { bg: 'bg-red-500/10 border-red-500/20 text-red-400', accent: 'text-red-500', logoColor: '#FF0000' };
    if (normalized.includes('spotify')) return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450', accent: 'text-emerald-555', logoColor: '#1DB954' };
    return { bg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400', accent: 'text-cyan-400', logoColor: '#06B6D4' };
  };

  const renderPlatformLogo = (name: string) => {
    const style = getPlatformStyle(name);
    const initial = name.charAt(0).toUpperCase();
    return (
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-all flex-shrink-0"
        style={{ backgroundColor: `${style.logoColor}20`, color: style.logoColor, border: `1px solid ${style.logoColor}40` }}
      >
        {initial}
      </div>
    );
  };

  const renderVencimientoStatus = (diffDays: number) => {
    if (diffDays < 0) {
      return (
        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 inline-block">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Vencida ({Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? 'día' : 'días'})
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 inline-block">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Vence hoy
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 inline-block">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Vence mañana
        </span>
      );
    }
    if (diffDays === 2) {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-550/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block">
          Vence en 2 días
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md inline-block">
        Faltan {diffDays} días
      </span>
    );
  };

  const getTipoUnidadBadge = (d: any) => {
    if (d.combo_id) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 select-none">
          Combo
        </span>
      );
    }
    if (!d.perfil_id) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 select-none">
          Cuenta Completa
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 select-none">
        Pantalla
      </span>
    );
  };

  const startEdit = (detail: any, cred: any, profileUser: string, pinVal: string) => {
    setEditingDetailId(detail.id);
    setEditEmail(cred?.email || '');
    setEditPassword(cred?.password || '');
    setEditProfileName(profileUser);
    setEditPin(pinVal === 'N/A' ? '' : pinVal);
  };

  const handleSaveAccesses = async (detail: any, cred: any) => {
    setSaveLoading(true);
    try {
      // 1. Update credential if changed
      if (cred && (editEmail !== cred.email || editPassword !== cred.password)) {
        await api.put(`/credenciales/${cred.id}`, {
          email: editEmail,
          password: editPassword
        });
      }
      
      // 2. Update profile if changed
      if (detail.perfil_id) {
        await api.put(`/perfiles/${detail.perfil_id}`, {
          nombre_perfil: editProfileName,
          pin: editPin || null
        });
      }

      alert('Accesos actualizados correctamente');
      setEditingDetailId(null);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      alert('Error al guardar los cambios: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaveLoading(false);
    }
  };

  // Group client sales list
  const filteredSalesList: any[] = [];
  
  sales.forEach(sale => {
    const clientName = getClienteName(sale.cliente_id).toLowerCase();
    const matchesSearch = clientName.includes(historySearch.toLowerCase()) || String(sale.id).includes(historySearch);
    
    if (!matchesSearch) return;

    const diffDays = getDaysDiff(sale.fecha_corte);
    
    let matchesExpiration = true;
    if (historyFilter === 'vence_2_dias') {
      matchesExpiration = diffDays === 2;
    } else if (historyFilter === 'vence_hoy') {
      matchesExpiration = diffDays <= 0;
    }

    if (!matchesExpiration) return;

    filteredSalesList.push({
      ...sale,
      diffDays
    });
  });

  // Group by client
  const groupedByClient: { [key: number]: { cliente: Cliente; sales: any[] } } = {};

  filteredSalesList.forEach(sale => {
    const clientId = sale.cliente_id;
    if (!groupedByClient[clientId]) {
      const cliente = clientes.find(c => c.id === clientId) || { id: clientId, nombre: `Cliente #${clientId}`, telefono: 'N/A', tipo: 'FINAL', estado: 'ACTIVO', dias_gracia_max: 0 } as Cliente;
      groupedByClient[clientId] = {
        cliente,
        sales: []
      };
    }
    groupedByClient[clientId].sales.push(sale);
  });

  const clientsList = Object.values(groupedByClient);

  const getClientHealthBadge = (clientSales: any[]) => {
    const pendingPayment = clientSales.filter(s => s.estado_pago !== 'PAGADO').length;
    const expiringSoon = clientSales.filter(s => s.diffDays <= 2 && s.estado_pago !== 'RENOVADA').length;

    if (pendingPayment > 0 || expiringSoon > 0) {
      return (
        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse select-none">
          <AlertTriangle className="w-3 h-3" />
          ATENCIÓN REQUERIDA ({pendingPayment} pendientes)
        </span>
      );
    }

    return (
      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        CUENTA AL DÍA
      </span>
    );
  };

  const isClientExpanded = (clientId: number) => {
    return expandedClients[clientId] !== false; // default is true (expanded)
  };

  const toggleClientExpand = (clientId: number) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: prev[clientId] === false ? true : false
    }));
  };

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

      {clientsList.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <AlertTriangle className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
          <p className="font-semibold text-sm">No se encontraron ventas registradas</p>
          <p className="text-xs">Modifica la búsqueda o los filtros actuales.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {clientsList.map(({ cliente, sales: clientSales }) => {
            const isExpanded = isClientExpanded(cliente.id);

            return (
              <div 
                key={cliente.id} 
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'border-slate-800 bg-slate-900/5' : 'border-slate-850 hover:bg-slate-900/10'
                }`}
              >
                {/* Cabecera del Cliente (Nivel Padre) */}
                <div 
                  onClick={() => toggleClientExpand(cliente.id)}
                  className="flex justify-between items-center p-4 cursor-pointer select-none bg-slate-950/40 hover:bg-slate-900/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-black text-slate-200">
                      {cliente.nombre}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                      Cliente ID: #{cliente.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Celular: {cliente.telefono}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getClientHealthBadge(clientSales)}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    )}
                  </div>
                </div>

                {/* Listado de Ventas del Cliente (Nivel Hijo) */}
                {isExpanded && (
                  <div className="divide-y divide-slate-850 bg-slate-950/10 animate-in fade-in duration-200">
                    {clientSales.map((sale, sIdx) => {
                      let platformTitle = '';
                      const isCombo = sale.detalles.length > 1;

                      const getDetailPlatName = (d: any) => {
                        const cm = cuentas.find(c => c.id === d.cuenta_madre_id);
                        return getPlataformaName(d.plataforma_id || (cm ? cm.plataforma_id : 0));
                      };

                      if (sale.detalles.length === 1) {
                        const d = sale.detalles[0];
                        const platName = getDetailPlatName(d);
                        const typeStr = d.perfil_id ? 'Pantalla' : 'Cuenta';
                        platformTitle = `${platName} - ${typeStr}`;
                      } else {
                        const itemsList = sale.detalles.map((d: any) => {
                          const platName = getDetailPlatName(d);
                          const typeStr = d.perfil_id ? 'Pantalla' : 'Cuenta';
                          return `${platName} - ${typeStr}`;
                        });
                        platformTitle = `Combo: ${itemsList.join(' + ')}`;
                      }

                      const detailKey = `sale-${sale.id}`;
                      const isDetailCredsOpen = showPasswords[detailKey] || false;

                      return (
                        <div 
                          key={sale.id} 
                          className={`p-4 ${
                            sIdx > 0 ? 'border-t border-slate-850' : ''
                          } hover:bg-slate-900/10 transition-colors space-y-3`}
                        >
                          {/* Fila principal del servicio / venta consolidado */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            
                            {/* Título de la compra (Netflix - Pantalla, Netflix - Cuenta, etc.) */}
                            <div className="flex items-center gap-3 min-w-0 md:w-2/5">
                              {sale.detalles.length === 1 ? (
                                renderPlatformLogo(getDetailPlatName(sale.detalles[0]))
                              ) : (
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30 flex-shrink-0 select-none">
                                  C
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-bold text-slate-200 truncate">
                                    {platformTitle}
                                  </p>
                                  {isCombo && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 select-none">
                                      Combo
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  Folio Venta: #{sale.id}
                                </p>
                              </div>
                            </div>

                            {/* Monto y Estado de Pago */}
                            <div className="flex items-center gap-2.5 md:w-1/5">
                              <span className="text-xs font-bold text-slate-300 font-mono">
                                ${sale.monto_total.toLocaleString('es-CO')}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getStatusColor(sale.estado_pago)}`}>
                                {sale.estado_pago}
                              </span>
                            </div>

                            {/* Fecha de Corte y Vencimiento */}
                            <div className="flex items-center gap-2 md:w-1/4">
                              <span className="text-xs text-slate-400 font-mono">
                                Corte: {sale.fecha_corte}
                              </span>
                              {renderVencimientoStatus(sale.diffDays)}
                            </div>

                            {/* Acciones Contextuales */}
                            <div 
                              className="flex items-center gap-2 w-full md:w-auto justify-end md:flex-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {((sale.estado_pago === 'PENDIENTE' || sale.estado_pago === 'PAGO_PARCIAL') && sale.diffDays > 2) ? (
                                <button
                                  onClick={() => onConfirmarPago(sale.id)}
                                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-955 text-[10px] font-black px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all shadow-md shadow-emerald-500/10"
                                >
                                  Confirmar Pago
                                </button>
                              ) : (sale.diffDays <= 2) ? (
                                <button
                                  onClick={() => onOpenRenovacionModal(sale)}
                                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 text-[10px] font-black px-3 py-1.5 rounded-lg border-none cursor-pointer transition-all shadow-md shadow-cyan-500/10"
                                >
                                  Renovar
                                </button>
                              ) : null}

                              <button
                                onClick={() => onOpenEditarModal(sale)}
                                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 bg-cyan-500/5 px-2 py-1.5 rounded-lg transition-all cursor-pointer select-none"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`¿Estás seguro de que deseas eliminar la venta #${sale.id}? Esta acción liberará las pantallas/cuentas asignadas y removerá los abonos de caja contable.`)) {
                                    onDeleteVenta(sale.id);
                                  }
                                }}
                                className="text-xs font-bold text-rose-450 hover:text-rose-350 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 px-2 py-1.5 rounded-lg transition-all cursor-pointer select-none"
                              >
                                Eliminar
                              </button>

                              <button
                                onClick={() => setShowPasswords(prev => ({ ...prev, [detailKey]: !prev[detailKey] }))}
                                className="text-xs font-bold text-slate-450 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-955/20 px-2 py-1.5 rounded-lg transition-all cursor-pointer select-none"
                              >
                                {isDetailCredsOpen ? 'Ocultar Accesos' : 'Ver Accesos'}
                              </button>
                            </div>
                          </div>

                          {/* Panel de detalles y accesos (Expandible por Venta) */}
                          {isDetailCredsOpen && (
                            <div className="bg-slate-955/40 p-4 rounded-xl border border-slate-850 space-y-4 animate-in slide-in-from-top-1 duration-150">
                              {sale.detalles.map((detail: any, dIdx: number) => {
                                const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
                                const cred = credenciales.find(c => c.id === cm?.credencial_id);
                                const detailPlatformName = getDetailPlatName(detail);
                                
                                const detailKeyStr = `detail-${detail.id}`;
                                const isEditing = editingDetailId === detail.id;

                                let profileUser = cliente.nombre;
                                let pinVal = 'N/A';
                                if (cm && cm.perfiles) {
                                  const matchPerfil = cm.perfiles.find((p: any) => p.id === detail.perfil_id);
                                  if (matchPerfil) {
                                    profileUser = matchPerfil.nombre_perfil;
                                    if (matchPerfil.pin) pinVal = matchPerfil.pin;
                                  }
                                }

                                const typeTemplate = sale.diffDays <= 0 ? 'corte' : 'cobro';
                                const waKey = `${detail.id}-${typeTemplate}`;

                                return (
                                  <div 
                                    key={detail.id} 
                                    className={`space-y-3 ${dIdx > 0 ? 'border-t border-slate-800/60 pt-3' : ''}`}
                                  >
                                    {/* Nombre de la plataforma del detalle */}
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-extrabold text-slate-300 tracking-wide uppercase">
                                          Servicio: {detailPlatformName}
                                        </p>
                                        {getTipoUnidadBadge(detail)}
                                      </div>
                                      
                                      {/* Botones de Edición */}
                                      {!isEditing ? (
                                        <button
                                          onClick={() => startEdit(detail, cred, profileUser, pinVal)}
                                          className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 bg-transparent border-none cursor-pointer"
                                        >
                                          Editar Accesos
                                        </button>
                                      ) : (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleSaveAccesses(detail, cred)}
                                            disabled={saveLoading}
                                            className="text-[10px] font-black text-emerald-400 hover:text-emerald-350 bg-transparent border-none cursor-pointer disabled:opacity-50"
                                          >
                                            {saveLoading ? 'Guardando...' : 'Guardar'}
                                          </button>
                                          <button
                                            onClick={() => setEditingDetailId(null)}
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-350 bg-transparent border-none cursor-pointer"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Formulario o Visualización de Accesos */}
                                    {isEditing ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                                        <div>
                                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Email / Usuario</label>
                                          <input
                                            type="text"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-cyan-550 focus:outline-none"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Contraseña</label>
                                          <input
                                            type="text"
                                            value={editPassword}
                                            onChange={(e) => setEditPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-cyan-550 focus:outline-none"
                                          />
                                        </div>
                                        {detail.perfil_id ? (
                                          <>
                                            <div>
                                              <label className="text-[9px] text-slate-500 uppercase block mb-1">Nombre Perfil</label>
                                              <input
                                                type="text"
                                                value={editProfileName}
                                                onChange={(e) => setEditProfileName(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-sans focus:border-cyan-550 focus:outline-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[9px] text-slate-500 uppercase block mb-1">PIN</label>
                                              <input
                                                type="text"
                                                value={editPin}
                                                onChange={(e) => setEditPin(e.target.value)}
                                                placeholder="Vacío o PIN"
                                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:border-cyan-550 focus:outline-none"
                                              />
                                            </div>
                                          </>
                                        ) : (
                                          <div className="col-span-2 flex items-center">
                                            <p className="text-[11px] text-slate-500 italic mt-3">Cuenta Completa (sin perfil individual)</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] font-mono text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-850">
                                        <p className="truncate">Usuario: <strong className="text-slate-200 font-sans select-all">{cred?.email || 'N/A'}</strong></p>
                                        <p className="flex items-center gap-1.5 truncate">
                                          Clave: 
                                          <strong className="text-slate-200 font-sans select-all">
                                            {showPasswords[`pw-${detailKeyStr}`] ? (cred?.password || 'N/A') : '••••••••'}
                                          </strong>
                                          {cred && (
                                            <button 
                                              onClick={() => setShowPasswords(prev => ({ ...prev, [`pw-${detailKeyStr}`]: !prev[`pw-${detailKeyStr}`] }))}
                                              className="text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer bg-transparent border-none"
                                              type="button"
                                            >
                                              {showPasswords[`pw-${detailKeyStr}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                          )}
                                        </p>
                                        {detail.perfil_id ? (
                                          <>
                                            <p className="truncate">Perfil: <strong className="text-slate-200 font-sans select-all">{profileUser}</strong></p>
                                            <p className="truncate">PIN: <strong className="text-cyan-400 font-sans select-all">{pinVal}</strong></p>
                                          </>
                                        ) : (
                                          <p className="col-span-2 text-sky-400 font-sans font-bold select-none">
                                            Acceso Total (Cuenta Completa sin límites de perfil)
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Botones de acción técnica */}
                                    <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
                                      {(sale.diffDays === 2 || sale.diffDays <= 0) ? (
                                        <button
                                          onClick={() => handleOpenWhatsAppLink(sale.id, detail.id, typeTemplate)}
                                          disabled={waLoading[waKey]}
                                          className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-all px-3 py-1.5 rounded-lg border cursor-pointer w-full sm:w-auto ${
                                            sale.diffDays <= 0 
                                              ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' 
                                              : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                                          }`}
                                        >
                                          <Smartphone className="w-3.5 h-3.5" /> 
                                          {waLoading[waKey] ? 'Generando...' : (sale.diffDays <= 0 ? 'Notificar Corte' : 'Notificar Cobro')}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenWhatsAppLink(sale.id, detail.id, 'cambio_credenciales')}
                                          disabled={waLoading[`${detail.id}-cambio_credenciales`]}
                                          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg cursor-pointer w-full sm:w-auto"
                                        >
                                          <Smartphone className="w-3.5 h-3.5" /> 
                                          {waLoading[`${detail.id}-cambio_credenciales`] ? 'Generando...' : 'Reenviar Accesos'}
                                        </button>
                                      )}

                                      <button
                                        onClick={() => onOpenGarantiaModal(detail)}
                                        className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg cursor-pointer bg-transparent w-full sm:w-auto"
                                      >
                                        <ShieldAlert className="w-3.5 h-3.5" /> Reportar Falla
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
