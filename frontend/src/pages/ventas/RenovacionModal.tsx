import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { AlertCircle } from 'lucide-react';

interface RenovacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSale: any;
  onSubmit: (nuevaFechaCorte: string) => Promise<void>;
}

export default function RenovacionModal({ isOpen, onClose, selectedSale, onSubmit }: RenovacionModalProps) {
  const [nuevaFechaCorte, setNuevaFechaCorte] = useState('');
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
    if (selectedSale) {
      const originalDate = new Date(selectedSale.fecha_corte);
      originalDate.setDate(originalDate.getDate() + 30);
      const suggestedStr = originalDate.toISOString().split('T')[0];
      setNuevaFechaCorte(suggestedStr);
      setError('');
      setSuccess('');
    }
  }, [selectedSale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFechaCorte) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await onSubmit(nuevaFechaCorte);
      setSuccess('¡Suscripción renovada con éxito!');
      timerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al renovar la suscripción.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedSale) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Renovar Suscripción de Cliente">
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
          label="Nueva Fecha de Corte"
          type="date"
          value={nuevaFechaCorte}
          onChange={(e) => setNuevaFechaCorte(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
            {loading ? 'Procesando...' : 'Renovar Suscripción'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
