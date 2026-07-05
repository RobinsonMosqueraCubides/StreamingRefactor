import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { 
  TrendingUp, TrendingDown, Wallet, BarChart3, Plus, 
  ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Tag 
} from 'lucide-react';

interface Transaccion {
  id: number;
  tipo: 'INGRESO' | 'EGRESO';
  categoria: string;
  monto: number;
  entidad: string;
  referencia_id: number | null;
  fecha: string;
}

interface Venta {
  id: number;
  cliente_id: number;
  fecha_corte: string;
  monto_total: number;
  estado_pago: 'PAGADO' | 'PENDIENTE' | 'PAGO_PARCIAL';
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaccion[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick Expense Form States
  const [gastoMonto, setGastoMonto] = useState<number | "">(10000);
  const [gastoCategoria, setGastoCategoria] = useState('Servicios (Luz/Internet)');
  const [gastoEntidad, setGastoEntidad] = useState('NEQUI');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [transRes, salesRes] = await Promise.all([
        api.get('/finanzas/transacciones'),
        api.get('/ventas/'),
      ]);
      setTransactions(transRes.data);
      setSales(salesRes.data);
    } catch (err: any) {
      setError('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRegisterExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      await api.post('/finanzas/gastos', {
        categoria: gastoCategoria,
        monto: Number(gastoMonto) || 0,
        entidad: gastoEntidad
      });
      setFormSuccess('Gasto registrado con éxito.');
      setGastoMonto(10000);
      setGastoCategoria('Servicios (Luz/Internet)');
      fetchDashboardData();
    } catch (err: any) {
      setFormError('Error al registrar el egreso.');
    }
  };

  // Financial Calculations
  const calculateIngresos = () => {
    return transactions
      .filter(t => t.tipo === 'INGRESO')
      .reduce((sum, t) => sum + Number(t.monto), 0);
  };

  const calculateEgresos = () => {
    return transactions
      .filter(t => t.tipo === 'EGRESO')
      .reduce((sum, t) => sum + Number(t.monto), 0);
  };

  const calculateCuentasPorCobrar = () => {
    let debt = 0;
    sales.forEach(v => {
      if (v.estado_pago === 'PENDIENTE') {
        debt += Number(v.monto_total);
      } else if (v.estado_pago === 'PAGO_PARCIAL') {
        const abonos = transactions
          .filter(t => t.tipo === 'INGRESO' && t.referencia_id === v.id)
          .reduce((sum, t) => sum + Number(t.monto), 0);
        debt += Math.max(0, Number(v.monto_total) - abonos);
      }
    });
    return debt;
  };

  const balanceNeto = calculateIngresos() - calculateEgresos();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Dashboard Financiero</h1>
        <p className="text-slate-400 text-sm mt-1">Monitorea tus ingresos, egresos y cuentas por cobrar en tiempo real.</p>
      </div>

      {loading && transactions.length === 0 ? (
        <p className="text-slate-400 text-sm">Cargando estadísticas...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          {/* Tarjetas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 kpi-metrics-grid">
            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-slate-900 border-emerald-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Ingresos Totales</p>
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-slate-100">${calculateIngresos().toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-450 mt-1">Caja y abonos consolidados</p>
            </Card>

            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-rose-500/10 to-slate-900 border-rose-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">Egresos Totales</p>
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-slate-100">${calculateEgresos().toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-450 mt-1">Gastos e inventario comprado</p>
            </Card>

            <Card hoverEffect className={`relative overflow-hidden bg-gradient-to-br border-cyan-500/10 ${balanceNeto >= 0 ? 'from-cyan-500/10 to-slate-900' : 'from-rose-500/10 to-slate-900'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider">Balance de Caja</p>
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-slate-100">${balanceNeto.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-450 mt-1">Utilidad neta actual</p>
            </Card>

            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-slate-900 border-amber-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Por Cobrar</p>
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-slate-100">${calculateCuentasPorCobrar().toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-450 mt-1">Suscripciones sin liquidar</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registro de Gastos Manuales */}
            <Card className="bg-slate-900/40 space-y-4">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-400" /> Registrar Gasto Rápido
              </h2>

              {formSuccess && <p className="text-xs text-green-400 font-semibold">{formSuccess}</p>}
              {formError && <p className="text-xs text-red-400 font-semibold">{formError}</p>}

              <form onSubmit={handleRegisterExpense} className="space-y-4">
                <Input
                  label="Categoría / Motivo"
                  placeholder="Ej: Internet local, Luz, Arriendo"
                  value={gastoCategoria}
                  onChange={(e) => setGastoCategoria(e.target.value)}
                  leftIcon={<Tag className="w-4 h-4 text-slate-500" />}
                  required
                />

                <Input
                  label="Monto del Gasto (COP)"
                  type="number"
                  value={gastoMonto}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGastoMonto(val === "" ? "" : parseFloat(val) || 0);
                  }}
                  leftIcon={<DollarSign className="w-4 h-4 text-slate-500" />}
                  min={1}
                  required
                />

                <Select
                  label="Entidad Financiera (Origen de Caja)"
                  value={gastoEntidad}
                  onChange={(e) => setGastoEntidad(e.target.value)}
                  options={[
                    { value: 'NEQUI', label: 'Nequi' },
                    { value: 'BANCOLOMBIA', label: 'Bancolombia' },
                    { value: 'DAVIPLATA', label: 'Daviplata' },
                    { value: 'NU_BANK', label: 'Nu Bank' },
                    { value: 'EFECTIVO', label: 'Efectivo' },
                  ]}
                  required
                />

                <Button type="submit" variant="danger" className="w-full">
                  Registrar Egreso
                </Button>
              </form>
            </Card>

            {/* Listado de Transacciones Recientes */}
            <Card className="lg:col-span-2 bg-slate-900/40 space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Flujo de Caja Reciente</h2>
              
              <div className="overflow-hidden rounded-xl border border-slate-850/80 bg-slate-950/20 divide-y divide-slate-850">
                {transactions.slice(0, 5).map((trans) => (
                  <div key={trans.id} className="p-4 flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        trans.tipo === 'INGRESO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {trans.tipo === 'INGRESO' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{trans.categoria}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(trans.fecha).toLocaleString('es-CO', { 
                            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${
                        trans.tipo === 'INGRESO' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {trans.tipo === 'INGRESO' ? '+' : '-'}${trans.monto.toLocaleString('es-CO')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{trans.entidad}</p>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">No se han registrado transacciones.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
