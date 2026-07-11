import { useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { 
  Eye, EyeOff, Copy, Check, Smartphone, ShieldAlert, Calendar, User 
} from 'lucide-react';
import type { Cliente, Plataforma, CuentaMadre, Credencial } from '../../types';

interface VentaDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  clientes: Cliente[];
  plataformas: Plataforma[];
  cuentas: CuentaMadre[];
  credenciales: Credencial[];
  onOpenGarantiaModal: (detail: any) => void;
  onOpenWhatsAppLink: (ventaId: number, detailId: number, templateType: string) => Promise<void>;
  waLoading: {[key: string]: boolean};
}

export default function VentaDetalleModal({
  isOpen,
  onClose,
  sale,
  clientes,
  plataformas,
  cuentas,
  credenciales,
  onOpenGarantiaModal,
  onOpenWhatsAppLink,
  waLoading
}: VentaDetalleModalProps) {
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

  if (!sale) return null;

  const cliente = clientes.find(c => c.id === sale.cliente_id) || {
    id: sale.cliente_id,
    nombre: `Cliente #${sale.cliente_id}`,
    telefono: 'N/A'
  };

  const getPlataformaName = (platId: number) => {
    if (!platId) return 'Plataforma Desconocida';
    return plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
  };

  const getDetailPlatName = (d: any) => {
    const cm = cuentas.find(c => c.id === d.cuenta_madre_id);
    return getPlataformaName(d.plataforma_id || (cm ? cm.plataforma_id : 0));
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

  const getStatusColor = (status: string) => {
    if (status === 'PAGADO') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (status === 'PAGO_PARCIAL') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
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

  const copyToClipboard = (text: string | undefined, fieldKey: string) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [fieldKey]: false }));
    }, 2000);
  };

  // Group details
  const detailsByCuenta: { [key: number]: any[] } = {};
  const noCuentaDetails: any[] = [];
  
  sale.detalles.forEach((d: any) => {
    if (d.cuenta_madre_id) {
      if (!detailsByCuenta[d.cuenta_madre_id]) {
        detailsByCuenta[d.cuenta_madre_id] = [];
      }
      detailsByCuenta[d.cuenta_madre_id].push(d);
    } else {
      noCuentaDetails.push(d);
    }
  });

  const renderList: any[] = [];

  Object.entries(detailsByCuenta).forEach(([cmIdStr, listDetalles]) => {
    const cmId = parseInt(cmIdStr);
    const cm = cuentas.find(c => c.id === cmId);
    const isCuentaCompleta = cm && (listDetalles.length === cm.max_perfiles);

    if (isCuentaCompleta) {
      renderList.push({
        isCuentaCompleta: true,
        detail: { ...listDetalles[0], perfil_id: null },
        allDetails: listDetalles
      });
    } else {
      listDetalles.forEach(d => {
        renderList.push({
          isCuentaCompleta: false,
          detail: d,
          allDetails: [d]
        });
      });
    }
  });

  noCuentaDetails.forEach(d => {
    renderList.push({
      isCuentaCompleta: false,
      detail: d,
      allDetails: [d]
    });
  });

  return createPortal(
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Venta #${sale.id}`}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Cabecera / Info del Cliente */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <User className="w-3.5 h-3.5" />
              <span>Cliente</span>
            </div>
            <p className="text-sm font-bold text-slate-200">{cliente.nombre}</p>
            <p className="text-xs text-slate-400 font-mono">Celular: {cliente.telefono}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>Suscripción</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-300">Inicio: <span className="font-mono text-slate-400">{sale.fecha_inicio}</span></p>
              <p className="text-xs font-semibold text-slate-300">Corte: <span className="font-mono text-slate-400">{sale.fecha_corte}</span></p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(sale.estado_pago)}`}>
                {sale.estado_pago}
              </span>
              <span className="text-xs font-bold text-cyan-400 font-mono">
                ${sale.monto_total.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>
        </div>

        {/* Listado de Servicios */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Servicios Adquiridos</h4>
          
          {renderList.map((item: any) => {
            const detail = item.detail;
            const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
            const cred = credenciales.find(c => c.id === cm?.credencial_id);
            const detailPlatformName = getDetailPlatName(detail);
            
            const detailKeyStr = `modal-detail-${detail.id}`;
            const pwKey = `pw-${detailKeyStr}`;
            
            let profileUser = cliente.nombre;
            let pinVal = 'N/A';
            if (!item.isCuentaCompleta && cm && cm.perfiles) {
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
                className="bg-slate-900/30 p-4 rounded-xl border border-slate-850 space-y-4"
              >
                {/* Cabecera del Item */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {renderPlatformLogo(detailPlatformName)}
                    <div>
                      <p className="text-sm font-bold text-slate-200">{detailPlatformName}</p>
                      <div className="flex gap-1 mt-0.5">
                        {getTipoUnidadBadge(detail)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenGarantiaModal(detail);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-350 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Reportar Falla
                  </button>
                </div>

                {/* Credenciales de Acceso */}
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850 space-y-2.5 text-xs">
                  {/* Email / Usuario */}
                  <div className="flex justify-between items-center gap-2 py-0.5">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Usuario (Email):</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-300 truncate select-all">{cred?.email || 'N/A'}</span>
                      {cred?.email && (
                        <button
                          onClick={() => copyToClipboard(cred.email, `email-${detail.id}`)}
                          className="text-slate-500 hover:text-slate-350 bg-transparent border-none cursor-pointer p-0.5"
                          title="Copiar usuario"
                        >
                          {copiedStates[`email-${detail.id}`] ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="flex justify-between items-center gap-2 py-0.5">
                    <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Contraseña:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-300 select-all">
                        {showPasswords[pwKey] ? (cred?.password || 'N/A') : '••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {cred && (
                          <button
                            onClick={() => setShowPasswords(prev => ({ ...prev, [pwKey]: !prev[pwKey] }))}
                            className="text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer p-0.5"
                            title={showPasswords[pwKey] ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPasswords[pwKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {cred?.password && (
                          <button
                            onClick={() => copyToClipboard(cred.password, `pass-${detail.id}`)}
                            className="text-slate-500 hover:text-slate-350 bg-transparent border-none cursor-pointer p-0.5"
                            title="Copiar contraseña"
                          >
                            {copiedStates[`pass-${detail.id}`] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Perfil & PIN si no es cuenta completa */}
                  {detail.perfil_id ? (
                    <>
                      {/* Perfil */}
                      <div className="flex justify-between items-center gap-2 py-0.5 border-t border-slate-900/60 pt-2">
                        <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">Perfil:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-slate-300 select-all font-bold">{profileUser}</span>
                          <button
                            onClick={() => copyToClipboard(profileUser, `profile-${detail.id}`)}
                            className="text-slate-500 hover:text-slate-350 bg-transparent border-none cursor-pointer p-0.5"
                            title="Copiar nombre de perfil"
                          >
                            {copiedStates[`profile-${detail.id}`] ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* PIN */}
                      <div className="flex justify-between items-center gap-2 py-0.5">
                        <span className="text-slate-500 uppercase text-[9px] font-bold tracking-wider">PIN:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 select-all font-bold">{pinVal}</span>
                          {pinVal !== 'N/A' && (
                            <button
                              onClick={() => copyToClipboard(pinVal, `pin-${detail.id}`)}
                              className="text-slate-500 hover:text-slate-350 bg-transparent border-none cursor-pointer p-0.5"
                              title="Copiar PIN"
                            >
                              {copiedStates[`pin-${detail.id}`] ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-50" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-1 border-t border-slate-900/60 pt-2 text-center">
                      <span className="text-sky-400 font-bold font-sans">
                        Acceso Total (Cuenta Completa sin límites de perfil)
                      </span>
                    </div>
                  )}
                </div>

                {/* Notificación de WhatsApp */}
                <div className="flex justify-end pt-1">
                  {(sale.diffDays === 2 || sale.diffDays <= 0) ? (
                    <button
                      onClick={() => onOpenWhatsAppLink(sale.id, detail.id, typeTemplate)}
                      disabled={waLoading[waKey]}
                      className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-all px-3 py-2 rounded-lg border cursor-pointer w-full sm:w-auto ${
                        sale.diffDays <= 0 
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20' 
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> 
                      {waLoading[waKey] ? 'Generando...' : (sale.diffDays <= 0 ? 'Notificar Corte (WhatsApp)' : 'Notificar Cobro (WhatsApp)')}
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenWhatsAppLink(sale.id, detail.id, 'cambio_credenciales')}
                      disabled={waLoading[`${detail.id}-cambio_credenciales`]}
                      className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-3 py-2 rounded-lg cursor-pointer w-full sm:w-auto"
                    >
                      <Smartphone className="w-3.5 h-3.5" /> 
                      {waLoading[`${detail.id}-cambio_credenciales`] ? 'Generando...' : 'Reenviar Accesos (WhatsApp)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-850 mt-4">
        <Button onClick={onClose} variant="ghost">
          Cerrar
        </Button>
      </div>
    </Modal>,
    document.body
  );
}
