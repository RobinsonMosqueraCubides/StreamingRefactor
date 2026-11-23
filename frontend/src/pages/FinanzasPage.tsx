import { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import api from '../api/axios';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  ShieldAlert,
  Calendar,
  Search,
  ShoppingBag,
  Receipt,
  ArrowUpRight,
  Clock,
  Landmark,
  X,
} from 'lucide-react';

type FilterMode = 'ANIO' | 'MES' | 'RANGO';
type DetailTab = 'TODAS' | 'COMPRAS' | 'EGRESOS' | 'INGRESOS' | 'PENDIENTES';

interface MesFinancieroResumen {
  mes: number;
  etiqueta: string;
  ingresos: number;
  egresos_compras: number;
  egresos_otros: number;
  egresos_totales: number;
  balance_neto: number;
  por_cobrar: number;
  cantidad_compras: number;
  cantidad_otros_egresos: number;
  cantidad_ingresos: number;
}

interface EntidadResumenItem {
  entidad: string;
  ingresos: number;
  egresos: number;
  balance: number;
}

interface CompraCuentaDetalleItem {
  id: number;
  cuenta_madre_id: number | null;
  plataforma: string;
  correo: string;
  proveedor: string;
  estado_cuenta: string | null;
  tipo_movimiento: string;
  monto: number;
  entidad: string;
  fecha: string;
}

interface EgresoDetalleItem {
  id: number;
  categoria: string;
  monto: number;
  entidad: string;
  referencia_id: number | null;
  detalle: string | null;
  fecha: string;
}

interface IngresoDetalleItem {
  id: number;
  categoria: string;
  monto: number;
  entidad: string;
  referencia_id: number | null;
  detalle: string | null;
  fecha: string;
}

interface PendienteDetalleItem {
  venta_id: number;
  cliente_nombre: string;
  plataformas: string;
  fecha_inicio: string;
  fecha_corte: string;
  estado_pago: string;
  monto_total: number;
  abonado: number;
  saldo_pendiente: number;
}

interface ReporteFinanciero {
  anio: number;
  mes: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  modo: FilterMode;
  etiqueta_periodo: string;
  ingresos_totales: number;
  ingresos_ventas: number;
  ingresos_otros: number;
  egresos_totales: number;
  egresos_cuentas_madre: number;
  egresos_otros: number;
  balance_neto: number;
  por_cobrar_periodo: number;
  por_cobrar_global: number;
  resumen_anual: MesFinancieroResumen[];
  por_entidad: EntidadResumenItem[];
  compras_detalle: CompraCuentaDetalleItem[];
  otros_egresos_detalle: EgresoDetalleItem[];
  ingresos_detalle: IngresoDetalleItem[];
  pendientes_detalle: PendienteDetalleItem[];
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

const ENTIDAD_LABELS: Record<string, string> = {
  NEQUI: 'Nequi',
  BANCOLOMBIA: 'Bancolombia',
  DAVIPLATA: 'Daviplata',
  NU_BANK: 'Nu Bank',
  EFECTIVO: 'Efectivo',
};

const formatCOP = (val: number | string) => {
  const num = Number(val) || 0;
  return `$${num.toLocaleString('es-CO')}`;
};

const formatDateOnly = (isoDate: string) => {
  if (!isoDate) return '-';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const formatDateTime = (isoDateTime: string) => {
  if (!isoDateTime) return '-';
  const d = new Date(isoDateTime);
  if (isNaN(d.getTime())) return isoDateTime;
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toIsoDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function FinanzasPage() {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Filtros principales
  const [mode, setMode] = useState<FilterMode>('MES');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const defaultMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const defaultToday = toIsoDateInput(now);
  const [rangeStart, setRangeStart] = useState<string>(defaultMonthStart);
  const [rangeEnd, setRangeEnd] = useState<string>(defaultToday);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({
    start: defaultMonthStart,
    end: defaultToday,
  });

  // Filtros locales del detalle
  const [activeTab, setActiveTab] = useState<DetailTab>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('TODAS');

  // Datos del backend
  const [report, setReport] = useState<ReporteFinanciero | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Margen de Riesgo (%) Persistente compartido con Dashboard
  const [riskMarginPct, setRiskMarginPct] = useState<number | ''>(() => {
    const saved = localStorage.getItem('streaming_erp_risk_margin_pct');
    return saved !== null && saved !== '' ? parseFloat(saved) : '';
  });

  const handleRiskMarginChange = (valStr: string) => {
    if (valStr === '') {
      setRiskMarginPct('');
      localStorage.setItem('streaming_erp_risk_margin_pct', '0');
      return;
    }
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) {
      setRiskMarginPct('');
      localStorage.setItem('streaming_erp_risk_margin_pct', '0');
      return;
    }
    const cleanVal = Math.max(0, Math.min(100, parsed));
    setRiskMarginPct(cleanVal);
    localStorage.setItem('streaming_erp_risk_margin_pct', cleanVal.toString());
  };

  const numericRiskMarginPct = typeof riskMarginPct === 'number' ? riskMarginPct : 0;

  const yearOptions = useMemo(() => {
    const years: { value: string; label: string }[] = [];
    for (let y = currentYear + 1; y >= 2023; y--) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentYear]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = { anio: selectedYear };
      if (mode === 'MES') {
        params.mes = selectedMonth;
      } else if (mode === 'RANGO') {
        if (!appliedRange.start || !appliedRange.end) {
          setError('Debes seleccionar fecha de inicio y fecha fin.');
          setLoading(false);
          return;
        }
        params.fecha_inicio = appliedRange.start;
        params.fecha_fin = appliedRange.end;
      }
      const res = await api.get<ReporteFinanciero>('/finanzas/reporte', { params });
      setReport(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Error al cargar el reporte financiero.';
      setError(typeof msg === 'string' ? msg : 'Error al cargar el reporte financiero.');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedYear, selectedMonth, appliedRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const applyReserve = useCallback(
    (balanceOrig: number) => {
      const reserve =
        balanceOrig > 0 && numericRiskMarginPct > 0
          ? balanceOrig * (numericRiskMarginPct / 100)
          : 0;
      return {
        reserve,
        adjusted: balanceOrig - reserve,
      };
    },
    [numericRiskMarginPct]
  );

  // KPIs calculados con la misma lógica del Dashboard
  const ingresosTotales = Number(report?.ingresos_totales ?? 0);
  const ingresosVentas = Number(report?.ingresos_ventas ?? 0);
  const ingresosOtros = Number(report?.ingresos_otros ?? 0);

  const egresosTotales = Number(report?.egresos_totales ?? 0);
  const egresosCuentasMadre = Number(report?.egresos_cuentas_madre ?? 0);
  const egresosOtros = Number(report?.egresos_otros ?? 0);

  const balanceNeto = Number(report?.balance_neto ?? 0);
  const { reserve: reservaRiesgoCaja, adjusted: balanceNetoAjustado } = applyReserve(balanceNeto);

  const porCobrarPeriodo = Number(report?.por_cobrar_periodo ?? 0);
  const porCobrarGlobal = Number(report?.por_cobrar_global ?? 0);

  // Escala máxima del gráfico anual
  const maxAnnualBar = useMemo(() => {
    if (!report?.resumen_anual?.length) return 1;
    const maxVal = Math.max(
      ...report.resumen_anual.map((m) => Math.max(Number(m.ingresos), Number(m.egresos_totales)))
    );
    return maxVal > 0 ? maxVal : 1;
  }, [report]);

  // Filtrado en memoria de las listas de detalle (búsqueda + entidad)
  const normalizedQuery = searchTerm.trim().toLowerCase();

  const filteredCompras = useMemo(() => {
    const list = report?.compras_detalle ?? [];
    return list.filter((item) => {
      if (selectedEntityFilter !== 'TODAS' && item.entidad !== selectedEntityFilter) return false;
      if (!normalizedQuery) return true;
      return (
        item.plataforma.toLowerCase().includes(normalizedQuery) ||
        item.correo.toLowerCase().includes(normalizedQuery) ||
        item.proveedor.toLowerCase().includes(normalizedQuery) ||
        item.tipo_movimiento.toLowerCase().includes(normalizedQuery) ||
        item.entidad.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [report, selectedEntityFilter, normalizedQuery]);

  const filteredOtrosEgresos = useMemo(() => {
    const list = report?.otros_egresos_detalle ?? [];
    return list.filter((item) => {
      if (selectedEntityFilter !== 'TODAS' && item.entidad !== selectedEntityFilter) return false;
      if (!normalizedQuery) return true;
      return (
        item.categoria.toLowerCase().includes(normalizedQuery) ||
        (item.detalle || '').toLowerCase().includes(normalizedQuery) ||
        item.entidad.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [report, selectedEntityFilter, normalizedQuery]);

  const filteredIngresos = useMemo(() => {
    const list = report?.ingresos_detalle ?? [];
    return list.filter((item) => {
      if (selectedEntityFilter !== 'TODAS' && item.entidad !== selectedEntityFilter) return false;
      if (!normalizedQuery) return true;
      return (
        item.categoria.toLowerCase().includes(normalizedQuery) ||
        (item.detalle || '').toLowerCase().includes(normalizedQuery) ||
        item.entidad.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [report, selectedEntityFilter, normalizedQuery]);

  const filteredPendientes = useMemo(() => {
    const list = report?.pendientes_detalle ?? [];
    return list.filter((item) => {
      if (!normalizedQuery) return true;
      return (
        item.cliente_nombre.toLowerCase().includes(normalizedQuery) ||
        item.plataformas.toLowerCase().includes(normalizedQuery) ||
        item.estado_pago.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [report, normalizedQuery]);

  const sumFilteredCompras = useMemo(
    () => filteredCompras.reduce((acc, i) => acc + Number(i.monto), 0),
    [filteredCompras]
  );
  const sumFilteredOtrosEgresos = useMemo(
    () => filteredOtrosEgresos.reduce((acc, i) => acc + Number(i.monto), 0),
    [filteredOtrosEgresos]
  );
  const sumFilteredIngresos = useMemo(
    () => filteredIngresos.reduce((acc, i) => acc + Number(i.monto), 0),
    [filteredIngresos]
  );
  const sumFilteredPendientes = useMemo(
    () => filteredPendientes.reduce((acc, i) => acc + Number(i.saldo_pendiente), 0),
    [filteredPendientes]
  );

  const handleApplyRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rangeStart || !rangeEnd) {
      setError('Debes indicar tanto la fecha de inicio como la fecha fin.');
      return;
    }
    if (rangeStart > rangeEnd) {
      setError('La fecha de inicio no puede ser mayor que la fecha fin.');
      return;
    }
    setError('');
    setMode('RANGO');
    setAppliedRange({ start: rangeStart, end: rangeEnd });
  };

  const handleSelectPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const sStr = toIsoDateInput(start);
    const eStr = toIsoDateInput(end);
    setRangeStart(sStr);
    setRangeEnd(eStr);
    setAppliedRange({ start: sStr, end: eStr });
    setMode('RANGO');
  };

  const handleSelectMonth = (monthNum: number) => {
    setSelectedMonth(monthNum);
    setMode('MES');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado + Margen de Riesgo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Finanzas
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control anual, mensual y por rango de fechas basado en flujo real de caja ·{' '}
            <span className="font-semibold text-cyan-400">
              {report?.etiqueta_periodo || `${selectedYear}`}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl self-start sm:self-auto">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              Margen de Riesgo
            </label>
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
                  if (riskMarginPct === 0) setRiskMarginPct('');
                }}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sm font-extrabold text-amber-400 focus:outline-none focus:border-amber-500 text-center"
              />
              <span className="text-sm font-bold text-amber-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra Unificada de Filtros: Año / Mes / Rango */}
      <Card className="bg-slate-900/60 border border-slate-800 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Selector de Modo */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Vista de Periodo
            </span>
            <div className="inline-flex rounded-xl bg-slate-950/70 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('ANIO')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'ANIO'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todo el Año
              </button>
              <button
                type="button"
                onClick={() => setMode('MES')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'MES'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mes Específico
              </button>
              <button
                type="button"
                onClick={() => setMode('RANGO')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === 'RANGO'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Rango de Fechas
              </button>
            </div>
          </div>

          {/* Controles según el modo */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-28">
              <Select
                label="Año (Resumen)"
                value={String(selectedYear)}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                options={yearOptions}
              />
            </div>

            {mode === 'MES' && (
              <>
                <div className="w-40">
                  <Select
                    label="Mes"
                    value={String(selectedMonth)}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    options={MESES_OPTIONS}
                  />
                </div>
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => {
                    setSelectedYear(currentYear);
                    setSelectedMonth(currentMonth);
                  }}
                >
                  Mes Actual
                </Button>
              </>
            )}

            {mode === 'RANGO' && (
              <form onSubmit={handleApplyRange} className="flex flex-wrap items-end gap-2.5">
                <div className="w-40">
                  <Input
                    label="Desde"
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Input
                    label="Hasta"
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
                <Button type="submit" size="md">
                  Aplicar Rango
                </Button>
                <div className="flex items-center gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() => handleSelectPresetRange(7)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-cyan-500/40 cursor-pointer"
                  >
                    7 días
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPresetRange(30)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:border-cyan-500/40 cursor-pointer"
                  >
                    30 días
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && !report ? (
        <p className="text-slate-400 text-sm">Cargando reporte financiero...</p>
      ) : (
        report && (
          <>
            {/* 1. Tarjetas KPI Principales (Misma lógica de caja del Dashboard filtrada al periodo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 kpi-metrics-grid">
              <Card
                hoverEffect
                className="relative overflow-hidden bg-gradient-to-br from-emerald-500/45 to-emerald-500/5 dark:from-emerald-500/10 dark:to-slate-900 border-emerald-200/50 dark:border-emerald-500/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Ingresos Totales
                  </p>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">
                  {formatCOP(ingresosTotales)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Ventas: {formatCOP(ingresosVentas)} · Otros: {formatCOP(ingresosOtros)}
                </p>
              </Card>

              <Card
                hoverEffect
                className="relative overflow-hidden bg-gradient-to-br from-rose-500/45 to-rose-500/5 dark:from-rose-500/10 dark:to-slate-900 border-rose-200/50 dark:border-rose-500/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">
                    Egresos Totales
                  </p>
                  <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">
                  {formatCOP(egresosTotales)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Compras/Renov.: {formatCOP(egresosCuentasMadre)} · Otros: {formatCOP(egresosOtros)}
                </p>
              </Card>

              <Card
                hoverEffect
                className={`relative overflow-hidden bg-gradient-to-br ${
                  balanceNetoAjustado >= 0
                    ? 'from-blue-500/45 to-blue-500/5 dark:from-cyan-500/10 dark:to-slate-900 border-blue-200/50 dark:border-cyan-500/10'
                    : 'from-rose-500/45 to-rose-500/5 dark:from-rose-500/10 dark:to-slate-900 border-rose-200/50 dark:border-rose-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      balanceNetoAjustado >= 0
                        ? 'text-blue-700 dark:text-cyan-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    Balance de Caja
                  </p>
                  <div
                    className={`p-2 rounded-lg ${
                      balanceNetoAjustado >= 0
                        ? 'bg-blue-100 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400'
                        : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">
                  {formatCOP(balanceNetoAjustado)}
                </h3>
                {numericRiskMarginPct > 0 && balanceNeto > 0 ? (
                  <p className="text-[11px] text-amber-400 font-semibold mt-1">
                    Reserva ({numericRiskMarginPct}%): -{formatCOP(reservaRiesgoCaja)} (Orig:{' '}
                    {formatCOP(balanceNeto)})
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Utilidad neta del periodo ({report.etiqueta_periodo})
                  </p>
                )}
              </Card>

              <Card
                hoverEffect
                className="relative overflow-hidden bg-gradient-to-br from-amber-500/45 to-amber-500/5 dark:from-amber-500/10 dark:to-slate-900 border-amber-200/50 dark:border-amber-500/10"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                    Por Cobrar (Periodo)
                  </p>
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold mt-3 text-black dark:text-slate-100">
                  {formatCOP(porCobrarPeriodo)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Global actual: <span className="font-bold text-amber-400">{formatCOP(porCobrarGlobal)}</span>
                </p>
              </Card>
            </div>

            {/* 2. Vista Detallada del Año (12 Meses + Comparativa Visual) */}
            <Card className="bg-slate-900/60 border border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-400" /> Resumen Anual {selectedYear}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Haz clic en cualquier mes para inspeccionar sus compras de cuentas madre, egresos e ingresos.
                  </p>
                </div>
                {mode !== 'ANIO' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setMode('ANIO')}
                  >
                    Ver Año Completo ({selectedYear})
                  </Button>
                )}
              </div>

              {/* Gráfico de Barras Comparativo (Ingresos vs Egresos por Mes) */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-300">
                    Comparativa Mensual de Flujo de Caja ({selectedYear})
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                      Ingresos
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                      Egresos (Compras + Gastos)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-2">
                  {report.resumen_anual.map((m) => {
                    const isSelectedMonth = mode === 'MES' && m.mes === selectedMonth;
                    const ingH = Math.round((Number(m.ingresos) / maxAnnualBar) * 100);
                    const egrH = Math.round((Number(m.egresos_totales) / maxAnnualBar) * 100);
                    return (
                      <button
                        key={m.mes}
                        type="button"
                        onClick={() => handleSelectMonth(m.mes)}
                        title={`${m.etiqueta}: Ingresos ${formatCOP(m.ingresos)} | Egresos ${formatCOP(m.egresos_totales)}`}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelectedMonth
                            ? 'bg-cyan-500/15 border-cyan-400/50'
                            : 'bg-slate-900/40 border-slate-800/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="w-full h-24 flex items-end justify-center gap-1 px-1">
                          <div
                            className="w-2.5 sm:w-3 rounded-t bg-emerald-500/85 transition-all duration-300"
                            style={{ height: `${Math.max(Number(m.ingresos) > 0 ? 6 : 2, ingH)}%` }}
                          />
                          <div
                            className="w-2.5 sm:w-3 rounded-t bg-rose-500/85 transition-all duration-300"
                            style={{ height: `${Math.max(Number(m.egresos_totales) > 0 ? 6 : 2, egrH)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            isSelectedMonth ? 'text-cyan-300' : 'text-slate-300'
                          }`}
                        >
                          {m.etiqueta.slice(0, 3)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grilla de los 12 Meses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {report.resumen_anual.map((m) => {
                  const isSelected = mode === 'MES' && m.mes === selectedMonth;
                  const { adjusted: netAdj } = applyReserve(Number(m.balance_neto));
                  const hasActivity =
                    Number(m.ingresos) > 0 ||
                    Number(m.egresos_totales) > 0 ||
                    Number(m.por_cobrar) > 0;

                  return (
                    <button
                      key={m.mes}
                      type="button"
                      onClick={() => handleSelectMonth(m.mes)}
                      className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400/60 ring-1 ring-cyan-400/30'
                          : hasActivity
                            ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/30 border-slate-800/50 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold ${
                            isSelected ? 'text-cyan-300' : 'text-slate-100'
                          }`}
                        >
                          {m.etiqueta}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {m.cantidad_compras} comp. · {m.cantidad_ingresos} ing.
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ingresos</span>
                          <span className="font-mono font-semibold text-emerald-400">
                            +{formatCOP(m.ingresos)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Compras Cuentas</span>
                          <span className="font-mono text-blue-400">
                            -{formatCOP(m.egresos_compras)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Otros Egresos</span>
                          <span className="font-mono text-amber-400">
                            -{formatCOP(m.egresos_otros)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold">Balance</span>
                        <span
                          className={`font-mono font-extrabold ${
                            netAdj >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {netAdj >= 0 ? '+' : ''}
                          {formatCOP(netAdj)}
                        </span>
                      </div>

                      {Number(m.por_cobrar) > 0 && (
                        <div className="text-[10px] text-amber-400 font-semibold flex justify-between">
                          <span>Por cobrar:</span>
                          <span className="font-mono">{formatCOP(m.por_cobrar)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* 3. Resumen por Entidad Financiera */}
            <Card className="bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-cyan-400" /> Flujo por Entidad Financiera
                  </h2>
                  <p className="text-xs text-slate-400">
                    Movimientos en <span className="text-slate-200 font-medium">{report.etiqueta_periodo}</span>. Haz clic en una entidad para filtrar el detalle.
                  </p>
                </div>
                {selectedEntityFilter !== 'TODAS' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedEntityFilter('TODAS')}
                  >
                    Quitar filtro ({ENTIDAD_LABELS[selectedEntityFilter] || selectedEntityFilter})
                  </Button>
                )}
              </div>

              {report.por_entidad.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No se registraron movimientos por entidad financiera en este periodo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {report.por_entidad.map((ent) => {
                    const active = selectedEntityFilter === ent.entidad;
                    const bal = Number(ent.balance);
                    return (
                      <button
                        key={ent.entidad}
                        type="button"
                        onClick={() =>
                          setSelectedEntityFilter(active ? 'TODAS' : ent.entidad)
                        }
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-400/60'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          {ENTIDAD_LABELS[ent.entidad] || ent.entidad}
                        </p>
                        <div className="mt-2 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Entró:</span>
                            <span className="font-mono text-emerald-400">+{formatCOP(ent.ingresos)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Salió:</span>
                            <span className="font-mono text-rose-400">-{formatCOP(ent.egresos)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                            <span className="text-slate-300">Neto:</span>
                            <span className={`font-mono ${bal >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                              {formatCOP(bal)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 4. Detalle de Compras, Otros Egresos, Ingresos y Por Cobrar */}
            <Card className="bg-slate-900/60 border border-slate-800 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-400" /> Detalle de Movimientos —{' '}
                    {report.etiqueta_periodo}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Desglose de compras/renovaciones de cuentas madre, otros egresos, ingresos de caja y cuentas pendientes.
                  </p>
                </div>

                <div className="w-full lg:w-72">
                  <Input
                    placeholder="Buscar plataforma, correo, cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-slate-500" />}
                  />
                </div>
              </div>

              {/* Pestañas de Secciones */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('TODAS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === 'TODAS'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Todas las Secciones
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('COMPRAS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === 'COMPRAS'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Compras Cuentas Madre ({filteredCompras.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('EGRESOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === 'EGRESOS'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Otros Egresos ({filteredOtrosEgresos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('INGRESOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === 'INGRESOS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Ingresos de Caja ({filteredIngresos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('PENDIENTES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === 'PENDIENTES'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Por Cobrar ({filteredPendientes.length})
                </button>
              </div>

              {/* Sub-sección 1: Compras y Renovaciones de Cuentas Madre */}
              {(activeTab === 'TODAS' || activeTab === 'COMPRAS') && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-blue-400" /> Compras y Renovaciones de Cuentas Madre ({filteredCompras.length})
                    </h3>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      Total: -{formatCOP(sumFilteredCompras)}
                    </span>
                  </div>

                  {filteredCompras.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No hay compras ni renovaciones de cuentas madre registradas en este periodo.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                          <tr>
                            <th className="py-2 pr-2">Fecha</th>
                            <th className="py-2 px-2">Plataforma</th>
                            <th className="py-2 px-2">Cuenta / Correo</th>
                            <th className="py-2 px-2">Proveedor</th>
                            <th className="py-2 px-2">Tipo</th>
                            <th className="py-2 px-2">Entidad</th>
                            <th className="py-2 pl-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredCompras.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 pr-2 font-mono text-slate-400 whitespace-nowrap">
                                {formatDateTime(c.fecha)}
                              </td>
                              <td className="py-2.5 px-2 font-semibold text-slate-200">
                                {c.plataforma}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300 font-mono">
                                {c.correo}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">
                                {c.proveedor}
                              </td>
                              <td className="py-2.5 px-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      c.tipo_movimiento === 'Renovación'
                                        ? 'bg-purple-500/15 text-purple-400'
                                        : 'bg-blue-500/15 text-blue-400'
                                    }`}
                                  >
                                    {c.tipo_movimiento}
                                  </span>
                                  {c.estado_cuenta === 'CANCELADA' && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                      Cancelada
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">
                                {ENTIDAD_LABELS[c.entidad] || c.entidad}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                                -{formatCOP(c.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-sección 2: Otros Egresos (Gastos Manuales y Reembolsos) */}
              {(activeTab === 'TODAS' || activeTab === 'EGRESOS') && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-amber-400" /> Otros Egresos (Gastos Manuales y Reembolsos) ({filteredOtrosEgresos.length})
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Total: -{formatCOP(sumFilteredOtrosEgresos)}
                    </span>
                  </div>

                  {filteredOtrosEgresos.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No hay otros egresos registrados en este periodo.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                          <tr>
                            <th className="py-2 pr-2">Fecha</th>
                            <th className="py-2 px-2">Categoría / Motivo</th>
                            <th className="py-2 px-2">Detalle</th>
                            <th className="py-2 px-2">Entidad</th>
                            <th className="py-2 pl-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredOtrosEgresos.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 pr-2 font-mono text-slate-400 whitespace-nowrap">
                                {formatDateTime(e.fecha)}
                              </td>
                              <td className="py-2.5 px-2 font-semibold text-slate-200">
                                {e.categoria}
                              </td>
                              <td className="py-2.5 px-2 text-slate-400">
                                {e.detalle || 'Egreso operativo de caja'}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">
                                {ENTIDAD_LABELS[e.entidad] || e.entidad}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                                -{formatCOP(e.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-sección 3: Ingresos de Caja */}
              {(activeTab === 'TODAS' || activeTab === 'INGRESOS') && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Ingresos de Caja ({filteredIngresos.length})
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Total: +{formatCOP(sumFilteredIngresos)}
                    </span>
                  </div>

                  {filteredIngresos.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No hay ingresos registrados en este periodo.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                          <tr>
                            <th className="py-2 pr-2">Fecha</th>
                            <th className="py-2 px-2">Categoría</th>
                            <th className="py-2 px-2">Detalle</th>
                            <th className="py-2 px-2">Entidad</th>
                            <th className="py-2 pl-2 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredIngresos.map((ing) => (
                            <tr key={ing.id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 pr-2 font-mono text-slate-400 whitespace-nowrap">
                                {formatDateTime(ing.fecha)}
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    ing.categoria === 'PAGO_VENTA'
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-cyan-500/15 text-cyan-400'
                                  }`}
                                >
                                  {ing.categoria}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-slate-200 font-medium">
                                {ing.detalle || 'Ingreso de caja'}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">
                                {ENTIDAD_LABELS[ing.entidad] || ing.entidad}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                +{formatCOP(ing.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-sección 4: Cuentas Por Cobrar del Periodo */}
              {(activeTab === 'TODAS' || activeTab === 'PENDIENTES') && (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" /> Por Cobrar en {report.etiqueta_periodo} ({filteredPendientes.length})
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Pendiente: {formatCOP(sumFilteredPendientes)}
                    </span>
                  </div>

                  {filteredPendientes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No hay ventas pendientes ni con pago parcial iniciadas en este periodo.
                    </p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[11px] uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                          <tr>
                            <th className="py-2 pr-2">Cliente</th>
                            <th className="py-2 px-2">Plataforma(s)</th>
                            <th className="py-2 px-2">Inicio</th>
                            <th className="py-2 px-2">Corte</th>
                            <th className="py-2 px-2">Estado</th>
                            <th className="py-2 px-2 text-right">Total</th>
                            <th className="py-2 px-2 text-right">Abonado</th>
                            <th className="py-2 pl-2 text-right">Pendiente</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredPendientes.map((p) => (
                            <tr key={p.venta_id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 pr-2 font-semibold text-slate-200">
                                {p.cliente_nombre}
                              </td>
                              <td className="py-2.5 px-2 text-slate-300">{p.plataformas}</td>
                              <td className="py-2.5 px-2 font-mono text-cyan-300">
                                {formatDateOnly(p.fecha_inicio)}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-slate-400">
                                {formatDateOnly(p.fecha_corte)}
                              </td>
                              <td className="py-2.5 px-2">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    p.estado_pago === 'PAGO_PARCIAL'
                                      ? 'bg-amber-500/15 text-amber-400'
                                      : 'bg-rose-500/15 text-rose-400'
                                  }`}
                                >
                                  {p.estado_pago}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-slate-300">
                                {formatCOP(p.monto_total)}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-emerald-400">
                                {formatCOP(p.abonado)}
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono font-bold text-amber-400">
                                {formatCOP(p.saldo_pendiente)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </>
        )
      )}
    </div>
  );
}
