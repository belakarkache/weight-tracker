<script setup>
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import { IconRulerMeasure, IconTrash } from "@tabler/icons-vue";
import { useIngredients } from "../composables/useIngredients";

const visible = defineModel({ type: Boolean, default: false });

const props = defineProps({
  dialogStyle: {
    type: Object,
    default: () => ({
      width: "calc(100vw - 2rem)",
      maxWidth: "var(--app-dialog-max-width)",
    }),
  },
  idPrefix: {
    type: String,
    default: "create-ingredient",
  },
  ingredientToEdit: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["saved"]);

const { upsert } = useIngredients();

const unitOptions = [
  { label: "Gramas (g)", value: "g" },
  { label: "Mililitros (ml)", value: "ml" },
  { label: "Unidade (un)", value: "un" },
];

const form = ref({
  name: "",
  quantity: 100,
  unit: "g",
  alternateMeasures: [],
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
  sodium: null,
});

function resetForm() {
  form.value = {
    name: "",
    quantity: 100,
    unit: "g",
    alternateMeasures: [],
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
    sodium: null,
  };
}

function loadFromIngredient(row) {
  const alts = Array.isArray(row?.alternateMeasures)
    ? row.alternateMeasures.map((a) => ({
        quantity: a.quantity ?? 1,
        unit: a.unit ?? "un",
        label: a.label ?? "",
      }))
    : [];
  form.value = {
    name: row.name ?? "",
    quantity: row.quantity ?? 100,
    unit: row.unit ?? "g",
    alternateMeasures: alts,
    kcal: row.kcal ?? row.calories ?? row.kcalPer100 ?? null,
    protein: row.protein ?? row.proteinPer100 ?? null,
    carbs: row.carbs ?? row.carbsPer100 ?? null,
    fat: row.fat ?? row.fatPer100 ?? null,
    sodium: row.sodium ?? row.sodiumMg ?? row.sodiumPer100 ?? null,
  };
}

const dialogHeader = computed(() =>
  props.ingredientToEdit?.id ? "Editar ingrediente" : "Novo ingrediente",
);

const alternateMeasuresValid = computed(() => {
  const primary = form.value.unit;
  const seen = new Set([primary]);
  for (const alt of form.value.alternateMeasures ?? []) {
    const u = alt?.unit;
    const q = alt?.quantity != null ? Number(alt.quantity) : null;
    if (!u || q == null || !Number.isFinite(q) || q <= 0) return false;
    if (seen.has(u)) return false;
    seen.add(u);
  }
  return true;
});

const isValid = computed(() => {
  const f = form.value;
  return (
    f.name.trim().length > 0 &&
    f.quantity != null &&
    Number(f.quantity) > 0 &&
    f.kcal != null &&
    Number(f.kcal) >= 0 &&
    alternateMeasuresValid.value
  );
});

function addAlternateMeasure() {
  form.value.alternateMeasures = [
    ...(form.value.alternateMeasures ?? []),
    { quantity: 1, unit: "un", label: "" },
  ];
}

function removeAlternateMeasure(index) {
  const next = [...(form.value.alternateMeasures ?? [])];
  next.splice(index, 1);
  form.value.alternateMeasures = next;
}

watch(visible, (v) => {
  if (!v) return;
  if (props.ingredientToEdit?.id) {
    loadFromIngredient(props.ingredientToEdit);
  } else {
    resetForm();
  }
});

function onCancel() {
  visible.value = false;
}

function onSave() {
  if (!isValid.value) return;
  const f = form.value;
  const referenceQuantity = Number(f.quantity);
  const primaryUnit = f.unit ?? "g";
  const alternates = (f.alternateMeasures ?? [])
    .map((a) => ({
      quantity: Number(a.quantity),
      unit: a.unit,
      label: typeof a.label === "string" ? a.label.trim() || null : null,
    }))
    .filter((a) => a.quantity > 0 && a.unit && a.unit !== primaryUnit);
  const saved = upsert({
    id: props.ingredientToEdit?.id,
    name: f.name.trim(),
    quantity: referenceQuantity,
    unit: primaryUnit,
    alternateMeasures: alternates,
    kcal: Number(f.kcal),
    protein: f.protein != null ? Number(f.protein) : null,
    carbs: f.carbs != null ? Number(f.carbs) : null,
    fat: f.fat != null ? Number(f.fat) : null,
    sodium: f.sodium != null ? Math.round(Number(f.sodium)) : null,
  });
  visible.value = false;
  emit("saved", { ingredient: saved, referenceQuantity });
}

function id(suffix) {
  return `${props.idPrefix}-${suffix}`;
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="dialogHeader"
    class="app-dialog"
    :style="dialogStyle"
    position="bottom"
    :draggable="false"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label
          :for="id('name')"
          class="text-[0.8125rem] font-medium text-app-text-muted-2"
          >Nome</label
        >
        <InputText
          :id="id('name')"
          v-model="form.name"
          placeholder="Ex.: Arroz branco cozido"
          class="w-full"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-2">
          <label
            :for="id('qty')"
            class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Quantidade</label
          >
          <InputNumber
            :id="id('qty')"
            v-model="form.quantity"
            :min="0"
            :max="100000"
            locale="pt-BR"
            :max-fraction-digits="2"
            placeholder="0"
            class="w-full"
            input-class="w-full"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label
            :for="id('unit')"
            class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Unidade</label
          >
          <Select
            :inputId="id('unit')"
            v-model="form.unit"
            :options="unitOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            fluid
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div
          class="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-3"
        >
          <span class="text-[0.8125rem] font-medium text-app-text-muted-2"
            >Outras medidas equivalentes</span
          >
          <Button
            type="button"
            rounded
            outlined
            severity="secondary"
            class="!size-9 shrink-0 !p-0"
            aria-label="Adicionar medida equivalente"
            title="Adicionar medida equivalente"
            @click="addAlternateMeasure"
          >
            <IconRulerMeasure
              class="size-[1.25rem] text-app-text"
              stroke-width="2"
            />
          </Button>
        </div>
        <p class="m-0 text-[0.75rem] leading-snug text-app-text-muted-2">
          Cada medida equivale à mesma informação nutricional da referência
          principal (ex.: 30 g e 1 fatia com os mesmos valores).
        </p>
        <div
          v-for="(alt, altIdx) in form.alternateMeasures"
          :key="altIdx"
          class="flex flex-wrap items-end gap-2 rounded-app-sm border border-app-border bg-[color-mix(in_srgb,var(--app-bg-surface)_60%,transparent)] p-2.5"
        >
          <div class="flex min-w-[5.5rem] flex-1 flex-col gap-1">
            <label
              class="text-[0.6875rem] font-medium text-app-text-muted-2"
              :for="id('alt-label-' + altIdx)"
              >Nome (opcional)</label
            >
            <InputText
              :id="id('alt-label-' + altIdx)"
              v-model="alt.label"
              placeholder="Ex.: fatia"
              class="w-full"
            />
          </div>
          <div class="w-[5.75rem] flex flex-col gap-1">
            <label
              class="text-[0.6875rem] font-medium text-app-text-muted-2"
              :for="id('alt-qty-' + altIdx)"
              >Qtd</label
            >
            <InputNumber
              :id="id('alt-qty-' + altIdx)"
              v-model="alt.quantity"
              :min="0.01"
              locale="pt-BR"
              :max-fraction-digits="2"
              class="w-full"
              input-class="w-full"
            />
          </div>
          <div class="min-w-[6.5rem] flex-[1_1_7rem] flex-col gap-1">
            <label
              class="text-[0.6875rem] font-medium text-app-text-muted-2"
              :for="id('alt-unit-' + altIdx)"
              >Unidade</label
            >
            <Select
              :inputId="id('alt-unit-' + altIdx)"
              v-model="alt.unit"
              :options="unitOptions"
              option-label="label"
              option-value="value"
              class="w-full"
              fluid
            />
          </div>
          <Button
            type="button"
            text
            rounded
            severity="danger"
            class="shrink-0"
            :aria-label="'Remover medida ' + (altIdx + 1)"
            @click="removeAlternateMeasure(altIdx)"
          >
            <template #icon>
              <IconTrash
                class="size-[1.125rem]"
                stroke-width="1.5"
              />
            </template>
          </Button>
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
              :for="id('kcal')"
              class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
            >
              Calorias <span class="text-[var(--accent-amber)]">*</span>
            </label>
            <div class="min-w-0">
              <InputNumber
                :id="id('kcal')"
                v-model="form.kcal"
                :min="0"
                :max="200000"
                locale="pt-BR"
                :max-fraction-digits="2"
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
              :for="id('protein')"
              class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
            >
              Proteína
            </label>
            <div class="min-w-0">
              <InputNumber
                :id="id('protein')"
                v-model="form.protein"
                :min="0"
                :max="100000"
                locale="pt-BR"
                :max-fraction-digits="2"
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
              :for="id('carbs')"
              class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
            >
              Carboidrato
            </label>
            <div class="min-w-0">
              <InputNumber
                :id="id('carbs')"
                v-model="form.carbs"
                :min="0"
                :max="100000"
                locale="pt-BR"
                :max-fraction-digits="2"
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
              :for="id('fat')"
              class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
            >
              Gordura
            </label>
            <div class="min-w-0">
              <InputNumber
                :id="id('fat')"
                v-model="form.fat"
                :min="0"
                :max="100000"
                locale="pt-BR"
                :max-fraction-digits="2"
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
              :for="id('sodium')"
              class="min-w-0 text-[0.8125rem] font-semibold text-app-text"
            >
              Sódio (mg)
            </label>
            <div class="min-w-0">
              <InputNumber
                :id="id('sodium')"
                v-model="form.sodium"
                :min="0"
                :max="1000000"
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
          @click="onCancel"
          >Cancelar</Button
        >
        <Button
          :disabled="!isValid"
          @click="onSave"
          >Salvar</Button
        >
      </div>
    </div>
  </Dialog>
</template>
