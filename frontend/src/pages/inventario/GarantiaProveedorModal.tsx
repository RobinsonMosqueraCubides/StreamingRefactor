import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { AlertCircle } from 'lucide-react';

interface GarantiaProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCuenta: any;
  onSubmit: (payload: any) => Promise<void>;
}

export default function GarantiaProveedorModal({ isOpen, onClose, selectedCuenta, onSubmit }: GarantiaProveedorModalProps) {
  const [tipoGarantiaProv, setTipoGarantiaProv] = useState('CAMBIO_CLAVE');
  const [nuevaClaveProv, setNuevaClaveProv] = useState('');
  const [nuevoEmailProv, setNuevoEmailProv] = useState('');
  const [montoSaldoAFavorProv, setMontoSaldoAFavorProv] = useState<number | "">(0);
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
      setTipoGarantiaProv('CAMBIO_CLAVE');
      setNuevaClaveProv('');
      setNuevoEmailProv('');
      setMontoSaldoAFavorProv(selectedCuenta.precio_compra);
      setError('');
      setSuccess('');
    }
  }, [selectedCuenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCuenta) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload: any = {
        cuenta_madre_id: selectedCuenta.id,
        tipo: tipoGarantiaProv
      };

      if (tipoGarantiaProv === 'CAMBIO_CLAVE') {
        payload.nueva_clave = nuevaClaveProv;
      } else if (tipoGarantiaProv === 'CAMBIO_CUENTA') {
        payload.nueva_clave = nuevaClaveProv;
        if (nuevoEmailProv) payload.nuevo_email = nuevoEmailProv;
      } else if (tipoGarantiaProv === 'SALDO_A_FAVOR') {
        payload.monto_saldo_a_favor = Number(montoSaldoAFavorProv) || 0;
      }

      await onSubmit(payload);
      setSuccess('¡Garantía aplicada al proveedor con éxito!');
      timerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al aplicar garantía al proveedor.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCuenta) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reportar Caída a Proveedor (Garantía)">
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

        <Select
          label="Resolución Acordada"
          value={tipoGarantiaProv}
          onChange={(e) => setTipoGarantiaProv(e.target.value)}
        >
          <option value="CAMBIO_CLAVE">El proveedor cambió la clave</option>
          <option value="CAMBIO_CUENTA">El proveedor dió cuenta nueva</option>
          <option value="SALDO_A_FAVOR">El proveedor dió Saldo a Favor</option>
        </Select>

        {(tipoGarantiaProv === 'CAMBIO_CLAVE' || tipoGarantiaProv === 'CAMBIO_CUENTA') && (
          <Input
            label="Nueva Contraseña de Acceso"
            type="text"
            value={nuevaClaveProv}
            onChange={(e) => setNuevaClaveProv(e.target.value)}
            placeholder="Escribe la contraseña provista por el proveedor..."
            required
          />
        )}

        {tipoGarantiaProv === 'CAMBIO_CUENTA' && (
          <Input
            label="Nuevo Correo / Usuario (Opcional)"
            type="email"
            value={nuevoEmailProv}
            onChange={(e) => setNuevoEmailProv(e.target.value)}
            placeholder="Dejar vacío si es el mismo correo..."
          />
        )}

        {tipoGarantiaProv === 'SALDO_A_FAVOR' && (
          <Input
            label="Monto Saldo a Favor (COP)"
            type="number"
            value={montoSaldoAFavorProv}
            onChange={(e) => {
              const val = e.target.value;
              setMontoSaldoAFavorProv(val === "" ? "" : parseFloat(val) || 0);
            }}
            min="0"
            required
          />
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
            {loading ? 'Procesando...' : 'Aplicar Garantía'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
