import { dayTotals } from "../composables/useDailyLog";

function localDayKeyFromMs(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function parseDayKeyToLocalDate(dayKey) {
  if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return null;
  }
  const [y, m, d] = dayKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function calendarDaysBetweenExclusive(firstKey, lastKey) {
  const a = parseDayKeyToLocalDate(firstKey);
  const b = parseDayKeyToLocalDate(lastKey);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function calendarInclusiveDays(firstKey, lastKey) {
  return Math.max(1, calendarDaysBetweenExclusive(firstKey, lastKey) + 1);
}

export function formatJourneyLabel(firstDayKey, lastDayKey) {
  const inclusive = calendarInclusiveDays(firstDayKey, lastDayKey);
  if (inclusive < 30) {
    return `${inclusive} ${inclusive === 1 ? "dia" : "dias"}`;
  }
  const approxMonths = Math.max(1, Math.round(inclusive / 30.437));
  if (approxMonths < 12) {
    return `${approxMonths} ${approxMonths === 1 ? "mês" : "meses"}`;
  }
  const years = Math.max(1, Math.round(inclusive / 365.25));
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

export function collectWeightsChronological(entries) {
  const out = [];
  for (const [storageKey, day] of Object.entries(entries ?? {})) {
    const dkFromKey =
      typeof storageKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(storageKey)
        ? storageKey
        : null;
    for (const w of day?.weights ?? []) {
      const t = new Date(w.recordedAt);
      if (Number.isNaN(t.getTime())) continue;
      const ms = t.getTime();
      const dayKey = dkFromKey ?? localDayKeyFromMs(ms);
      out.push({
        t: ms,
        kg: Number(w.kg) || 0,
        recordedAt: w.recordedAt,
        dayKey,
      });
    }
  }
  out.sort((a, b) =>
    a.t !== b.t ? a.t - b.t : String(a.dayKey).localeCompare(String(b.dayKey)),
  );
  return out;
}

export function hasStatsOverviewData(entries) {
  if (collectWeightsChronological(entries).length > 0) return true;
  for (const key of Object.keys(entries ?? {})) {
    const meals = entries[key]?.meals;
    if (Array.isArray(meals) && meals.length > 0) return true;
  }
  return false;
}

export function computeNutritionAverages(entries) {
  let sumKcal = 0;
  let sumProtein = 0;
  let n = 0;
  for (const dayKey of Object.keys(entries ?? {})) {
    const meals = entries[dayKey]?.meals ?? [];
    if (!meals.length) continue;
    const t = dayTotals(meals);
    sumKcal += t.kcal;
    sumProtein += t.protein;
    n += 1;
  }
  if (n === 0) return null;
  return {
    avgKcalPerDay: sumKcal / n,
    avgProteinPerDay: sumProtein / n,
    daysCounted: n,
  };
}

export function computeWeightStats(series) {
  if (!series.length) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const deltaKg = last.kg - first.kg;

  const sortedDayKeys = [...new Set(series.map((s) => s.dayKey))].sort();
  const journeyFirstDayKey = sortedDayKeys[0];
  const journeyLastDayKey = sortedDayKeys[sortedDayKeys.length - 1];

  const exclusiveCalendarDays = Math.max(
    0,
    calendarDaysBetweenExclusive(journeyFirstDayKey, journeyLastDayKey),
  );
  const weeksForAvg = Math.max(exclusiveCalendarDays / 7, 1 / 7);
  const avgPerWeek = deltaKg / weeksForAvg;

  return {
    initialKg: first.kg,
    currentKg: last.kg,
    deltaKg,
    avgPerWeek,
    firstDayKey: journeyFirstDayKey,
    lastDayKey: journeyLastDayKey,
    journeyLabel: formatJourneyLabel(journeyFirstDayKey, journeyLastDayKey),
  };
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function weightSeriesToChartPoints(series) {
  const n = series.length;
  if (!n) return [];

  const kgs = series.map((p) => p.kg);
  const minK = Math.min(...kgs);
  const maxK = Math.max(...kgs);
  const spanK = maxK - minK;
  const pad =
    spanK < 1e-9 ? 2 : Math.max(spanK * 0.1, 0.35);
  const lo = minK - pad;
  const hi = maxK + pad;
  const denom = Math.max(hi - lo, 1e-6);

  return series.map((p, i) => {
    const x = n <= 1 ? 0.5 : i / (n - 1);
    const y = clamp(1 - (p.kg - lo) / denom, 0, 1);
    return {
      x,
      y,
      kg: p.kg,
      recordedAt: p.recordedAt,
      dayKey: p.dayKey,
    };
  });
}

/** Índices nos pontos da série para marcar no gráfico sem empilhar círculos (máx. `maxMarkers`). */
export function weightChartMarkerIndices(seriesLength, maxMarkers = 6) {
  const n = seriesLength;
  if (n <= 0) return [];
  if (n <= maxMarkers) return [...Array(n).keys()];
  const out = new Set();
  const m = maxMarkers;
  for (let k = 0; k < m; k++) {
    out.add(Math.round((k * (n - 1)) / Math.max(m - 1, 1)));
  }
  return [...out].sort((a, b) => a - b);
}
