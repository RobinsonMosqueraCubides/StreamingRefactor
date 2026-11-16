/**
 * Utilidades para manejo consistente de fechas en formato 'YYYY-MM-DD'
 * evitando desfases por conversiones a UTC (como new Date().toISOString()).
 */

/**
 * Retorna la fecha local en formato 'YYYY-MM-DD'.
 * Por defecto toma la fecha actual del cliente.
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parsea una cadena de fecha ('YYYY-MM-DD' o ISO) a un objeto Date
 * situado en la medianoche local (00:00:00.000).
 * Evita que 'YYYY-MM-DD' sea interpretado como medianoche UTC por JavaScript.
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Suma (o resta) días a una fecha 'YYYY-MM-DD' y retorna la nueva fecha 'YYYY-MM-DD'.
 */
export const addDaysToDateString = (dateStr: string, days: number): string => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
};

/**
 * Retorna la diferencia en días calendario entre la fecha objetivo y hoy (target - hoy).
 * - 0: vence hoy
 * - positivo (ej: 1, 2): vence en N días
 * - negativo (ej: -1): venció hace N días
 */
export const getDaysDiff = (targetDateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(targetDateStr);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calcula la diferencia en días entre dos fechas (end - start).
 */
export const getDaysBetween = (startStr: string, endStr: string): number => {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
