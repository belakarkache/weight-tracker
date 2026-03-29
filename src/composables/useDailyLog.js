import { ref } from "vue";

const STORAGE_KEY = "weight-tracker-daily-log-v1";

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function newId() {
  return crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function dateKeyFromDate(d) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function endOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function normalizeMeal(m) {
  const ingredients = Array.isArray(m?.ingredients)
    ? m.ingredients
        .map((entry) => ({
          ingredientId: entry?.ingredientId ?? null,
          name: (entry?.name ?? "").trim(),
          unit: entry?.unit ?? "g",
          quantityConsumed:
            entry?.quantityConsumed != null
              ? Number(entry.quantityConsumed)
              : null,
          kcal: Math.max(0, Number(entry?.kcal) || 0),
          protein: entry?.protein != null ? round1(entry.protein) : null,
          carbs: entry?.carbs != null ? round1(entry.carbs) : null,
          fat: entry?.fat != null ? round1(entry.fat) : null,
        }))
        .filter(
          (entry) =>
            entry.ingredientId != null &&
            entry.name.length > 0 &&
            entry.quantityConsumed != null &&
            entry.quantityConsumed > 0,
        )
    : [];

  return {
    id: m?.id ?? newId(),
    name: (m?.name ?? "").trim() || "Refeição",
    recordedAt: m?.recordedAt ?? new Date().toISOString(),
    source: m?.source === "ingredient" ? "ingredient" : "manual",
    ingredientId: m?.ingredientId ?? null,
    quantityConsumed:
      m?.quantityConsumed != null ? Number(m.quantityConsumed) : null,
    kcal: Math.max(0, Number(m?.kcal) || 0),
    protein: m?.protein != null ? round1(m.protein) : null,
    carbs: m?.carbs != null ? round1(m.carbs) : null,
    fat: m?.fat != null ? round1(m.fat) : null,
    ingredients,
  };
}

function normalizeWeight(w) {
  return {
    id: w?.id ?? newId(),
    kg: Math.round((Number(w?.kg) || 0) * 10) / 10,
    recordedAt: w?.recordedAt ?? new Date().toISOString(),
  };
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return {};
  const entries = parsed.entries;
  if (!entries || typeof entries !== "object") return {};
  return entries;
}

function saveEntries(entries) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: 1, entries }),
  );
}

export function dayTotals(meals) {
  const list = Array.isArray(meals) ? meals : [];
  return list.reduce(
    (acc, m) => {
      acc.kcal += Number(m.kcal) || 0;
      acc.protein += Number(m.protein) || 0;
      acc.carbs += Number(m.carbs) || 0;
      acc.fat += Number(m.fat) || 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function latestWeightKgBeforeOrOn(entries, date) {
  const end = endOfLocalDay(date);
  let best = null;
  for (const day of Object.values(entries || {})) {
    for (const w of day?.weights ?? []) {
      const t = new Date(w.recordedAt);
      if (Number.isNaN(t.getTime())) continue;
      if (t > end) continue;
      if (!best || t > best.t) best = { t, kg: w.kg };
    }
  }
  return best?.kg ?? null;
}

export function useDailyLog() {
  const entries = ref(loadEntries());

  function persist() {
    saveEntries(entries.value);
  }

  function getDay(dayKey) {
    const d = entries.value[dayKey];
    if (!d) return { meals: [], weights: [] };
    return {
      meals: [...(d.meals ?? [])],
      weights: [...(d.weights ?? [])],
    };
  }

  function setDay(dayKey, day) {
    const next = { ...entries.value };
    next[dayKey] = {
      meals: [...(day.meals ?? [])],
      weights: [...(day.weights ?? [])],
    };
    entries.value = next;
    persist();
  }

  function upsertMeal(dayKey, meal) {
    const normalized = normalizeMeal(meal);
    const day = getDay(dayKey);
    const idx = day.meals.findIndex((m) => m.id === normalized.id);
    if (idx >= 0) day.meals[idx] = normalized;
    else day.meals.push(normalized);
    day.meals.sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    setDay(dayKey, day);
    return normalized;
  }

  function removeMeal(dayKey, mealId) {
    const day = getDay(dayKey);
    day.meals = day.meals.filter((m) => m.id !== mealId);
    setDay(dayKey, day);
  }

  function upsertWeight(dayKey, weight) {
    const normalized = normalizeWeight(weight);
    const day = getDay(dayKey);
    const idx = day.weights.findIndex((w) => w.id === normalized.id);
    if (idx >= 0) day.weights[idx] = normalized;
    else day.weights.push(normalized);
    day.weights.sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    setDay(dayKey, day);
    return normalized;
  }

  function removeWeight(dayKey, weightId) {
    const day = getDay(dayKey);
    day.weights = day.weights.filter((w) => w.id !== weightId);
    setDay(dayKey, day);
  }

  function refresh() {
    entries.value = loadEntries();
  }

  return {
    entries,
    getDay,
    upsertMeal,
    removeMeal,
    upsertWeight,
    removeWeight,
    refresh,
    dayTotals,
    latestWeightKgBeforeOrOn: (d) => latestWeightKgBeforeOrOn(entries.value, d),
  };
}
