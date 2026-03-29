(function seedIngredients() {
  const KEY = "weight-tracker-ingredients-v1";
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

  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? () => crypto.randomUUID()
      : () => `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let existing = [];
  try {
    const raw = localStorage.getItem(KEY);
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

  localStorage.setItem(KEY, JSON.stringify(merged));
  console.log(
    `[seed] +${extras.length} ingredientes (${merged.length} no total). Recarregando…`,
  );
  location.reload();
})();
