import { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import { 
  TrendingUp, TrendingDown, Wallet, BarChart3, Plus, 
  ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Tag, ShieldAlert 
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

interface BalancePeriodo {
  periodo: 'MES_ACTUAL' | 'TRES_MESES' | 'ANIO_ACTUAL';
  etiqueta: string;
  ingresos_reales: number;
  costo_cuentas_madre: number;
  gastos_manuales: number;
  costo_total: number;
  balance_neto: number;
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaccion[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [periodBalances, setPeriodBalances] = useState<BalancePeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Margen de Riesgo (%) Persistente
  const [riskMarginPct, setRiskMarginPct] = useState<number | "">(() => {
    const saved = localStorage.getItem('streaming_erp_risk_margin_pct');
    return saved !== null && saved !== "" ? parseFloat(saved) : "";
  });

  const handleRiskMarginChange = (valStr: string) => {
    if (valStr === "") {
      setRiskMarginPct("");
      localStorage.setItem('streaming_erp_risk_margin_pct', "0");
      return;
    }
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) {
      setRiskMarginPct("");
      localStorage.setItem('streaming_erp_risk_margin_pct', "0");
      return;
    }
    const cleanVal = Math.max(0, Math.min(100, parsed));
    setRiskMarginPct(cleanVal);
    localStorage.setItem('streaming_erp_risk_margin_pct', cleanVal.toString());
  };

  const numericRiskMarginPct = typeof riskMarginPct === 'number' ? riskMarginPct : 0;

  // Quick Expense Form States
  const [gastoMonto, setGastoMonto] = useState<number | "">(10000);
  const [gastoCategoria, setGastoCategoria] = useState('Servicios (Luz/Internet)');
  const [gastoEntidad, setGastoEntidad] = useState('NEQUI');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [transRes, salesRes, periodRes] = await Promise.all([
        api.get('/finanzas/transacciones'),
        api.get('/ventas/'),
        api.get('/finanzas/balance-periodos'),
      ]);
      setTransactions(transRes.data);
      setSales(salesRes.data);
      setPeriodBalances(periodRes.data.periodos || []);
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
  const ingresos = useMemo(() => {
    return transactions
      .filter(t => t.tipo === 'INGRESO')
      .reduce((sum, t) => sum + Number(t.monto), 0);
  }, [transactions]);

  const egresos = useMemo(() => {
    return transactions
      .filter(t => t.tipo === 'EGRESO')
      .reduce((sum, t) => sum + Number(t.monto), 0);
  }, [transactions]);

  const cuentasPorCobrar = useMemo(() => {
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
  }, [sales, transactions]);

  const balanceNeto = useMemo(() => ingresos - egresos, [ingresos, egresos]);

  const reservaRiesgoCaja = useMemo(() => {
    if (balanceNeto <= 0 || numericRiskMarginPct <= 0) return 0;
    return balanceNeto * (numericRiskMarginPct / 100);
  }, [balanceNeto, numericRiskMarginPct]);

  const balanceNetoAjustado = useMemo(() => balanceNeto - reservaRiesgoCaja, [balanceNeto, reservaRiesgoCaja]);

  return (
    <div className="space-y-6">
      {/* Encabezado con Casilla de Margen de Riesgo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Dashboard Financiero</h1>
          <p className="text-slate-400 text-sm mt-1">Monitorea tus ingresos, egresos y cuentas por cobrar en tiempo real.</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">Margen de Riesgo</label>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                placeholder="0"
                value={riskMarginPct}
                onChange={(e) => handleRiskMarginChange(e.target.value)}
                onFocus={() => {
                  if (riskMarginPct === 0) setRiskMarginPct("");
                }}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sm font-extrabold text-amber-400 focus:outline-none focus:border-amber-500 text-center"
              />
              <span className="text-sm font-bold text-amber-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {loading && transactions.length === 0 ? (
        <p className="text-slate-400 text-sm">Cargando estadísticas...</p>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          {/* Tarjetas KPI Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 kpi-metrics-grid">
            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-emerald-500/45 to-emerald-500/5 dark:from-emerald-500/10 dark:to-slate-900 border-emerald-200/50 dark:border-emerald-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Ingresos Totales</p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">${ingresos.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Caja y abonos consolidados</p>
            </Card>

            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-rose-500/45 to-rose-500/5 dark:from-rose-500/10 dark:to-slate-900 border-rose-200/50 dark:border-rose-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">Egresos Totales</p>
                <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">${egresos.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Gastos e inventario comprado</p>
            </Card>

            <Card hoverEffect className={`relative overflow-hidden bg-gradient-to-br ${
              balanceNetoAjustado >= 0 
                ? 'from-blue-500/45 to-blue-500/5 dark:from-cyan-500/10 dark:to-slate-900 border-blue-200/50 dark:border-cyan-500/10' 
                : 'from-rose-500/45 to-rose-500/5 dark:from-rose-500/10 dark:to-slate-900 border-rose-200/50 dark:border-rose-500/10'
            }`}>
              <div className="flex items-center justify-between">
                <p className={`text-xs font-bold uppercase tracking-wider ${balanceNetoAjustado >= 0 ? 'text-blue-700 dark:text-cyan-400' : 'text-rose-700 dark:text-rose-400'}`}>Balance de Caja</p>
                <div className={`p-2 rounded-lg ${
                  balanceNetoAjustado >= 0 
                    ? 'bg-blue-100 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400' 
                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}>
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">${balanceNetoAjustado.toLocaleString('es-CO')}</h3>
              {numericRiskMarginPct > 0 ? (
                <p className="text-[10px] text-amber-400 font-semibold mt-1">
                  Reserva ({numericRiskMarginPct}%): -${reservaRiesgoCaja.toLocaleString('es-CO')} (Orig: ${balanceNeto.toLocaleString('es-CO')})
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Utilidad neta actual</p>
              )}
            </Card>

            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-amber-500/45 to-amber-500/5 dark:from-amber-500/10 dark:to-slate-900 border-amber-200/50 dark:border-amber-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">Por Cobrar</p>
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">${cuentasPorCobrar.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Suscripciones sin liquidar</p>
            </Card>
          </div>

          {/* Resumen Comparativo de Balance por Periodos */}
          {periodBalances.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" /> Balance Financiero por Periodos
                </h2>
                <span className="text-xs text-slate-400">
                  {numericRiskMarginPct > 0 ? `Descontando ${numericRiskMarginPct}% de reserva de riesgo` : 'Considera coste de ventas por mes y gastos de caja'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {periodBalances.map((item) => {
                  const balanceOrig = Number(item.balance_neto);
                  const reservaRiesgo = (balanceOrig > 0 && numericRiskMarginPct > 0) ? balanceOrig * (numericRiskMarginPct / 100) : 0;
                  const balanceAjustado = balanceOrig - reservaRiesgo;
                  const esPositivo = balanceAjustado >= 0;

                  return (
                    <Card key={item.periodo} hoverEffect className="bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">{item.etiqueta}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            esPositivo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {esPositivo ? 'Ganancia' : 'Pérdida'}
                          </span>
                        </div>

                        <div className="my-4">
                          <p className="text-[11px] text-slate-400 uppercase font-medium">Balance Neto Ajustado</p>
                          <h3 className={`text-2xl font-black mt-0.5 ${esPositivo ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${balanceAjustado.toLocaleString('es-CO')}
                          </h3>
                          {numericRiskMarginPct > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Original: <span className="font-semibold text-slate-200">${balanceOrig.toLocaleString('es-CO')}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 text-xs divide-y divide-slate-800/60 pt-1">
                          <div className="flex justify-between items-center pt-1.5">
                            <span className="text-slate-400">Ingresos Reales</span>
                            <span className="font-semibold text-emerald-400">+${Number(item.ingresos_reales).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5">
                            <span className="text-slate-400">Cuentas Madre (Compras/Renov.)</span>
                            <span className="font-semibold text-blue-400">-${Number(item.costo_cuentas_madre).toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5">
                            <span className="text-slate-400">Gastos Manuales</span>
                            <span className="font-semibold text-amber-400">-${Number(item.gastos_manuales).toLocaleString('es-CO')}</span>
                          </div>
                          {numericRiskMarginPct > 0 && (
                            <div className="flex justify-between items-center pt-1.5 text-amber-400">
                              <span>Reserva Riesgo ({numericRiskMarginPct}%)</span>
                              <span className="font-semibold">-${reservaRiesgo.toLocaleString('es-CO')}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-1.5 font-bold">
                            <span className="text-slate-300">Costo Total</span>
                            <span className="text-rose-400">-${(Number(item.costo_total) + reservaRiesgo).toLocaleString('es-CO')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}



          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Registro de Gastos Manuales */}
            <Card className="bg-[#ffedd5] dark:bg-slate-900/40 space-y-4">
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

                <Button type="submit" className="w-full !bg-red-600 !text-white hover:!bg-[#ffedd5] hover:!text-black border border-red-600 hover:border-orange-300 transition-all duration-200">
                  Registrar Egreso
                </Button>
              </form>
            </Card>

            {/* Listado de Transacciones Recientes */}
            <Card className="lg:col-span-2 bg-[#ffedd5] dark:bg-slate-900/40 space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Flujo de Caja Reciente</h2>
              
              <div className="overflow-hidden rounded-xl border border-slate-850/80 bg-white/60 dark:bg-slate-950/20 divide-y divide-slate-850">
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
