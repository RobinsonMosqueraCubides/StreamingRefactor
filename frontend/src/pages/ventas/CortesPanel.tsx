import { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Search, Scissors, Calendar, User, CreditCard } from 'lucide-react';

interface CortesPanelProps {
  ventasVencidas: any[];
  loading: boolean;
}

export default function CortesPanel({ ventasVencidas, loading }: CortesPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCortes = useMemo(() => {
    return ventasVencidas.filter(c => {
      const term = searchTerm.toLowerCase();
      return (
        c.cliente.toLowerCase().includes(term) ||
        c.plataforma.toLowerCase().includes(term) ||
        c.cuenta_madre.toLowerCase().includes(term)
      );
    });
  }, [ventasVencidas, searchTerm]);

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-rose-500" /> Historial de Cortes / Ventas Vencidas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de pantallas liberadas y servicios desactivados.
          </p>
        </div>
        
        {/* Búsqueda */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Buscar por cliente, cuenta o plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-500" />}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm font-semibold">
          Cargando historial de cortes...
        </div>
      ) : filteredCortes.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          {searchTerm ? 'No se encontraron cortes que coincidan con la búsqueda.' : 'No hay cortes registrados en el historial.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCortes.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900/40 p-4 rounded-2xl border border-slate-850 space-y-3.5 hover:border-slate-800 hover:bg-slate-900/50 transition-all"
            >
              {/* Encabezado: Cliente y Monto */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200 text-sm select-all">
                    {c.cliente}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-lg border border-rose-500/10 text-xs font-mono font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                  ${c.monto_pagado.toLocaleString('es-CO')}
                </div>
              </div>

              {/* Detalles técnicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-400 border-t border-slate-850 pt-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Servicio / Plataforma</p>
                  <p className="text-slate-200 font-bold">{c.plataforma}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-black">Cuenta Madre</p>
                  <p className="text-slate-200 font-mono truncate select-all" title={c.cuenta_madre}>
                    {c.cuenta_madre}
                  </p>
                </div>
              </div>

              {/* Fechas de Servicio y Registro */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-850/50 pt-2.5 text-[10px] text-slate-550 font-mono">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inicio: {c.fecha_inicio}</span>
                  <span className="mx-1 text-slate-700">|</span>
                  <span>Fin: {c.fecha_fin}</span>
                </div>
                <div className="bg-slate-955/40 px-2 py-1 rounded text-slate-400 border border-slate-850">
                  Corte: {new Date(c.fecha_corte_registro).toLocaleString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
