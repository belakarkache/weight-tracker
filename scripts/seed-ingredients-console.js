(function seedIngredientsAndRecipes() {
  const ING_KEY = "weight-tracker-ingredients-v1";
  const RECIPE_KEY = "weight-tracker-recipes-v1";
  const count = Number(window.__SEED_COUNT) > 0 ? Number(window.__SEED_COUNT) : 18;

  const names = [
    "Arroz branco cozido",
    "Feijão preto cozido",
    "Frango grelhado",
    "Ovo cozido",
    "Aveia em flocos",
    "Banana prata",
    "Iogurte natural",
    "Pão integral",
    "Queijo minas",
    "Tomate cru",
    "Abacate",
    "Salmão assado",
    "Batata doce cozida",
    "Brócolis cozido",
    "Azeite de oliva",
    "Leite desnatado",
    "Tapioca",
    "Amendoim torrado",
    "Maçã Fuji",
    "Melancia",
  ];

  const recipeTemplates = [
    {
      name: "Marmita frango e arroz",
      yieldQuantity: 400,
      yieldUnit: "g",
      lines: [
        { name: "Frango grelhado", quantity: 150 },
        { name: "Arroz branco cozido", quantity: 200 },
        { name: "Brócolis cozido", quantity: 50 },
      ],
    },
    {
      name: "Bowl de aveia",
      yieldQuantity: 280,
      yieldUnit: "g",
      lines: [
        { name: "Aveia em flocos", quantity: 40 },
        { name: "Iogurte natural", quantity: 180 },
        { name: "Banana prata", quantity: 60 },
      ],
    },
    {
      name: "Vitamina de banana",
      yieldQuantity: 300,
      yieldUnit: "ml",
      lines: [
        { name: "Banana prata", quantity: 120 },
        { name: "Leite desnatado", quantity: 180 },
      ],
    },
    {
      name: "Arroz, feijão e ovo",
      yieldQuantity: 350,
      yieldUnit: "g",
      lines: [
        { name: "Arroz branco cozido", quantity: 150 },
        { name: "Feijão preto cozido", quantity: 120 },
        { name: "Ovo cozido", quantity: 80 },
      ],
    },
  ];

  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? () => crypto.randomUUID()
      : () => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let existing = [];
  try {
    const raw = localStorage.getItem(ING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    }
  } catch (e) {
    console.warn("Lista existente inválida, começando do zero:", e);
    existing = [];
  }

  const now = new Date().toISOString();
  const extras = [];

  for (let i = 0; i < count; i++) {
    const base = names[i % names.length];
    const suffix = Math.floor(i / names.length);
    const name = suffix ? `${base} (${suffix + 1})` : base;
    const n = i + 1;
    extras.push({
      id: uuid(),
      name,
      unit: "g",
      quantity: 100,
      kcal: 80 + (n % 40) * 3,
      protein: (n % 12) + 1,
      carbs: (n % 25) + 2,
      fat: n % 15,
      createdAt: now,
      updatedAt: now,
    });
  }

  const merged = [...existing, ...extras];
  merged.sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "pt-BR", {
      sensitivity: "base",
    }),
  );

  localStorage.setItem(ING_KEY, JSON.stringify(merged));

  function ingredientIdByName(list, ingredientName) {
    const found = list.find((x) => x.name === ingredientName);
    return found?.id ?? null;
  }

  let existingRecipes = [];
  try {
    const rawR = localStorage.getItem(RECIPE_KEY);
    if (rawR) {
      const parsed = JSON.parse(rawR);
      if (Array.isArray(parsed)) existingRecipes = parsed;
    }
  } catch (e) {
    console.warn("[seed] receitas existentes inválidas, ignorando:", e);
    existingRecipes = [];
  }

  const recipeNamesPresent = new Set(
    existingRecipes.map((r) => String(r?.name ?? "").trim()),
  );
  const recipeExtras = [];

  for (const tpl of recipeTemplates) {
    if (recipeNamesPresent.has(tpl.name)) continue;

    const lines = [];
    let ok = true;
    for (const ln of tpl.lines) {
      const id = ingredientIdByName(merged, ln.name);
      if (!id) {
        console.warn(
          `[seed] ingrediente não encontrado para receita "${tpl.name}": ${ln.name}`,
        );
        ok = false;
        break;
      }
      lines.push({ ingredientId: id, quantity: ln.quantity });
    }
    if (!ok || !lines.length) continue;

    recipeExtras.push({
      id: uuid(),
      name: tpl.name,
      yieldQuantity: tpl.yieldQuantity,
      yieldUnit: tpl.yieldUnit,
      lines,
      createdAt: now,
      updatedAt: now,
    });
    recipeNamesPresent.add(tpl.name);
  }

  const mergedRecipes = [...existingRecipes, ...recipeExtras];
  mergedRecipes.sort((a, b) =>
    String(a?.name ?? "").localeCompare(String(b?.name ?? ""), "pt-BR", {
      sensitivity: "base",
    }),
  );

  localStorage.setItem(RECIPE_KEY, JSON.stringify(mergedRecipes));

  console.log(
    `[seed] +${extras.length} ingredientes (${merged.length} no total); +${recipeExtras.length} receitas (${mergedRecipes.length} no total). Recarregando…`,
  );
  location.reload();
})();
