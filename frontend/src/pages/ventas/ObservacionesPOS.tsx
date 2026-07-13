import { useState, useEffect } from 'react';
import api from '../../api/axios';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { 
  FileText, Link2, Plus, Trash2, Save, ExternalLink, AlertCircle 
} from 'lucide-react';

interface Proveedor {
  id: number;
  nombre: string;
}

interface Enlace {
  id: number;
  nombre: string;
  url: string;
}

interface ObservacionesPOSProps {
  proveedores: Proveedor[];
  nota: string;
  setNota: (val: string) => void;
}

export default function ObservacionesPOS({ 
  proveedores,
  nota,
  setNota
}: ObservacionesPOSProps) {
  const [activeSubTab, setActiveSubTab] = useState<'ventas' | 'proveedores'>('ventas');

  // --- PROVIDER STATES ---
  const [selectedProvId, setSelectedProvId] = useState('');
  const [provObservaciones, setProvObservaciones] = useState('');
  const [provEnlaces, setProvEnlaces] = useState<Enlace[]>([]);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [provLoading, setProvLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [provError, setProvError] = useState('');

  // --- ACTIONS FOR PROVIDERS ---
  const fetchProveedorData = async (provId: string) => {
    if (!provId) {
      setProvObservaciones('');
      setProvEnlaces([]);
      return;
    }
    try {
      setProvLoading(true);
      setProvError('');
      const res = await api.get(`/notas/proveedores/${provId}`);
      setProvObservaciones(res.data.observaciones || '');
      setProvEnlaces(res.data.enlaces || []);
    } catch (e) {
      console.error('Error al cargar notas del proveedor:', e);
    } finally {
      setProvLoading(false);
    }
  };

  const handleSaveObservaciones = async () => {
    if (!selectedProvId) return;
    try {
      setActionLoading(true);
      setProvError('');
      await api.put(`/notas/proveedores/${selectedProvId}/observaciones`, {
        observaciones: provObservaciones
      });
      alert('Observaciones guardadas con éxito.');
    } catch (e: any) {
      setProvError(e.response?.data?.detail || 'Error al guardar observaciones.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddEnlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvId || !newLinkName.trim() || !newLinkUrl.trim()) return;
    try {
      setActionLoading(true);
      setProvError('');
      await api.post(`/notas/proveedores/${selectedProvId}/enlaces`, {
        nombre: newLinkName,
        url: newLinkUrl
      });
      setNewLinkName('');
      setNewLinkUrl('');
      await fetchProveedorData(selectedProvId);
    } catch (e: any) {
      setProvError(e.response?.data?.detail || 'Error al agregar el enlace.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEnlace = async (linkId: number) => {
    if (!window.confirm('¿Deseas eliminar este enlace?')) return;
    try {
      setActionLoading(true);
      setProvError('');
      await api.delete(`/notas/proveedores/enlaces/${linkId}`);
      await fetchProveedorData(selectedProvId);
    } catch (e: any) {
      setProvError(e.response?.data?.detail || 'Error al eliminar el enlace.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'proveedores') {
      if (proveedores.length > 0 && !selectedProvId) {
        setSelectedProvId(String(proveedores[0].id));
        fetchProveedorData(String(proveedores[0].id));
      }
    }
  }, [activeSubTab, proveedores]);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
      {/* Botones de Pestañas */}
      <div className="flex border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('ventas')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none bg-transparent flex justify-center items-center gap-1.5 ${
            activeSubTab === 'ventas' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Ventas
        </button>
        <button
          onClick={() => setActiveSubTab('proveedores')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-none bg-transparent flex justify-center items-center gap-1.5 ${
            activeSubTab === 'proveedores' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" /> Proveedores
        </button>
      </div>

      {/* PESTAÑA VENTAS */}
      {activeSubTab === 'ventas' && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Observación / Nota de la Venta
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Escribe alguna observación o nota para la venta actual..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-250 focus:border-cyan-500 focus:outline-none h-28 resize-none"
          />
        </div>
      )}

      {/* PESTAÑA PROVEEDORES */}
      {activeSubTab === 'proveedores' && (
        <div className="space-y-4">
          <Select
            label="Proveedor"
            value={selectedProvId}
            onChange={(e) => {
              setSelectedProvId(e.target.value);
              fetchProveedorData(e.target.value);
            }}
          >
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </Select>

          {provError && (
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{provError}</span>
            </div>
          )}

          {selectedProvId && (
            <>
              {/* Opción 1: Observaciones */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observaciones del Proveedor</label>
                <textarea
                  value={provObservaciones}
                  onChange={(e) => setProvObservaciones(e.target.value)}
                  placeholder="Detalles del proveedor, datos bancarios..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none h-16 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveObservaciones}
                    disabled={actionLoading || provLoading}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 border-none cursor-pointer"
                  >
                    <Save className="w-3 h-3" /> Guardar Observaciones
                  </Button>
                </div>
              </div>

              {/* Opción 2: Enlaces */}
              <div className="space-y-2 border-t border-slate-850 pt-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Enlaces Rápidos ({provEnlaces.length}/2)
                </label>

                {/* Listado Enlaces */}
                {provEnlaces.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No hay enlaces registrados.</p>
                ) : (
                  <div className="space-y-1.5">
                    {provEnlaces.map((link) => (
                      <div key={link.id} className="bg-slate-955/60 border border-slate-850/60 px-2.5 py-1.5 rounded-lg flex justify-between items-center text-xs">
                        <a
                          href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {link.nombre} <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={() => handleDeleteEnlace(link.id)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer bg-transparent border-none p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario Enlaces (solo si enlaces < 2) */}
                {provEnlaces.length < 2 && (
                  <form onSubmit={handleAddEnlace} className="bg-slate-950/20 border border-slate-850 p-2 rounded-xl space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre (ej: Pago)"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        required
                        className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none w-full"
                      />
                      <input
                        type="text"
                        placeholder="URL (ej: mercadopago.com)"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        required
                        className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none w-full"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[10px] flex items-center gap-1 border-none cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Enlace
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
