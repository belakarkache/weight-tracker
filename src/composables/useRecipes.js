const STORAGE_KEY = "weight-tracker-recipes-v1";

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

function newId() {
  return crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLine(l) {
  return {
    ingredientId: l?.ingredientId ?? null,
    quantity: l?.quantity != null ? Number(l.quantity) : null,
  };
}

function normalizeRecipe(r) {
  const lines = Array.isArray(r?.lines)
    ? r.lines.map(normalizeLine).filter((x) => x.ingredientId && x.quantity != null && x.quantity > 0)
    : [];
  return {
    id: r?.id ?? newId(),
    name: (r?.name ?? "").trim() || "Receita",
    yieldQuantity:
      r?.yieldQuantity != null && Number(r.yieldQuantity) > 0
        ? Number(r.yieldQuantity)
        : 100,
    yieldUnit: r?.yieldUnit ?? "g",
    lines,
    updatedAt: r?.updatedAt ?? new Date().toISOString(),
    createdAt: r?.createdAt ?? new Date().toISOString(),
  };
}

const sortByName = (a, b) =>
  (a?.name ?? "").localeCompare(b?.name ?? "", "pt-BR", { sensitivity: "base" });

export function useRecipes() {
  const getStored = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecipe).sort(sortByName);
  };

  const saveAll = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  };

  const upsert = (payload) => {
    const current = getStored();
    const existingId = payload?.id;
    let idx = existingId ? current.findIndex((r) => r.id === existingId) : -1;

    if (idx < 0 && !existingId) {
      const key = (payload?.name ?? "").trim();
      if (key) {
        idx = current.findIndex(
          (r) =>
            (r.name ?? "")
              .trim()
              .localeCompare(key, "pt-BR", { sensitivity: "base" }) === 0,
        );
      }
    }

    if (idx >= 0) {
      const next = normalizeRecipe({
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

    const next = normalizeRecipe(payload);
    saveAll([...current, next].sort(sortByName));
    return next;
  };

  const remove = (id) => {
    const current = getStored();
    return saveAll(current.filter((r) => r.id !== id));
  };

  const removeMany = (ids) => {
    if (!ids?.length) return getStored();
    const drop = new Set(ids);
    const current = getStored();
    return saveAll(current.filter((r) => !drop.has(r.id)));
  };

  const getById = (id) => getStored().find((r) => r.id === id) ?? null;

  return { getStored, upsert, remove, removeMany, getById };
}
