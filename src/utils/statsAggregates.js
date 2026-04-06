import { dayTotals } from "../composables/useDailyLog";

export function collectWeightsChronological(entries) {
  const out = [];
  for (const day of Object.values(entries ?? {})) {
    for (const w of day?.weights ?? []) {
      const t = new Date(w.recordedAt);
      if (Number.isNaN(t.getTime())) continue;
      out.push({ t: t.getTime(), kg: Number(w.kg) || 0, recordedAt: w.recordedAt });
    }
  }
  out.sort((a, b) => a.t - b.t);
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
  const spanMs = last.t - first.t;
  const spanDaysRaw = spanMs / 86400000;
  const spanDays = spanDaysRaw <= 0 ? 1 : Math.max(1, Math.round(spanDaysRaw));
  const avgPerWeek = deltaKg / (spanDays / 7);
  const journeyDays = spanDaysRaw <= 0 ? 1 : Math.max(1, Math.round(spanDaysRaw));
  const journeyMonths = Math.round(journeyDays / 30.437);
  return {
    initialKg: first.kg,
    currentKg: last.kg,
    deltaKg,
    avgPerWeek,
    journeyDays,
    journeyMonths,
  };
}

/** Pontos normalizados [0,1] para SVG (x = tempo, y = peso invertido para coordenadas de tela). */
export function weightSeriesToChartPoints(series) {
  if (!series.length) return [];
  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const spanT = Math.max(1, t1 - t0);
  const kgs = series.map((p) => p.kg);
  const minK = Math.min(...kgs);
  const maxK = Math.max(...kgs);
  const spanK = Math.max(0.001, maxK - minK);
  return series.map((p) => ({
    x: (p.t - t0) / spanT,
    y: 1 - (p.kg - minK) / spanK,
    kg: p.kg,
    recordedAt: p.recordedAt,
  }));
}
