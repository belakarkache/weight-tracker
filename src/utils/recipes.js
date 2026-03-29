import { scaleIngredientMacros } from "./nutrition";

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

export function computeRecipeFullTotals(lines, getIngredient) {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const line of lines ?? []) {
    const ing = getIngredient?.(line?.ingredientId);
    if (!ing) continue;
    const q = Number(line?.quantity);
    if (!q || q <= 0) continue;
    const m = scaleIngredientMacros(ing, q);
    kcal += m.kcal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
  }
  return {
    kcal: round1(kcal),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
  };
}

export function buildMealFromRecipePortion(recipe, consumedYieldQty, getIngredient) {
  const yieldQ = Number(recipe?.yieldQuantity);
  const consumed = Number(consumedYieldQty);
  if (!recipe || !yieldQ || yieldQ <= 0 || !consumed || consumed <= 0) {
    return { entries: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, factor: 0 };
  }
  const factor = consumed / yieldQ;
  const entries = [];
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const line of recipe.lines ?? []) {
    const ing = getIngredient?.(line?.ingredientId);
    if (!ing) continue;
    const fullLineQty = Number(line?.quantity);
    if (!fullLineQty || fullLineQty <= 0) continue;
    const qMeal = fullLineQty * factor;
    const m = scaleIngredientMacros(ing, qMeal);
    kcal += m.kcal;
    protein += m.protein;
    carbs += m.carbs;
    fat += m.fat;
    entries.push({
      ingredientId: ing.id,
      name: ing.name,
      unit: ing.unit ?? "g",
      quantityConsumed: round1(qMeal),
      kcal: m.kcal,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
    });
  }
  return {
    entries,
    totals: {
      kcal: round1(kcal),
      protein: round1(protein),
      carbs: round1(carbs),
      fat: round1(fat),
    },
    factor,
  };
}
