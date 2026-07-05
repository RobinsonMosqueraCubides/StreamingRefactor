import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { AlertCircle } from 'lucide-react';

interface GarantiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDetail: any;
  onSubmit: (payload: any) => Promise<void>;
}

export default function GarantiaModal({ isOpen, onClose, selectedDetail, onSubmit }: GarantiaModalProps) {
  const [tipoGarantia, setTipoGarantia] = useState('CAMBIO_RECURSO');
  const [diasExtendidos, setDiasExtendidos] = useState(0);
  const [liberarRecursoAnterior, setLiberarRecursoAnterior] = useState(false);
  const [montoReembolso, setMontoReembolso] = useState<number | "">(0);
  const [entidadReembolso, setEntidadReembolso] = useState('NEQUI');
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
    if (selectedDetail) {
      setTipoGarantia('CAMBIO_RECURSO');
      setDiasExtendidos(0);
      setLiberarRecursoAnterior(false);
      setMontoReembolso(selectedDetail.precio_aplicado);
      setError('');
      setSuccess('');
    }
  }, [selectedDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload: any = {
        detalle_venta_id: selectedDetail.id,
        tipo_garantia: tipoGarantia,
        dias_extendidos: diasExtendidos,
        liberar_recurso_anterior: liberarRecursoAnterior
      };

      if (tipoGarantia === 'REEMBOLSO') {
        payload.monto_reembolso = Number(montoReembolso) || 0;
        payload.entidad_reembolso = entidadReembolso;
      }

      await onSubmit(payload);
      setSuccess('¡Garantía procesada de forma exitosa!');
      timerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al procesar la garantía.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDetail) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reportar Falla / Aplicar Garantía">
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
          label="Tipo de Resolución"
          value={tipoGarantia}
          onChange={(e) => setTipoGarantia(e.target.value)}
        >
          <option value="CAMBIO_RECURSO">Cambio de Perfil/Pantalla (Automático)</option>
          <option value="CAMBIO_CLAVE">Actualizar Clave (Sólo informático)</option>
          <option value="AGREGAR_DIAS">Compensar días (Extender corte)</option>
          <option value="REEMBOLSO">Reembolso Financiero (Egreso Caja)</option>
        </Select>

        {tipoGarantia === 'AGREGAR_DIAS' && (
          <Input
            label="Días a Extender"
            type="number"
            value={diasExtendidos}
            onChange={(e) => setDiasExtendidos(parseInt(e.target.value) || 0)}
            min="0"
            required
          />
        )}

        {tipoGarantia === 'REEMBOLSO' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monto Reembolso (COP)"
              type="number"
              value={montoReembolso}
              onChange={(e) => {
                const val = e.target.value;
                setMontoReembolso(val === "" ? "" : parseFloat(val) || 0);
              }}
              min="0"
              required
            />
            <Select
              label="Medio de Reembolso"
              value={entidadReembolso}
              onChange={(e) => setEntidadReembolso(e.target.value)}
            >
              <option value="NEQUI">Nequi</option>
              <option value="DAVIPLATA">Daviplata</option>
              <option value="BANCOLOMBIA">Bancolombia</option>
              <option value="NU_BANK">Nu Bank</option>
              <option value="EFECTIVO">Efectivo</option>
            </Select>
          </div>
        )}

        {tipoGarantia === 'CAMBIO_RECURSO' && (
          <div className="flex items-center gap-2 bg-slate-955/40 p-3.5 rounded-xl border border-slate-850">
            <input
              type="checkbox"
              id="liberar_recurso"
              checked={liberarRecursoAnterior}
              onChange={(e) => setLiberarRecursoAnterior(e.target.checked)}
              className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="liberar_recurso" className="text-xs text-slate-300 font-medium cursor-pointer">
              ¿Liberar recurso anterior? (Marcar sólo si el cliente puede seguir usándolo)
            </label>
          </div>
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
