import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertCircle } from 'lucide-react';

interface CancelarCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCuenta: any;
  onSubmit: (payload: {
    motivo_cancelacion: string;
    devolucion_tipo: 'CAJA' | 'SALDO_PROVEEDOR' | 'NINGUNA';
    monto_devolucion: number;
    entidad_pago: string | null;
  }) => Promise<void>;
}

export default function CancelarCuentaModal({ isOpen, onClose, selectedCuenta, onSubmit }: CancelarCuentaModalProps) {
  const [motivo, setMotivo] = useState('');
  const [devolucionTipo, setDevolucionTipo] = useState<'CAJA' | 'SALDO_PROVEEDOR' | 'NINGUNA'>('NINGUNA');
  const [montoDevolucion, setMontoDevolucion] = useState(0);
  const [entidadPago, setEntidadPago] = useState<string>('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedCuenta) {
      setMotivo('');
      setDevolucionTipo('NINGUNA');
      setMontoDevolucion(0);
      setEntidadPago('');
      setError('');
      setSuccess('');
    }
  }, [selectedCuenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        motivo_cancelacion: motivo,
        devolucion_tipo: devolucionTipo,
        monto_devolucion: Number(montoDevolucion) || 0,
        entidad_pago: devolucionTipo === 'CAJA' ? entidadPago : null
      };

      await onSubmit(payload);
      setSuccess('¡Cuenta Madre cancelada y archivada con éxito!');
      timerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cancelar la Cuenta Madre.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCuenta) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancelar Cuenta Madre">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold">
            {success}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo de Cancelación</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm min-h-[80px]"
            placeholder="Describe el motivo por el cual cancelas esta cuenta..."
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Devolución</label>
          <select
            value={devolucionTipo}
            onChange={(e) => {
              const val = e.target.value as 'CAJA' | 'SALDO_PROVEEDOR' | 'NINGUNA';
              setDevolucionTipo(val);
              if (val === 'NINGUNA') setMontoDevolucion(0);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm h-10"
          >
            <option value="NINGUNA">Sin Reembolso (Pérdida)</option>
            <option value="CAJA">Devolución a Caja (Efectivo/Banco)</option>
            <option value="SALDO_PROVEEDOR">Saldo a Favor con Proveedor</option>
          </select>
        </div>

        {devolucionTipo !== 'NINGUNA' && (
          <Input
            label="Monto de Devolución"
            type="number"
            value={montoDevolucion}
            onChange={(e) => setMontoDevolucion(Number(e.target.value) || 0)}
            required
            min={0}
          />
        )}

        {devolucionTipo === 'CAJA' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entidad Financiera</label>
            <select
              value={entidadPago}
              onChange={(e) => setEntidadPago(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm h-10"
              required
            >
              <option value="">Selecciona una entidad...</option>
              <option value="NEQUI">Nequi</option>
              <option value="BANCOLOMBIA">Bancolombia</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="NU_BANK">Nu Bank</option>
              <option value="EFECTIVO">Efectivo</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          <Button type="submit" disabled={loading} className="bg-red-500 hover:bg-red-400 text-white font-bold">
            {loading ? 'Procesando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
