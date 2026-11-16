import { useState, useEffect, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import api from '../api/axios';
import {
  BarChart3, ShieldAlert, Filter, Layers
} from 'lucide-react';

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

  const [resumenMensual, setResumenMensual] = useState<ResumenMensual | null>(null);
  const [loading, setLoading] = useState(false);
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

  const fetchMonthlySummary = async (anio: number, mes: number) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/finanzas/resumen-mensual', {
        params: { anio, mes }
      });
      setResumenMensual(res.data);
    } catch {
      setError('Error al cargar las estadísticas financieras del mes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySummary(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

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
            Control mensual de ventas por fecha de inicio/renovación, rendimiento por plataforma y contraste de egresos.
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

        {loading && !resumenMensual ? (
          <p className="text-sm text-slate-400 py-4">Calculando resumen del mes...</p>
        ) : error ? (
          <p className="text-sm text-rose-400 py-4">{error}</p>
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
    </div>
  );
}
