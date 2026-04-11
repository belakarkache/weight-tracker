<script setup>
import { computed, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import Button from "primevue/button";
import DataView from "primevue/dataview";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
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
import CreateIngredientDialog from "../components/CreateIngredientDialog.vue";

const { getStored, remove, removeMany } = useIngredients();

const ingredients = ref(getStored());
const query = ref("");

const ingredientDialogOpen = ref(false);
const ingredientToEdit = ref(null);
const isRemoveDialogOpen = ref(false);
const isBulkRemoveDialogOpen = ref(false);
const removingIngredient = ref(null);
const selectedIds = ref([]);
const isBulkMode = ref(false);

const filteredIngredients = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  if (!normalizedQuery) return ingredients.value;
  return ingredients.value.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(normalizedQuery),
  );
});

const selectedCount = computed(() => selectedIds.value.length);
const appDialogStyle = {
  width: "calc(100vw - 2rem)",
  maxWidth: "var(--app-dialog-max-width)",
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

watch(ingredientDialogOpen, (open) => {
  if (!open) ingredientToEdit.value = null;
});

function openCreate() {
  ingredientToEdit.value = null;
  ingredientDialogOpen.value = true;
}

function openEdit(row) {
  ingredientToEdit.value = row;
  ingredientDialogOpen.value = true;
}

function onIngredientDialogSaved() {
  refresh();
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
  <div class="app-page flex h-full min-h-0 flex-col overflow-hidden">
    <AppHeader
      title="Ingredientes"
      subtitle="Organize ingredientes e detalhes nutricionais"
    >
    </AppHeader>
    <div
      class="app-scroll mx-auto flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 pb-8 pt-4"
    >
      <section
        class="flex shrink-0 flex-col gap-4 rounded-app-lg border border-app-border bg-app-surface p-4"
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
          class="!border-0"
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
                      class="inline-flex max-w-full shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 rounded-app-sm border border-app-border bg-[color-mix(in_srgb,var(--app-bg-elevated)_80%,transparent)] px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums leading-none text-app-text-muted-2"
                      :title="
                        'Referência nutricional: ' +
                        (item.quantity ?? '—') +
                        (item.unit ? ' ' + item.unit : '') +
                        (item.alternateMeasures?.length
                          ? '; também ' +
                            item.alternateMeasures
                              .map(
                                (a) =>
                                  `${Number(a.quantity)} ${a.unit}` +
                                  (a.label ? ` (${a.label})` : ''),
                              )
                              .join(', ')
                          : '')
                      "
                    >
                      <span
                        >{{ item.quantity != null ? Number(item.quantity) : "—"
                        }}{{ item.unit ?? "g" }}</span
                      >
                      <template v-if="item.alternateMeasures?.length">
                        <span
                          class="text-app-text-muted"
                          aria-hidden="true"
                          >·</span
                        >
                        <span
                          v-for="(a, ai) in item.alternateMeasures"
                          :key="ai"
                          class="whitespace-nowrap"
                        >
                          {{ Number(a.quantity) }}{{ a.unit
                          }}<template v-if="a.label"> {{ a.label }}</template
                          ><span
                            v-if="ai < item.alternateMeasures.length - 1"
                            class="mx-0.5 text-app-text-muted"
                            >·</span
                          >
                        </span>
                      </template>
                    </span>
                  </div>

                  <div
                    class="mt-2 grid min-w-0 w-full grid-cols-2 divide-x divide-[color-mix(in_srgb,var(--app-border)_55%,transparent)] sm:grid-cols-3 md:w-max md:max-w-full md:grid-cols-[repeat(5,max-content)]"
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
                    <div class="flex min-w-0 flex-col gap-0.5 px-2 text-left">
                      <span
                        class="text-[0.625rem] font-medium leading-tight text-app-text-muted-2"
                        >Na</span
                      >
                      <span
                        class="truncate text-[0.75rem] font-semibold leading-tight text-app-text tabular-nums"
                      >
                        {{ item.sodium != null ? item.sodium + " mg" : "—" }}
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

    <CreateIngredientDialog
      v-model="ingredientDialogOpen"
      :ingredient-to-edit="ingredientToEdit"
      :dialog-style="appDialogStyle"
      id-prefix="ingredients"
      @saved="onIngredientDialogSaved"
    />

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
