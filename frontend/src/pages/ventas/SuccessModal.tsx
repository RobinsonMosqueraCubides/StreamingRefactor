import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import api from '../../api/axios';
import { Eye, EyeOff, Smartphone, ShieldCheck, DollarSign } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredVenta: any;
  cuentas: any[];
  credenciales: any[];
  plataformas: any[];
  abonoMonto: number;
  setAbonoMonto: (val: number) => void;
  abonoEntidad: string;
  setAbonoEntidad: (val: string) => void;
  editablePerfiles: any;
  setEditablePerfiles: any;
  onFinalize: () => Promise<void>;
  loading: boolean;
}

export default function SuccessModal({
  isOpen,
  onClose,
  registeredVenta,
  cuentas,
  credenciales,
  plataformas,
  abonoMonto,
  setAbonoMonto,
  abonoEntidad,
  setAbonoEntidad,
  editablePerfiles,
  setEditablePerfiles,
  onFinalize,
  loading
}: SuccessModalProps) {
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

  const handleOpenWhatsAppConsolidated = async (ventaId: number) => {
    const key = 'consolidated';
    setWaLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/ventas/${ventaId}/whatsapp-consolidated`);
      window.open(res.data.url, '_blank');
    } catch (err: any) {
      alert('Error al generar el enlace de WhatsApp consolidado: ' + (err.response?.data?.detail || err.message));
    } finally {
      setWaLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  if (!registeredVenta) return null;

  const getPlataformaName = (platId: number) => {
    return plataformas.find(p => p.id === platId)?.nombre || `Plataforma #${platId}`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="¡Venta Registrada Exitosamente!"
    >
      <div className="space-y-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500 rounded-lg text-slate-950">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Suscripciones asignadas</h3>
            <p className="text-xs text-slate-400">Personaliza los accesos a continuación y regístralos en la base de datos.</p>
          </div>
        </div>

        {/* Detalles de accesos asignados */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Detalles de Accesos Asignados:</h4>
          {registeredVenta.detalles.map((detail: any, index: number) => {
            const cm = cuentas.find(c => c.id === detail.cuenta_madre_id);
            const cred = credenciales.find(c => c.id === cm?.credencial_id);
            const email = cred?.email || 'N/A';
            const password = cred?.password || 'N/A';
            const platName = getPlataformaName(cm?.plataforma_id || 0);
            const editData = editablePerfiles[detail.perfil_id] || { nombre_perfil: '', pin: '' };

            return (
              <div key={index} className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                  <span className="text-sm font-bold text-slate-200">{platName}</span>
                </div>

                {/* Credenciales no editables con enmascaramiento y botón de revelación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Usuario Cuenta</p>
                    <p className="text-xs text-slate-300 font-mono select-all bg-slate-950/50 p-1.5 rounded border border-slate-800">{email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">
                      <span>Clave Cuenta</span>
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
                    <p className="text-xs text-slate-300 font-mono select-all bg-slate-950/50 p-1.5 rounded border border-slate-800">
                      {showPasswords[cred?.id || 0] ? password : '••••••••'}
                    </p>
                  </div>
                </div>

                {/* Campos editables para Usuario y PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nombre Perfil (Usuario)"
                    value={editData.nombre_perfil}
                    onChange={(e) => setEditablePerfiles((prev: any) => ({
                      ...prev,
                      [detail.perfil_id]: { ...editData, nombre_perfil: e.target.value }
                    }))}
                    placeholder="Ej. Juan Perez"
                    required
                  />
                  <Input
                    label="PIN Perfil"
                    value={editData.pin}
                    onChange={(e) => setEditablePerfiles((prev: any) => ({
                      ...prev,
                      [detail.perfil_id]: { ...editData, pin: e.target.value }
                    }))}
                    placeholder="Ej. 1234"
                    maxLength={10}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpenWhatsAppLink(registeredVenta.id, detail.id, 'cambio_credenciales')}
                    disabled={waLoading[`${detail.id}-cambio_credenciales`]}
                    className="text-xs text-cyan-400 border border-cyan-400/20 bg-cyan-500/5 hover:bg-cyan-500/10 font-bold flex items-center gap-1 cursor-pointer py-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> 
                    {waLoading[`${detail.id}-cambio_credenciales`] ? 'Generando...' : 'Enviar Accesos WhatsApp'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Abono Contable */}
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-cyan-400" /> Registro de Pago Recibido
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monto del Abono (COP)"
              type="number"
              value={abonoMonto}
              onChange={(e) => setAbonoMonto(parseFloat(e.target.value) || 0)}
              min="0"
            />
            <Select
              label="Método de Recibo"
              value={abonoEntidad}
              onChange={(e) => setAbonoEntidad(e.target.value)}
            >
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="BANCOLOMBIA">Bancolombia</option>
              <option value="NU_BANK">Nu Bank</option>
              <option value="EFECTIVO">Efectivo</option>
            </Select>
          </div>
        </div>

        {/* Botón de Enlace de WhatsApp Consolidado */}
        {registeredVenta.detalles.length > 1 && (
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={() => handleOpenWhatsAppConsolidated(registeredVenta.id)}
              disabled={waLoading['consolidated']}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center gap-2 px-6 py-2.5 rounded-xl cursor-pointer border-none shadow-lg shadow-emerald-500/15"
            >
              <Smartphone className="w-4 h-4" /> 
              {waLoading['consolidated'] ? 'Generando...' : 'Enviar Todos los Accesos Consilidados'}
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-850">
          <Button 
            onClick={onFinalize} 
            disabled={loading} 
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl cursor-pointer"
          >
            {loading ? 'Guardando...' : 'Guardar Accesos y Registrar Abono'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
