function num(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim().toUpperCase();
  if (s === "NA" || s === "TR" || s === "-" || s === "N/A") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function mapTacoJsonRows(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const name = String(row.description ?? "").trim();
    return {
      id: `taco-${row.id}`,
      name: name || `Alimento ${row.id}`,
      unit: "g",
      quantity: 100,
      kcal: Math.round(num(row.energy_kcal) * 10) / 10,
      protein: Math.round(num(row.protein_g) * 10) / 10,
      carbs: Math.round(num(row.carbohydrate_g) * 10) / 10,
      fat: Math.round(num(row.lipid_g) * 10) / 10,
      sodium:
        row.sodium_mg != null
          ? Math.round(num(row.sodium_mg) * 10) / 10
          : null,
      tacoReference: true,
    };
  });
}

export function sortIngredientsByName(a, b) {
  return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "pt-BR", {
    sensitivity: "base",
  });
}

export function buildIngredientLookupMap(userList, tacoList) {
  const m = {};
  for (const ing of tacoList ?? []) {
    m[ing.id] = ing;
  }
  for (const ing of userList ?? []) {
    m[ing.id] = ing;
  }
  return m;
}

export const TACO_LIST_PREVIEW_COUNT = 64;
export const TACO_FILTER_RESULT_CAP = 180;
export const MULTISELECT_VIRTUAL_ITEM_SIZE = 38;

export const RECIPE_OPTIONS_PREVIEW_COUNT = 32;

export function mergeIngredientOptionsWindowed(
  userList,
  tacoList,
  recipeOptions,
  selectedIds,
  filterText,
) {
  const q = (filterText ?? "").trim().toLowerCase();
  const map = buildIngredientLookupMap(userList, tacoList);
  for (const r of recipeOptions ?? []) {
    if (r?.id) map[r.id] = r;
  }
  const selectedItems = (selectedIds ?? [])
    .map((id) => map[id])
    .filter(Boolean);

  let pool = [];
  if (!q) {
    const user = [...(userList ?? [])];
    const taco = [...(tacoList ?? [])].slice(0, TACO_LIST_PREVIEW_COUNT);
    const recipes = [...(recipeOptions ?? [])].slice(
      0,
      RECIPE_OPTIONS_PREVIEW_COUNT,
    );
    pool = [...user, ...recipes, ...taco];
  } else {
    const userHit = (userList ?? []).filter((u) =>
      String(u.name ?? "")
        .toLowerCase()
        .includes(q),
    );
    const recipeHit = (recipeOptions ?? [])
      .filter((r) =>
        String(r.name ?? "")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, TACO_FILTER_RESULT_CAP);
    const tacoHit = (tacoList ?? [])
      .filter((t) =>
        String(t.name ?? "")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, TACO_FILTER_RESULT_CAP);
    pool = [...userHit, ...recipeHit, ...tacoHit];
  }

  const byId = new Map();
  for (const ing of selectedItems) {
    byId.set(ing.id, ing);
  }
  for (const ing of pool) {
    byId.set(ing.id, ing);
  }
  return [...byId.values()].sort(sortIngredientsByName);
}
