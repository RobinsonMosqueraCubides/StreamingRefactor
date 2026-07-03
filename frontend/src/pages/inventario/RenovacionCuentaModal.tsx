import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertCircle } from 'lucide-react';

interface RenovacionCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCuenta: any;
  onSubmit: (nuevaFechaVencimiento: string) => Promise<void>;
}

export default function RenovacionCuentaModal({ isOpen, onClose, selectedCuenta, onSubmit }: RenovacionCuentaModalProps) {
  const [newFechaVencimiento, setNewFechaVencimiento] = useState('');
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
      const originalDate = new Date(selectedCuenta.fecha_vencimiento);
      originalDate.setDate(originalDate.getDate() + 30);
      const suggestedStr = originalDate.toISOString().split('T')[0];
      setNewFechaVencimiento(suggestedStr);
      setError('');
      setSuccess('');
    }
  }, [selectedCuenta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFechaVencimiento) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await onSubmit(newFechaVencimiento);
      setSuccess('¡Cuenta Madre renovada con éxito!');
      timerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al renovar la Cuenta Madre.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCuenta) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renovar Cuenta Madre (Proveedor)">
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

        <Input
          label="Nueva Fecha de Vencimiento"
          type="date"
          value={newFechaVencimiento}
          onChange={(e) => setNewFechaVencimiento(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
            {loading ? 'Procesando...' : 'Renovar Cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
