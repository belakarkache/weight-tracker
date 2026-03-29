<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AppHeader from "../components/AppHeader.vue";
import Button from "primevue/button";
import DataView from "primevue/dataview";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import MultiSelect from "primevue/multiselect";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconChefHat,
} from "@tabler/icons-vue";
import { useIngredients } from "../composables/useIngredients";
import { useRecipes } from "../composables/useRecipes";
import { computeRecipeFullTotals } from "../utils/recipes";
import InfoNotice from "../components/InfoNotice.vue";

const router = useRouter();
const { getStored: getIngredients } = useIngredients();
const { getStored: getRecipes, upsert, remove } = useRecipes();

const ingredients = ref(getIngredients());
const recipes = ref(getRecipes());
const query = ref("");

const unitOptions = [
  { label: "Gramas (g)", value: "g" },
  { label: "Mililitros (ml)", value: "ml" },
  { label: "Unidade (un)", value: "un" },
];

const isDialogOpen = ref(false);
const editingId = ref(null);
const yieldLockedByUser = ref(false);
let syncingYieldFromIngredients = false;
const form = ref({
  name: "",
  yieldQuantity: null,
  yieldUnit: "g",
  ingredientIds: [],
  lineQuantities: {},
});

const ingredientMap = computed(() =>
  Object.fromEntries(ingredients.value.map((i) => [i.id, i])),
);

const isEditing = computed(() => !!editingId.value);
const dialogTitle = computed(() =>
  isEditing.value ? "Editar receita" : "Nova receita",
);

const filteredRecipes = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return recipes.value;
  return recipes.value.filter((r) => r.name.toLowerCase().includes(q));
});

const selectedFormIngredients = computed(() =>
  (form.value.ingredientIds ?? [])
    .map((id) => ingredientMap.value[id])
    .filter(Boolean),
);

const recipeLinesForTotals = computed(() =>
  (form.value.ingredientIds ?? []).map((id) => ({
    ingredientId: id,
    quantity: Number(form.value.lineQuantities?.[id]) || 0,
  })),
);

const fullRecipeTotals = computed(() =>
  computeRecipeFullTotals(
    recipeLinesForTotals.value,
    (id) => ingredientMap.value[id],
  ),
);

const suggestedYield = computed(() => {
  const ids = form.value.ingredientIds ?? [];
  const qmap = form.value.lineQuantities ?? {};
  const units = new Set();
  let sum = 0;
  for (const id of ids) {
    const ing = ingredientMap.value[id];
    const q = Number(qmap[id]);
    if (!ing || !q || q <= 0) continue;
    sum += q;
    units.add(String(ing.unit ?? "g").toLowerCase());
  }
  const first = ids.length ? ingredientMap.value[ids[0]] : null;
  const unit = first?.unit ?? "g";
  return {
    sum: Math.round(sum * 100) / 100,
    unit,
    mixedUnits: units.size > 1,
  };
});

const effectiveYieldQuantity = computed(() => {
  const typed = Number(form.value.yieldQuantity);
  if (typed > 0) return typed;
  const s = suggestedYield.value.sum;
  return s > 0 ? s : 0;
});

const isFormValid = computed(() => {
  const nameOk = form.value.name.trim().length > 0;
  const ids = form.value.ingredientIds ?? [];
  if (!nameOk || !ids.length) return false;
  if (!ids.every((id) => Number(form.value.lineQuantities?.[id]) > 0)) {
    return false;
  }
  return effectiveYieldQuantity.value > 0;
});

const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
};

function refresh() {
  ingredients.value = getIngredients();
  recipes.value = getRecipes();
}

watch(
  () => form.value.ingredientIds,
  (ids) => {
    const next = { ...form.value.lineQuantities };
    for (const id of ids ?? []) {
      if (next[id] == null || next[id] <= 0) {
        const ing = ingredientMap.value[id];
        next[id] =
          ing?.quantity != null && Number(ing.quantity) > 0
            ? Number(ing.quantity)
            : 100;
      }
    }
    for (const k of Object.keys(next)) {
      if (!ids?.includes(k)) delete next[k];
    }
    form.value.lineQuantities = next;
  },
  { deep: true },
);

watch(
  [suggestedYield, yieldLockedByUser, isEditing, isDialogOpen],
  async () => {
    if (!isDialogOpen.value || yieldLockedByUser.value || isEditing.value) {
      return;
    }
    const { sum, unit } = suggestedYield.value;
    syncingYieldFromIngredients = true;
    if (sum > 0) {
      form.value.yieldQuantity = sum;
      form.value.yieldUnit = unit;
    } else {
      form.value.yieldQuantity = null;
    }
    await nextTick();
    syncingYieldFromIngredients = false;
  },
  { flush: "post" },
);

function openCreate() {
  editingId.value = null;
  yieldLockedByUser.value = false;
  form.value = {
    name: "",
    yieldQuantity: null,
    yieldUnit: "g",
    ingredientIds: [],
    lineQuantities: {},
  };
  isDialogOpen.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  yieldLockedByUser.value = true;
  const ids = (row.lines ?? []).map((l) => l.ingredientId).filter(Boolean);
  const qty = Object.fromEntries(
    (row.lines ?? []).map((l) => [l.ingredientId, Number(l.quantity) || 0]),
  );
  form.value = {
    name: row.name ?? "",
    yieldQuantity: row.yieldQuantity ?? 100,
    yieldUnit: row.yieldUnit ?? "g",
    ingredientIds: ids,
    lineQuantities: qty,
  };
  isDialogOpen.value = true;
}

function onYieldFieldEdited() {
  if (syncingYieldFromIngredients) return;
  yieldLockedByUser.value = true;
}

function saveRecipe() {
  if (!isFormValid.value) return;
  const lines = (form.value.ingredientIds ?? []).map((id) => ({
    ingredientId: id,
    quantity: Number(form.value.lineQuantities[id]),
  }));
  const yQ = effectiveYieldQuantity.value;
  const yUnit =
    Number(form.value.yieldQuantity) > 0
      ? form.value.yieldUnit
      : suggestedYield.value.unit;
  upsert({
    id: editingId.value ?? undefined,
    name: form.value.name.trim(),
    yieldQuantity: yQ,
    yieldUnit: yUnit,
    lines,
  });
  refresh();
  isDialogOpen.value = false;
}

const removing = ref(null);
const removeOpen = ref(false);

function openRemove(row) {
  removing.value = row;
  removeOpen.value = true;
}

function confirmRemove() {
  if (removing.value?.id) remove(removing.value.id);
  refresh();
  removeOpen.value = false;
  removing.value = null;
}
</script>

<template>
  <div class="app-page flex h-full min-h-0 flex-col overflow-hidden">
    <AppHeader
      title="Receitas"
      subtitle="Combine ingredientes em receitas e use porções"
      subtitle-class="!text-[0.75rem] !leading-tight"
    >
    </AppHeader>

    <div
      class="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4"
    >
      <section
        class="flex shrink-0 flex-col gap-4 rounded-app-lg border border-app-border bg-app-surface p-4"
      >
        <div class="flex flex-nowrap items-end gap-2">
          <div class="min-w-0 flex-1 flex flex-col gap-2">
            <label
              for="recipes-search"
              class="text-[0.8125rem] font-medium text-app-text-muted-2"
              >Buscar</label
            >
            <InputText
              id="recipes-search"
              v-model="query"
              placeholder="Nome da receita..."
              class="w-full min-w-0"
            />
          </div>
          <Button
            class="shrink-0"
            size="small"
            :disabled="!ingredients.length"
            @click="openCreate"
          >
            <template #icon>
              <IconPlus
                class="size-4"
                stroke-width="2"
              />
            </template>
          </Button>
        </div>

        <p
          v-if="!ingredients.length"
          class="m-0 rounded-app-sm border border-dashed border-app-border bg-app-elevated/40 p-3 text-[0.8125rem] text-app-text-muted"
        >
          Cadastre ingredientes em
          <button
            type="button"
            class="font-semibold text-teal-400 underline-offset-2 hover:underline"
            @click="router.push({ name: 'ingredients' })"
          >
            Ingredientes
          </button>
          antes de criar receitas.
        </p>

        <DataView
          v-else
          :value="filteredRecipes"
          data-key="id"
          layout="list"
          class="app-recipes-dataview"
        >
          <template #empty>
            <div
              class="rounded-app-sm border border-dashed border-app-border bg-app-elevated/30 px-4 py-10 text-center"
            >
              <p class="m-0 text-sm text-app-text-muted">
                Nenhuma receita ainda. Toque em Nova para montar a primeira.
              </p>
            </div>
          </template>
          <template #list="{ items }">
            <div class="flex flex-col gap-2">
              <article
                v-for="item in items"
                :key="item.id"
                class="flex gap-3 rounded-app-lg border border-app-border bg-app-elevated/50 p-3"
              >
                <div class="min-w-0 flex-1">
                  <h3
                    class="m-0 text-[0.9375rem] font-semibold leading-snug text-app-text"
                  >
                    {{ item.name }}
                  </h3>
                  <p class="mt-1 m-0 text-[0.75rem] text-app-text-muted-2">
                    Rendimento:
                    {{ item.yieldQuantity }}
                    {{ item.yieldUnit }} ·
                    {{ item.lines?.length ?? 0 }}
                    {{
                      (item.lines?.length ?? 0) === 1
                        ? "ingrediente"
                        : "ingredientes"
                    }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col gap-1">
                  <Button
                    text
                    rounded
                    size="small"
                    class="!size-9 !min-w-0 border border-[color-mix(in_srgb,var(--accent-teal)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-teal)_10%,transparent)]"
                    title="Editar"
                    aria-label="Editar receita"
                    @click="openEdit(item)"
                  >
                    <template #icon>
                      <IconPencil
                        class="size-[1.125rem] text-[var(--accent-teal)]"
                        stroke-width="1.5"
                      />
                    </template>
                  </Button>
                  <Button
                    text
                    rounded
                    size="small"
                    severity="danger"
                    class="!size-9 !min-w-0"
                    title="Excluir"
                    aria-label="Excluir receita"
                    @click="openRemove(item)"
                  >
                    <template #icon>
                      <IconTrash
                        class="size-[1.125rem]"
                        stroke-width="1.5"
                      />
                    </template>
                  </Button>
                </div>
              </article>
            </div>
          </template>
        </DataView>
      </section>
    </div>

    <Dialog
      v-model:visible="isDialogOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      :header="dialogTitle"
      :style="appDialogStyle"
    >
      <div class="flex max-h-[min(70vh,520px)] flex-col gap-4 overflow-y-auto">
        <div class="flex flex-col gap-2">
          <label
            for="recipe-name"
            class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Nome da receita</label
          >
          <InputText
            id="recipe-name"
            v-model="form.name"
            placeholder="Ex.: Sopa de legumes"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="recipe-ings"
            class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Ingredientes (quantidades na receita completa)</label
          >
          <MultiSelect
            id="recipe-ings"
            v-model="form.ingredientIds"
            :options="ingredients"
            option-label="name"
            option-value="id"
            filter
            display="chip"
            placeholder="Selecionar ingredientes"
            class="w-full"
          />
        </div>

        <div
          v-if="selectedFormIngredients.length"
          class="space-y-2 rounded-app-sm border border-app-border bg-app-surface/50 p-2.5"
        >
          <div
            v-for="ing in selectedFormIngredients"
            :key="ing.id"
            class="flex items-center gap-2"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-app-text">{{
              ing.name
            }}</span>
            <InputNumber
              v-model="form.lineQuantities[ing.id]"
              :min="0.01"
              class="w-28 shrink-0"
              input-class="w-full"
            />
            <span class="w-8 text-right text-xs text-app-text-muted-2">{{
              ing.unit ?? "g"
            }}</span>
          </div>
        </div>

        <div
          v-if="selectedFormIngredients.length"
          class="flex flex-col gap-2"
        >
          <div class="flex flex-col gap-0.5">
            <label
              for="recipe-yield-q"
              class="text-[0.8125rem] font-medium text-app-text-muted-2"
              >Rendimento total
              <span class="font-normal text-app-text-muted"
                >(opcional)</span
              ></label
            >
            <p
              v-if="suggestedYield.sum > 0"
              class="m-0 text-[0.6875rem] leading-snug text-app-text-muted-2"
            >
              Sugestão pela soma dos ingredientes:
              <span class="font-medium tabular-nums text-app-text-muted"
                >{{ suggestedYield.sum }} {{ suggestedYield.unit }}</span
              >
              <template v-if="suggestedYield.mixedUnits">
                — unidades mistas; confira se a unidade do rendimento faz
                sentido para a receita.</template
              >
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-2">
              <InputNumber
                id="recipe-yield-q"
                v-model="form.yieldQuantity"
                :min="0.01"
                :maxFractionDigits="2"
                class="w-full"
                input-class="w-full"
                placeholder="Ex.: 500"
                @update:model-value="onYieldFieldEdited"
              />
            </div>
            <div class="flex flex-col gap-2">
              <Select
                inputId="recipe-yield-u"
                v-model="form.yieldUnit"
                :options="unitOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                fluid
                @update:model-value="onYieldFieldEdited"
              />
            </div>
          </div>
        </div>

        <div
          class="rounded-app-sm border border-app-border bg-app-surface/60 px-3 py-2 text-[0.8125rem]"
        >
          <span class="text-app-text-muted-2">Receita completa: </span>
          <span class="font-semibold tabular-nums text-app-text"
            >{{ fullRecipeTotals.kcal }} kcal</span
          >
          <span class="mx-1 text-app-text-muted">·</span>
          <span class="tabular-nums text-app-text-muted"
            >P {{ fullRecipeTotals.protein }} g</span
          >
          <span class="mx-1 text-app-text-muted">·</span>
          <span class="tabular-nums text-app-text-muted"
            >C {{ fullRecipeTotals.carbs }} g</span
          >
          <span class="mx-1 text-app-text-muted">·</span>
          <span class="tabular-nums text-app-text-muted"
            >G {{ fullRecipeTotals.fat }} g</span
          >
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            severity="secondary"
            outlined
            @click="isDialogOpen = false"
            >Cancelar</Button
          >
          <Button
            :disabled="!isFormValid"
            @click="saveRecipe"
            >Salvar</Button
          >
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="removeOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      header="Excluir receita"
      :style="appDialogStyle"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-sm text-app-text">
          Remover
          <strong>{{ removing?.name ?? "esta receita" }}</strong
          >? Refeições já registradas não são apagadas.
        </p>
        <div class="flex justify-end gap-2">
          <Button
            severity="secondary"
            outlined
            @click="removeOpen = false"
            >Cancelar</Button
          >
          <Button
            severity="danger"
            @click="confirmRemove"
            >Excluir</Button
          >
        </div>
      </div>
    </Dialog>
  </div>
</template>
