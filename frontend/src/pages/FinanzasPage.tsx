import { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import {
  BarChart3, ShieldAlert, Filter, Layers, TrendingUp, TrendingDown, Wallet, Plus, Tag, DollarSign, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface BalancePeriodo {
  periodo: 'MES_ACTUAL' | 'TRES_MESES' | 'ANIO_ACTUAL';
  etiqueta: string;
  ingresos_reales: number;
  costo_cuentas_madre: number;
  gastos_manuales: number;
  costo_total: number;
  balance_neto: number;
}

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

interface PlataformaVentaStats {
  plataforma_id: number | null;
  plataforma: string;
  pantallas_vendidas: number;
  cuentas_completas_vendidas: number;
  total_vendido: number;
  costo_cuentas_madre: number;
  utilidad_estimada: number;
}

interface VentaMensualItem {
  id: number;
  cliente_nombre: string;
  plataformas: string;
  tipo_venta: string;
  fecha_inicio: string;
  fecha_corte: string;
  monto_total: number;
  estado_pago: string;
  origen: 'ACTIVA' | 'CORTADA';
}

interface MesAnualComparativo {
  mes: number;
  etiqueta: string;
  ventas_mes: number;
  egresos_mes: number;
  balance_neto: number;
  cantidad_ventas: number;
}

interface ResumenMensual {
  anio: number;
  mes: number;
  etiqueta_mes: string;
  total_vendido_mes: number;
  total_cobrado_mes: number;
  total_pendiente_mes: number;
  ingresos_caja_mes: number;
  egresos_cuentas_madre_mes: number;
  egresos_gastos_manuales_mes: number;
  total_egresos_mes: number;
  balance_ventas_vs_egresos: number;
  balance_caja_real: number;
  cantidad_ventas: number;
  pantallas_vendidas: number;
  cuentas_completas_vendidas: number;
  por_plataforma: PlataformaVentaStats[];
  ventas_detalle: VentaMensualItem[];
  comparativa_anual: MesAnualComparativo[];
}

const MESES_OPTIONS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default function FinanzasPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // Estados replicados exactamente de la logica de Inicio (DashboardPage)
  const [periodBalances, setPeriodBalances] = useState<BalancePeriodo[]>([]);
  const [transactions, setTransactions] = useState<Transaccion[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [error, setError] = useState('');

  // Margen de Riesgo (%) Persistente compartido
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

  // Formulario de gasto rapido
  const [gastoMonto, setGastoMonto] = useState<number | "">(10000);
  const [gastoCategoria, setGastoCategoria] = useState('Servicios (Luz/Internet)');
  const [gastoEntidad, setGastoEntidad] = useState('NEQUI');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // 1. Cargar la data con la misma logica de Inicio: /finanzas/balance-periodos, /finanzas/transacciones y /ventas/
  const fetchFinanzasData = async () => {
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
    } catch {
      setError('Error al cargar datos financieros.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async (anio: number, mes: number) => {
    try {
      setMonthlyLoading(true);
      const res = await api.get('/finanzas/resumen-mensual', {
        params: { anio, mes }
      });
      setResumenMensual(res.data);
    } catch {
      // Non-blocking
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanzasData();
  }, []);

  useEffect(() => {
    fetchMonthlySummary(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

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
      fetchFinanzasData();
      fetchMonthlySummary(selectedYear, selectedMonth);
    } catch {
      setFormError('Error al registrar el egreso.');
    }
  };

  // Logica de calculo financiero global del inicio
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

  const yearOptions = useMemo(() => {
    const currentY = new Date().getFullYear();
    return [currentY - 2, currentY - 1, currentY, currentY + 1].map(y => ({
      value: String(y),
      label: String(y),
    }));
  }, []);

  const monthlyNet = resumenMensual ? Number(resumenMensual.balance_ventas_vs_egresos) : 0;
  const monthlyReserve = (monthlyNet > 0 && numericRiskMarginPct > 0) ? monthlyNet * (numericRiskMarginPct / 100) : 0;
  const monthlyNetAdjusted = monthlyNet - monthlyReserve;
  const monthlySalesTotal = resumenMensual ? Number(resumenMensual.total_vendido_mes) : 0;
  const monthlyEgresosTotal = resumenMensual ? Number(resumenMensual.total_egresos_mes) : 0;
  const maxContrast = Math.max(monthlySalesTotal, monthlyEgresosTotal, 1);

  return (
    <div className="space-y-6">
      {/* Encabezado con Margen de Riesgo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Finanzas</h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen de balance por periodos, estadísticas de ventas mensuales por fecha de inicio/renovación y contraste de egresos.
          </p>
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

      {loading && periodBalances.length === 0 ? (
        <p className="text-slate-400 text-sm">Cargando estadísticas financieras...</p>
      ) : error ? (
        <p className="text-rose-400 text-sm">{error}</p>
      ) : (
        <>
          {/* LAS 3 CARDS DE VENTAS / BALANCE POR PERIODOS (IDÉNTICAS AL INICIO) */}
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

          {/* TARJETAS KPI DE CAJA Y CUENTAS POR COBRAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 kpi-metrics-grid">
            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-emerald-500/45 to-emerald-500/5 dark:from-emerald-500/10 dark:to-slate-900 border-emerald-200/50 dark:border-emerald-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Ingresos Totales (Caja)</p>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">${ingresos.toLocaleString('es-CO')}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Caja y abonos consolidados</p>
            </Card>

            <Card hoverEffect className="relative overflow-hidden bg-gradient-to-br from-rose-500/45 to-rose-500/5 dark:from-rose-500/10 dark:to-slate-900 border-rose-200/50 dark:border-rose-500/10">
              <div className="flex items-center justify-between">
                <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">Egresos Totales (Caja)</p>
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

          {/* SECCIÓN DETALLADA: CONTROL FINANCIERO MENSUAL */}
          <Card className="bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-cyan-400" />
                  Estadísticas Mensuales — {resumenMensual?.etiqueta_mes || `${selectedMonth}/${selectedYear}`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  El valor mensual de cada venta se contabiliza únicamente en el mes de su fecha de inicio o renovación.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="w-36">
                  <Select
                    value={String(selectedMonth)}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    options={MESES_OPTIONS}
                  />
                </div>
                <div className="w-28">
                  <Select
                    value={String(selectedYear)}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    options={yearOptions}
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const current = new Date();
                    setSelectedYear(current.getFullYear());
                    setSelectedMonth(current.getMonth() + 1);
                  }}
                >
                  Mes Actual
                </Button>
              </div>
            </div>

            {monthlyLoading && !resumenMensual ? (
              <p className="text-sm text-slate-400 py-4">Calculando resumen del mes...</p>
            ) : resumenMensual && (
              <div className="space-y-6">
                {/* KPIs del Mes Filtrado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 border border-emerald-500/20 rounded-xl p-4 space-y-1">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Ventas del Mes</p>
                    <h3 className="text-2xl font-black text-slate-100">
                      ${Number(resumenMensual.total_vendido_mes).toLocaleString('es-CO')}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {resumenMensual.cantidad_ventas} ventas · {resumenMensual.pantallas_vendidas} pantallas · {resumenMensual.cuentas_completas_vendidas} cuentas
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl p-4 space-y-1">
                    <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Recaudo de Ventas del Mes</p>
                    <h3 className="text-2xl font-black text-slate-100">
                      ${Number(resumenMensual.total_cobrado_mes).toLocaleString('es-CO')}
                    </h3>
                    <p className="text-[11px] text-amber-400">
                      Pendiente: ${Number(resumenMensual.total_pendiente_mes).toLocaleString('es-CO')}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-rose-500/20 rounded-xl p-4 space-y-1">
                    <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Egresos del Mes</p>
                    <h3 className="text-2xl font-black text-slate-100">
                      ${Number(resumenMensual.total_egresos_mes).toLocaleString('es-CO')}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Cuentas: ${Number(resumenMensual.egresos_cuentas_madre_mes).toLocaleString('es-CO')} · Gastos: ${Number(resumenMensual.egresos_gastos_manuales_mes).toLocaleString('es-CO')}
                    </p>
                  </div>

                  <div className={`bg-slate-950/60 border rounded-xl p-4 space-y-1 ${monthlyNetAdjusted >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${monthlyNetAdjusted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Contraste Neto (Ventas - Egresos)
                    </p>
                    <h3 className={`text-2xl font-black ${monthlyNetAdjusted >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${monthlyNetAdjusted.toLocaleString('es-CO')}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {numericRiskMarginPct > 0
                        ? `Reserva ${numericRiskMarginPct}%: -$${monthlyReserve.toLocaleString('es-CO')}`
                        : `Caja real del mes: $${Number(resumenMensual.balance_caja_real).toLocaleString('es-CO')}`}
                    </p>
                  </div>
                </div>

                {/* Barra Visual de Contraste Ventas vs Egresos */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Contraste Visual del Mes (Ventas vs Egresos)</span>
                    <span className={monthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      Diferencia: {monthlyNet >= 0 ? '+' : ''}${monthlyNet.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-emerald-400 font-semibold">Ventas</span>
                      <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (monthlySalesTotal / maxContrast) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right font-mono text-slate-200">${monthlySalesTotal.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-rose-400 font-semibold">Egresos</span>
                      <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (monthlyEgresosTotal / maxContrast) * 100)}%` }}
                        />
                      </div>
                      <span className="w-28 text-right font-mono text-slate-200">${monthlyEgresosTotal.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>

                {/* Control de Lo Que Se Vende por Plataforma */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" /> Lo Que Se Vende por Plataforma ({resumenMensual.etiqueta_mes})
                    </h3>
                    {resumenMensual.por_plataforma.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No hubo ventas ni compras registradas en este mes.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="py-2 pr-2">Plataforma</th>
                              <th className="py-2 px-2 text-center">Pant.</th>
                              <th className="py-2 px-2 text-center">Ctas.</th>
                              <th className="py-2 px-2 text-right">Vendido</th>
                              <th className="py-2 px-2 text-right">Costo</th>
                              <th className="py-2 pl-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {resumenMensual.por_plataforma.map((p) => (
                              <tr key={p.plataforma} className="hover:bg-slate-900/40">
                                <td className="py-2 pr-2 font-semibold text-slate-200">{p.plataforma}</td>
                                <td className="py-2 px-2 text-center text-cyan-300">{p.pantallas_vendidas}</td>
                                <td className="py-2 px-2 text-center text-purple-300">{p.cuentas_completas_vendidas}</td>
                                <td className="py-2 px-2 text-right font-mono text-emerald-400">${Number(p.total_vendido).toLocaleString('es-CO')}</td>
                                <td className="py-2 px-2 text-right font-mono text-rose-400">${Number(p.costo_cuentas_madre).toLocaleString('es-CO')}</td>
                                <td className={`py-2 pl-2 text-right font-mono font-bold ${Number(p.utilidad_estimada) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  ${Number(p.utilidad_estimada).toLocaleString('es-CO')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Comparativa Anual Mes a Mes */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" /> Comparativa Anual {selectedYear} (Clic para filtrar)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {resumenMensual.comparativa_anual.map((m) => {
                        const isSelected = m.mes === selectedMonth;
                        const net = Number(m.balance_neto);
                        return (
                          <button
                            key={m.mes}
                            type="button"
                            onClick={() => setSelectedMonth(m.mes)}
                            className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400/50'
                                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>{m.etiqueta}</span>
                              <span className="text-[10px] text-slate-500">{m.cantidad_ventas} vts</span>
                            </div>
                            <p className="text-[11px] font-mono text-emerald-400 mt-1">+${Number(m.ventas_mes).toLocaleString('es-CO')}</p>
                            <p className="text-[11px] font-mono text-rose-400">-${Number(m.egresos_mes).toLocaleString('es-CO')}</p>
                            <p className={`text-[11px] font-mono font-bold mt-0.5 pt-0.5 border-t border-slate-800 ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {net >= 0 ? '+' : ''}${net.toLocaleString('es-CO')}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Listado de Ventas Contabilizadas en el Mes */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">
                      Detalle de Ventas del Mes ({resumenMensual.ventas_detalle.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">Agrupadas por Fecha de Inicio / Renovación</span>
                  </div>
                  {resumenMensual.ventas_detalle.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No hay ventas iniciadas o renovadas en {resumenMensual.etiqueta_mes}.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                          <tr>
                            <th className="py-2 pr-2">Cliente</th>
                            <th className="py-2 px-2">Plataforma(s)</th>
                            <th className="py-2 px-2">Inicio / Renov.</th>
                            <th className="py-2 px-2">Corte</th>
                            <th className="py-2 px-2">Estado</th>
                            <th className="py-2 pl-2 text-right">Valor Mensual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {resumenMensual.ventas_detalle.map((v, idx) => (
                            <tr key={`${v.origen}-${v.id}-${idx}`} className="hover:bg-slate-900/40">
                              <td className="py-2 pr-2 font-semibold text-slate-200">
                                {v.cliente_nombre}
                                {v.origen === 'CORTADA' && (
                                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Cortada</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-slate-300">{v.plataformas}</td>
                              <td className="py-2 px-2 font-mono text-cyan-300">{v.fecha_inicio}</td>
                              <td className="py-2 px-2 font-mono text-slate-400">{v.fecha_corte}</td>
                              <td className="py-2 px-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  v.estado_pago === 'PAGADO'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : v.estado_pago === 'PAGO_PARCIAL'
                                      ? 'bg-amber-500/15 text-amber-400'
                                      : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                  {v.estado_pago}
                                </span>
                              </td>
                              <td className="py-2 pl-2 text-right font-mono font-bold text-emerald-400">
                                ${Number(v.monto_total).toLocaleString('es-CO')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* GASTO RÁPIDO Y FLUJO DE CAJA RECIENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <Card className="lg:col-span-2 bg-[#ffedd5] dark:bg-slate-900/40 space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Flujo de Caja Reciente</h2>
              
              <div className="overflow-hidden rounded-xl border border-slate-850/80 bg-white/60 dark:bg-slate-950/20 divide-y divide-slate-850">
                {transactions.slice(0, 8).map((trans) => (
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
