<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  IconChevronDown,
  IconFlame,
  IconScale,
  IconPlus,
  IconPencil,
  IconTrash,
  IconChefHat,
  IconSoup,
  IconTarget,
  IconApple,
  IconBarbell,
  IconDroplet,
} from "@tabler/icons-vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import DatePicker from "primevue/datepicker";
import Popover from "primevue/popover";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import SpeedDial from "primevue/speeddial";
import AppHeader from "../components/AppHeader.vue";
import AppHeaderStatLink from "../components/AppHeaderStatLink.vue";
import InfoNotice from "../components/InfoNotice.vue";
import { useOnboarding } from "../composables/useOnboarding";
import { useIngredients } from "../composables/useIngredients";
import { useRecipes } from "../composables/useRecipes";
import {
  useDailyLog,
  dateKeyFromDate,
  dayTotals,
} from "../composables/useDailyLog";
import { dailyCalorieTarget, scaleIngredientMacros } from "../utils/nutrition";
import { buildMealFromRecipePortion } from "../utils/recipes";
const router = useRouter();
const toast = useToast();
const { getStored: getProfile, save: saveProfile } = useOnboarding();
const profileTick = ref(0);
const { getStored: getIngredients, upsert: upsertIngredient } =
  useIngredients();
const { getStored: getRecipes } = useRecipes();
const dailyLog = useDailyLog();

const recipesList = ref(getRecipes());
function refreshRecipes() {
  recipesList.value = getRecipes();
}
const recipeMap = computed(() =>
  Object.fromEntries(recipesList.value.map((r) => [r.id, r])),
);

const selectedDate = ref(new Date());
const datePopoverRef = ref();
const isDatePopoverOpen = ref(false);

const profile = computed(() => {
  profileTick.value;
  return getProfile() ?? {};
});

const dayKey = computed(() => dateKeyFromDate(selectedDate.value) ?? "");

const daySnapshot = computed(() => {
  const dk = dayKey.value;
  if (!dk) return { meals: [], weights: [] };
  return dailyLog.getDay(dk);
});

const meals = computed(() => daySnapshot.value.meals ?? []);
const weightsToday = computed(() => daySnapshot.value.weights ?? []);

const totals = computed(() => dayTotals(meals.value));

const ingredientsList = ref(getIngredients());
const expandedMeals = ref({});

function refreshIngredients() {
  ingredientsList.value = getIngredients();
}

const ingredientSelectOptions = computed(() => ingredientsList.value);

function toggleMealExpanded(mealId) {
  expandedMeals.value = {
    ...expandedMeals.value,
    [mealId]: !expandedMeals.value[mealId],
  };
}

function isMealExpanded(mealId) {
  return !!expandedMeals.value[mealId];
}

const weightForTdee = computed(() => {
  const latest = dailyLog.latestWeightKgBeforeOrOn(selectedDate.value);
  if (latest != null && Number(latest) > 0) return Number(latest);
  const pw = Number(profile.value.weight);
  return pw > 0 ? pw : null;
});

const autoCalorieGoal = computed(() =>
  dailyCalorieTarget(profile.value, weightForTdee.value),
);

const calorieGoal = computed(() => {
  const manual = profile.value.calorieTargetManual;
  if (manual != null && Number(manual) > 0) {
    return Math.round(Number(manual));
  }
  return autoCalorieGoal.value;
});

const hasCalorieGoal = computed(
  () => calorieGoal.value != null && Number(calorieGoal.value) > 0,
);

const kcalProgress = computed(() => {
  const goal = calorieGoal.value;
  const consumed = totals.value.kcal;
  if (!goal || goal <= 0) return { pct: 0, over: false };
  const pct = Math.min(100, (consumed / goal) * 100);
  return { pct, over: consumed > goal };
});

const proteinGoal = computed(() => {
  const baseWeight =
    weightForTdee.value != null && Number(weightForTdee.value) > 0
      ? Number(weightForTdee.value)
      : Number(profile.value.weight);
  if (!baseWeight || baseWeight <= 0) return null;

  const factorByActivity = {
    sedentary: 1.6,
    light: 1.7,
    moderate: 1.8,
    active: 1.9,
    very_active: 2.0,
  };
  let factor = factorByActivity[profile.value.activityLevel] ?? 1.7;
  const goalWeight = Number(profile.value.goalWeight);
  if (goalWeight > 0 && goalWeight > baseWeight) factor -= 0.1;

  return Math.max(60, Math.round(baseWeight * factor));
});

const proteinProgress = computed(() => {
  const goal = proteinGoal.value;
  const consumed = Number(totals.value.protein) || 0;
  if (!goal || goal <= 0) return { pct: 0, over: false };
  return {
    pct: Math.min(100, (consumed / goal) * 100),
    over: consumed > goal,
  };
});

const quickActions = computed(() => [
  {
    label: "Registrar peso",
    action: "weight",
    command: () => openWeightDialog(),
  },
  {
    label: "Adicionar refeição",
    action: "meal",
    command: () => openMealCreate(),
  },
]);

const ringCircumference = 2 * Math.PI * 40;
const todayDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
};

const ringOffset = computed(() => {
  const { pct, over } = kcalProgress.value;
  const p = over ? 100 : pct;
  return ringCircumference * (1 - p / 100);
});

const lastWeightOnDay = computed(() => {
  const arr = [...weightsToday.value].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  return arr.length ? arr[arr.length - 1] : null;
});

const displayWeight = computed(() => {
  if (lastWeightOnDay.value) {
    return { kg: lastWeightOnDay.value.kg };
  }
  const hist = dailyLog.latestWeightKgBeforeOrOn(selectedDate.value);
  if (hist != null) {
    return { kg: hist };
  }
  const pw = Number(profile.value.weight);
  if (pw > 0) {
    return { kg: pw };
  }
  return null;
});

const weightGap = computed(() => {
  const goal = Number(profile.value.goalWeight);
  const cur = displayWeight.value?.kg;
  if (!goal || cur == null) return null;
  const diff = goal - cur;
  const abs = Math.round(Math.abs(diff) * 10) / 10;
  const met = abs < 0.05;
  return {
    met,
    needGain: diff > 0.05,
    needLose: diff < -0.05,
    abs,
    goal,
  };
});

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function isSameCalendarDay(a, b) {
  const da = startOfLocalDay(a);
  const db = startOfLocalDay(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

const headerTitle = computed(() => {
  const d = selectedDate.value;
  if (!d) return "Hoje";
  if (isSameCalendarDay(d, new Date())) return "Hoje";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
});

const headerSubtitle = computed(() =>
  isSameCalendarDay(selectedDate.value, new Date())
    ? "Metas, refeições e peso do dia"
    : "Visualizando o dia selecionado.",
);

function toggleDatePopover(event) {
  datePopoverRef.value?.toggle(event);
}

function onDatePopoverShow() {
  isDatePopoverOpen.value = true;
}

function onDatePopoverHide() {
  isDatePopoverOpen.value = false;
}

async function closeDatePopover() {
  await nextTick();
  datePopoverRef.value?.hide();
}

function onClearDateClick() {
  selectedDate.value = new Date();
  closeDatePopover();
}

function fmtInt(n) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmt1(n) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtTime(iso) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const mealRecordedAtPreserve = ref(null);
const mealDialogOpen = ref(false);
const editingMealId = ref(null);
const mealForm = ref({
  mode: "ingredient",
  ingredientIds: [],
  ingredientQuantities: {},
  recipeId: null,
  recipeConsumedQty: null,
  name: "",
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
});

const ingredientMap = computed(() =>
  Object.fromEntries(ingredientsList.value.map((ing) => [ing.id, ing])),
);

const selectedIngredients = computed(() =>
  (mealForm.value.ingredientIds ?? [])
    .map((id) => ingredientMap.value[id])
    .filter(Boolean),
);

function firstWord(text) {
  return (
    String(text ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] ?? ""
  );
}

function truncateWithEllipsis(text, max = 32) {
  const clean = String(text ?? "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function mealNameFromIngredients(ingredients) {
  const base = ingredients
    .slice(0, 3)
    .map((ing) => firstWord(ing.name))
    .filter(Boolean)
    .join(" ");
  return truncateWithEllipsis(base || "Refeição", 30);
}

const ingredientMealEntries = computed(() =>
  selectedIngredients.value
    .map((ing) => {
      const typedQty = Number(mealForm.value.ingredientQuantities?.[ing.id]);
      const quantity =
        typedQty > 0
          ? typedQty
          : Number(ing.quantity) > 0
            ? Number(ing.quantity)
            : 100;
      const macros = scaleIngredientMacros(ing, quantity);
      return {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit ?? "g",
        quantityConsumed: quantity,
        kcal: macros.kcal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    })
    .filter((entry) => entry.quantityConsumed > 0),
);

const quickIngredientDialogOpen = ref(false);
const quickIngredientForm = ref({
  name: "",
  quantity: 100,
  unit: "g",
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
});

const quickIngredientValid = computed(() => {
  const f = quickIngredientForm.value;
  return (
    f.name.trim().length > 0 &&
    f.quantity != null &&
    Number(f.quantity) > 0 &&
    f.kcal != null &&
    Number(f.kcal) >= 0
  );
});

const scaledFromIngredient = computed(() =>
  ingredientMealEntries.value.reduce(
    (acc, entry) => {
      acc.kcal += Number(entry.kcal) || 0;
      acc.protein += Number(entry.protein) || 0;
      acc.carbs += Number(entry.carbs) || 0;
      acc.fat += Number(entry.fat) || 0;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  ),
);

const recipeMealPreview = computed(() => {
  const f = mealForm.value;
  if (f.mode !== "recipe" || !f.recipeId) {
    return { entries: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };
  }
  const recipe = recipeMap.value[f.recipeId];
  return buildMealFromRecipePortion(
    recipe,
    f.recipeConsumedQty,
    (id) => ingredientMap.value[id],
  );
});

watch(
  () => mealForm.value.recipeId,
  (id) => {
    if (mealForm.value.mode !== "recipe" || !id) return;
    const r = recipeMap.value[id];
    if (!r) return;
    const cur = Number(mealForm.value.recipeConsumedQty);
    if (!cur || cur <= 0) {
      mealForm.value.recipeConsumedQty = r.yieldQuantity;
    }
  },
);

const mealFormSelectedRecipe = computed(() => {
  const id = mealForm.value.recipeId;
  return id ? (recipeMap.value[id] ?? null) : null;
});

const mealFormValid = computed(() => {
  const f = mealForm.value;
  if (f.mode === "ingredient") {
    if (!Array.isArray(f.ingredientIds) || !f.ingredientIds.length)
      return false;
    const hasInvalid = ingredientMealEntries.value.some(
      (entry) => entry.kcal < 0,
    );
    if (hasInvalid) return false;
    return (
      scaledFromIngredient.value.kcal > 0 &&
      ingredientMealEntries.value.length > 0
    );
  }
  if (f.mode === "recipe") {
    if (!f.recipeId) return false;
    const qty = Number(f.recipeConsumedQty);
    if (!qty || qty <= 0) return false;
    const { entries, totals } = recipeMealPreview.value;
    return entries.length > 0 && totals.kcal > 0;
  }
  return f.name.trim().length > 0 && f.kcal != null && Number(f.kcal) >= 0;
});

function openMealCreate() {
  refreshIngredients();
  refreshRecipes();
  editingMealId.value = null;
  mealRecordedAtPreserve.value = null;
  mealForm.value = {
    mode: "ingredient",
    ingredientIds: [],
    ingredientQuantities: {},
    recipeId: null,
    recipeConsumedQty: null,
    name: "",
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
  };
  mealDialogOpen.value = true;
}

function openQuickIngredientDialog() {
  quickIngredientForm.value = {
    name: "",
    quantity: 100,
    unit: "g",
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
  };
  quickIngredientDialogOpen.value = true;
}

function saveQuickIngredient() {
  if (!quickIngredientValid.value) return;
  const f = quickIngredientForm.value;
  const beforeIds = new Set(ingredientsList.value.map((x) => x.id));
  upsertIngredient({
    name: f.name.trim(),
    quantity: Number(f.quantity),
    unit: f.unit ?? "g",
    kcal: Number(f.kcal),
    protein: f.protein != null ? Number(f.protein) : null,
    carbs: f.carbs != null ? Number(f.carbs) : null,
    fat: f.fat != null ? Number(f.fat) : null,
  });
  refreshIngredients();
  const createdId =
    ingredientsList.value.find((x) => !beforeIds.has(x.id))?.id ?? null;
  if (createdId) {
    mealForm.value.ingredientIds = [
      ...new Set([...(mealForm.value.ingredientIds ?? []), createdId]),
    ];
    mealForm.value.ingredientQuantities = {
      ...(mealForm.value.ingredientQuantities ?? {}),
      [createdId]: Number(f.quantity),
    };
  }
  quickIngredientDialogOpen.value = false;
}

function openMealEdit(meal) {
  refreshIngredients();
  refreshRecipes();
  editingMealId.value = meal.id;
  mealRecordedAtPreserve.value = meal.recordedAt;
  if (meal.source === "recipe") {
    mealForm.value = {
      mode: "recipe",
      ingredientIds: [],
      ingredientQuantities: {},
      recipeId: meal.recipeId ?? null,
      recipeConsumedQty:
        meal.recipeQuantityConsumed != null
          ? Number(meal.recipeQuantityConsumed)
          : null,
      name: meal.name ?? "",
      kcal: meal.kcal ?? null,
      protein: meal.protein ?? null,
      carbs: meal.carbs ?? null,
      fat: meal.fat ?? null,
    };
    mealDialogOpen.value = true;
    return;
  }
  const idsFromMeal = Array.isArray(meal.ingredients)
    ? meal.ingredients.map((x) => x.ingredientId).filter(Boolean)
    : meal.ingredientId
      ? [meal.ingredientId]
      : [];
  const qtyFromMeal = Array.isArray(meal.ingredients)
    ? Object.fromEntries(
        meal.ingredients
          .filter((x) => x?.ingredientId)
          .map((x) => [x.ingredientId, Number(x.quantityConsumed) || 0]),
      )
    : meal.ingredientId
      ? { [meal.ingredientId]: Number(meal.quantityConsumed) || 100 }
      : {};
  mealForm.value = {
    mode: meal.source === "ingredient" ? "ingredient" : "manual",
    ingredientIds: idsFromMeal,
    ingredientQuantities: qtyFromMeal,
    recipeId: null,
    recipeConsumedQty: null,
    name: meal.name ?? "",
    kcal: meal.kcal ?? null,
    protein: meal.protein ?? null,
    carbs: meal.carbs ?? null,
    fat: meal.fat ?? null,
  };
  mealDialogOpen.value = true;
}

function saveMeal() {
  if (!mealFormValid.value) {
    toast.add({
      group: "pwa",
      severity: "warn",
      summary: "Dados incompletos",
      detail: "Preencha os campos obrigatórios da refeição.",
      life: 3200,
    });
    return;
  }
  const dk = dayKey.value;
  if (!dk) return;

  const recordedAt =
    editingMealId.value && mealRecordedAtPreserve.value
      ? mealRecordedAtPreserve.value
      : new Date().toISOString();
  const f = mealForm.value;

  if (f.mode === "ingredient") {
    const entries = ingredientMealEntries.value;
    const mealName = mealNameFromIngredients(entries);
    dailyLog.upsertMeal(dk, {
      id: editingMealId.value ?? undefined,
      name: mealName,
      recordedAt,
      source: "ingredient",
      ingredientId: entries[0]?.ingredientId ?? null,
      quantityConsumed: entries[0]?.quantityConsumed ?? null,
      recipeId: null,
      recipeName: null,
      yieldQuantity: null,
      yieldUnit: null,
      recipeQuantityConsumed: null,
      ingredients: entries,
      kcal: Number(scaledFromIngredient.value.kcal.toFixed(1)),
      protein: Number(scaledFromIngredient.value.protein.toFixed(1)) || null,
      carbs: Number(scaledFromIngredient.value.carbs.toFixed(1)) || null,
      fat: Number(scaledFromIngredient.value.fat.toFixed(1)) || null,
    });
  } else if (f.mode === "recipe") {
    const recipe = recipeMap.value[f.recipeId];
    if (!recipe) {
      toast.add({
        group: "pwa",
        severity: "warn",
        summary: "Receita indisponível",
        detail:
          "Esta receita não existe mais. Escolha outra ou monte manualmente.",
        life: 4000,
      });
      return;
    }
    const { entries, totals } = recipeMealPreview.value;
    dailyLog.upsertMeal(dk, {
      id: editingMealId.value ?? undefined,
      name: recipe.name,
      recordedAt,
      source: "recipe",
      ingredientId: entries[0]?.ingredientId ?? null,
      quantityConsumed: null,
      recipeId: recipe.id,
      recipeName: recipe.name,
      yieldQuantity: recipe.yieldQuantity,
      yieldUnit: recipe.yieldUnit,
      recipeQuantityConsumed: Number(f.recipeConsumedQty),
      ingredients: entries,
      kcal: Number(totals.kcal.toFixed(1)),
      protein: Number(totals.protein.toFixed(1)) || null,
      carbs: Number(totals.carbs.toFixed(1)) || null,
      fat: Number(totals.fat.toFixed(1)) || null,
    });
  } else {
    dailyLog.upsertMeal(dk, {
      id: editingMealId.value ?? undefined,
      name: f.name.trim(),
      recordedAt,
      source: "manual",
      ingredientId: null,
      quantityConsumed: null,
      recipeId: null,
      recipeName: null,
      yieldQuantity: null,
      yieldUnit: null,
      recipeQuantityConsumed: null,
      ingredients: [],
      kcal: Number(f.kcal),
      protein: f.protein != null ? Number(f.protein) : null,
      carbs: f.carbs != null ? Number(f.carbs) : null,
      fat: f.fat != null ? Number(f.fat) : null,
    });
  }

  mealDialogOpen.value = false;
  toast.add({
    group: "pwa",
    severity: "success",
    summary: editingMealId.value
      ? "Refeição atualizada"
      : "Refeição adicionada",
    detail: "Suas informações foram salvas neste dia.",
    life: 2200,
    closable: false,
  });
}

const removeMealTarget = ref(null);
const removeMealDialogOpen = ref(false);

function openRemoveMeal(meal) {
  removeMealTarget.value = meal;
  removeMealDialogOpen.value = true;
}

function closeRemoveMealDialog() {
  removeMealDialogOpen.value = false;
  removeMealTarget.value = null;
}

function confirmRemoveMeal() {
  const m = removeMealTarget.value;
  const dk = dayKey.value;
  if (!m || !dk) return;
  dailyLog.removeMeal(dk, m.id);
  closeRemoveMealDialog();
}

const weightDialogOpen = ref(false);
const weightForm = ref({
  kg: null,
});

const weightFormValid = computed(
  () => weightForm.value.kg != null && Number(weightForm.value.kg) > 0,
);

function openWeightDialog() {
  weightForm.value = {
    kg: displayWeight.value?.kg ?? profile.value.weight ?? null,
  };
  weightDialogOpen.value = true;
}

function saveWeight() {
  if (!weightFormValid.value) {
    toast.add({
      group: "pwa",
      severity: "warn",
      summary: "Peso inválido",
      detail: "Informe um valor maior que zero.",
      life: 2800,
    });
    return;
  }
  const dk = dayKey.value;
  if (!dk) return;
  dailyLog.upsertWeight(dk, {
    kg: Number(weightForm.value.kg),
    recordedAt: new Date().toISOString(),
  });
  weightDialogOpen.value = false;
  toast.add({
    group: "pwa",
    severity: "success",
    summary: "Peso registrado",
    detail: "Pesagem salva para este dia.",
    life: 2200,
    closable: false,
  });
}

const removeWeightTarget = ref(null);
const removeWeightDialogOpen = ref(false);

function openRemoveWeight(w) {
  removeWeightTarget.value = w;
  removeWeightDialogOpen.value = true;
}

function closeRemoveWeightDialog() {
  removeWeightDialogOpen.value = false;
  removeWeightTarget.value = null;
}

function confirmRemoveWeight() {
  const w = removeWeightTarget.value;
  const dk = dayKey.value;
  if (!w || !dk) return;
  dailyLog.removeWeight(dk, w.id);
  closeRemoveWeightDialog();
}

const calorieMetaOpen = ref(false);
const calorieMetaMode = ref("auto");
const calorieMetaManual = ref(null);

function openCalorieMetaDialog() {
  const p = getProfile() ?? {};
  const manual = p.calorieTargetManual;
  if (manual != null && Number(manual) > 0) {
    calorieMetaMode.value = "manual";
    calorieMetaManual.value = Math.round(Number(manual));
  } else {
    calorieMetaMode.value = "auto";
    calorieMetaManual.value =
      autoCalorieGoal.value != null && autoCalorieGoal.value > 0
        ? Math.round(autoCalorieGoal.value)
        : 2000;
  }
  calorieMetaOpen.value = true;
}

function saveCalorieMeta() {
  if (calorieMetaMode.value === "manual") {
    const v = Number(calorieMetaManual.value);
    if (!v || v < 1 || v > 20000) {
      toast.add({
        group: "pwa",
        severity: "warn",
        summary: "Valor inválido",
        detail: "Informe uma meta entre 1 e 20.000 kcal.",
        life: 3200,
      });
      return;
    }
    saveProfile({ calorieTargetManual: Math.round(v) });
  } else {
    saveProfile({ calorieTargetManual: null });
  }
  profileTick.value++;
  calorieMetaOpen.value = false;
  toast.add({
    group: "pwa",
    severity: "success",
    summary: "Meta de calorias atualizada",
    detail: "Sincronizado com o perfil.",
    life: 2200,
    closable: false,
  });
}

const weightGoalDialogOpen = ref(false);
const weightGoalForm = ref(null);

function openWeightGoalDialog() {
  weightGoalForm.value =
    profile.value.goalWeight != null ? Number(profile.value.goalWeight) : null;
  weightGoalDialogOpen.value = true;
}

function saveWeightGoalDialog() {
  const v = Number(weightGoalForm.value);
  if (!v || v <= 0 || v > 400) {
    toast.add({
      group: "pwa",
      severity: "warn",
      summary: "Valor inválido",
      detail: "Informe uma meta de peso válida (kg).",
      life: 3200,
    });
    return;
  }
  saveProfile({ goalWeight: Math.round(v * 10) / 10 });
  profileTick.value++;
  weightGoalDialogOpen.value = false;
  toast.add({
    group: "pwa",
    severity: "success",
    summary: "Meta de peso atualizada",
    detail: "Sincronizado com o perfil.",
    life: 2500,
    closable: false,
  });
}

watch(mealDialogOpen, (open) => {
  if (open) refreshIngredients();
});

watch(
  () => mealForm.value.ingredientIds,
  (ids) => {
    const keep = new Set(ids ?? []);
    const next = {};
    for (const [k, v] of Object.entries(
      mealForm.value.ingredientQuantities ?? {},
    )) {
      if (keep.has(k)) next[k] = v;
    }
    for (const id of keep) {
      if (next[id] != null && Number(next[id]) > 0) continue;
      const ing = ingredientMap.value[id];
      next[id] = Number(ing?.quantity) > 0 ? Number(ing.quantity) : 100;
    }
    mealForm.value.ingredientQuantities = next;
  },
  { deep: true },
);

watch(removeMealDialogOpen, (open) => {
  if (!open) removeMealTarget.value = null;
});

watch(removeWeightDialogOpen, (open) => {
  if (!open) removeWeightTarget.value = null;
});
</script>

<template>
  <div
    class="app-page relative flex h-full min-h-0 flex-col overflow-hidden text-slate-100"
  >
    <AppHeader :subtitle="headerSubtitle">
      <template #actions>
        <AppHeaderStatLink />
      </template>
      <template #title>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            class="app-today-title-trigger inline-flex max-w-full min-w-0 items-center gap-2 rounded-app-sm text-left transition-colors hover:text-[color-mix(in_srgb,var(--app-text)_88%,var(--accent-teal)_12%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
            style="color: var(--app-text)"
            :aria-expanded="isDatePopoverOpen"
            aria-haspopup="dialog"
            :aria-label="'Selecionar data. Exibindo: ' + headerTitle"
            @click="toggleDatePopover"
          >
            <span
              class="m-0 min-w-0 text-2xl font-bold leading-tight tracking-[-0.02em]"
            >
              {{ headerTitle }}
            </span>
            <IconChevronDown
              class="size-5 shrink-0 text-app-text-muted-2 transition-transform duration-200 ease-out"
              :class="{ 'rotate-180': isDatePopoverOpen }"
              stroke-width="2"
              aria-hidden="true"
            />
          </button>
          <Popover
            ref="datePopoverRef"
            class="app-date-popover"
            @show="onDatePopoverShow"
            @hide="onDatePopoverHide"
          >
            <DatePicker
              v-model="selectedDate"
              inline
              :showButtonBar="true"
              dateFormat="dd/mm/yy"
              class="app-today-datepicker"
              @date-select="closeDatePopover"
              @today-click="closeDatePopover"
              @clear-click="onClearDateClick"
            />
          </Popover>
        </div>
      </template>
    </AppHeader>

    <div
      class="relative z-[1] mx-auto flex min-h-0 w-full max-w-lg flex-1 min-w-0 flex-col gap-5 overflow-y-auto overflow-x-hidden px-4 pb-28 pt-4"
    >
      <div
        class="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div
          class="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-400/14 blur-[72px] opacity-50"
        />
        <div
          class="absolute right-[-40px] top-[28%] h-40 w-40 rounded-full bg-violet-400/10 blur-[70px] opacity-45"
        />
        <div
          class="absolute bottom-[10%] left-1/3 h-32 w-32 rounded-full bg-emerald-400/8 blur-[64px] opacity-40"
        />
      </div>

      <div class="relative z-[1] flex min-w-0 flex-col gap-5">
        <section
          class="flex flex-col gap-3"
          aria-labelledby="today-section-weight-heading"
        >
          <article
            class="rounded-xl border border-violet-400/35 border-l-4 border-l-violet-400 px-3.5 py-3"
            style="
              background: linear-gradient(
                135deg,
                rgba(167, 139, 250, 0.12) 0%,
                rgba(139, 92, 246, 0.07) 100%
              );
            "
          >
            <div class="mb-2 flex items-center justify-between gap-2.5">
              <div
                class="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-violet-100/95"
              >
                <IconTarget
                  class="size-3.5 shrink-0 opacity-95"
                  stroke-width="2"
                />
                Peso & meta
              </div>
              <Button
                variant="link"
                size="small"
                class="!min-w-0 shrink-0 !p-0"
                aria-label="Editar meta de peso"
                @click="openWeightGoalDialog"
              >
                <template #icon>
                  <IconPencil
                    class="size-4 text-violet-100/95"
                    stroke-width="2"
                  />
                </template>
              </Button>
            </div>
            <div class="flex items-center gap-2.5">
              <IconScale
                class="size-8 shrink-0 text-violet-200/90"
                stroke-width="1.35"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1 space-y-1">
                <p
                  v-if="displayWeight"
                  class="m-0 text-lg font-bold tabular-nums leading-tight text-violet-50"
                >
                  {{ fmt1(displayWeight.kg) }}
                  <span class="text-xs font-semibold text-violet-200/80"
                    >kg</span
                  >
                </p>
                <p
                  v-else
                  class="m-0 text-xs text-violet-200/75"
                >
                  Sem peso no perfil.
                </p>
                <p
                  v-if="weightGap && displayWeight"
                  class="m-0 pt-0.5 text-[0.6875rem] leading-snug text-violet-100/85"
                >
                  <span class="tabular-nums"
                    >Meta {{ fmt1(weightGap.goal) }} kg</span
                  >
                  <span class="mx-1 text-violet-300/60">·</span>
                  <span
                    v-if="weightGap.met"
                    class="font-medium text-emerald-200"
                    >Na meta</span
                  >
                  <span
                    v-else
                    class="font-medium"
                    >Faltam {{ fmt1(weightGap.abs) }} kg</span
                  >
                </p>
              </div>
            </div>
          </article>

          <div
            v-if="!weightsToday.length"
            class="w-full"
          >
            <Button
              severity="secondary"
              outlined
              class="w-full font-semibold border-app-border"
              aria-label="Registrar peso"
              @click="openWeightDialog"
            >
              <span class="inline-flex items-center justify-center gap-2">
                <IconPlus
                  class="size-5 shrink-0"
                  stroke-width="2"
                  aria-hidden="true"
                />
                <span>Peso</span>
              </span>
            </Button>
          </div>

          <section
            v-if="weightsToday.length"
            class="rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-violet)_50%,transparent)] bg-app-surface/90 p-3"
          >
            <h3
              class="m-0 mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
            >
              Pesagens neste dia
            </h3>
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
              <li
                v-for="w in [...weightsToday].sort(
                  (a, b) =>
                    new Date(a.recordedAt).getTime() -
                    new Date(b.recordedAt).getTime(),
                )"
                :key="w.id"
                class="flex items-center justify-between gap-2 rounded-app-sm border border-app-border bg-app-elevated/60 px-3 py-2"
              >
                <div class="min-w-0">
                  <span class="text-sm font-semibold tabular-nums text-app-text"
                    >{{ fmt1(w.kg) }} kg</span
                  >
                </div>
                <Button
                  text
                  rounded
                  severity="danger"
                  size="small"
                  class="!size-9 shrink-0"
                  :aria-label="'Excluir pesagem ' + fmt1(w.kg) + ' kg'"
                  @click="openRemoveWeight(w)"
                >
                  <template #icon>
                    <IconTrash
                      class="size-4"
                      stroke-width="1.75"
                    />
                  </template>
                </Button>
              </li>
            </ul>
          </section>
        </section>

        <section
          class="flex flex-col gap-3"
          aria-labelledby="today-section-meals-heading"
        >
          <InfoNotice
            v-if="!hasCalorieGoal"
            class="border-amber-500/25 bg-amber-500/5"
          >
            <template #icon>
              <IconTarget
                class="text-amber-400/90"
                stroke-width="1.5"
              />
            </template>
            <p class="m-0 text-[0.8125rem] leading-relaxed text-app-text">
              Complete ou atualize seu
              <button
                type="button"
                class="font-semibold text-teal-400 underline-offset-2 hover:underline"
                @click="router.push({ name: 'profile' })"
              >
                perfil
              </button>
              para calcular a meta calórica.
            </p>
          </InfoNotice>

          <div
            class="flex flex-col gap-3 border-b border-app-border pb-5"
            role="group"
            aria-label="Consumo e meta de calorias"
          >
            <div class="flex items-center gap-3">
              <div class="flex min-w-0 items-center gap-2">
                <IconFlame
                  class="size-5 shrink-0 text-teal-400"
                  stroke-width="2"
                  aria-hidden="true"
                />
                <span
                  class="text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
                >
                  Calorias
                </span>
              </div>
            </div>

            <div
              class="flex flex-wrap items-center gap-x-5 gap-y-2 sm:flex-nowrap"
            >
              <div
                class="relative flex size-[4.25rem] shrink-0 items-center justify-center"
              >
                <svg
                  class="size-[4.25rem] -rotate-90"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgb(51 65 85 / 0.45)"
                    stroke-width="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    :stroke="kcalProgress.over ? '#fbbf24' : '#2dd4bf'"
                    stroke-width="6"
                    stroke-linecap="round"
                    :stroke-dasharray="ringCircumference"
                    :stroke-dashoffset="ringOffset"
                    class="transition-[stroke-dashoffset] duration-500 ease-out"
                  />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center">
                  <p
                    class="m-0 text-2xl font-bold tabular-nums leading-tight tracking-tight text-app-text sm:text-[1.65rem]"
                  >
                    {{ fmtInt(totals.kcal) }}
                    <span
                      v-if="calorieGoal"
                      class="text-lg font-semibold text-app-text-muted-2"
                    >
                      / {{ fmtInt(calorieGoal) }}
                    </span>
                    <span
                      class="ml-1 text-base font-medium text-app-text-muted-2"
                    >
                      kcal
                    </span>
                  </p>
                  <Button
                    variant="link"
                    size="small"
                    class="!min-w-0 shrink-0 !p-0 text-app-text-muted-2 hover:text-app-text-muted-2"
                    aria-label="Editar meta de calorias"
                    @click="openCalorieMetaDialog"
                  >
                    <template #icon>
                      <IconPencil
                        class="size-4"
                        stroke-width="2"
                      />
                    </template>
                  </Button>
                </div>
                <p
                  class="m-0 mt-1 text-[0.8125rem] leading-snug text-app-text-muted"
                >
                  <template v-if="calorieGoal">
                    {{
                      kcalProgress.over
                        ? "Acima da meta neste dia."
                        : `${fmtInt(Math.max(0, calorieGoal - totals.kcal))} kcal restantes`
                    }}
                  </template>
                  <template v-else>Sem meta definida para o dia.</template>
                </p>
                <p
                  v-if="
                    profile.calorieTargetManual != null &&
                    Number(profile.calorieTargetManual) > 0
                  "
                  class="mt-1 m-0 text-[0.6875rem] font-medium text-teal-400/90"
                >
                  Meta manual
                </p>
              </div>
            </div>
          </div>

          <section>
            <div class="mb-2 flex items-center justify-between gap-2">
              <h3
                class="m-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
              >
                Refeições
              </h3>
              <span
                class="text-[0.6875rem] font-medium tabular-nums text-app-text-muted-2"
                >{{ meals.length }}
                {{ meals.length === 1 ? "item" : "itens" }}</span
              >
            </div>

            <div
              v-if="!meals.length"
              class="flex flex-col items-center gap-3 rounded-app-lg border border-dashed border-app-border bg-app-elevated/40 px-4 py-10 text-center"
            >
              <div
                class="flex size-14 items-center justify-center rounded-2xl border border-teal-500/25 bg-teal-500/10 text-teal-300"
              >
                <IconSoup
                  class="size-8"
                  stroke-width="1.25"
                />
              </div>
              <p class="m-0 max-w-[260px] text-sm text-app-text-muted">
                Nenhuma refeição neste dia. Monte com ingredientes, use uma
                receita salva ou registre manualmente.
              </p>
              <Button
                size="small"
                @click="openMealCreate"
              >
                <span class="inline-flex items-center justify-center gap-2">
                  <IconPlus
                    class="size-4 shrink-0"
                    stroke-width="2"
                    aria-hidden="true"
                  />
                  <span>Adicionar refeição</span>
                </span>
              </Button>
            </div>

            <ul
              v-else
              class="m-0 flex list-none flex-col gap-2.5 p-0"
            >
              <li
                v-for="meal in meals"
                :key="meal.id"
                class="group rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-teal)_55%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-bg-surface)_100%,transparent)_0%,color-mix(in_srgb,var(--app-bg-elevated)_88%,var(--accent-teal)_6%)_100%)] p-3.5 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.55)]"
              >
                <div class="flex gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h3
                        class="m-0 min-w-0 text-left text-[0.9375rem] font-semibold leading-snug text-app-text"
                      >
                        {{ meal.name }}
                      </h3>
                      <span
                        class="shrink-0 text-[0.6875rem] font-medium tabular-nums text-app-text-muted-2"
                      >
                        {{ fmtTime(meal.recordedAt) }}
                      </span>
                    </div>
                    <p
                      v-if="
                        meal.source === 'recipe' &&
                        meal.recipeQuantityConsumed != null &&
                        meal.yieldQuantity != null
                      "
                      class="mt-1 m-0 text-[0.75rem] text-app-text-muted-2"
                    >
                      Porção:
                      {{ fmt1(meal.recipeQuantityConsumed) }}
                      {{ meal.yieldUnit ?? "" }}
                      de
                      {{ fmt1(meal.yieldQuantity) }}
                      {{ meal.yieldUnit ?? "" }}
                      (receita)
                    </p>
                    <div
                      v-if="
                        (meal.source === 'ingredient' ||
                          meal.source === 'recipe') &&
                        (meal.ingredients?.length ?? 0)
                      "
                      class="mt-2"
                    >
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded-app-sm border border-app-border bg-app-elevated/60 px-2 py-1 text-[0.6875rem] text-app-text-muted-2"
                        @click="toggleMealExpanded(meal.id)"
                      >
                        {{
                          isMealExpanded(meal.id)
                            ? "Ocultar ingredientes"
                            : "Ver ingredientes"
                        }}
                        <IconChevronDown
                          class="size-3.5 transition-transform"
                          :class="{ 'rotate-180': isMealExpanded(meal.id) }"
                          stroke-width="2"
                        />
                      </button>
                      <ul
                        v-if="isMealExpanded(meal.id)"
                        class="mt-1.5 list-disc space-y-1 pl-4 text-[0.75rem] text-app-text-muted"
                      >
                        <li
                          v-for="entry in meal.ingredients"
                          :key="`${meal.id}-${entry.ingredientId}-${entry.name}`"
                        >
                          {{ entry.name }} ({{ fmt1(entry.quantityConsumed) }}
                          {{ entry.unit ?? "g" }}) -
                          {{ fmtInt(entry.kcal) }} kcal
                        </li>
                      </ul>
                    </div>
                    <div
                      class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4"
                    >
                      <div>
                        <span
                          class="text-[0.625rem] font-medium text-app-text-muted-2"
                          >Calorias</span
                        >
                        <p
                          class="m-0 text-sm font-semibold tabular-nums text-app-text"
                        >
                          {{ fmtInt(meal.kcal) }} kcal
                        </p>
                      </div>
                      <div>
                        <span
                          class="text-[0.625rem] font-medium text-app-text-muted-2"
                          >Proteína</span
                        >
                        <p
                          class="m-0 text-sm font-semibold tabular-nums text-app-text"
                        >
                          {{
                            meal.protein != null
                              ? fmt1(meal.protein) + " g"
                              : "—"
                          }}
                        </p>
                      </div>
                      <div>
                        <span
                          class="text-[0.625rem] font-medium text-app-text-muted-2"
                          >Carbos</span
                        >
                        <p
                          class="m-0 text-sm font-semibold tabular-nums text-app-text"
                        >
                          {{
                            meal.carbs != null ? fmt1(meal.carbs) + " g" : "—"
                          }}
                        </p>
                      </div>
                      <div>
                        <span
                          class="text-[0.625rem] font-medium text-app-text-muted-2"
                          >Gorduras</span
                        >
                        <p
                          class="m-0 text-sm font-semibold tabular-nums text-app-text"
                        >
                          {{ meal.fat != null ? fmt1(meal.fat) + " g" : "—" }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    class="flex shrink-0 flex-col gap-1 self-start opacity-100 sm:opacity-90 sm:group-hover:opacity-100"
                  >
                    <Button
                      text
                      rounded
                      size="small"
                      class="!size-9 !min-w-0 border border-[color-mix(in_srgb,var(--accent-teal)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-teal)_10%,transparent)]"
                      title="Editar"
                      aria-label="Editar refeição"
                      @click="openMealEdit(meal)"
                    >
                      <template #icon>
                        <IconPencil
                          class="size-4 text-teal-300"
                          stroke-width="1.75"
                        />
                      </template>
                    </Button>
                    <Button
                      text
                      rounded
                      severity="danger"
                      size="small"
                      class="!size-9 !min-w-0"
                      title="Excluir"
                      aria-label="Excluir refeição"
                      @click="openRemoveMeal(meal)"
                    >
                      <template #icon>
                        <IconTrash
                          class="size-4"
                          stroke-width="1.75"
                        />
                      </template>
                    </Button>
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section
            v-if="meals.length"
            class="rounded-app-lg border border-app-border bg-app-elevated/50 p-4"
          >
            <h3
              class="m-0 mb-3 flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-app-text-muted-2"
            >
              <IconApple
                class="size-3.5 text-emerald-400/90"
                stroke-width="2"
              />
              Total consumido no dia
            </h3>
            <div
              v-if="proteinGoal"
              class="mb-3"
            >
              <p class="m-0 text-[0.75rem] text-app-text-muted">
                Proteína indicada: {{ fmtInt(proteinGoal) }} g/dia · Consumido:
                {{ fmt1(totals.protein) }} g
                <span class="text-app-text-muted-2">
                  ({{ fmtInt(proteinProgress.pct) }}%)
                </span>
              </p>
              <div class="mt-1 h-1 overflow-hidden rounded-full bg-app-border">
                <div
                  class="h-full rounded-full transition-all duration-500 ease-out"
                  :class="
                    proteinProgress.over
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-violet-400 to-indigo-400'
                  "
                  :style="{ width: `${proteinProgress.pct}%` }"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div
                class="rounded-app-sm border border-app-border bg-app-surface/80 px-3 py-2.5"
              >
                <span class="text-[0.625rem] font-medium text-app-text-muted-2"
                  >Calorias</span
                >
                <p
                  class="m-0 mt-0.5 text-lg font-bold tabular-nums text-teal-300"
                >
                  {{ fmtInt(totals.kcal) }}
                </p>
              </div>
              <div
                class="rounded-app-sm border border-app-border bg-app-surface/80 px-3 py-2.5"
              >
                <div
                  class="flex items-center gap-1 text-[0.625rem] font-medium text-app-text-muted-2"
                >
                  <IconBarbell
                    class="size-3"
                    stroke-width="2"
                  />
                  Proteína
                </div>
                <p
                  class="m-0 mt-0.5 text-lg font-bold tabular-nums text-app-text"
                >
                  {{ fmt1(totals.protein) }} g
                </p>
              </div>
              <div
                class="rounded-app-sm border border-app-border bg-app-surface/80 px-3 py-2.5"
              >
                <span class="text-[0.625rem] font-medium text-app-text-muted-2"
                  >Carboidratos</span
                >
                <p
                  class="m-0 mt-0.5 text-lg font-bold tabular-nums text-app-text"
                >
                  {{ fmt1(totals.carbs) }} g
                </p>
              </div>
              <div
                class="rounded-app-sm border border-app-border bg-app-surface/80 px-3 py-2.5"
              >
                <div
                  class="flex items-center gap-1 text-[0.625rem] font-medium text-app-text-muted-2"
                >
                  <IconDroplet
                    class="size-3"
                    stroke-width="2"
                  />
                  Gorduras
                </div>
                <p
                  class="m-0 mt-0.5 text-lg font-bold tabular-nums text-app-text"
                >
                  {{ fmt1(totals.fat) }} g
                </p>
              </div>
            </div>
          </section>

          <div
            class="flex flex-col items-center gap-2 pb-2 text-center text-[0.6875rem] text-app-text-muted-2"
          >
            <div class="flex flex-wrap justify-center gap-2">
              <Button
                size="small"
                severity="secondary"
                outlined
                class="border-app-border text-[0.6875rem]"
                @click="router.push({ name: 'ingredients' })"
              >
                <span class="inline-flex items-center gap-1.5">
                  <IconPlus
                    class="size-3.5"
                    stroke-width="2"
                  />
                  Novo ingrediente
                </span>
              </Button>
              <Button
                size="small"
                severity="secondary"
                outlined
                class="border-app-border text-[0.6875rem]"
                @click="router.push({ name: 'recipes' })"
              >
                <span class="inline-flex items-center gap-1.5">
                  <IconChefHat
                    class="size-3.5"
                    stroke-width="2"
                  />
                  Nova receita
                </span>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <Dialog
      v-model:visible="mealDialogOpen"
      modal
      :header="editingMealId ? 'Editar refeição' : 'Nova refeição'"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <div
          class="grid grid-cols-3 gap-0.5 rounded-app-sm border border-app-border bg-app-elevated p-0.5"
        >
          <button
            type="button"
            class="rounded-app-sm px-1.5 py-2 text-[0.6875rem] font-semibold leading-tight transition-colors sm:px-2 sm:text-xs"
            :class="
              mealForm.mode === 'ingredient'
                ? 'bg-teal-600/90 text-white shadow-sm'
                : 'text-app-text-muted-2 hover:text-app-text'
            "
            @click="mealForm.mode = 'ingredient'"
          >
            Montar
          </button>
          <button
            type="button"
            class="rounded-app-sm px-1.5 py-2 text-[0.6875rem] font-semibold leading-tight transition-colors sm:px-2 sm:text-xs"
            :class="
              mealForm.mode === 'recipe'
                ? 'bg-teal-600/90 text-white shadow-sm'
                : 'text-app-text-muted-2 hover:text-app-text'
            "
            @click="mealForm.mode = 'recipe'"
          >
            Receita
          </button>
          <button
            type="button"
            class="rounded-app-sm px-1.5 py-2 text-[0.6875rem] font-semibold leading-tight transition-colors sm:px-2 sm:text-xs"
            :class="
              mealForm.mode === 'manual'
                ? 'bg-teal-600/90 text-white shadow-sm'
                : 'text-app-text-muted-2 hover:text-app-text'
            "
            @click="mealForm.mode = 'manual'"
          >
            Manual
          </button>
        </div>

        <div
          v-if="
            mealForm.mode === 'ingredient' && !ingredientSelectOptions.length
          "
          class="rounded-app-sm border border-dashed border-app-border bg-app-elevated/40 p-3"
        >
          <p class="m-0 text-[0.8125rem] leading-relaxed text-app-text-muted">
            Você ainda não tem ingredientes cadastrados. Crie o primeiro agora
            para montar esta refeição sem sair desta tela.
          </p>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              size="small"
              @click="openQuickIngredientDialog"
            >
              <span class="inline-flex items-center gap-1.5">
                <IconPlus
                  class="size-4"
                  stroke-width="2"
                  aria-hidden="true"
                />
                Novo ingrediente
              </span>
            </Button>
          </div>
        </div>

        <template
          v-if="
            mealForm.mode === 'ingredient' && ingredientSelectOptions.length
          "
        >
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              for="meal-ingredient"
              >Ingredientes da refeição</label
            >
            <MultiSelect
              id="meal-ingredient"
              v-model="mealForm.ingredientIds"
              :options="ingredientSelectOptions"
              optionLabel="name"
              optionValue="id"
              filter
              display="chip"
              selectedItemsLabel="{0} ingredientes"
              :maxSelectedLabels="2"
              placeholder="Buscar e selecionar ingredientes"
              class="w-full"
            >
              <template #footer>
                <div class="border-t border-app-border p-2">
                  <Button
                    variant="link"
                    class="!px-0 text-teal-400"
                    @click="openQuickIngredientDialog"
                  >
                    + Novo ingrediente
                  </Button>
                </div>
              </template>
            </MultiSelect>
          </div>
          <div
            v-if="selectedIngredients.length"
            class="space-y-2 rounded-app-sm border border-app-border bg-app-surface/50 p-2.5"
          >
            <div
              v-for="ing in selectedIngredients"
              :key="ing.id"
              class="flex items-center gap-2"
            >
              <span class="min-w-0 flex-1 truncate text-sm text-app-text">{{
                ing.name
              }}</span>
              <InputNumber
                v-model="mealForm.ingredientQuantities[ing.id]"
                :min="1"
                class="w-28 shrink-0"
                input-class="w-full"
                :placeholder="String(ing.quantity ?? 100)"
              />
              <span class="w-8 text-right text-xs text-app-text-muted-2">{{
                ing.unit ?? "g"
              }}</span>
            </div>
          </div>
          <div
            class="rounded-app-sm border border-app-border bg-app-surface/60 px-3 py-2 text-[0.8125rem]"
          >
            <span class="text-app-text-muted-2">Prévia: </span>
            <span class="font-semibold tabular-nums text-app-text"
              >{{ fmt1(scaledFromIngredient.kcal) }} kcal</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >P {{ fmt1(scaledFromIngredient.protein) }} g</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >C {{ fmt1(scaledFromIngredient.carbs) }} g</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >G {{ fmt1(scaledFromIngredient.fat) }} g</span
            >
          </div>
        </template>

        <div
          v-else-if="mealForm.mode === 'recipe' && !recipesList.length"
          class="rounded-app-sm border border-dashed border-app-border bg-app-elevated/40 p-3"
        >
          <p class="m-0 text-[0.8125rem] leading-relaxed text-app-text-muted">
            Você ainda não tem receitas salvas. Crie uma combinação de
            ingredientes em Receitas para usar aqui.
          </p>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              size="small"
              @click="
                mealDialogOpen = false;
                router.push({ name: 'recipes' });
              "
            >
              <span class="inline-flex items-center gap-1.5">
                <IconChefHat
                  class="size-4"
                  stroke-width="2"
                  aria-hidden="true"
                />
                Ir para Receitas
              </span>
            </Button>
          </div>
        </div>

        <template v-else-if="mealForm.mode === 'recipe' && recipesList.length">
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              for="meal-recipe-select"
              >Receita</label
            >
            <Select
              id="meal-recipe-select"
              v-model="mealForm.recipeId"
              :options="recipesList"
              option-label="name"
              option-value="id"
              filter
              placeholder="Escolher receita"
              class="w-full"
              fluid
            />
          </div>
          <div v-if="mealFormSelectedRecipe">
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              for="meal-recipe-qty"
            >
              Quanto você consumiu?
              <span class="font-normal text-app-text-muted">
                (receita total:
                {{ mealFormSelectedRecipe.yieldQuantity }}
                {{ mealFormSelectedRecipe.yieldUnit }})</span
              >
            </label>
            <InputNumber
              id="meal-recipe-qty"
              v-model="mealForm.recipeConsumedQty"
              :min="0.01"
              :max-fraction-digits="2"
              class="w-full"
              input-class="w-full"
              :suffix="` ${mealFormSelectedRecipe.yieldUnit}`"
            />
            <p
              class="mt-1.5 m-0 text-[0.6875rem] leading-snug text-app-text-muted-2"
            >
              Os nutrientes são calculados na proporção entre o que você comeu e
              o rendimento total da receita.
            </p>
          </div>
          <div
            class="rounded-app-sm border border-app-border bg-app-surface/60 px-3 py-2 text-[0.8125rem]"
          >
            <span class="text-app-text-muted-2">Prévia: </span>
            <span class="font-semibold tabular-nums text-app-text"
              >{{ fmt1(recipeMealPreview.totals.kcal) }} kcal</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >P {{ fmt1(recipeMealPreview.totals.protein) }} g</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >C {{ fmt1(recipeMealPreview.totals.carbs) }} g</span
            >
            <span class="mx-1 text-app-text-muted">·</span>
            <span class="tabular-nums text-app-text-muted"
              >G {{ fmt1(recipeMealPreview.totals.fat) }} g</span
            >
          </div>
          <div class="border-t border-app-border pt-1">
            <Button
              variant="link"
              class="!h-auto !px-0 py-1 text-teal-400"
              @click="
                mealDialogOpen = false;
                router.push({ name: 'recipes' });
              "
            >
              + Nova receita
            </Button>
          </div>
        </template>

        <template v-else-if="mealForm.mode === 'manual'">
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              for="meal-name"
              >Nome</label
            >
            <InputText
              id="meal-name"
              v-model="mealForm.name"
              class="w-full"
              placeholder="Ex.: Almoço fora"
            />
          </div>
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              for="meal-kcal"
              >Calorias (kcal)</label
            >
            <InputNumber
              id="meal-kcal"
              v-model="mealForm.kcal"
              :min="0"
              class="w-full"
              input-class="w-full"
            />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label
                class="mb-1.5 block text-[0.6875rem] font-medium text-app-text-muted-2"
                for="meal-p"
                >Prot (g)</label
              >
              <InputNumber
                id="meal-p"
                v-model="mealForm.protein"
                :min="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
            <div>
              <label
                class="mb-1.5 block text-[0.6875rem] font-medium text-app-text-muted-2"
                for="meal-c"
                >Carb (g)</label
              >
              <InputNumber
                id="meal-c"
                v-model="mealForm.carbs"
                :min="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
            <div>
              <label
                class="mb-1.5 block text-[0.6875rem] font-medium text-app-text-muted-2"
                for="meal-f"
                >Gord (g)</label
              >
              <InputNumber
                id="meal-f"
                v-model="mealForm.fat"
                :min="0"
                class="w-full"
                input-class="w-full"
              />
            </div>
          </div>
        </template>

        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="mealDialogOpen = false"
          />
          <Button
            label="Salvar"
            size="small"
            :disabled="!mealFormValid"
            @click="saveMeal"
          />
        </div>
      </div>
    </Dialog>

    <div
      class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-40"
    >
      <div
        class="mx-auto flex w-full max-w-[var(--app-shell-max)] justify-end px-4"
      >
        <SpeedDial
          :model="quickActions"
          direction="up"
          :buttonProps="{
            rounded: true,
            severity: 'contrast',
            'aria-label': 'Ações rápidas',
            class:
              'pointer-events-auto !w-14 !h-14 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.75)]',
          }"
          :pt="{
            menu: { class: 'pointer-events-auto' },
            menuitem: { class: 'pointer-events-auto' },
          }"
        >
          <template #item="{ item }">
            <button
              type="button"
              @click="item.command && item.command()"
              class="flex size-11 items-center justify-center rounded-full border border-app-border bg-app-surface/95 backdrop-blur-[2px] text-app-text shadow-[0_10px_26px_-12px_rgba(0,0,0,0.72)] transition hover:bg-app-elevated hover:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.8)]"
              :aria-label="item.label"
              :title="item.label"
            >
              <IconScale
                v-if="item.action === 'weight'"
                class="size-5 text-violet-300"
                stroke-width="1.9"
              />
              <IconSoup
                v-else
                class="size-5 text-teal-300"
                stroke-width="1.9"
              />
            </button>
          </template>
        </SpeedDial>
      </div>
    </div>

    <Dialog
      v-model:visible="quickIngredientDialogOpen"
      modal
      header="Novo ingrediente"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-3">
        <div>
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            >Nome</label
          >
          <InputText
            v-model="quickIngredientForm.name"
            class="w-full"
            placeholder="Ex.: Frango grelhado"
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              >Quantidade</label
            >
            <InputNumber
              v-model="quickIngredientForm.quantity"
              :min="1"
              class="w-full"
              input-class="w-full"
            />
          </div>
          <div>
            <label
              class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
              >Unidade</label
            >
            <InputText
              v-model="quickIngredientForm.unit"
              class="w-full"
              placeholder="g"
            />
          </div>
        </div>
        <div>
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            >Calorias</label
          >
          <InputNumber
            v-model="quickIngredientForm.kcal"
            :min="0"
            class="w-full"
            input-class="w-full"
          />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <InputNumber
            v-model="quickIngredientForm.protein"
            :min="0"
            class="w-full"
            input-class="w-full"
            placeholder="Prot"
          />
          <InputNumber
            v-model="quickIngredientForm.carbs"
            :min="0"
            class="w-full"
            input-class="w-full"
            placeholder="Carb"
          />
          <InputNumber
            v-model="quickIngredientForm.fat"
            :min="0"
            class="w-full"
            input-class="w-full"
            placeholder="Gord"
          />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="quickIngredientDialogOpen = false"
          />
          <Button
            label="Salvar ingrediente"
            size="small"
            :disabled="!quickIngredientValid"
            @click="saveQuickIngredient"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="weightDialogOpen"
      modal
      header="Registrar peso"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            for="w-kg"
            >Peso (kg)</label
          >
          <InputNumber
            id="w-kg"
            v-model="weightForm.kg"
            :min="0"
            :max="400"
            :minFractionDigits="1"
            :maxFractionDigits="1"
            class="w-full"
            input-class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="weightDialogOpen = false"
          />
          <Button
            label="Salvar"
            size="small"
            :disabled="!weightFormValid"
            @click="saveWeight"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="calorieMetaOpen"
      modal
      header="Meta de calorias"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-[0.8125rem] leading-relaxed text-slate-300">
          A meta automática usa a fórmula de
          <strong class="text-slate-100">Mifflin–St Jeor</strong>, seu nível de
          atividade, déficit ou superávit escolhido na configuração de perfil e
          o peso mais recente disponível (registros ou perfil).
        </p>
        <p
          v-if="autoCalorieGoal != null && autoCalorieGoal > 0"
          class="m-0 text-[0.8125rem] text-slate-400"
        >
          Estimativa automática atual:
          <strong class="tabular-nums text-slate-200"
            >{{ fmtInt(autoCalorieGoal) }} kcal/dia</strong
          >.
        </p>

        <div class="flex flex-col gap-2">
          <label
            class="flex cursor-pointer items-start gap-3 rounded-app-sm border border-app-border bg-app-elevated/50 px-3 py-2.5 transition-colors has-[:checked]:border-teal-500/40 has-[:checked]:bg-teal-500/10"
          >
            <input
              v-model="calorieMetaMode"
              type="radio"
              value="auto"
              class="mt-0.5 size-4 shrink-0 accent-teal-500"
            />
            <span class="text-sm leading-snug text-slate-200">
              Usar cálculo automático com base no perfil
            </span>
          </label>
          <label
            class="flex cursor-pointer items-start gap-3 rounded-app-sm border border-app-border bg-app-elevated/50 px-3 py-2.5 transition-colors has-[:checked]:border-teal-500/40 has-[:checked]:bg-teal-500/10"
          >
            <input
              v-model="calorieMetaMode"
              type="radio"
              value="manual"
              class="mt-0.5 size-4 shrink-0 accent-teal-500"
            />
            <span class="text-sm leading-snug text-slate-200">
              Definir meta manualmente (kcal/dia)
            </span>
          </label>
        </div>

        <div v-if="calorieMetaMode === 'manual'">
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            for="cal-manual"
            >Meta diária (kcal)</label
          >
          <InputNumber
            id="cal-manual"
            v-model="calorieMetaManual"
            :min="1"
            :max="20000"
            class="w-full"
            input-class="w-full"
          />
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="calorieMetaOpen = false"
          />
          <Button
            label="Salvar"
            size="small"
            @click="saveCalorieMeta"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="weightGoalDialogOpen"
      modal
      header="Meta de peso"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-[0.8125rem] leading-relaxed text-slate-300">
          Este é o mesmo valor de
          <strong class="text-slate-100">meta de peso</strong> do seu perfil.
          Alterar aqui atualiza o perfil.
        </p>
        <div>
          <label
            class="mb-1.5 block text-[0.8125rem] font-medium text-app-text-muted-2"
            for="goal-kg"
            >Meta (kg)</label
          >
          <InputNumber
            id="goal-kg"
            v-model="weightGoalForm"
            :min="0"
            :max="400"
            :minFractionDigits="1"
            :maxFractionDigits="1"
            class="w-full"
            input-class="w-full"
          />
        </div>
        <div class="flex justify-end gap-2">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="weightGoalDialogOpen = false"
          />
          <Button
            label="Salvar"
            size="small"
            @click="saveWeightGoalDialog"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="removeMealDialogOpen"
      modal
      header="Excluir refeição?"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p
          v-if="removeMealTarget"
          class="m-0 text-sm text-app-text-muted"
        >
          Remover “{{ removeMealTarget.name }}” deste dia? Esta ação não pode
          ser desfeita.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="closeRemoveMealDialog"
          />
          <Button
            label="Excluir"
            severity="danger"
            size="small"
            @click="confirmRemoveMeal"
          />
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="removeWeightDialogOpen"
      modal
      header="Excluir pesagem?"
      class="app-dialog"
      :style="todayDialogStyle"
      position="bottom"
      :draggable="false"
    >
      <div class="flex flex-col gap-4">
        <p
          v-if="removeWeightTarget"
          class="m-0 text-sm text-app-text-muted"
        >
          Remover o registro de {{ fmt1(removeWeightTarget.kg) }} kg?
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Button
            label="Cancelar"
            severity="secondary"
            outlined
            size="small"
            class="border-app-border"
            @click="closeRemoveWeightDialog"
          />
          <Button
            label="Excluir"
            severity="danger"
            size="small"
            @click="confirmRemoveWeight"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
