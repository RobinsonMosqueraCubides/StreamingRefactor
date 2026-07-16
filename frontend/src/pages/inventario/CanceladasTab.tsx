import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import api from '../../api/axios';
import { Eye, EyeOff, Search } from 'lucide-react';

export default function CanceladasTab() {
  const [canceladas, setCanceladas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: number]: boolean }>({});

  const fetchCanceladas = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/cuentas_madre/canceladas/list');
      setCanceladas(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar las cuentas canceladas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanceladas();
  }, []);

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredCuentas = canceladas.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.correo.toLowerCase().includes(search) ||
      c.plataforma_nombre.toLowerCase().includes(search) ||
      c.proveedor_nombre.toLowerCase().includes(search) ||
      (c.motivo_cancelacion && c.motivo_cancelacion.toLowerCase().includes(search))
    );
  });

  const formatDevolucion = (c: any) => {
    if (c.devolucion_caja > 0) {
      return <span className="text-emerald-400 font-semibold">Caja: ${Number(c.devolucion_caja).toLocaleString()}</span>;
    }
    if (c.devolucion_proveedor > 0) {
      return <span className="text-cyan-400 font-semibold">Proveedor: ${Number(c.devolucion_proveedor).toLocaleString()}</span>;
    }
    return <span className="text-slate-500 font-medium">Ninguna (Pérdida)</span>;
  };

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="w-4 h-4 text-slate-500" />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por correo, plataforma, proveedor o motivo..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm h-11"
        />
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          <span>{error}</span>
        </div>
      )}

      <Card className="overflow-hidden border-slate-850 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="p-4">Original ID</th>
                <th className="p-4">Plataforma</th>
                <th className="p-4">Correo / Clave</th>
                <th className="p-4">Perfiles</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Valor Compra</th>
                <th className="p-4">Fecha Cancelación</th>
                <th className="p-4">Devolución</th>
                <th className="p-4">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-350 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">Cargando histórico de cancelaciones...</td>
                </tr>
              ) : filteredCuentas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">No se encontraron cuentas canceladas.</td>
                </tr>
              ) : (
                filteredCuentas.map((c) => {
                  const showPass = visiblePasswords[c.id] || false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="p-4 font-semibold text-slate-500">#{c.cuenta_madre_id}</td>
                      <td className="p-4">
                        <span className="font-bold text-slate-200">{c.plataforma_nombre}</span>
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="font-medium text-slate-300">{c.correo}</div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span>{showPass ? c.clave : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(c.id)}
                            className="text-slate-500 hover:text-slate-300 focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                          >
                            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-4 font-semibold">{c.max_perfiles} perfiles</td>
                      <td className="p-4 font-medium">{c.proveedor_nombre}</td>
                      <td className="p-4 font-semibold">${Number(c.precio_compra).toLocaleString()}</td>
                      <td className="p-4 text-slate-400">
                        {new Date(c.fecha_cancelacion).toLocaleString()}
                      </td>
                      <td className="p-4">{formatDevolucion(c)}</td>
                      <td className="p-4 max-w-[200px] truncate" title={c.motivo_cancelacion}>
                        {c.motivo_cancelacion || <span className="text-slate-600">N/A</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
