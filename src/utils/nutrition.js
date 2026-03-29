const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const DEFICIT_KCAL = {
  low: 250,
  moderate: 500,
  aggressive: 750,
};

function bmrMifflinStJeor(p) {
  const w = Number(p.weightKg);
  const h = Number(p.heightCm);
  const age = Number(p.age);
  if (!w || !h || !age || w <= 0 || h <= 0 || age <= 0) return null;

  const base = 10 * w + 6.25 * h - 5 * age;
  if (p.sex === "female") return base - 161;
  if (p.sex === "male") return base + 5;
  return base - 78;
}

function activityFactor(level) {
  return ACTIVITY_FACTORS[level] ?? 1.2;
}

function deficitOrSurplusKcal(key) {
  return DEFICIT_KCAL[key] ?? 500;
}

export function dailyCalorieTarget(profile, weightKgForTdee) {
  if (!profile) return null;
  const w =
    weightKgForTdee != null && Number(weightKgForTdee) > 0
      ? Number(weightKgForTdee)
      : Number(profile.weight);
  const h = Number(profile.height);
  const age = Number(profile.age);
  const goal = Number(profile.goalWeight);
  if (!w || !h || !age || !goal) return null;

  const bmr = bmrMifflinStJeor({
    weightKg: w,
    heightCm: h,
    age,
    sex: profile.sex ?? "unspecified",
  });
  if (bmr == null || bmr <= 0) return null;

  const tdee = bmr * activityFactor(profile.activityLevel);
  const delta = deficitOrSurplusKcal(profile.calorieDeficit);

  if (w > goal) return Math.max(800, Math.round(tdee - delta));
  if (w < goal) return Math.round(tdee + delta);
  return Math.round(tdee);
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

export function scaleIngredientMacros(ingredient, consumedQty) {
  const refQty = Number(ingredient?.quantity) || 100;
  const q = Number(consumedQty);
  if (!ingredient || !q || q <= 0 || refQty <= 0) {
    return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const factor = q / refQty;
  return {
    kcal: round1((Number(ingredient.kcal) || 0) * factor),
    protein: round1((Number(ingredient.protein) || 0) * factor),
    carbs: round1((Number(ingredient.carbs) || 0) * factor),
    fat: round1((Number(ingredient.fat) || 0) * factor),
  };
}
