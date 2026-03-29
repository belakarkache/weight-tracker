<script setup>
import { computed, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import Button from "primevue/button";
import DataView from "primevue/dataview";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Checkbox from "primevue/checkbox";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconInfoCircle,
  IconSquaresSelected,
  IconCheck,
} from "@tabler/icons-vue";
import { useIngredients } from "../composables/useIngredients";
import InfoNotice from "../components/InfoNotice.vue";

const { getStored, upsert, remove, removeMany } = useIngredients();

const ingredients = ref(getStored());
const query = ref("");

const unitOptions = [
  { label: "Gramas (g)", value: "g" },
  { label: "Mililitros (ml)", value: "ml" },
  { label: "Unidade (un)", value: "un" },
];

const isDialogOpen = ref(false);
const isRemoveDialogOpen = ref(false);
const isBulkRemoveDialogOpen = ref(false);
const editingId = ref(null);
const removingIngredient = ref(null);
const selectedIds = ref([]);
const isBulkMode = ref(false);
const form = ref({
  name: "",
  quantity: 100,
  unit: "g",
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
});

const isEditing = computed(() => !!editingId.value);
const dialogTitle = computed(() =>
  isEditing.value ? "Editar ingrediente" : "Novo ingrediente",
);

const filteredIngredients = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) return ingredients.value;
  return ingredients.value.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(normalizedQuery),
  );
});

const isFormValid = computed(() => {
  const nameOk = form.value.name.trim().length > 0;
  const qtyOk = form.value.quantity !== null && Number(form.value.quantity) > 0;
  const calOk =
    form.value.kcal !== null && Number(form.value.kcal) >= 0;
  return nameOk && qtyOk && calOk;
});

const selectedCount = computed(() => selectedIds.value.length);
const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "430px",
};

const selectAllFilteredLabel = computed(() =>
  query.value.trim() ? "Selecionar todos da busca" : "Selecionar todos",
);

function refresh() {
  ingredients.value = getStored();
  const valid = new Set(ingredients.value.map((i) => i.id));
  selectedIds.value = selectedIds.value.filter((id) => valid.has(id));
}

function setItemSelected(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value = [...selectedIds.value, id];
    }
  } else {
    selectedIds.value = selectedIds.value.filter((x) => x !== id);
  }
}

function selectAllFiltered() {
  selectedIds.value = filteredIngredients.value.map((i) => i.id);
}

function clearSelection() {
  selectedIds.value = [];
}

function openBulkRemoveDialog() {
  if (!selectedIds.value.length) return;
  isBulkRemoveDialogOpen.value = true;
}

function closeBulkRemoveDialog() {
  isBulkRemoveDialogOpen.value = false;
}

function confirmBulkRemove() {
  if (!selectedIds.value.length) return;
  removeMany([...selectedIds.value]);
  clearSelection();
  refresh();
  closeBulkRemoveDialog();
}

function toggleBulkMode() {
  if (isBulkMode.value) {
    isBulkMode.value = false;
    clearSelection();
  } else {
    isBulkMode.value = true;
  }
}

watch(
  () => ingredients.value.length,
  (n) => {
    if (n === 0) {
      isBulkMode.value = false;
      selectedIds.value = [];
    }
  },
);

function openCreate() {
  editingId.value = null;
  form.value = {
    name: "",
    quantity: 100,
    unit: "g",
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
  };
  isDialogOpen.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.value = {
    name: row.name ?? "",
    quantity: row.quantity ?? 100,
    unit: row.unit ?? "g",
    kcal: row.kcal ?? row.calories ?? row.kcalPer100 ?? null,
    protein: row.protein ?? row.proteinPer100 ?? null,
    carbs: row.carbs ?? row.carbsPer100 ?? null,
    fat: row.fat ?? row.fatPer100 ?? null,
  };
  isDialogOpen.value = true;
}

function saveIngredient() {
  if (!isFormValid.value) return;

  upsert({
    id: editingId.value ?? undefined,
    name: form.value.name.trim(),
    quantity: form.value.quantity,
    unit: form.value.unit,
    kcal: form.value.kcal,
    protein: form.value.protein,
    carbs: form.value.carbs,
    fat: form.value.fat,
  });
  refresh();
  isDialogOpen.value = false;
}

function openRemoveDialog(row) {
  removingIngredient.value = row;
  isRemoveDialogOpen.value = true;
}

function closeRemoveDialog() {
  isRemoveDialogOpen.value = false;
  removingIngredient.value = null;
}

function confirmRemove() {
  if (!removingIngredient.value) return;
  const id = removingIngredient.value.id;
  remove(id);
  selectedIds.value = selectedIds.value.filter((x) => x !== id);
  refresh();
  closeRemoveDialog();
}
</script>

<template>
  <div class="app-page flex min-h-full flex-col">
    <AppHeader
      title="Ingredientes"
      subtitle="Organize ingredientes e detalhes nutricionais"
    />
    <div class="mx-auto flex w-full flex-1 flex-col px-4 pb-8 pt-4">
      <section
        class="flex min-h-0 flex-col gap-4 rounded-app-lg border border-app-border bg-app-surface p-4"
      >
        <div class="flex flex-nowrap items-end gap-2 md:flex-wrap md:gap-3">
          <div class="flex min-w-0 flex-1 flex-col gap-2 md:min-w-[14rem]">
            <label
              for="ingredients-search"
              class="text-[0.8125rem] font-medium text-app-text-muted-2"
              >Buscar</label
            >
            <InputText
              id="ingredients-search"
              v-model="query"
              placeholder="Ex.: arroz, frango..."
              class="w-full min-w-0"
            />
          </div>
          <Button
            v-if="ingredients.length"
            class="shrink-0"
            severity="secondary"
            outlined
            size="small"
            :title="
              isBulkMode
                ? 'Sair do modo seleção em lote'
                : 'Selecionar e excluir vários ingredientes'
            "
            :aria-pressed="isBulkMode"
            :aria-label="
              isBulkMode ? 'Concluir seleção em lote' : 'Ativar seleção em lote'
            "
            @click="toggleBulkMode"
          >
            <template #icon>
              <IconSquaresSelected
                v-if="!isBulkMode"
                class="size-5"
                stroke-width="1.5"
              />
              <IconCheck
                v-else
                class="size-5"
                stroke-width="1.5"
              />
            </template>
          </Button>
          <Button
            class="shrink-0"
            severity="primary"
            aria-label="Novo ingrediente"
            size="small"
            @click="openCreate"
          >
            <template #icon>
              <IconPlus
                class="size-5"
                stroke-width="1.5"
              />
            </template>
          </Button>
        </div>

        <div
          v-if="isBulkMode && ingredients.length"
          class="flex flex-wrap items-center gap-2 border-t border-app-border pt-3"
        >
          <Button
            severity="secondary"
            outlined
            size="small"
            class="shrink-0"
            :disabled="!filteredIngredients.length"
            @click="selectAllFiltered"
          >
            {{ selectAllFilteredLabel }}
          </Button>
          <Button
            severity="secondary"
            outlined
            size="small"
            class="shrink-0"
            :disabled="!selectedCount"
            @click="clearSelection"
          >
            Limpar seleção
          </Button>
          <span
            v-if="selectedCount"
            class="text-[0.75rem] text-app-text-muted-2 sm:ml-auto"
          >
            {{ selectedCount }}
            {{ selectedCount === 1 ? "selecionado" : "selecionados" }}
          </span>
          <Button
            severity="danger"
            outlined
            size="small"
            class="shrink-0"
            :disabled="!selectedCount"
            @click="openBulkRemoveDialog"
          >
            Excluir selecionados
          </Button>
        </div>

        <DataView
          :value="filteredIngredients"
          dataKey="id"
          class="min-h-0 !border-0"
          :paginator="filteredIngredients.length > 10"
          :rows="10"
          paginatorTemplate="PrevPageLink PageLinks NextPageLink"
        >
          <template #empty>
            <InfoNotice class="mt-1">
              <template #icon>
                <IconInfoCircle stroke-width="1.5" />
              </template>
              <div class="space-y-1">
                <p class="m-0 text-sm font-semibold text-app-text">
                  {{
                    query
                      ? "Nenhum ingrediente encontrado para a busca."
                      : "Você ainda não cadastrou nenhum ingrediente."
                  }}
                </p>
                <p
                  v-if="!query"
                  class="m-0 text-[0.8125rem] text-app-text-muted"
                >
                  Toque no botão “+” para criar seu primeiro ingrediente.
                </p>
              </div>
            </InfoNotice>
          </template>

          <template #list="{ items }">
            <div class="flex flex-col gap-3">
              <article
                v-for="item in items"
                :key="item.id"
                class="flex gap-3 rounded-app-lg border border-app-border border-l-[3px] border-l-[color-mix(in_srgb,var(--accent-teal)_55%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--app-bg-surface)_100%,transparent)_0%,color-mix(in_srgb,var(--app-bg-elevated)_88%,var(--accent-teal)_6%)_100%)] p-3.5 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.55)]"
              >
                <div
                  v-if="isBulkMode"
                  class="flex w-9 shrink-0 items-center justify-center self-stretch"
                >
                  <Checkbox
                    :inputId="'ingredient-select-' + item.id"
                    binary
                    :modelValue="selectedIds.includes(item.id)"
                    :aria-label="'Selecionar ' + (item.name || 'ingrediente')"
                    @update:modelValue="(v) => setItemSelected(item.id, v)"
                  />
                </div>
                <div class="flex min-w-0 flex-1 flex-col justify-center">
                  <div
                    class="flex w-full min-w-0 flex-wrap items-baseline justify-start gap-x-2 gap-y-1 text-left"
                  >
                    <h3
                      class="m-0 min-w-0 max-w-[calc(100%-3.75rem)] shrink text-[0.9375rem] font-semibold leading-snug text-app-text line-clamp-2"
                    >
                      {{ item.name }}
                    </h3>
                    <span
                      class="inline-flex shrink-0 items-center rounded-app-sm border border-app-border bg-[color-mix(in_srgb,var(--app-bg-elevated)_80%,transparent)] px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums leading-none text-app-text-muted-2"
                      :title="
                        'Quantidade de referência: ' +
                        (item.quantity ?? '—') +
                        (item.unit ? ' ' + item.unit : '')
                      "
                    >
                      {{ item.quantity != null ? Number(item.quantity) : "—"
                      }}{{ item.unit ?? "g" }}
                    </span>
                  </div>

                  <div
                    class="mt-2 grid min-w-0 w-full grid-cols-4 divide-x divide-[color-mix(in_srgb,var(--app-border)_55%,transparent)] md:w-max md:max-w-full md:grid-cols-[repeat(4,max-content)]"
                  >
                    <div
                      class="flex min-w-0 flex-col gap-0.5 pl-0 pr-2 text-left"
                    >
                      <span
                        class="text-[0.625rem] font-medium leading-tight text-app-text-muted-2"
                        >Calorias</span
                      >
                      <span
                        class="truncate text-[0.75rem] font-semibold leading-tight text-app-text tabular-nums"
                      >
                        {{ item.kcal ?? "—" }}
                      </span>
                    </div>
                    <div class="flex min-w-0 flex-col gap-0.5 px-2 text-left">
                      <span
                        class="text-[0.625rem] font-medium leading-tight text-app-text-muted-2"
                        >Prot</span
                      >
                      <span
                        class="truncate text-[0.75rem] font-semibold leading-tight text-app-text tabular-nums"
                      >
                        {{ item.protein ?? "—" }}
                      </span>
                    </div>
                    <div class="flex min-w-0 flex-col gap-0.5 px-2 text-left">
                      <span
                        class="text-[0.625rem] font-medium leading-tight text-app-text-muted-2"
                        >Carb</span
                      >
                      <span
                        class="truncate text-[0.75rem] font-semibold leading-tight text-app-text tabular-nums"
                      >
                        {{ item.carbs ?? "—" }}
                      </span>
                    </div>
                    <div class="flex min-w-0 flex-col gap-0.5 px-2 text-left">
                      <span
                        class="text-[0.625rem] font-medium leading-tight text-app-text-muted-2"
                        >Gord</span
                      >
                      <span
                        class="truncate text-[0.75rem] font-semibold leading-tight text-app-text tabular-nums"
                      >
                        {{ item.fat ?? "—" }}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  class="flex shrink-0 flex-col items-end justify-start gap-1.5 self-stretch"
                >
                  <Button
                    text
                    rounded
                    size="small"
                    title="Editar"
                    aria-label="Editar ingrediente"
                    class="!size-9 !min-w-0 shrink-0 border border-[color-mix(in_srgb,var(--accent-teal)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-teal)_10%,transparent)]"
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
                    title="Deletar"
                    aria-label="Deletar ingrediente"
                    class="!size-9 !min-w-0 shrink-0 border border-[color-mix(in_srgb,var(--accent-rose)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-rose)_8%,transparent)]"
                    @click="openRemoveDialog(item)"
                  >
                    <template #icon>
                      <IconTrash
                        class="size-[1.125rem] text-[var(--accent-rose)]"
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
      :draggable="false"
      class="app-dialog"
      :header="dialogTitle"
      position="bottom"
      :style="appDialogStyle"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <label
            for="ingredient-name"
            class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Nome</label
          >
          <InputText
            id="ingredient-name"
            v-model="form.name"
            placeholder="Ex.: Arroz branco cozido"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-2">
            <label
              for="ingredient-qty"
              class="text-[0.8125rem] font-medium text-app-text-muted-2"
              >Quantidade</label
            >
            <InputNumber
              id="ingredient-qty"
              v-model="form.quantity"
              :min="0"
              :max="100000"
              :maxFractionDigits="2"
              placeholder="0"
              class="w-full"
              input-class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="ingredient-unit"
              class="text-[0.8125rem] font-medium text-app-text-muted-2"
              >Unidade</label
            >
            <Select
              inputId="ingredient-unit"
              v-model="form.unit"
              :options="unitOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              fluid
            />
          </div>
        </div>

        <div
          class="overflow-hidden rounded-app-lg border border-app-border bg-[color-mix(in_srgb,var(--app-bg-surface)_85%,transparent)]"
          role="group"
          aria-label="Tabela nutricional"
        >
          <div
            class="grid grid-cols-[1fr_10rem] gap-3 border-b border-app-border bg-white/[0.02] px-3.5 py-3 text-xs font-bold text-app-text-muted-2 max-[380px]:grid-cols-[1fr_8.5rem]"
          >
            <span>Nutriente</span>
            <span class="text-right">Valor</span>
          </div>

          <div class="divide-y divide-white/[0.05]">
            <div
              class="grid grid-cols-[1fr_10rem] items-center gap-3 px-3.5 py-2.5 max-[380px]:grid-cols-[1fr_8.5rem]"
            >
              <label
                for="ingredient-kcal"
                class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
              >
                Calorias <span class="text-[var(--accent-amber)]">*</span>
              </label>
              <div class="min-w-0">
                <InputNumber
                  id="ingredient-kcal"
                  v-model="form.kcal"
                  :min="0"
                  :max="200000"
                  :maxFractionDigits="1"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                />
              </div>
            </div>

            <div
              class="grid grid-cols-[1fr_10rem] items-center gap-3 px-3.5 py-2.5 max-[380px]:grid-cols-[1fr_8.5rem]"
            >
              <label
                for="ingredient-protein"
                class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
              >
                Proteína
              </label>
              <div class="min-w-0">
                <InputNumber
                  id="ingredient-protein"
                  v-model="form.protein"
                  :min="0"
                  :max="100000"
                  :maxFractionDigits="1"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                />
              </div>
            </div>

            <div
              class="grid grid-cols-[1fr_10rem] items-center gap-3 px-3.5 py-2.5 max-[380px]:grid-cols-[1fr_8.5rem]"
            >
              <label
                for="ingredient-carbs"
                class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
              >
                Carboidrato
              </label>
              <div class="min-w-0">
                <InputNumber
                  id="ingredient-carbs"
                  v-model="form.carbs"
                  :min="0"
                  :max="100000"
                  :maxFractionDigits="1"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                />
              </div>
            </div>

            <div
              class="grid grid-cols-[1fr_10rem] items-center gap-3 px-3.5 py-2.5 max-[380px]:grid-cols-[1fr_8.5rem]"
            >
              <label
                for="ingredient-fat"
                class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
              >
                Gordura
              </label>
              <div class="min-w-0">
                <InputNumber
                  id="ingredient-fat"
                  v-model="form.fat"
                  :min="0"
                  :max="100000"
                  :maxFractionDigits="1"
                  placeholder="0"
                  class="w-full"
                  input-class="w-full"
                />
              </div>
            </div>
          </div>
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
            @click="saveIngredient"
          >
            Salvar
          </Button>
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="isRemoveDialogOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      header="Remover ingrediente"
      :style="appDialogStyle"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-sm leading-relaxed text-app-text">
          Deseja remover
          <strong class="text-app-text"
            >"{{ removingIngredient?.name ?? "este ingrediente" }}"</strong
          >?
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <Button
            severity="secondary"
            outlined
            @click="closeRemoveDialog"
            >Cancelar</Button
          >
          <Button
            severity="danger"
            @click="confirmRemove"
            >Remover</Button
          >
        </div>
      </div>
    </Dialog>

    <Dialog
      v-model:visible="isBulkRemoveDialogOpen"
      modal
      position="bottom"
      :draggable="false"
      class="app-dialog"
      header="Excluir selecionados"
      :style="appDialogStyle"
    >
      <div class="flex flex-col gap-4">
        <p class="m-0 text-sm leading-relaxed text-app-text">
          Remover
          <strong class="text-app-text">{{ selectedCount }}</strong>
          {{
            selectedCount === 1
              ? " ingrediente selecionado"
              : " ingredientes selecionados"
          }}? Esta ação não pode ser desfeita.
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <Button
            severity="secondary"
            outlined
            @click="closeBulkRemoveDialog"
            >Cancelar</Button
          >
          <Button
            severity="danger"
            @click="confirmBulkRemove"
            >Excluir</Button
          >
        </div>
      </div>
    </Dialog>
  </div>
</template>
