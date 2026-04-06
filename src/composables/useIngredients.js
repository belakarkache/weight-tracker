const STORAGE_KEY = "weight-tracker-ingredients-v1";

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizeIngredient = (i) => ({
  id: i?.id ?? crypto?.randomUUID?.() ?? String(Date.now()),
  name: (i?.name ?? "").trim(),
  unit: i?.unit ?? "g",
  quantity: i?.quantity ?? 100,
  kcal: i?.kcal ?? i?.calories ?? i?.kcalPer100 ?? null,
  protein: i?.protein ?? i?.proteinPer100 ?? null,
  carbs: i?.carbs ?? i?.carbsPer100 ?? null,
  fat: i?.fat ?? i?.fatPer100 ?? null,
  updatedAt: i?.updatedAt ?? new Date().toISOString(),
  createdAt: i?.createdAt ?? new Date().toISOString(),
});

const sortByName = (a, b) =>
  (a?.name ?? "").localeCompare(b?.name ?? "", "pt-BR", { sensitivity: "base" });

export function useIngredients() {
  const getStored = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeIngredient).sort(sortByName);
  };

  const saveAll = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  };

  const upsert = (payload) => {
    const current = getStored();
    const existingId = payload?.id;
    let idx = existingId
      ? current.findIndex((i) => i.id === existingId)
      : -1;

    if (idx < 0 && !existingId) {
      const key = (payload?.name ?? "").trim();
      if (key) {
        idx = current.findIndex(
          (i) =>
            (i.name ?? "")
              .trim()
              .localeCompare(key, "pt-BR", { sensitivity: "base" }) === 0,
        );
      }
    }

    if (idx >= 0) {
      const next = normalizeIngredient({
        ...current[idx],
        ...payload,
        id: current[idx].id,
        updatedAt: new Date().toISOString(),
      });
      const updated = current.slice();
      updated[idx] = next;
      saveAll(updated.sort(sortByName));
      return next;
    }

    const next = normalizeIngredient(payload);
    saveAll([...current, next].sort(sortByName));
    return next;
  };

  const remove = (id) => {
    const current = getStored();
    return saveAll(current.filter((i) => i.id !== id));
  };

  const removeMany = (ids) => {
    if (!ids?.length) return getStored();
    const drop = new Set(ids);
    const current = getStored();
    return saveAll(current.filter((i) => !drop.has(i.id)));
  };

  return { getStored, upsert, remove, removeMany };
}

