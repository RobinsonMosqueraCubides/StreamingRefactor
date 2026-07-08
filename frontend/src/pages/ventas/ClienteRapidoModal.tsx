import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import api from '../../api/axios';
import { AlertCircle } from 'lucide-react';
import type { Cliente } from '../../types';
import { useMetadata } from '../../context/MetadataContext';

interface ClienteRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cliente: Cliente) => void;
}

export default function ClienteRapidoModal({ isOpen, onClose, onSuccess }: ClienteRapidoModalProps) {
  const { refreshMetadata } = useMetadata();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipo, setTipo] = useState('FINAL');
  const [diasGraciaMax, setDiasGraciaMax] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!nombre.trim() || !telefono.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/clientes/', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        tipo,
        estado: 'ACTIVO',
        dias_gracia_max: Number(diasGraciaMax) || 0
      });
      
      await refreshMetadata();
      onSuccess(res.data);
      onClose();
      // Reset state
      setNombre('');
      setTelefono('');
      setTipo('FINAL');
      setDiasGraciaMax(0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear el cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nuevo Cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Nombre"
          placeholder="Ej: Juan Pérez"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <Input
          label="Teléfono Celular"
          placeholder="Ej: +573001234567"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          required
        />

        <Select
          label="Tipo de Cliente"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="FINAL">Cliente Final</option>
          <option value="REVENDEDOR">Revendedor (Mayorista)</option>
        </Select>

        <Input
          label="Días de gracia máximos"
          type="number"
          value={diasGraciaMax}
          onChange={(e) => setDiasGraciaMax(parseInt(e.target.value) || 0)}
          min={0}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-850">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="bg-cyan-500 hover:bg-cyan-400 text-slate-955 font-bold">
            {loading ? 'Creando...' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
